type Handler = (request: Request) => Response | Promise<Response>;
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };

async function handlers(): Promise<Record<string, Handler>> {
  const result: Record<string, Handler> = {};
  const original = Deno.serve;
  try {
    for (const slug of ["wantiss-public-content", "wantiss-cms-public"]) {
      (Deno as unknown as { serve: (handler: Handler) => unknown }).serve = handler => { result[slug] = handler; return {}; };
      await import(new URL("../" + slug + "/index.ts", import.meta.url).href);
    }
  } finally { Deno.serve = original; }
  return result;
}

const endpoints = await handlers();
async function withBackend(work: (calls: string[]) => Promise<void>, unavailable = false) {
  const previousFetch = globalThis.fetch;
  const previousUrl = Deno.env.get("SUPABASE_URL"), previousKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const calls: string[] = [];
  Deno.env.set("SUPABASE_URL", "https://local-acceptance.invalid");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "synthetic-unit-test-key");
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    check(url.origin === "https://local-acceptance.invalid", "Unit test attempted an external service request");
    if (url.pathname.endsWith("/rpc/wantiss_cms_published_content")) calls.push((await request.json()).p_locale);
    return new Response(JSON.stringify(unavailable ? { message: "private_database_secret SELECT internal_schema" } : []), {
      status: unavailable ? 500 : 200, headers: { "Content-Type": "application/json" },
    });
  };
  try { await work(calls); } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) Deno.env.delete("SUPABASE_URL"); else Deno.env.set("SUPABASE_URL", previousUrl);
    if (previousKey === undefined) Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY"); else Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", previousKey);
  }
}
function request(slug: string, locale: string) {
  return slug === "wantiss-public-content"
    ? new Request("http://local-edge.invalid/", { method: "POST", body: JSON.stringify({ locale }) })
    : new Request("http://local-edge.invalid/?locale=" + encodeURIComponent(locale));
}

Deno.test("both CMS delivery handlers accept all five configured locales and preserve regional-code compatibility", async () => {
  await withBackend(async calls => {
    for (const [slug, handler] of Object.entries(endpoints)) {
      for (const locale of ["en", "fr", "ht", "es", "zh-Hans", "en-US"]) {
        const response = await handler(request(slug, locale));
        check(response.status === 200, slug + " rejects configured locale " + locale);
        check(calls.at(-1) === locale, "The validated locale did not reach the published-content query");
        const body = await response.json();
        check(Array.isArray(body.content) && Array.isArray(body.assets), "Published envelope changed");
      }
    }
  });
});
Deno.test("invalid CMS locale input is rejected before any published-content lookup", async () => {
  await withBackend(async calls => {
    for (const [slug, handler] of Object.entries(endpoints)) for (const locale of ["../en", "zh_hans", "en--US", "ZH-HANS", "en-"]) {
      const response = await handler(request(slug, locale)); check(response.status === 400, "Invalid locale was accepted"); await response.arrayBuffer();
    }
    check(calls.length === 0, "Invalid input reached the backend");
  });
});
Deno.test("CMS delivery failures return owned messages without database details", async () => {
  await withBackend(async () => {
    for (const [slug, handler] of Object.entries(endpoints)) {
      const response = await handler(request(slug, "en"));
      check(response.status >= 500, "Unavailable backend reported success");
      check(!/private_database_secret|SELECT|internal_schema/.test(await response.text()), "Backend details leaked");
    }
  }, true);
});
Deno.test("CMS delivery rejects unsupported methods without backend activity", async () => {
  await withBackend(async calls => {
    for (const handler of Object.values(endpoints)) {
      const response = await handler(new Request("http://local-edge.invalid/", { method: "DELETE" }));
      check(response.status === 405, "Unsupported method was accepted"); await response.arrayBuffer();
    }
    check(calls.length === 0, "Unsupported method reached the backend");
  });
});
