---
'@nicoflow/shared': minor
---

Share the AI assistant's quota derivation and SSE stream parser so web and mobile use one implementation.

- `utils`: add `deriveQuota`, `applyServerBlock`, `isQuotaBlocked`, `isFeatureDisabled`, `AI_ERROR_CODE` and the `QuotaStatus`/`QuotaState`/`AIErrorCode` types.
- `utils`: add `SSEParser` for the SSE-over-POST send-message body. Pure string handling, so it works over both a web `ReadableStream` and `expo/fetch` on React Native.
- `api`: add the `AIStreamEvent` union (`AIStreamDelta`/`AIStreamDone`/`AIStreamError`/`AIStreamToolProposal`) and widen `AIToolName` with the NIC-1998 write tools.
