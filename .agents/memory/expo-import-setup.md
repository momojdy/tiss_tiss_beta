---
name: Expo import setup
description: Non-obvious Expo CLI behavior when setting up this import in Replit.
---

For a browser-only Replit workflow, run Expo in headless mode rather than
installing desktop debugger dependencies.

**Why:** Expo's standalone React Native debugger attempted to launch a desktop
binary and failed because the Replit environment lacked libglib. Its CLI's
headless mode disables that desktop debugger without disabling Metro watch mode,
unlike CI mode.

**How to apply:** Check the installed CLI's headless environment flag before
changing Expo versions; this is a CLI implementation detail, not a stable API.

Treat `expo lint` as a potentially mutating operation when no lint configuration
exists.

**Why:** The setup check automatically added ESLint packages, a config file, and
a package script. These were removed to keep the import setup minimal.

**How to apply:** Inspect existing lint configuration first, and do not assume
that CI mode prevents automatic lint setup.
