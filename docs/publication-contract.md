# One case repository, a broader crime publication

`glirette/Marg_speaks` is the public source of truth for research about the Jaren
Lockhart case. It is not a collection point for unrelated cases.

New Orleans Crime is the proposed consuming publication at `neworleanscrime.org`.
The website seed in this PR demonstrates that relationship and is independently
buildable. It does not relocate the research or presume that every future story
will be maintained in this repository.

## What stays here

- The original archive and its provenance.
- Public research notes, source ledgers, review dates and record gaps.
- Case-specific corrections, open issues, PRs and contribution history.
- Reviewed case copy and structured public data.

## What the publication consumes

- Stable story root: `/stories/jaren-lockhart/`.
- Story subpages: `timeline/`, `sources/`, `archive/`.
- Public source/timeline data: `site/content/jaren-lockhart.json`, emitted as
  `/data/jaren-lockhart.json`, schema `new-orleans-crime-case-v1`.
- The original artifact and support files, if the consuming host serves the archive.

The consuming site must retain citations, checked dates, source-type distinctions,
and verification limits. Rebuilding or importing an unchanged record must not
advance its source-review date. Preserve event IDs and source IDs for stable links.

If a dedicated publication repository is established, port the shell/build there
and consume this case at a reviewed commit. Preserve the link back to this public
case repository. Do not import unresolved research statements as verified article
copy, or copy other repositories' internal material into this public one.

No automated cross-repository ingestion job or live docket monitor is claimed by
this seed. Deployment and future integration remain separate, reviewable actions.
