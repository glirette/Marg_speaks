# New Orleans Crime · Marg Speaks archive

This repository now prepares **New Orleans Crime**, an independent publication by
Greg Lirette, with the Jaren Lockhart case as its first story. The proposed home is
`neworleanscrime.org`; hosting and DNS have not been provisioned by this change.

The original [Marg Speaks page](default.htm) and its tracked support files remain
unchanged. The modern website adds a reading layer around that historical artifact.

## The public website

- `/` — publication homepage, ready for reviewed additional stories.
- `/stories/jaren-lockhart/` — case background, convictions, pleas, sentences,
  appeal history and explicit verification limits.
- `/stories/jaren-lockhart/timeline/` — searchable and filterable chronology.
- `/stories/jaren-lockhart/sources/` — source index with dates and scope.
- `/stories/jaren-lockhart/archive/` — context and access to the unchanged archive.
- `/about/` and `/standards/` — publication identity and correction standards.

Every article and citation works without JavaScript. The small client script adds
filters, search, result counts and printing. No framework, runtime API or npm
package dependency is required.

## Run locally

Requires Node.js 22 or later:

```sh
npm test
npm run build
npm run preview
```

Open `http://localhost:4173`. Builds are noindex previews unless an HTTPS origin is
explicitly supplied as `SITE_URL`. See [Azure hosting](docs/hosting.md) for the
manual production workflow and remaining host setup.

## Content and provenance

Public source review: **September 14, 2026**.

- [Public review note](updates/2026-09-14-case-status.md)
- [Case data and source ledger](site/content/jaren-lockhart.json)
- [Earlier June status note](updates/2026-06-08-case-status.md)
- [Original machine-readable June status](data/case-status-2026-06-08.json)
- [Original artifact](default.htm) and [Word support files](default_files/)

The review establishes historical outcomes from cited sources. It does not verify
present custody, release eligibility, or a complete later state/federal docket.
The October 2017 Supreme Court step is attributed to reporting; the underlying
action sheet was not obtained.

GitHub was an experimental publication channel for the original coverage. Greg
continued following the case elsewhere. The preserved file documents that early
work without pretending its pending-charge language is current.

## Maintaining the publication

Read [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md) first.
Research for this story remains public in this repository, at Greg’s direction.
[Research notes](docs/research/2026-09-14-source-review.md) distinguish observed
source support, access limitations and open verification work. The reader-facing
site publishes reviewed copy; public research notes are separately identified.

## Case repository and publication boundary

**This repository remains dedicated to the Jaren Lockhart case.** Its research,
records, public issues and PRs remain here. New Orleans Crime is a separate
publication destination that can consume this case alongside other stories.
Research about unrelated cases belongs in its own appropriate repository, not here.

The seed website includes the publication shell so this case can be reviewed in
context. `site/content/publication.json` registers the seed story; this case's
sources and timeline live in `site/content/jaren-lockhart.json`. Generated public
case data is available at `/data/jaren-lockhart.json`. A future central crime-site
repository can import this reviewed data and article material while linking back
to this repository for source history, issues, PRs and corrections.

`site/lib/` holds page rendering, and `tools/build.mjs` emits the site. The build
rejects a registered story without content rather than publishing placeholders.
No unrelated stories or research have been added.

Case URLs are stable folders, not client-side routes. Build output is an explicit
allowlist. PR validation creates a downloadable preview artifact; deployment is a
separate manual action from `master`. See [publication contract](docs/publication-contract.md).
