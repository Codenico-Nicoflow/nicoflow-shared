---
"@nicoflow/shared": minor
---

Add cross-platform toast helpers to `@nicoflow/shared/utils`: `Toast` interface, `createToastHelpers(i18n)` (returns `showErrorToast`/`showSuccessToast`/`showInfoToast`/`showWarningToast` bound to a host app's i18next instance), `getApiErrorCode`, and `ToastMessages`. Extracted from nicoflow-frontend so nicoflow-mobile can build the same toast/retry UX against one source of truth. Also adds `actions.retry` and `mutationError` keys to the `common` i18n namespace (en/he/ru).
