---
"@nicoflow/shared": minor
---

Add `searchMentions` query to `createNoteApi` (`GET /notes/search?q=&excludeId=`), plus the `IMentionResult`/`SearchMentionsRequest` types and `NOTE_API.SEARCH` endpoint constant — backs the @-mention typeahead in the notes editor (NIC-1972).
