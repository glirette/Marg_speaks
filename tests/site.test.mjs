import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {escape} from '../site/lib/html.mjs';
import {validateContent} from '../site/lib/validate.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const dist=join(root,'dist');
const build=(extra={})=>execFileSync(process.execPath,['tools/build.mjs'],{cwd:root,env:{...process.env,SITE_URL:'',...extra},encoding:'utf8',stdio:['ignore','pipe','pipe']});
const read=p=>readFile(join(root,p),'utf8');
async function walk(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())result.push(...await walk(path));else result.push(path);}return result;}
build();
test('all modern pages render content and local links/fragments resolve',async()=>{
 const pages=(await walk(dist)).filter(p=>p.endsWith('.html')&&!p.includes('googlee801'));
 assert.equal(pages.length,8);
 for(const path of pages){const html=await readFile(path,'utf8');assert.equal((html.match(/<h1[ >]/g)||[]).length,1,path);assert.match(html,/<main id="main">/);assert.match(html,/<html lang="en">/);assert.match(html,/<h1[^>]*>[^<]+/);
 for(const [,href] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(/^(https?:|mailto:|data:)/.test(href))continue;
  const parsed=new URL(href,`https://example.test/${path.slice(dist.length+1)}`);
  let target=join(dist,parsed.pathname);if(parsed.pathname.endsWith('/'))target=join(target,'index.html');
  assert.ok(existsSync(target),`${path} links to missing ${href}`);
  if(parsed.hash){const body=await readFile(target,'utf8');assert.ok(body.includes(`id="${decodeURIComponent(parsed.hash.slice(1))}"`),`Missing fragment ${href}`);}
 }
 }
});
test('timeline dates and citations have a valid source and honest review limits',async()=>{
 const data=JSON.parse(await read('site/content/jaren-lockhart.json'));
 const pub=JSON.parse(await read('site/content/publication.json'));
 assert.equal(data.reviewedDate,pub.stories[0].reviewedDate);
 const sourceIds=new Set(data.sources.map(s=>s.id));assert.equal(sourceIds.size,data.sources.length);
 let previous='';const events=new Set();
 for(const item of data.timeline){assert.ok(sourceIds.has(item.source));assert.match(item.date,/^\d{4}-\d{2}-\d{2}$/);assert.ok(item.date>=previous);assert.ok(item.date<=data.reviewedDate);assert.ok(!events.has(item.id));events.add(item.id);previous=item.date;assert.ok(item.locator);}
 for(const source of data.sources){assert.equal(source.checkedDate,data.reviewedDate);assert.ok(source.limit);assert.ok(source.url.startsWith('https://')||source.url.startsWith('/stories/'));}
 assert.match(data.reviewScope,/not been independently verified/);
 const report=data.timeline.find(e=>e.id==='supreme-report');assert.match(report.text,/report date/);
 assert.equal(report.dateKind,'reportPublication');
 assert.equal(report.date,data.sources.find(s=>s.id===report.source).date);
 assert.match(await read('dist/stories/jaren-lockhart/timeline/index.html'),/Report published October 17, 2017/);
 assert.match(await read('dist/stories/jaren-lockhart/index.html'),/Speaks trial case/);
 assert.match(await read('dist/stories/jaren-lockhart/index.html'),/concurrently/);
 assert.doesNotMatch(await read('dist/stories/jaren-lockhart/index.html'),/first degree murder/);
});
test('a reporting publication date cannot be silently promoted to an order date',async()=>{
 const original=JSON.parse(await read('site/content/jaren-lockhart.json'));
 const pub=JSON.parse(await read('site/content/publication.json'));
 const copy=()=>structuredClone(original);
 const unmarked=copy();delete unmarked.timeline.find(e=>e.id==='supreme-report').dateKind;
 assert.throws(()=>validateContent(pub,unmarked),/Reporting source needs an explicit event or publication date kind/);
 const wrongDate=copy();wrongDate.timeline.find(e=>e.id==='supreme-report').date='2017-10-16';
 assert.throws(()=>validateContent(pub,wrongDate),/Reported event must use the source publication date/);
 const wrongSource=copy();wrongSource.timeline.find(e=>e.id==='supreme-report').source='appeal-2016';
 assert.throws(()=>validateContent(pub,wrongSource),/Non-report event cannot use a report publication date/);
});
test('historical artifacts are unchanged in the working tree and build',async()=>{
 const base='803ebd9b719cd7034b9465a74edc54b673b3cca1';
 const all=execFileSync('git',['ls-tree','-r','--name-only',base],{cwd:root,encoding:'utf8'}).trim().split('\n');
 const archive=all.filter(p=>p==='default.htm'||p.startsWith('default_files/')||p==='~$efault.htm'||p==='googlee801e58c75ba074d.html');
 assert.equal(archive.length,6);
 const hash=b=>createHash('sha256').update(b).digest('hex');
 for(const path of archive){const before=execFileSync('git',['show',`${base}:${path}`],{cwd:root});const now=await readFile(join(root,path));assert.equal(hash(now),hash(before),path);if(path!=='~$efault.htm')assert.equal(hash(await readFile(join(dist,path))),hash(before),`build ${path}`);}
});
test('deployment output is an allowlist and previews cannot claim the production origin',async()=>{
 const files=await walk(dist);
 assert.ok(!files.some(p=>/AGENTS|README|research|node_modules|package\.json|~\$/.test(p.slice(dist.length))));
 assert.match(await read('dist/index.html'),/noindex, nofollow/);
 assert.doesNotMatch(await read('dist/index.html'),/rel="canonical"/);
 assert.equal(await read('dist/robots.txt'),'User-agent: *\nDisallow: /\n');
 const config=JSON.parse(await read('dist/staticwebapp.config.json'));
 assert.equal(config.responseOverrides['404'].rewrite,'/404.html');assert.ok(!config.navigationFallback);
 assert.equal(config.globalHeaders['X-Robots-Tag'],'noindex, nofollow');
 assert.equal(config.routes[0].headers['X-Robots-Tag'],'noindex, nofollow');
});
test('HTML text escaping prevents source content becoming markup',()=>assert.equal(escape('<img src="x" onerror=\'run()\'> &'), '&lt;img src=&quot;x&quot; onerror=&#39;run()&#39;&gt; &amp;'));
test('production builds use a chosen HTTPS origin; invalid origins fail',async()=>{
 build({SITE_URL:'https://neworleanscrime.org'});
 try {
  assert.match(await read('dist/stories/jaren-lockhart/index.html'),/rel="canonical" href="https:\/\/neworleanscrime.org\/stories\/jaren-lockhart\/"/);
  assert.equal((await read('dist/sitemap.xml')).match(/<loc>/g).length,7);
  assert.doesNotMatch(await read('dist/index.html'),/noindex, nofollow/);
  const html=await read('dist/stories/jaren-lockhart/index.html');
  const json=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert.equal(json['@type'],'Article');assert.equal(json.dateModified,'2026-09-14');assert.equal(json.citation.length,3);
  for(const SITE_URL of ['http://example.com','https://example.com/path','https://user:secret@example.com'])assert.throws(()=>build({SITE_URL}));
 } finally {build();}
});
