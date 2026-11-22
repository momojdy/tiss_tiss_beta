# Checkout time selection and carousel entry

The checkout Time step no longer wraps Schedule in a radio card. Closed stores show the existing Delivery/Pick-up and time controls directly; open stores retain ASAP and a plain Schedule action. The scheduled-order minimum explanation and the Wallet debit explanation are removed from the rendered customer interface and generated CMS preview.

Scheduling now selects the first real available instant across the existing seven-day calendar. It retains the five-minute increment and fifteen-minute safety margin, checks every merchant through `canScheduleGoodiesStore`, and respects merchant time zones, opening hours, overnight windows and the merchant's configured minimum clock time. Dates without slots are disabled. No available slot produces a truthful unavailable state and disables closed-store continuation. The checkout picker saves its displayed selection immediately; the separate Cart/modal Apply action is preserved.

Native date limits and JavaScript clamping prevent earlier selections. Android's native time picker does not enforce date bounds in time mode, so the event handler also clamps to actual allowed slots and skips closed gaps. Continue rechecks availability and minimum lead time. Backend order creation and pricing remain authoritative and unchanged.

Carousel entry exposes Home once owned local cache and checkout recovery are restored. Profile, addresses, payment methods, CMS and catalogue refresh continue through their existing services. Private/deep-link entry retains its account-hydration gate. Startup completion preserves navigation made while refreshing. The isolated CMS preview invokes the local-ready callback without calling customer auth, storage, financial or backend operations.

Local verification: **PASS** for 308 customer tests, 73 admin tests and 47 cross-role checks; both TypeScript checks, required lint, direct lint of changed runtime files, CMS source coverage and prepared-content validation. New tests exercise the actual picker and checkout handlers, closed/future days, daylight-saving boundaries, earlier/later native events, missing availability, Wallet copy, local account ownership and background startup navigation. CMS source coverage remains 34 routes with 1,923 fields. [Recorded checks](verification.json).

Only one unavailable-time label was added to the local prepared content packages, in English, French, Spanish and Simplified Chinese. All other content records, fee configuration, policy/FAQ bodies and existing Haitian Creole fields remain unchanged. No content was published.

**NOT VERIFIED:** physical Android/iPhone picker presentation and installed-app refresh. Automated native-event tests and bundle/compilation checks do not certify physical-device behavior. No Wantiss app release, OTA, store submission, production database change or hosted synthetic test was performed.
