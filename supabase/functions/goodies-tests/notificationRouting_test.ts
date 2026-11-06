import {goodiesBusinessNotificationTarget} from '../../../src/features/Goodies/notifications.ts';
function equal(actual:unknown,expected:unknown){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);}
Deno.test('vendor order, moderation, ingredient and message notices open their established pages',()=>{
  equal(goodiesBusinessNotificationTarget({destination:'business_goodies_orders',metadata:{business_id:'store-a',order_id:'order-a'}},'store-a'),{page:'goodiesOrders',arg:{focus:'order-a'}});
  equal(goodiesBusinessNotificationTarget({notification_type:'goodies_vendor_product_review',metadata:{business_id:'store-a'}},'store-a'),{page:'goodiesProducts'});
  equal(goodiesBusinessNotificationTarget({notification_type:'goodies_ingredient_approved',metadata:{business_id:'store-a'}},'store-a'),{page:'goodiesRequests'});
  equal(goodiesBusinessNotificationTarget({notification_type:'store_message',metadata:{business_id:'store-a',conversation_id:'thread-a'}},'store-a'),{page:'conversation',arg:{id:'thread-a'}});
});
Deno.test('push payloads cannot navigate another business or an unrelated page',()=>{
  equal(goodiesBusinessNotificationTarget({business_id:'store-b',page:'goodiesProducts'},'store-a'),null);
  equal(goodiesBusinessNotificationTarget({page:'finance',business_id:'store-a'},'store-a'),null);
  equal(goodiesBusinessNotificationTarget({page:'goodiesProducts',business_id:'store-a'},'store-a'),{page:'goodiesProducts'});
});
