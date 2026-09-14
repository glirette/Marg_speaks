export const escape = (s = '') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const date = value => new Intl.DateTimeFormat('en-US', {year:'numeric', month:'long', day:'numeric', timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));
export const arrow = '<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h17M13 5l7 7-7 7"/></svg>';
export const link = (url, label, cls = '') => `<a${cls ? ` class="${escape(cls)}"` : ''} href="${escape(url)}">${escape(label)}${cls.includes('arrow-link') || cls.includes('button') ? arrow : ''}</a>`;
export const caseRoot = '/stories/jaren-lockhart/';
export function caseNav(selected) {
  return `<nav class="case-nav" aria-label="Case file">${[['Overview',caseRoot],['Timeline',`${caseRoot}timeline/`],['Sources',`${caseRoot}sources/`],['Original archive',`${caseRoot}archive/`]].map(([title,url]) => `<a href="${url}"${title===selected ? ' aria-current="page"' : ''}>${title}</a>`).join('')}</nav>`;
}
export function caseHeader(title, subtitle, reviewed, section, note = false) {
 return `<div class="wrap"><div class="breadcrumb"><a href="/">Stories</a><span aria-hidden="true">/</span>${section === 'Overview' ? 'Jaren Lockhart' : link(caseRoot,'Jaren Lockhart')}</div><header class="article-header"><h1>${escape(title)}</h1><p class="dek">${escape(subtitle)}</p><p class="meta">By Greg Lirette · Source review: <time datetime="${reviewed}">${date(reviewed)}</time></p>${note ? '<p class="notice">The outcomes below are documented in historical sources. Present custody and later proceedings have not been independently verified.</p>' : ''}</header>${caseNav(section)}</div>`;
}
export function page({title, description, path, content, origin, section = 'Stories', schema}) {
 const canonical = origin ? `${origin}${path}` : null;
 const structured = schema && canonical ? `<script type="application/ld+json">${JSON.stringify({...schema, url:canonical}).replace(/</g,'\\u003c')}</script>` : '';
 return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)} | New Orleans Crime</title><meta name="description" content="${escape(description)}"><meta name="color-scheme" content="light">${canonical ? `<link rel="canonical" href="${escape(canonical)}"><meta property="og:url" content="${escape(canonical)}">` : '<meta name="robots" content="noindex, nofollow">'}<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="${schema?.['@type']==='Article'?'article':'website'}"><meta property="og:site_name" content="New Orleans Crime"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/site.css"><script src="/assets/site.js" defer></script>${structured}</head>
<body><a class="skip-link" href="#main">Skip to content</a><header class="masthead wrap"><a class="brand" href="/" aria-label="New Orleans Crime home"><span>New Orleans Crime</span><small>Courts · Records · Accountability</small></a><nav aria-label="Main navigation">${[['Stories','/'],['About','/about/'],['Sources & standards','/standards/']].map(([name,url]) => `<a href="${url}"${name===section ? ' aria-current="page"' : ''}>${name}</a>`).join('')}</nav></header><main id="main">${content}</main><footer class="wrap footer"><a class="footer-brand" href="/">New Orleans Crime</a><span>An independent publication by Greg Lirette</span></footer></body></html>`;
}
