import {PGlite} from 'npm:@electric-sql/pglite@0.3.14';

Deno.test('server builder rules enforce availability, required groups, limits and authoritative pricing',async()=>{
  const db=new PGlite();
  const business='10000000-0000-4000-8000-000000000001';
  const config={base:10,enabled:true,available:true,sizes:[{id:'regular',add:0},{id:'large',add:2},{id:'unavailable',avail:false}],groups:[
    {id:'base',kind:'one',req:true,min:1,max:1,items:[{id:'standard',free:true}]},
    {id:'extras',kind:'many',min:0,max:2,me:1,inc:1,items:[{id:'a',price:2,max:1},{id:'b',price:3,max:1},{id:'blocked',price:1,avail:false}]},
  ]};
  const check=(value:boolean,message:string)=>{if(!value)throw new Error(message);};
  try{
    await db.exec('create table public.goodies_builder_configs(business_id uuid,builder_id text,enabled boolean,config jsonb)');
    const source=await Deno.readTextFile(new URL('../../migrations/20261025115651_validate_goodies_custom_builder_orders.sql',import.meta.url));
    const marker=source.indexOf('AS $function$');
    await db.exec(source.slice(0,source.indexOf('$function$',marker+13)+11)+';');
    await db.exec(await Deno.readTextFile(new URL('../../migrations/20261106022200_goodies_builder_selection_contract.sql',import.meta.url)));
    for(const builder of ['pizza','burger','custom']){
      await db.query('insert into public.goodies_builder_configs values($1,$2,true,$3::jsonb)',[business,builder,JSON.stringify(config)]);
      const valid={id:'byo:'+builder,p:15,q:1,byo:{sid:'synthetic-store',bid:builder,size:'large',sel:{base:['standard'],extras:['a','b']}}};
      const price=await db.query<{price:string}>('select public.validate_goodies_builder_line($1,$2,$3::jsonb) as price',[business,'synthetic-store',JSON.stringify(valid)]);
      check(Number(price.rows[0].price)===15,'Base, size, included ingredient and extra price must be authoritative');
      const invalid=[{...valid,p:0.01},{...valid,p:null},{...valid,q:1.5},{...valid,q:100},
        {...valid,byo:{...valid.byo,sid:'another-store'}},
        {...valid,byo:{...valid.byo,size:'unavailable'}},
        {...valid,byo:{...valid.byo,sel:{base:[],extras:['a']}}},
        {...valid,byo:{...valid.byo,sel:{base:['standard'],extras:['blocked']}}},
        {...valid,byo:{...valid.byo,sel:{base:['standard'],extras:['a','a']}}},
        {...valid,byo:{...valid.byo,sel:{base:['standard'],extras:['a','b','a']}}},
        {...valid,byo:{...valid.byo,sel:{...valid.byo.sel,unconfigured:['free-item']}}},
      ];
      for(const line of invalid){
        let denied=false;
        try{await db.query('select public.validate_goodies_builder_line($1,$2,$3::jsonb)',[business,'synthetic-store',JSON.stringify(line)]);}
        catch(error){check(['22023','P0001'].includes((error as {code:string}).code),'Expected builder validation rejection');denied=true;}
        check(denied,'Invalid builder request must fail');
      }
    }
  }finally{await db.close();}
});
