# Goodies screen and state audit

Audit date: 2026-11-06. Source review and isolated reproductions; no authenticated button-by-button hosted/device session was available. Every runtime row remains NOT VERIFIED unless a named reproduction demonstrates a specific FAIL. Handler/state-token presence is not proof that every branch works. Purely local/static pages do not require artificial skeletons.

## Consumer routes

| Route | Screen | State/connection assessment | Runtime |
|---|---|---|---|
| `wantiss` | Wantiss entry | Entry/navigation source inventoried; authenticated runtime not exercised. | NOT VERIFIED |
| `home` | Home | CMS skeleton exists; catalog loading/failure feedback incomplete (S01). | NOT VERIFIED |
| `cats` | Categories | Local/CMS catalog controls traced; remote catalog failure S01. | NOT VERIFIED |
| `orders` | Order history | History load and actions traced; missing historical store crash A08; history capped S04. | NOT VERIFIED |
| `cart` | Cart | Quantity/remove/checkout controls traced; real concurrency/provider flow not verified. | NOT VERIFIED |
| `grouporder` | Group orders | Group RPC calls traced; hosted participant/host authorization not exercised. | NOT VERIFIED |
| `explore` | Explore | Catalog-based; catalog error S01. | NOT VERIFIED |
| `search` | Search | Search/filter controls traced; catalog error S01. | NOT VERIFIED |
| `catlist` | Category / store results | Catalog lists; no-op banner S06. | NOT VERIFIED |
| `store` | Store | Navigation/items/hours traced; missing store crash A07. | NOT VERIFIED |
| `reviews` | Store reviews | Seeded historical reviews A06; local-only review writes A04. | NOT VERIFIED |
| `product` | Product | Options/quantity/cart paths traced; authoritative rules have targeted tests, hosted end-to-end not verified. | NOT VERIFIED |
| `checkout` | Checkout | Server estimate/order paths traced; busy feedback incomplete; no real charge attempted. | NOT VERIFIED |
| `addcard` | Add card | Setup and save paths traced; WebView network recovery gap S05. | NOT VERIFIED |
| `cardauth` | Card verification | Bank WebView; network recovery gap S05; real provider challenge not verified. | NOT VERIFIED |
| `confirm` | Order confirmation | Order navigation traced; host/device not exercised. | NOT VERIFIED |
| `track` | Order tracking | Receipt error leak A02; pickup map A09; real GPS/background/reassignment not device verified. | NOT VERIFIED |
| `notifs` | Notifications | Server list/read paths traced; delivery/deep-link runtime not verified. | NOT VERIFIED |
| `promos` | Promotions | CMS/coupon display traced; live merchant-promotion-to-checkout bridge not established. | NOT VERIFIED |
| `flashdeals` | Flash deals | Catalog/promo filtering traced; catalog failure S01. | NOT VERIFIED |
| `favs` | Favorites | Local persistence/catalog references traced; account/device lifecycle not runtime verified. | NOT VERIFIED |
| `byo` | Build Your Own | Options/pricing controls traced; placeholder builders A17. | NOT VERIFIED |
| `help` | Help / FAQs | Published FAQ placeholders C01. | NOT VERIFIED |
| `settings` | Settings | Local switches/language controls traced; notification preferences A12. | NOT VERIFIED |
| `profile` | Profile | Shared account actions traced; authenticated writes not exercised. | NOT VERIFIED |
| `addresses` | Addresses | Shared address reads/writes traced; hosted access boundaries not exercised. | NOT VERIFIED |
| `payments` | Payment methods | Card/wallet controls traced; top-up unavailable S06; external payment not verified. | NOT VERIFIED |
| `contact` | Contact support | Real support insert traced; subsequent misleading confirmation A05. | NOT VERIFIED |
| `storechat` | Store conversation | Conversation/read/send calls traced; realtime/reopened delivery not exercised. | NOT VERIFIED |
| `supdone` | Support confirmation | False demo/disconnected statement A05. | NOT VERIFIED |
| `policies` | Policies | Published policy collection empty C01; unavailable state is honest but release content incomplete. | NOT VERIFIED |
| `policy` | Policy document | Policy detail lookup/fallback traced; no live policy C01. | NOT VERIFIED |
| `ndetail` | Notification detail | Detail/navigation source traced; authenticated deep-link runtime not exercised. | NOT VERIFIED |

## All source surfaces and state evidence

Includes sheets, shared vendor entry/account/financial screens, courier and admin CMS preview. Preview bindings are not live customer controls. The JSON inventory preserves individual function ownership, handler traces, API/navigation calls, dynamic unresolved calls, and loading/error/empty-state source evidence. A token match is evidence for inspection, not a passing UI assertion.

| Repository / file | Role | Lines | Event bindings | Comments | State evidence |
|---|---|---:|---:|---:|---|
| tiss_tiss_beta/`src/features/Goodies/GoodiesApp.tsx` | consumer | 256 | 14 | 8 | [{'property': 'refreshing', 'value': '{refreshing}', 'line': 184, 'owner': 'GoodiesApp'}] |
| tiss_tiss_beta/`src/features/Goodies/GoodiesCourierScreen.tsx` | courier | 242 | 7 | 0 | [{'property': 'disabled', 'value': '{!!busy // !!activeOrderId}', 'line': 219, 'owner': 'GoodiesCourierScreen'}, {'property': 'disabled', 'value': '{!!busy//!available//!!activeOrderId}', 'line': 222, 'owner': 'GoodiesCourierScreen'}, {'property': 'disabled', 'value': '{!!busy}', 'line': 235, 'owner': 'GoodiesCourierScreen'}, {'property': 'disabled', 'value': '{!!busy}', 'line': 235, 'owner': 'GoodiesCourierScreen'}, {'property': 'disabled', 'value': '{!!busy}', 'line': 236, 'owner': 'GoodiesCou |
| tiss_tiss_beta/`src/features/Goodies/accountCache.ts` | consumer | 10 | 0 | 2 | [] |
| tiss_tiss_beta/`src/features/Goodies/actions.ts` | consumer | 631 | 0 | 19 | [] |
| tiss_tiss_beta/`src/features/Goodies/builders/Builder.tsx` | consumer | 310 | 18 | 3 | [{'property': 'disabled', 'value': '{!BD.hist.length}', 'line': 170, 'owner': 'Stage'}, {'property': 'disabled', 'value': '{!it.avail}', 'line': 189, 'owner': 'OptTile'}, {'property': 'disabled', 'value': '{!sz.avail}', 'line': 207, 'owner': 'Options'}, {'property': 'disabled', 'value': '{!ck.ok // !!BD.busy}', 'line': 246, 'owner': 'ByoFoot'}] |
| tiss_tiss_beta/`src/features/Goodies/builders/engine.tsx` | consumer | 280 | 1 | 9 | [{'property': 'disabled', 'value': '{!ok}', 'line': 266, 'owner': 'ByoRow'}] |
| tiss_tiss_beta/`src/features/Goodies/builders/pizzaArt.ts` | consumer | 51 | 0 | 1 | [] |
| tiss_tiss_beta/`src/features/Goodies/builders/templates.ts` | consumer | 731 | 0 | 1 | [] |
| tiss_tiss_beta/`src/features/Goodies/components/Icon.tsx` | consumer | 20 | 0 | 1 | [] |
| tiss_tiss_beta/`src/features/Goodies/components/Overlays.tsx` | consumer | 66 | 4 | 1 | [] |
| tiss_tiss_beta/`src/features/Goodies/components/Sheets.tsx` | consumer | 738 | 78 | 6 | [{'property': 'disabled', 'value': '{!selected}', 'line': 194, 'owner': 'ScheduleSheet'}, {'property': 'disabled', 'value': '{groupBusy}', 'line': 480, 'owner': 'GroupOrderSheet'}, {'property': 'disabled', 'value': '{groupBusy}', 'line': 487, 'owner': 'GroupOrderSheet'}, {'property': 'disabled', 'value': '{groupBusy}', 'line': 493, 'owner': 'GroupOrderSheet'}, {'property': 'disabled', 'value': '{groupBusy}', 'line': 500, 'owner': 'GroupOrderSheet'}, {'property': 'disabled', 'value': '{blocked}', |
| tiss_tiss_beta/`src/features/Goodies/components/cards.tsx` | consumer | 140 | 11 | 1 | [{'property': 'disabled', 'value': '{!!dis}', 'line': 46, 'owner': 'Dish'}, {'property': 'disabled', 'value': '{!!dis}', 'line': 134, 'owner': 'ItemRow'}] |
| tiss_tiss_beta/`src/features/Goodies/components/ui.tsx` | consumer | 199 | 16 | 3 | [{'property': 'disabled', 'value': '{disabled}', 'line': 88, 'owner': 'Cta'}] |
| tiss_tiss_beta/`src/features/Goodies/content.ts` | consumer | 132 | 0 | 12 | [] |
| tiss_tiss_beta/`src/features/Goodies/data/promoText.ts` | consumer | 7 | 0 | 1 | [] |
| tiss_tiss_beta/`src/features/Goodies/data/seed.ts` | consumer | 525 | 0 | 3 | [] |
| tiss_tiss_beta/`src/features/Goodies/data/types.ts` | consumer | 21 | 0 | 1 | [] |
| tiss_tiss_beta/`src/features/Goodies/deliveryTracking.ts` | consumer | 51 | 0 | 3 | [] |
| tiss_tiss_beta/`src/features/Goodies/friendlyError.ts` | consumer | 22 | 0 | 4 | [] |
| tiss_tiss_beta/`src/features/Goodies/goodiesCourierBackgroundLocation.ts` | courier | 52 | 0 | 0 | [] |
| tiss_tiss_beta/`src/features/Goodies/i18n/dict.ts` | consumer | 666 | 0 | 1 | [] |
| tiss_tiss_beta/`src/features/Goodies/i18n/index.ts` | consumer | 58 | 0 | 6 | [] |
| tiss_tiss_beta/`src/features/Goodies/i18n/interfaceContent.ts` | consumer | 11 | 0 | 1 | [] |
| tiss_tiss_beta/`src/features/Goodies/i18n/resolveText.ts` | consumer | 11 | 0 | 1 | [] |
| tiss_tiss_beta/`src/features/Goodies/notifications.ts` | consumer | 15 | 0 | 1 | [] |
| tiss_tiss_beta/`src/features/Goodies/providers/index.ts` | consumer | 7 | 0 | 0 | [] |
| tiss_tiss_beta/`src/features/Goodies/screens/Account.tsx` | consumer | 364 | 56 | 4 | [{'property': 'disabled', 'value': '{busy}', 'line': 183, 'owner': 'Addresses'}, {'property': 'disabled', 'value': '{busy}', 'line': 185, 'owner': 'Addresses'}, {'property': 'disabled', 'value': '{locating}', 'line': 193, 'owner': 'Addresses'}, {'property': 'disabled', 'value': '{busy}', 'line': 200, 'owner': 'Addresses'}, {'property': 'disabled', 'value': '{!draft.trim() // !conversationId // sending}', 'line': 275, 'owner': 'StoreChat'}, {'property': 'disabled', 'value': '{sending}', 'line': 3 |
| tiss_tiss_beta/`src/features/Goodies/screens/Browse.tsx` | consumer | 542 | 57 | 2 | [{'property': 'onError', 'value': '{() => {\n      if (!retried) {\n        setRetried(true);\n        void loadContent().finally(() => setReloadKey(value => value + 1));\n      } else { setFailed(true); onFail?.(); }\n    }}', 'line': 27, 'owner': 'CachedContentImage'}] |
| tiss_tiss_beta/`src/features/Goodies/screens/CardAuthentication.tsx` | consumer | 54 | 5 | 0 | [{'property': 'disabled', 'value': '{busy}', 'line': 50, 'owner': 'CardAuthentication'}] |
| tiss_tiss_beta/`src/features/Goodies/screens/Payments.tsx` | consumer | 194 | 13 | 8 | [{'property': 'disabled', 'value': '{creating}', 'line': 159, 'owner': 'LivePayments'}, {'property': 'disabled', 'value': '{!!busyId}', 'line': 173, 'owner': 'LivePayments'}, {'property': 'disabled', 'value': '{!!busyId}', 'line': 177, 'owner': 'LivePayments'}, {'property': 'disabled', 'value': '{!!busyId}', 'line': 178, 'owner': 'LivePayments'}] |
| tiss_tiss_beta/`src/features/Goodies/screens/Shop.tsx` | consumer | 639 | 100 | 0 | [{'property': 'disabled', 'value': '{!!blocked}', 'line': 155, 'owner': 'ProductFoot'}, {'property': 'disabled', 'value': '{short}', 'line': 228, 'owner': 'Cart'}, {'property': 'disabled', 'value': '{(S.cs === 3 && hasAlcohol() && !S.alcConsent) // insufficientWallet}', 'line': 358, 'owner': 'CheckoutFoot'}, {'property': 'disabled', 'value': '{receiptBusy}', 'line': 508, 'owner': 'Track'}, {'property': 'disabled', 'value': '{receiptBusy // reportText.trim().length < 3}', 'line': 511, 'owner': 'T |
| tiss_tiss_beta/`src/features/Goodies/serverSync.ts` | consumer | 280 | 0 | 0 | [] |
| tiss_tiss_beta/`src/features/Goodies/store.ts` | consumer | 711 | 0 | 31 | [] |
| tiss_tiss_beta/`src/features/Goodies/theme.ts` | consumer | 24 | 0 | 2 | [] |
| tiss_tiss_beta/`src/screens/Goodies/goodiesHomeScreen.tsx` | consumer | 12 | 1 | 1 | [] |
| tiss_tiss_beta/`src/screens/businessSpace/BusinessSpaceGoodies.tsx` | vendor | 835 | 120 | 4 | [{'property': 'busy', 'value': '{coverBusy}', 'line': 380, 'owner': 'GoodiesStorePage'}, {'property': 'busy', 'value': '{thumbnailBusy}', 'line': 384, 'owner': 'GoodiesStorePage'}, {'property': 'busy', 'value': '{locationBusy}', 'line': 399, 'owner': 'GoodiesStorePage'}, {'property': 'disabled', 'value': '{locationBusy // locationSaving}', 'line': 399, 'owner': 'GoodiesStorePage'}, {'property': 'busy', 'value': '{locationSaving}', 'line': 404, 'owner': 'GoodiesStorePage'}, {'property': 'disabled |
| tiss_tiss_beta/`src/screens/businessSpace/BusinessSpaceGoodiesOrders.tsx` | vendor | 351 | 24 | 0 | [{'property': 'refreshing', 'value': '{orders.l}', 'line': 220, 'owner': 'GoodiesOrdersPage'}, {'property': 'busy', 'value': '{cashBusy}', 'line': 225, 'owner': 'GoodiesOrdersPage'}, {'property': 'disabled', 'value': '{!storeId // cashBusy}', 'line': 225, 'owner': 'GoodiesOrdersPage'}, {'property': 'disabled', 'value': '{!!busyId}', 'line': 286, 'owner': 'GoodiesOrdersPage'}, {'property': 'disabled', 'value': '{!!busyId // !!ownBusy}', 'line': 289, 'owner': 'GoodiesOrdersPage'}, {'property': 'bu |
| tiss_tiss_beta/`src/screens/businessSpace/BusinessSpaceShared.tsx` | vendor | 1097 | 68 | 10 | [{'property': 'disabled', 'value': '{disabled // busy}', 'line': 444, 'owner': 'Btn'}, {'property': 'refreshing', 'value': '{!!refreshing}', 'line': 511, 'owner': 'Pg'}, {'property': 'disabled', 'value': '{past}', 'line': 643, 'owner': 'BlockCalendar'}, {'property': 'disabled', 'value': '{busy}', 'line': 855, 'owner': 'ListingWizard'}, {'property': 'disabled', 'value': '{busy // step === 0}', 'line': 892, 'owner': 'ListingWizard'}, {'property': 'busy', 'value': '{busy}', 'line': 893, 'owner': 'L |
| tiss_tiss_beta/`src/screens/businessSpace/BusinessSpaceScreen.tsx` | vendor | 254 | 12 | 1 | [] |
| tiss_tiss_beta/`src/screens/businessSpace/BusinessSpaceCommunicationScreens.tsx` | vendor | 176 | 19 | 1 | [{'property': 'refreshing', 'value': '{c.l && !!c.d}', 'line': 36, 'owner': 'MessagesPage'}, {'property': 'busy', 'value': '{sending}', 'line': 77, 'owner': 'ConversationPage'}, {'property': 'disabled', 'value': '{!text.trim() // !c}', 'line': 77, 'owner': 'ConversationPage'}, {'property': 'refreshing', 'value': '{n.l && !!n.d}', 'line': 113, 'owner': 'NotificationsPage'}] |
| tiss_tiss_beta/`src/screens/businessSpace/BusinessSpaceAccountScreens.tsx` | vendor | 298 | 45 | 4 | [{'property': 'refreshing', 'value': '{p.l && !!p.d}', 'line': 27, 'owner': 'PromotionsPage'}, {'property': 'disabled', 'value': '{a.busy}', 'line': 30, 'owner': 'PromotionsPage'}, {'property': 'refreshing', 'value': '{(r.l && !!r.d) // (applicationDocs.l && !!applicationDocs.d)}', 'line': 116, 'owner': 'RegistrationPage'}, {'property': 'busy', 'value': '{a.busy}', 'line': 122, 'owner': 'RegistrationPage'}, {'property': 'busy', 'value': '{a.busy}', 'line': 132, 'owner': 'RegistrationPage'}, {'pr |
| tiss_tiss_beta/`src/screens/businessSpace/BusinessSpaceActivityScreens.tsx` | vendor | 135 | 11 | 2 | [{'property': 'refreshing', 'value': '{a.l && !!a.d}', 'line': 24, 'owner': 'ActionsPage'}, {'property': 'refreshing', 'value': '{load && rows.length > 0}', 'line': 43, 'owner': 'ActivityPage'}, {'property': 'busy', 'value': '{load}', 'line': 49, 'owner': 'ActivityPage'}, {'property': 'refreshing', 'value': '{sum.l && !!d}', 'line': 86, 'owner': 'ChartsPage'}] |
| tiss_tiss_beta/`src/screens/businessSpace/BusinessSpaceMarketplaceScreens.tsx` | vendor | 160 | 23 | 0 | [{'property': 'disabled', 'value': "{!on && app.biz.verification === 'restricted'}", 'line': 28, 'owner': 'FeaturePage'}, {'property': 'busy', 'value': '{a.busy}', 'line': 28, 'owner': 'FeaturePage'}, {'property': 'refreshing', 'value': '{(orders.l // lst.l) && !!orders.d}', 'line': 35, 'owner': 'FeaturePage'}, {'property': 'disabled', 'value': '{restricted}', 'line': 40, 'owner': 'FeaturePage'}, {'property': 'busy', 'value': '{a.busy}', 'line': 40, 'owner': 'FeaturePage'}, {'property': 'disable |
| tiss_tiss_beta/`src/screens/businessSpace/BusinessSpaceHomeScreen.tsx` | vendor | 118 | 11 | 0 | [{'property': 'refreshing', 'value': '{refreshing}', 'line': 46, 'owner': 'Home'}] |
| tiss_tiss_beta/`src/screens/businessSpace/BusinessSpaceSheets.tsx` | vendor | 232 | 52 | 0 | [{'property': 'disabled', 'value': '{name.trim().length < 2}', 'line': 63, 'owner': 'AddBusinessSheet'}, {'property': 'busy', 'value': '{a.busy}', 'line': 63, 'owner': 'AddBusinessSheet'}, {'property': 'disabled', 'value': '{txt.trim() !== b.name}', 'line': 82, 'owner': 'DeleteBusinessSheet'}, {'property': 'busy', 'value': '{a.busy}', 'line': 82, 'owner': 'DeleteBusinessSheet'}, {'property': 'busy', 'value': '{a.busy}', 'line': 122, 'owner': 'StockSheet'}, {'property': 'disabled', 'value': '{cur |
| tiss_tiss_beta/`src/screens/businessSpace/goodiesLibrarySeed.ts` | vendor | 410 | 0 | 1 | [] |
| tiss_tiss_beta/`src/screens/businessSpace/goodiesTemplates.ts` | vendor | 731 | 0 | 1 | [] |
| tiss_tiss_beta/`src/screens/Wallet/WalletAddNewCardScreen.tsx` | shared-card | 588 | 16 | 4 | [{'property': 'disabled', 'value': '{processing}', 'line': 523, 'owner': 'AddCardScreen'}, {'property': 'disabled', 'value': '{!success}', 'line': 546, 'owner': 'AddCardScreen'}] |
| tiss_tiss_beta/`src/services/goodiesDeliveryProof.ts` | consumer | 14 | 0 | 1 | [] |
| tiss-admin/`src/features/admin/screens/goodies/GoodiesAdminScreen.tsx` | admin | 282 | 20 | 0 | [{'property': 'disabled', 'value': '{busy===m.business_id}', 'line': 194, 'owner': 'GoodiesAdminScreen'}, {'property': 'disabled', 'value': '{!!busy}', 'line': 203, 'owner': 'GoodiesAdminScreen'}, {'property': 'disabled', 'value': '{!!busy}', 'line': 203, 'owner': 'GoodiesAdminScreen'}, {'property': 'disabled', 'value': '{busy===o.id}', 'line': 213, 'owner': 'GoodiesAdminScreen'}, {'property': 'disabled', 'value': '{!!busy}', 'line': 229, 'owner': 'GoodiesAdminScreen'}, {'property': 'disabled',  |
| tiss-admin/`src/features/admin/screens/goodies/GoodiesAssetLibrary.tsx` | admin | 143 | 2 | 2 | [{'property': 'disabled', 'value': '{loading}', 'line': 112, 'owner': 'GoodiesAssetLibrary'}] |
| tiss-admin/`src/features/admin/screens/goodies/modules.ts` | admin | 2 | 0 | 0 | [] |
| tiss-admin/`src/features/admin/screens/content/GoodiesBuilderConfigEditor.tsx` | admin | 193 | 10 | 2 | [{'property': 'disabled', 'value': '{!canEdit // saving}', 'line': 153, 'owner': 'GoodiesBuilderConfigEditor'}, {'property': 'disabled', 'value': '{!canEdit // saving}', 'line': 154, 'owner': 'GoodiesBuilderConfigEditor'}, {'property': 'disabled', 'value': '{!canEdit // !!busy}', 'line': 165, 'owner': 'GoodiesBuilderConfigEditor'}, {'property': 'disabled', 'value': '{!canEdit // !!busy}', 'line': 166, 'owner': 'GoodiesBuilderConfigEditor'}, {'property': 'disabled', 'value': '{!canEdit // !!busy} |
| tiss-admin/`src/features/admin/screens/content/GoodiesConsumerPreview.tsx` | admin | 218 | 5 | 11 | [] |
| tiss-admin/`src/features/admin/screens/content/GoodiesEditor.tsx` | admin | 665 | 51 | 9 | [{'property': 'disabled', 'value': '{!editMode // !!busy // !!assetBusy}', 'line': 262, 'owner': 'toggleLive'}, {'property': 'disabled', 'value': '{!editMode // !!busy // !!assetBusy}', 'line': 403, 'owner': 'promoColorPicker'}, {'property': 'disabled', 'value': '{!editMode // !!busy // !!assetBusy}', 'line': 408, 'owner': 'promoColorPicker'}, {'property': 'disabled', 'value': '{!canEdit}', 'line': 416, 'owner': 'GoodiesEditor'}, {'property': 'disabled', 'value': '{!ready // !canEdit // !dirty / |
| tiss-admin/`src/features/admin/screens/content/GoodiesIngredientRequests.tsx` | admin | 189 | 14 | 1 | [{'property': 'disabled', 'value': '{off}', 'line': 136, 'owner': 'GoodiesIngredientRequests'}, {'property': 'disabled', 'value': "{off // r.status === 'approved'}", 'line': 157, 'owner': 'GoodiesIngredientRequests'}, {'property': 'disabled', 'value': '{off}', 'line': 158, 'owner': 'GoodiesIngredientRequests'}, {'property': 'disabled', 'value': '{off}', 'line': 159, 'owner': 'GoodiesIngredientRequests'}, {'property': 'disabled', 'value': '{off}', 'line': 160, 'owner': 'GoodiesIngredientRequests' |
| tiss-admin/`src/features/admin/screens/content/GoodiesPageContentFields.tsx` | admin | 55 | 8 | 1 | [{'property': 'disabled', 'value': '{disabled // !read(entry[key]).trim()}', 'line': 18, 'owner': 'field'}, {'property': 'disabled', 'value': '{disabled}', 'line': 29, 'owner': 'GoodiesPageContentFields'}, {'property': 'disabled', 'value': '{disabled//index===0}', 'line': 32, 'owner': 'GoodiesPageContentFields'}, {'property': 'disabled', 'value': '{disabled//index===(draft[list.key]//[]).length-1}', 'line': 33, 'owner': 'GoodiesPageContentFields'}, {'property': 'disabled', 'value': '{disabled}', |
| tiss-admin/`src/features/admin/screens/content/builderImages.ts` | admin | 50 | 0 | 3 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/GoodiesApp.tsx` | isolated-admin-preview | 213 | 9 | 5 | [{'property': 'refreshing', 'value': '{refreshing}', 'line': 142, 'owner': 'GoodiesApp'}] |
| tiss-admin/`src/features/admin/goodiesConsumer/actions.ts` | isolated-admin-preview | 302 | 0 | 12 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/builders/Builder.tsx` | isolated-admin-preview | 347 | 20 | 4 | [{'property': 'disabled', 'value': '{!BD.hist.length}', 'line': 182, 'owner': 'Stage'}, {'property': 'disabled', 'value': '{!it.avail}', 'line': 200, 'owner': 'OptTile'}, {'property': 'disabled', 'value': '{!sz.avail}', 'line': 219, 'owner': 'Options'}, {'property': 'disabled', 'value': '{!ck.ok // !!BD.busy}', 'line': 259, 'owner': 'ByoFoot'}] |
| tiss-admin/`src/features/admin/goodiesConsumer/builders/engine.tsx` | isolated-admin-preview | 273 | 1 | 6 | [{'property': 'disabled', 'value': '{!ok}', 'line': 259, 'owner': 'ByoRow'}] |
| tiss-admin/`src/features/admin/goodiesConsumer/builders/pizzaArt.ts` | isolated-admin-preview | 48 | 0 | 1 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/builders/templates.ts` | isolated-admin-preview | 729 | 0 | 1 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/components/Icon.tsx` | isolated-admin-preview | 43 | 0 | 0 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/components/Overlays.tsx` | isolated-admin-preview | 59 | 4 | 0 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/components/Sheets.tsx` | isolated-admin-preview | 357 | 57 | 1 | [{'property': 'disabled', 'value': '{!selected}', 'line': 206, 'owner': 'ScheduleSheet'}] |
| tiss-admin/`src/features/admin/goodiesConsumer/components/cards.tsx` | isolated-admin-preview | 140 | 11 | 0 | [{'property': 'disabled', 'value': '{!!dis}', 'line': 47, 'owner': 'Dish'}, {'property': 'disabled', 'value': '{!!dis}', 'line': 134, 'owner': 'ItemRow'}] |
| tiss-admin/`src/features/admin/goodiesConsumer/components/ui.tsx` | isolated-admin-preview | 207 | 16 | 1 | [{'property': 'disabled', 'value': '{disabled}', 'line': 99, 'owner': 'Cta'}] |
| tiss-admin/`src/features/admin/goodiesConsumer/content.ts` | isolated-admin-preview | 154 | 0 | 12 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/contentEditing.ts` | isolated-admin-preview | 32 | 0 | 1 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/data/defaultPromos.ts` | isolated-admin-preview | 36 | 0 | 0 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/data/promoText.ts` | isolated-admin-preview | 7 | 0 | 1 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/data/seed.ts` | isolated-admin-preview | 70 | 0 | 2 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/data/types.ts` | isolated-admin-preview | 21 | 0 | 1 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/draft.ts` | isolated-admin-preview | 901 | 0 | 10 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/editContext.tsx` | isolated-admin-preview | 72 | 3 | 7 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/i18n/dict.ts` | isolated-admin-preview | 664 | 0 | 1 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/i18n/index.ts` | isolated-admin-preview | 62 | 0 | 6 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/i18n/interfaceContent.ts` | isolated-admin-preview | 11 | 0 | 1 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/i18n/resolveText.ts` | isolated-admin-preview | 11 | 0 | 1 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/providers/index.ts` | isolated-admin-preview | 7 | 0 | 0 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/screens/Account.tsx` | isolated-admin-preview | 285 | 56 | 1 | [{'property': 'disabled', 'value': '{!!edit.def && !!edit.id}', 'line': 118, 'owner': 'Addresses'}, {'property': 'disabled', 'value': '{!draft.trim() // !conversationId // sending}', 'line': 200, 'owner': 'StoreChat'}, {'property': 'disabled', 'value': '{sending}', 'line': 264, 'owner': 'Contact'}] |
| tiss-admin/`src/features/admin/goodiesConsumer/screens/Browse.tsx` | isolated-admin-preview | 510 | 54 | 3 | [{'property': 'onError', 'value': '{() => setFailed(true)}', 'line': 28, 'owner': 'CategoryIcon'}] |
| tiss-admin/`src/features/admin/goodiesConsumer/screens/Payments.tsx` | isolated-admin-preview | 199 | 13 | 7 | [{'property': 'disabled', 'value': '{creating}', 'line': 163, 'owner': 'LivePayments'}, {'property': 'disabled', 'value': '{!!busyId}', 'line': 177, 'owner': 'LivePayments'}, {'property': 'disabled', 'value': '{!!busyId}', 'line': 181, 'owner': 'LivePayments'}, {'property': 'disabled', 'value': '{!!busyId}', 'line': 182, 'owner': 'LivePayments'}, {'property': 'disabled', 'value': '{previewOnly}', 'line': 194, 'owner': 'LivePayments'}] |
| tiss-admin/`src/features/admin/goodiesConsumer/screens/Shop.tsx` | isolated-admin-preview | 457 | 88 | 0 | [{'property': 'disabled', 'value': '{!!blocked}', 'line': 138, 'owner': 'ProductFoot'}, {'property': 'disabled', 'value': '{short}', 'line': 194, 'owner': 'Cart'}, {'property': 'disabled', 'value': '{S.cs === 3 && hasAlcohol() && !S.alcConsent}', 'line': 265, 'owner': 'CheckoutFoot'}] |
| tiss-admin/`src/features/admin/goodiesConsumer/serverSync.ts` | isolated-admin-preview | 241 | 0 | 0 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/store.ts` | isolated-admin-preview | 400 | 0 | 14 | [] |
| tiss-admin/`src/features/admin/goodiesConsumer/theme.ts` | isolated-admin-preview | 24 | 0 | 2 | [] |
| tiss-admin/`src/features/admin/lib/adminBackend.ts` | admin | 312 | 0 | 4 | [] |
| tiss-admin/`src/features/admin/lib/cmsAssetPagination.ts` | admin | 21 | 0 | 1 | [] |
| tiss-admin/`src/features/admin/shell/NotificationsSheet.tsx` | admin | 81 | 3 | 1 | [{'property': 'empty', 'value': '"Nothing here."', 'line': 72, 'owner': 'NotificationsSheet'}] |
| tiss-admin/`src/features/admin/state/access.ts` | admin | 141 | 0 | 11 | [] |
| tiss-admin/`src/features/admin/state/people.ts` | admin | 364 | 0 | 3 | [] |
| tiss-admin/`src/features/admin/overlays/PeopleDrawers.tsx` | admin | 421 | 31 | 2 | [{'property': 'empty', 'value': '"No changes yet."', 'line': 106, 'owner': 'StaffDrawer'}, {'property': 'empty', 'value': '"No individual grants."', 'line': 172, 'owner': 'EditAccessSheet'}, {'property': 'disabled', 'value': '{busy}', 'line': 176, 'owner': 'EditAccessSheet'}, {'property': 'empty', 'value': '"None."', 'line': 383, 'owner': 'AccountDrawer'}, {'property': 'empty', 'value': '"No history yet."', 'line': 395, 'owner': 'AccountDrawer'}] |
| tiss-admin/`src/features/admin/screens/finance/FinanceScreen.tsx` | admin | 134 | 6 | 0 | [] |
| tiss-admin/`src/features/admin/lib/goodiesDeliveryProof.ts` | admin | 14 | 0 | 1 | [] |
