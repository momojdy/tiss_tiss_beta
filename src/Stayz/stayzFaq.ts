export interface Faq {
  cat: 'Booking' | 'Payment' | 'Cancellation' | 'Your stay';
  q: string;
  a: string;
}

export const FAQ_CATEGORIES = ['Booking', 'Payment', 'Cancellation', 'Your stay'] as const;

export const FAQS: Faq[] = [
  { cat: 'Booking', q: 'What stay types can I book?', a: 'Hourly (1, 2, 3, 6 or 8 hours), day use, overnight and extended stays. Each property chooses which types it offers.' },
  { cat: 'Booking', q: 'What does Verified business mean?', a: 'The owner submitted property documents and a Wantiss admin approved them.' },
  { cat: 'Booking', q: 'What does Inspected by Stayz mean?', a: 'The property has completed more than 30 successful stays on Stayz.' },
  { cat: 'Booking', q: 'Can I leave a special request?', a: 'Yes, it is optional. The property will do its best but cannot guarantee special requests.' },
  { cat: 'Payment', q: 'Are taxes included in the price?', a: 'Yes. Every price you see includes tax. There are no extra service fees added at checkout.' },
  { cat: 'Payment', q: 'Which payment methods are accepted?', a: 'Wallet, Visa, Mastercard, Discover, JCB, UnionPay, MonCash and NatCash. All bookings are paid online through Stayz.' },
  { cat: 'Payment', q: 'Which currency are prices shown in?', a: 'The currency you choose in Profile: US dollar, Haitian gourde or Dominican peso. Gourde and peso prices use the live exchange rate with a small 0.77% margin.' },
  { cat: 'Payment', q: 'What is the deposit?', a: 'Some properties ask for a deposit. It is collected by the property at check-in and is not part of your online total.' },
  { cat: 'Payment', q: 'My Wallet balance is too low.', a: 'Top up your Wallet or choose another payment method at checkout.' },
  { cat: 'Cancellation', q: 'How does cancellation work?', a: 'Each property sets its own policy, shown before you book and on your booking. Free cancellation applies until the time the property defines.' },
  { cat: 'Cancellation', q: 'When do I get my refund?', a: 'Approved refunds are paid within 14 business days to the method you used.' },
  { cat: 'Cancellation', q: 'What if I do not show up or leave early?', a: 'No-shows are not refunded. Leaving early is up to the property and is not refundable.' },
  { cat: 'Cancellation', q: 'Can I change my dates?', a: 'Send a change request from your booking. The property must approve it and you will see the price difference before you send.' },
  { cat: 'Your stay', q: 'When do I get my door code?', a: 'Your door code appears in your booking 2 hours before check-in.' },
  { cat: 'Your stay', q: 'Can I check in early or check out late?', a: 'Hourly stays have strict start and end times. For other stays, check-in is from the time shown and check-out by the time shown.' },
  { cat: 'Your stay', q: 'Can I extend my stay?', a: 'If the property allows it, you can request an extension during your stay or in the 2 hours before check-in or check-out. The property confirms if available and you pay online.' },
  { cat: 'Your stay', q: 'Who can write a review?', a: 'Only guests who completed a stay. Reviews cannot be edited after they are submitted.' },
];
