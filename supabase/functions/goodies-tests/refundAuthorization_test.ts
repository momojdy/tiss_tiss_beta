import { assert, assertStringIncludes, assertEquals } from "jsr:@std/assert@1";
const source = await Deno.readTextFile(new URL("../refund-goodies-card-order/index.ts", import.meta.url));

Deno.test("Goodies refund endpoint authorizes before exposing any order payment state", () => {
  const authorize = source.indexOf('let authorized = user.id === order.customer_id');
  const denied = source.indexOf('if (!authorized) return json({ error: "Order not found" }, 404);');
  const firstState = source.indexOf('if (order.payment_method !== "card")');
  assert(authorize >= 0 && denied > authorize && firstState > denied, "Payment state must not be readable before authorization");
  assertStringIncludes(source, '.select("role").eq("business_id", order.business_id).eq("user_id", user.id).maybeSingle()');
  assertStringIncludes(source, 'membership?.role === "owner" || membership?.role === "admin"');
  assertEquals(source.includes('.select("business_id").eq("business_id", order.business_id)'), false);
});
