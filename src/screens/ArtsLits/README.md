# Arts & Lits — approved V8 homepage reference

Status: integration branch only; the exact HTML asset must be uploaded before visual review or merge.

Replace `homepage-v8.html` with the approved offline V8 file (byte-for-byte).
Expected size: 2,287,291 bytes.
Expected SHA-256: b4a0f5e1b70aac4cf77cc04a1538f67eadc61018b9bcebfad3a89d8e7ecaed99.

The app embeds the local HTML using the already-installed WebView, with a sandboxed iframe on web. The only runtime modification is a navigation/theme bridge; no visual changes to the source. The header Back button returns to Wantiss. Native safe areas are owned by the wrapper and existing Android navigation container. The web iframe intentionally isolates storage. The sample content and developer preview states remain non-production, and no payment or backend is connected.

Before merging: replace the missing-reference sentinel, run the checksum check, typecheck/build and compare native screenshots at representative phone sizes. Do not deploy the sample catalog as real inventory. Museum, library, marketplace, CMS and vendor/admin integration follow in separate stages.
