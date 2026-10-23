export interface HelpTopic {
  key: string;
  title: string;
  body: string;
}

export const helpTopics: HelpTopic[] = [
  {
    key: 'campaigns',
    title: 'Campaign basics',
    body: 'A group campaign sets a target and a deadline. If enough people join, it goes ahead. A pre-order is different: the seller accepts orders for a date they set, with no group and no minimum.',
  },
  {
    key: 'preorders',
    title: 'Pre-orders',
    body: 'A pre-order reserves an item for a future date or scheduled time the seller sets. There is no target to reach. If the seller limits quantity, you see how many are claimed.',
  },
  {
    key: 'metrics',
    title: 'Targets and deadlines',
    body: 'Each group campaign picks its own metric: buyers, units or amount raised. Each campaign has its own deadline.',
  },
  {
    key: 'pricing',
    title: 'Pricing and payment',
    body: 'You pay the primary price upfront. On a group campaign, a higher fallback price applies only if the target is missed and you accept it.',
  },
  {
    key: 'fallback',
    title: 'Missed targets and fallback',
    body: 'When a group campaign misses its target you get a limited time to accept the fallback price or decline. Accepting needs a separate payment you authorise.',
  },
  {
    key: 'refunds',
    title: 'Refund status',
    body: 'Requested, processing, completed and failed are different. Requested isn’t refunded.',
  },
  {
    key: 'fulfil',
    title: 'Delivery, pickup, digital and services',
    body: 'Fulfilment depends on the campaign. Details show before you pay.',
  },
  {
    key: 'waitlist',
    title: 'Waitlists',
    body: 'Joining is free and doesn’t reserve anything.',
  },
  {
    key: 'saved',
    title: 'Saved campaigns and alerts',
    body: 'Bookmarks don’t reserve or buy. Alerts follow your preferences.',
  },
];

export const policyTopics: { key: string; label: string }[] = [
  { key: 'terms', label: 'Campaign participation terms' },
  { key: 'pricing', label: 'Pricing and fallback rules' },
  { key: 'refund', label: 'Refund policy' },
  { key: 'waitlist', label: 'Waitlist terms' },
  { key: 'fulfil', label: 'Fulfilment information' },
  { key: 'privacy', label: 'Privacy and notifications' },
];

