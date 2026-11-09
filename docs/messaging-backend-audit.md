# Wantiss Messages backend audit — 2026-11-09

This audit concerns the live Wantiss Supabase project `ycbirmgppwavorwudlrv`.

## Existing assets
- `conversations`: participant_ids, business_id, customer_id, feature, ref_id, unread_business, unread_customer, last_body.
- `messages`: conversation_id, sender_id, body, created_at, read_at.
- `user_friendships`: requester_id, recipient_id, status (pending/accepted/declined/blocked); existing participant-specific RLS.
- `notifications`: independent user_id, read, feature_name, destination, metadata; existing owner-specific RLS.
- Existing Goodies-specific send/read RPCs must remain in use.

## Applied live migration
`messaging_independent_preferences_and_participant_state` created:
- `message_preferences` — independent messaging settings.
- `message_business_preferences` — per-user, per-business promotional mute state.
- `message_participant_state` — per-conversation, per-user read cursor, mute, archive.

All three tables have RLS enabled. Live inspection confirmed respectively 3, 4, and 3 policies. No notification tables, routes, or policies were modified.

## Important limitations
- A single `messages.read_at` is not a group read receipt. Use `message_participant_state.last_read_at` for group unread calculations after fully integrating it.
- Existing conversation UPDATE policies authorize participants broadly; restrict mutable identity/participant fields before enabling group administration.
- Existing friend-request policies should be reviewed for self-request and duplicate-pair constraints.
- Business sending must continue through authorized membership checks, not client-supplied identity.
- Live authenticated multi-user and device tests are still required.
