# Goodies screen verification — 2026-11-13

There are 34 internal route names, including the Wantiss entry alias and the gated Help Pay recovery route. The host Wallet contribution surface is additionally registered as platform content and remains gated. Platform copy belongs to CMS; store/product information remains vendor-owned, addresses remain customer-owned, and financial configuration remains under server authorization.

PASS below means local source/content coverage and preview rendering only. No row is a hosted button-by-button or physical-device acceptance pass.

| Route | Existing page group | Local preview | Hosted actions / cross-role results |
|---|---|---|---|
| `wantiss` | Home | PASS | NOT VERIFIED |
| `home` | Home | PASS | NOT VERIFIED |
| `cats` | Categories | PASS | NOT VERIFIED |
| `orders` | Order history | PASS | NOT VERIFIED |
| `cart` | Cart | PASS | NOT VERIFIED |
| `grouporder` | Group orders | PASS | NOT VERIFIED |
| `explore` | Explore | PASS | NOT VERIFIED |
| `search` | Search | PASS | NOT VERIFIED |
| `catlist` | Category / store results | PASS | NOT VERIFIED |
| `store` | Store | PASS | NOT VERIFIED |
| `reviews` | Store reviews | PASS | NOT VERIFIED |
| `product` | Product | PASS | NOT VERIFIED |
| `checkout` | Checkout | PASS | NOT VERIFIED |
| `help-pay` | Shared Bill requests | PASS | NOT VERIFIED |
| `addcard` | Add card | PASS | NOT VERIFIED |
| `cardauth` | Card verification | PASS | NOT VERIFIED |
| `confirm` | Order confirmation | PASS | NOT VERIFIED |
| `track` | Order tracking | PASS | NOT VERIFIED |
| `notifs` | Notifications | PASS | NOT VERIFIED |
| `promos` | Promotions | PASS | NOT VERIFIED |
| `flashdeals` | Flash deals | PASS | NOT VERIFIED |
| `favs` | Favorites | PASS | NOT VERIFIED |
| `byo` | Build Your Own | PASS | NOT VERIFIED |
| `help` | Help / FAQs | PASS | NOT VERIFIED |
| `settings` | Settings | PASS | NOT VERIFIED |
| `profile` | Profile | PASS | NOT VERIFIED |
| `addresses` | Addresses | PASS | NOT VERIFIED |
| `payments` | Payment methods | PASS | NOT VERIFIED |
| `contact` | Contact support | PASS | NOT VERIFIED |
| `storechat` | Store conversation | PASS | NOT VERIFIED |
| `supdone` | Support confirmation | PASS | NOT VERIFIED |
| `policies` | Policies | PASS | NOT VERIFIED |
| `policy` | Policy document | PASS | NOT VERIFIED |
| `ndetail` | Notification detail | PASS | NOT VERIFIED |

## Operational surfaces

| Surface | Implemented checks | Hosted acceptance |
|---|---|---|
| Vendor product/store management | Save contract, real storefront, rejection preservation, safe errors | NOT VERIFIED |
| Vendor fulfillment and settlement | State handlers, paging, balances and payout contracts; synthetic SQL | NOT VERIFIED |
| Admin moderation and operations | Rejection reason, permissions, fees, private proofs and paging | NOT VERIFIED |
| Admin content/builders/assets | Source catalog, isolated preview, edit/publish permission contracts | NOT VERIFIED |
| Courier | Assignment order access, private proof permissions, GPS freshness and location recovery logic | NOT VERIFIED on physical devices |
| Shared Bill contribution | New requests/debits gated; existing status/cancellation retained; no funding acceptance claimed | Excluded from customer funding release |

[source-inventory.json](source-inventory.json) records every discovered control and its static call/navigation trace. Its unresolved callbacks and runtime statuses are preserved; a handler being present is not a runtime PASS.
