# Marg Speaks Agent Instructions

This public repo is a preserved public-record/provenance archive. It is not the active Notary Geek operating repo and not a private strategy workspace.

## Read First

- `README.md`
- `CONTRIBUTING.md`
- `ROADMAP.md`
- `updates/2026-06-08-case-status.md`
- `data/case-status-2026-06-08.json`

## Operating Rules

- Preserve the original Word-exported artifact and supporting files unless Greg explicitly asks for an archival migration.
- Add source-backed update layers instead of rewriting the old page as if it were current news.
- Use public court records, public reporting, official records, or clearly cited public sources for status updates.
- Distinguish source-backed fact from memory, inference, opinion, and open questions.
- Do not publish private Notary Geek strategy, customer data, private messages, raw accusations, or unrelated business context.
- Do not make claims about current legal status without checking current public sources.

## Checks

For docs/data changes, run targeted text/JSON checks and inspect changed files.

If editing JSON:

```powershell
Get-Content .\data\case-status-2026-06-08.json | ConvertFrom-Json | Out-Null
```

## Handoff

Report:

- source-backed files changed;
- sources used or refreshed;
- whether original archival files were left untouched;
- checks run;
- any current-status uncertainty.
