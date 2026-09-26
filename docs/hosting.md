# Azure hosting

The proposed production home is `https://neworleanscrime.org`. No Azure resource,
DNS record, certificate, or public deployment is created by this change.

## Build contract

- Node.js 22 or later; no npm runtime or build dependencies.
- `npm test` validates the source, static links, provenance and preview/production builds.
- `npm run build` creates a **noindex preview** in `dist/`.
- Set `SITE_URL=https://neworleanscrime.org` when building for that production host.
  A production build writes matching canonical URLs, an XML sitemap and Article
  structured data. The value must be a literal HTTPS origin, with an optional
  trailing slash; credentials, paths, query strings, fragments, whitespace, and
  URL-parser repairs are rejected. Omit the value for previews; never use a production build for
  an unrelated preview hostname.
- `npm run preview` serves the built files locally on port 4173. This small server
  is a development aid, not an Azure production server.

Only `dist/` is uploaded. It contains seven modern pages, a 404 page, static assets,
public source data and dated updates, and the original HTML/support files. The
repository root is not a deployment directory. The old Office lock file stays in
Git for provenance and is not served. The copy manifest names each asset and
archive file individually; extra files in those directories are not published,
and symlinks at copied paths are rejected. Content validation rejects unsafe
source URLs, invalid calendar dates, duplicate IDs, unresolved citations, and
unregistered case slugs before replacing the existing output.

`npm test` includes isolated synthetic builds for these failure paths and local
HTTP checks for preview errors, redirects, headers, and file containment. The
fixtures do not contact source providers or deploy anything. Browser QA remains
a separate check; passing Node tests does not establish rendered behavior.

## Recommended initial host

Use an Azure Static Web App for this static publication. There is no database,
login, payment service, or backend API to operate. The generated
`staticwebapp.config.json` supplies headers, legacy-archive noindex rules, and a
real 404 response. No catch-all SPA fallback conceals missing article URLs.

After choosing the Azure subscription, resource group, name and region:

1. Create a Static Web App using the Azure portal, choosing a deployment source
   that does not add a second automatic publishing workflow (Other/manual).
2. Obtain that app's deployment token through Azure and save it as the
   `AZURE_STATIC_WEB_APPS_API_TOKEN` secret in this repository's `production`
   environment. Configure any desired required reviewers there.
3. Deploy a preview build to the Azure default hostname for a routing/header smoke
   check before public launch. Keep `SITE_URL` unset for that preview build. This
   can be uploaded with the official SWA CLI or Azure tooling in the chosen host
   environment. The committed production workflow is not a preview deployment.
4. Add the selected custom domain in Azure. Use the validation records Azure
   actually gives you; do not invent DNS targets. For the apex, follow the current
   Azure guide for your external DNS provider's ALIAS/ANAME/flattening support and
   TXT ownership validation. Add `www` separately if wanted and choose the default
   domain deliberately. Preserve existing mail and other DNS records.
5. Once the reviewed site is on `master` and the production hostname is ready,
   manually run **Publish reviewed site to Azure**, using the selected HTTPS
   origin. The workflow rebuilds, tests and deploys only `dist/` from `master`.
6. Verify `/`, `/stories/jaren-lockhart/`, its timeline/sources/archive pages,
   `/default.htm`, a deliberately missing URL, TLS, canonical URLs, and sitemap.
   Confirm the legacy page receives `X-Robots-Tag: noindex, nofollow`.

The deployment token, Azure resource selection and domain validation are outstanding
host setup, not application-build blockers. No provisioned hostname or live URL is
claimed in the code or handoff. An Azure App Service could also serve `dist/`, but
its default-document, MIME, security-header and 404 configuration must be adapted;
Static Web Apps configuration is not an IIS/App Service configuration file.

## Reviewed provider documentation

Checked September 14, 2026:

- [Build configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration)
- [Routing, headers and response configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration)
- [External-provider apex domain setup](https://learn.microsoft.com/en-us/azure/static-web-apps/apex-domain-external)

## Updates and recovery

Publish reviewed updates through a new PR, then rerun the manual deployment from
`master`. Roll back with a reviewed revert commit on `master` and rerun the same
workflow. The dated source data does not claim an automated docket-monitoring feed.
