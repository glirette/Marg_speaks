import { mkdir, readFile, writeFile, copyFile, rm, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { page, escape } from '../site/lib/html.mjs';
import * as render from '../site/lib/render.mjs';
import { siteOrigin, validateContent } from '../site/lib/validate.mjs';
const repo = fileURLToPath(new URL('../', import.meta.url));
const output = join(repo, 'dist');
const origin = siteOrigin(process.env.SITE_URL || '');
const publicFiles = [
  'site/assets/favicon.svg', 'site/assets/site.css', 'site/assets/site.js',
  'default.htm', 'default_files/colorschememapping.xml',
  'default_files/filelist.xml', 'default_files/themedata.thmx',
  'googlee801e58c75ba074d.html'
];
const contentFiles = ['site/content/publication.json', 'site/content/jaren-lockhart.json',
  'updates/2026-06-08-case-status.md', 'updates/2026-09-14-case-status.md',
  'data/case-status-2026-06-08.json'];
// A symlink must not smuggle an unreviewed file through any build input path.
for (const name of [...publicFiles, ...contentFiles]) {
  const parts = name.split('/');
  for (let i = 1; i <= parts.length; i++) {
    const entry = await lstat(join(repo, ...parts.slice(0, i)));
    if (entry.isSymbolicLink() || (i === parts.length ? !entry.isFile() : !entry.isDirectory())) throw new Error('Invalid public asset type');
  }
}
const publication = JSON.parse(await readFile(join(repo, 'site/content/publication.json'), 'utf8'));
const data = JSON.parse(await readFile(join(repo, 'site/content/jaren-lockhart.json'), 'utf8'));
validateContent(publication, data);
const publicRoutes = [];
await rm(output, {recursive:true, force:true});
await mkdir(output, {recursive:true});
async function write(path, content) {
  const destination = resolve(output, `.${path}`);
  if (!destination.startsWith(`${output}/`)) throw new Error('Output must be within dist');
  await mkdir(resolve(destination, '..'), {recursive:true});
  await writeFile(destination, content);
}
async function add(path, title, description, content, section='Stories', schema=null) {
  await write(path.endsWith('/') ? `${path}index.html` : path, page({title, description, path, content, origin, section, schema}));
  if(path !== '/404.html') publicRoutes.push(path);
}
await add('/', 'Stories', 'Independent reporting and public-record archives for New Orleans and the surrounding parishes.', render.home(publication));
for (const story of publication.stories) {
  if (story.slug !== data.slug) throw new Error(`No case content registered for ${story.slug}. Add its source data and renderer before publication.`);
  const root = `/stories/${story.slug}/`;
  await add(root, `${story.title}: ${story.subtitle}`, story.summary, render.overview(data), 'Stories', {'@context':'https://schema.org','@type':'Article',headline:`${story.title}: ${story.subtitle}`,author:{'@type':'Person',name:publication.author},publisher:{'@type':'Organization',name:publication.name},dateModified:story.reviewedDate,citation:data.sources.filter(s=>s.url.startsWith('https:')).map(s=>s.url)});
  await add(`${root}timeline/`, 'Jaren Lockhart case timeline', 'A dated, source-linked chronology of the Jaren Lockhart case and preserved archive.', render.timeline(data));
  await add(`${root}sources/`, 'Jaren Lockhart case sources', 'Court opinions, official accounts, public reporting and the original Marg Speaks archive, with verification limits.', render.sources(data));
  await add(`${root}archive/`, 'Original Marg Speaks archive', 'Context and access to Greg Lirette’s unchanged historical Word-exported case archive.', render.archive(data));
}
await add('/about/','About', 'About New Orleans Crime, an independent publication by Greg Lirette.',render.about,'About');
await add('/standards/','Sources & standards','How New Orleans Crime cites records, distinguishes case outcomes and handles corrections.',render.standards,'Sources & standards');
await add('/404.html','Page not found','This page could not be found.', '<div class="wrap simple-page"><h1>Page not found</h1><p class="dek">The address may have changed, or the page may not exist.</p><p><a href="/">Return to the stories</a></p></div>', '');
// Copy individual reviewed files, never a directory's future contents.
for (const name of publicFiles) {
  const target = join(output, name.replace(/^site\//, ''));
  await mkdir(resolve(target, '..'), {recursive:true});
  await copyFile(join(repo, name), target);
}
for (const name of ['2026-06-08-case-status.md','2026-09-14-case-status.md']) await write(`/updates/${name}`, await readFile(join(repo,'updates',name),'utf8'));
await write('/data/jaren-lockhart.json', `${JSON.stringify(data,null,2)}\n`);
await write('/data/case-status-2026-06-08.json', await readFile(join(repo,'data/case-status-2026-06-08.json'),'utf8'));
await write('/robots.txt', origin ? `User-agent: *\nAllow: /\nDisallow: /default.htm\nSitemap: ${origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
await write('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${origin ? publicRoutes.map(path=>`<url><loc>${escape(origin+path)}</loc></url>`).join('') : ''}</urlset>\n`);
const config = {
  routes: [
    {route:'/default.htm',headers:{'X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}},
    {route:'/default_files/*',headers:{'X-Robots-Tag':'noindex, nofollow'}}
  ],
  responseOverrides: {'404':{rewrite:'/404.html'}},
  globalHeaders: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    ...(origin ? {} : {'X-Robots-Tag':'noindex, nofollow'})
  },
  mimeTypes:{'.json':'application/json','.md':'text/plain; charset=utf-8','.svg':'image/svg+xml'}
};
await write('/staticwebapp.config.json',JSON.stringify(config,null,2)+'\n');
console.log(`Built ${publicRoutes.length} public pages and a 404 page into dist (${origin ? 'production: '+origin : 'preview: noindex'}).`);
