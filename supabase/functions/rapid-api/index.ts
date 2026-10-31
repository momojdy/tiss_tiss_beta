import Stripe from "npm:stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabase = createClient(
Deno.env.get("SUPABASE_URL")!,
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);


async function reconcileGoodiesPaymentIntent(paymentIntent: Stripe.PaymentIntent, state: string) {
  const orderId = paymentIntent.metadata?.goodies_order_id;
  if (paymentIntent.metadata?.wantiss_purpose !== "goodies_order" || !orderId) return false;
  const {data, error} = await supabase.rpc("process_goodies_card_payment_event", {
    p_order_id: orderId, p_payment_intent_id: paymentIntent.id, p_event_state: state,
    p_amount_cents: paymentIntent.amount, p_currency: paymentIntent.currency,
  });
  if (error) throw error;
  if (data === "refund_required") {
    await stripe.refunds.create({payment_intent: paymentIntent.id, reason: "requested_by_customer"},
      {idempotencyKey: "goodies-late-success-refund-" + orderId});
  }
  return true;
}
async function paymentIntentFromCharge(charge: Stripe.Charge) {
  const id = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  return id ? await stripe.paymentIntents.retrieve(id) : null;
}

Deno.serve(async (req) => {
try {
const signature = req.headers.get("Stripe-Signature");

if (!signature) {
return new Response(
JSON.stringify({
success: false,
error: "Missing Stripe signature.",
}),
{
headers: { "Content-Type": "application/json" },
status: 400,
}
);
}

const body = await req.text();

let event: Stripe.Event;

try {
event = await stripe.webhooks.constructEventAsync(
body,
signature,
Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
undefined,
cryptoProvider
);
} catch (error) {
console.error("Stripe signature verification failed:", error);

return new Response(
JSON.stringify({
success: false,
error: "Invalid Stripe signature.",
}),
{
headers: { "Content-Type": "application/json" },
status: 400,
}
);
}

console.log(`Stripe event received: ${event.id} (${event.type})`);

// Existing Stripe webhook: handle Goodies payments before money-request events.
if (event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.payment_failed" ||
    event.type === "payment_intent.canceled") {
  const pi = event.data.object as Stripe.PaymentIntent;
  const state = event.type === "payment_intent.succeeded" ? "succeeded"
    : event.type === "payment_intent.canceled" ? "cancelled" : "failed";
  if (await reconcileGoodiesPaymentIntent(pi, state)) {
    return new Response(JSON.stringify({success:true,goodies:true,state}), {headers:{"Content-Type":"application/json"},status:200});
  }
}
if (event.type === "charge.refunded") {
  const charge = event.data.object as Stripe.Charge;
  if (charge.amount_refunded >= charge.amount) {
    const pi = await paymentIntentFromCharge(charge);
    if (pi && await reconcileGoodiesPaymentIntent(pi, "refunded")) {
      return new Response(JSON.stringify({success:true,goodies:true,state:"refunded"}), {headers:{"Content-Type":"application/json"},status:200});
    }
  }
}
if (event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") {
  const dispute = event.data.object as Stripe.Dispute;
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
  const charge = await stripe.charges.retrieve(chargeId);
  const pi = await paymentIntentFromCharge(charge);
  const state = event.type === "charge.dispute.created" ? "disputed"
    : dispute.status === "won" ? "dispute_won" : "dispute_lost";
  if (pi && await reconcileGoodiesPaymentIntent(pi, state)) {
    return new Response(JSON.stringify({success:true,goodies:true,state}), {headers:{"Content-Type":"application/json"},status:200});
  }
}


// ==========================================================
// EXISTING MONEY REQUEST PAYMENT FLOW
// ==========================================================

if (event.type === "payment_intent.succeeded") {
const paymentIntent =
event.data.object as Stripe.PaymentIntent;

const moneyRequestId =
paymentIntent.metadata?.money_request_id;

if (!moneyRequestId) {
return new Response(
JSON.stringify({
success: true,
ignored: true,
reason: "No money_request_id metadata.",
}),
{
headers: { "Content-Type": "application/json" },
status: 200,
}
);
}

// The payment row was saved with no PaymentIntent ID
// because Stripe creates it only after checkout is confirmed.
// Find the Checkout Session for this PaymentIntent.
const sessions = await stripe.checkout.sessions.list({
payment_intent: paymentIntent.id,
limit: 1,
});

const sessionId = sessions.data[0]?.id;

if (!sessionId) {
throw new Error(
"Checkout session not found for Stripe PaymentIntent."
);
}

const { data: walletPayment, error: paymentError } =
await supabase
.from("wallet_payments")
.select("id, status, money_request_id")
.eq("money_request_id", moneyRequestId)
.eq(
"metadata->>stripe_checkout_session_id",
sessionId
)
.maybeSingle();

if (paymentError) {
throw paymentError;
}

if (!walletPayment) {
throw new Error(
"Wallet payment not found for Stripe checkout session."
);
}

const verifiedPaymentIntent =
await stripe.paymentIntents.retrieve(
paymentIntent.id
);

if (verifiedPaymentIntent.status !== "succeeded") {
throw new Error(
"Stripe PaymentIntent is not succeeded."
);
}

// Save the PaymentIntent ID on the row before settling.
const { error: updateError } = await supabase
.from("wallet_payments")
.update({
stripe_payment_intent_id:
verifiedPaymentIntent.id,
})
.eq("id", walletPayment.id);

if (updateError) {
throw updateError;
}

const {
data: settled,
error: settlementError,
} = await supabase.rpc(
"settle_card_money_request",
{
p_wallet_payment_id: walletPayment.id,
p_stripe_payment_intent_id:
verifiedPaymentIntent.id,
}
);

if (settlementError) {
throw settlementError;
}

return new Response(
JSON.stringify({
success: true,
settled: settled === true,
money_request_id: moneyRequestId,
payment_intent_id:
verifiedPaymentIntent.id,
}),
{
headers: { "Content-Type": "application/json" },
status: 200,
}
);
}

// ==========================================================
// SAVED CARD FLOW
// ==========================================================

if (event.type === "setup_intent.succeeded") {
const setupIntent =
event.data.object as Stripe.SetupIntent;

// --------------------------------------------------------
// Verify this SetupIntent belongs to Wantiss card saving
// --------------------------------------------------------

const wantissPurpose =
setupIntent.metadata?.wantiss_purpose;

const userId =
setupIntent.metadata?.wantiss_user_id;

if (
wantissPurpose !== "save_card" ||
!userId
) {
return new Response(
JSON.stringify({
success: true,
ignored: true,
reason:
"SetupIntent is not a Wantiss save-card operation.",
}),
{
headers: { "Content-Type": "application/json" },
status: 200,
}
);
}

// --------------------------------------------------------
// Verify Stripe Customer
// --------------------------------------------------------

const stripeCustomerId =
typeof setupIntent.customer === "string"
? setupIntent.customer
: setupIntent.customer?.id;

if (!stripeCustomerId) {
throw new Error(
"SetupIntent has no Stripe Customer."
);
}

const { data: stripeCustomerRecord, error: customerError } =
await supabase
.from("stripe_customers")
.select("user_id, stripe_customer_id")
.eq("user_id", userId)
.eq("stripe_customer_id", stripeCustomerId)
.maybeSingle();

if (customerError) {
throw customerError;
}

if (!stripeCustomerRecord) {
throw new Error(
"Stripe Customer does not belong to the Wantiss user."
);
}

// --------------------------------------------------------
// Get PaymentMethod from SetupIntent
// --------------------------------------------------------

const paymentMethodId =
typeof setupIntent.payment_method === "string"
? setupIntent.payment_method
: setupIntent.payment_method?.id;

if (!paymentMethodId) {
throw new Error(
"SetupIntent has no PaymentMethod."
);
}

const paymentMethod =
await stripe.paymentMethods.retrieve(
paymentMethodId
);

// --------------------------------------------------------
// Only cards are allowed by this flow
// --------------------------------------------------------

if (paymentMethod.type !== "card") {
throw new Error(
"SetupIntent returned a non-card PaymentMethod."
);
}

if (!paymentMethod.card) {
throw new Error(
"Stripe PaymentMethod does not contain card details."
);
}

// --------------------------------------------------------
// Verify the PaymentMethod belongs to this Customer
// --------------------------------------------------------

const paymentMethodCustomer =
typeof paymentMethod.customer === "string"
? paymentMethod.customer
: paymentMethod.customer?.id;

if (
paymentMethodCustomer !== stripeCustomerId
) {
throw new Error(
"PaymentMethod does not belong to the expected Stripe Customer."
);
}

// --------------------------------------------------------
// Idempotency check
// --------------------------------------------------------

const { data: existingPaymentMethod, error: existingError } =
await supabase
.from("user_payment_methods")
.select("id")
.eq(
"stripe_payment_method_id",
paymentMethod.id
)
.maybeSingle();

if (existingError) {
throw existingError;
}

if (existingPaymentMethod) {
console.log(
`PaymentMethod ${paymentMethod.id} already exists.`
);

return new Response(
JSON.stringify({
success: true,
saved: true,
already_exists: true,
payment_method_id: paymentMethod.id,
}),
{
headers: { "Content-Type": "application/json" },
status: 200,
}
);
}

// --------------------------------------------------------
// Save safe card metadata only
// NEVER store PAN or CVV
// --------------------------------------------------------

const { data: savedPaymentMethod, error: insertError } =
await supabase
.from("user_payment_methods")
.insert({
user_id: userId,
stripe_customer_id: stripeCustomerId,
stripe_payment_method_id: paymentMethod.id,
type: "card",
brand: paymentMethod.card.brand,
last4: paymentMethod.card.last4,
expiry_month: paymentMethod.card.exp_month,
expiry_year: paymentMethod.card.exp_year,
})
.select(
"id, type, brand, last4, expiry_month, expiry_year, is_default"
)
.single();

if (insertError) {
// A duplicate webhook delivery may race with another
// successful delivery. Treat the unique PaymentMethod
// constraint as an idempotent success.
if (insertError.code === "23505") {
console.log(
`PaymentMethod ${paymentMethod.id} was already saved.`
);

return new Response(
JSON.stringify({
success: true,
saved: true,
already_exists: true,
payment_method_id: paymentMethod.id,
}),
{
headers: {
"Content-Type": "application/json",
},
status: 200,
}
);
}

throw insertError;
}

console.log(
`Saved card ${paymentMethod.card.brand} ****${paymentMethod.card.last4} for user ${userId}.`
);

return new Response(
JSON.stringify({
success: true,
saved: true,
already_exists: false,
payment_method: savedPaymentMethod,
}),
{
headers: { "Content-Type": "application/json" },
status: 200,
}
);
}

// ==========================================================
// ALL OTHER STRIPE EVENTS
// ==========================================================

return new Response(
JSON.stringify({
success: true,
ignored: true,
event_type: event.type,
}),
{
headers: { "Content-Type": "application/json" },
status: 200,
}
);
} catch (error) {
console.error(
"Stripe webhook error:",
error
);

return new Response(
JSON.stringify({
success: false,
error:
error instanceof Error
? error.message
: String(error),
}),
{
headers: { "Content-Type": "application/json" },
status: 500,
}
);
}
});