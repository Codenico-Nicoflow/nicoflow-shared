---
'@nicoflow/shared': patch
---

Fix `notes.json`'s `colors` i18n keys (en/he/ru) to match the actual backend-allowlisted swatch token set (gray/brown/orange/yellow/green/blue/purple/pink/red) — the previous keys (amber/teal) never matched what the API accepts, and the new keys (brown/yellow/pink) were missing entirely.
