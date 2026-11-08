import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';

Deno.test('server product prices, option restrictions, promotions and tip choices reject tampering', async () => {
  const db = new PGlite();
  const check = (condition: boolean, message: string) => {if (!condition) throw new Error(message);};
  try {
    const migration = await Deno.readTextFile(new URL('../../migrations/20261031190114_goodies_validate_standard_options_and_tips.sql', import.meta.url));
    // Execute the repository's real validator definitions, excluding later migration
    // patches that require the complete order schema. No validator is mocked.
    await db.exec(migration.slice(0, migration.indexOf('REVOKE ALL')));
    async function price(category: string, line: unknown, deals: unknown = []) {
      return (await db.query<{price: string}>(
        'select public.validate_goodies_standard_product_line($1,10,$2::jsonb,$3::jsonb) as price',
        [category, JSON.stringify(line), JSON.stringify(deals)])).rows[0].price;
    }
    async function rejected(category: string, line: unknown, deals: unknown = []) {
      try {await price(category, line, deals);}
      catch (error) {check(['22023','P0001'].includes((error as {code: string}).code), 'Expected a validation rejection'); return;}
      throw new Error('Manipulated cart price or option was accepted');
    }
    check(Number(await price('restaurants', {id: 'synthetic-product', p: 12.5, options: {size:'large',drink:true}})) === 12.5, 'Server computes option surcharges');
    check(Number(await price('groceries', {p:10})) === 10, 'Simple products use authoritative base price');
    await rejected('restaurants', {p:0.01, options:{size:'regular'}});
    await rejected('restaurants', {p:10, options:{size:'large'}});
    await rejected('restaurants', {p:10, options:{size:'invented'}});
    await rejected('groceries', {p:11, options:{drink:true}});
    await rejected('groceries', {p:11.5, options:{size:'large'}});
    await rejected('restaurants', {p:11, options:{size:'regular',drink:'true'}});
    await rejected('restaurants', {id:'synthetic-product', p:5, options:{size:'regular',discount_pct:50}});
    const deal = {item:'synthetic-product', st:'Live', pct:50};
    check(Number(await price('restaurants', {id:'synthetic-product',p:5,options:{size:'regular',discount_pct:50}}, [deal])) === 5, 'Published matching promotion is honored');
    await rejected('restaurants', {id:'other-product',p:5,options:{size:'regular',discount_pct:50}}, [deal]);
    await rejected('restaurants', {id:'synthetic-product',p:5,options:{size:'regular',discount_pct:50}}, [{...deal,st:'Draft'}]);
    for (const [tip, allowed] of [[0,true],[2,true],[5,true],[3,false],[-1,false],[1001,false]] as const) {
      const result = await db.query<{allowed:boolean}>('select public.goodies_tip_is_allowed($1,$2) as allowed',[tip,'0,2,5']);
      check(result.rows[0].allowed === allowed, 'Only configured nonnegative tips are accepted');
    }
  } finally {await db.close();}
});
