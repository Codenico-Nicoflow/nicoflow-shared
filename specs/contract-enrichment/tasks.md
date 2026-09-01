# Tasks — contract-enrichment (nicoflow-shared)

This repo consumes the API's enrichment; it does not drive it. These tasks run
**after** the api's list is complete, since regenerating against a half-enriched
spec produces churn rather than signal.

## Planned

- [ ] Regenerate types against the fully enriched contract and confirm the output is valid [ac:AC6] [files:src/generated] [verify:pnpm codegen && pnpm type-check]

- [ ] Verify every generated View is strong: no bare `status?: string`, nullable fields are `| null`, required fields have no `?` [ac:AC2,AC3] [verify:node -e "const fs=require('fs');const f=fs.readdirSync('src/generated/types',{recursive:true}).filter(p=>String(p).endsWith('View.ts'));const bad=f.filter(p=>/\b(status|priority|energy|type|polarity)\??: string;/.test(fs.readFileSync('src/generated/types/'+p,'utf8')));if(bad.length)throw new Error('bare enum strings in: '+bad.join(', '));console.log('all',f.length,'views strong')"]

- [ ] Confirm the contract gate catches drift in both directions [ac:AC6] [verify:pnpm codegen:check]

## Discovered

_(the loop appends here — never reorder or delete the planned list above)_
