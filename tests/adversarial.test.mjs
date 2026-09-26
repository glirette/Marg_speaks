import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,rm,mkdir,readdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {request} from 'node:http';
import {createPreviewServer} from '../tools/preview.mjs';
import {siteOrigin} from '../site/lib/validate.mjs';
import {sources,timeline} from '../site/lib/render.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const caseData=JSON.parse(await readFile(join(root,'site/content/jaren-lockhart.json'),'utf8'));
const publication=JSON.parse(await readFile(join(root,'site/content/publication.json'),'utf8'));
async function fixture(t) {
 const dir=await mkdtemp(join(tmpdir(),'marg-adversarial-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 for(const name of ['package.json','site','tools','default.htm','default_files','googlee801e58c75ba074d.html','updates','data']) await cp(join(root,name),join(dir,name),{recursive:true});
 return dir;
}
const build=(dir,SITE_URL='')=>spawnSync(process.execPath,['tools/build.mjs'],{cwd:dir,env:{...process.env,SITE_URL},encoding:'utf8'});
async function walk(dir,prefix='') {
 const files=[];
 for(const entry of await readdir(join(dir,prefix),{withFileTypes:true})) {
  const name=prefix+entry.name;
  files.push(...entry.isDirectory()?await walk(dir,name+'/'):[name]);
 }
 return files.sort();
}
test('build emits only reviewed individual files, even when asset directories contain extra files',async t=>{
 const dir=await fixture(t);
 for(const name of ['site/assets/unreviewed.txt','default_files/unreviewed.txt']) await writeFile(join(dir,name),'synthetic private note');
 const result=build(dir);assert.equal(result.status,0,result.stderr);
 assert.deepEqual(await walk(join(dir,'dist')), [
  'index.html','404.html','about/index.html','standards/index.html',
  ...['index.html','timeline/index.html','sources/index.html','archive/index.html'].map(p=>'stories/jaren-lockhart/'+p),
  'assets/favicon.svg','assets/site.css','assets/site.js',
  'default.htm','default_files/colorschememapping.xml','default_files/filelist.xml','default_files/themedata.thmx','googlee801e58c75ba074d.html',
  'updates/2026-06-08-case-status.md','updates/2026-09-14-case-status.md',
  'data/jaren-lockhart.json','data/case-status-2026-06-08.json','robots.txt','sitemap.xml','staticwebapp.config.json'
 ].sort());
 await rm(join(dir,'site/assets/site.js'));
 await symlink(join(dir,'default.htm'),join(dir,'site/assets/site.js'));
 assert.notEqual(build(dir).status,0,'symlink public asset rejected');
 await rm(join(dir,'site/assets/site.js'));
 await cp(join(root,'site/assets/site.js'),join(dir,'site/assets/site.js'));
 await rm(join(dir,'default_files'),{recursive:true});
 await symlink(join(root,'default_files'),join(dir,'default_files'),'dir');
 assert.notEqual(build(dir).status,0,'symlink public asset directory rejected');
});
test('text and JSON input symlinks cannot import unreviewed material',async t=>{
 const dir=await fixture(t);
 for (const name of ['updates/2026-09-14-case-status.md','data/case-status-2026-06-08.json','site/content/publication.json','site/content/jaren-lockhart.json']) {
  const original=await readFile(join(dir,name));
  await writeFile(join(dir,'synthetic.txt'),original);
  await rm(join(dir,name));await symlink(join(dir,'synthetic.txt'),join(dir,name));
  assert.notEqual(build(dir).status,0,name);
  await rm(join(dir,name));await writeFile(join(dir,name),original);
 }
});
test('malformed content fails before replacing an existing build',async t=>{
 const dir=await fixture(t);
 await mkdir(join(dir,'dist'));await writeFile(join(dir,'dist/receipt.txt'),'previous build');
 const mutations=[
  d=>d.sources[0].url='javascript:alert(1)',
  d=>d.sources[0].url='data:text/html,synthetic',
  d=>d.sources[0].url='//example.test/source',
  d=>d.sources[0].url='https://user:synthetic@example.test/',
  d=>d.sources[0].id='x"><img src=x onerror=alert(1)>',
  d=>d.sources[0].type='<img src=x onerror=alert(1)>',
  d=>d.sources[0].checkedDate='2026-02-30',
  d=>d.sources[0].date='2016-02-30',
  d=>d.timeline[0].date='2012-02-30',
  d=>d.timeline[0].source='unknown',
  d=>d.timeline[0].id='x"><img src=x>',
  d=>d.timeline[0].id=d.timeline[1].id,
  d=>d.timeline[0].id='main',
  d=>d.timeline[0].category='unknown',
  d=>d.timeline.reverse(),
  d=>d.sources[0].id=d.sources[1].id,
  d=>d.sources=d.sources.filter(s=>s.id!=='appeal-2016'),
  d=>d.reviewedDate='2026-09-15',
  d=>d.sources=null,
 ];
 for(const mutate of mutations){
  const data=structuredClone(caseData);mutate(data);
  await writeFile(join(dir,'site/content/jaren-lockhart.json'),JSON.stringify(data));
  assert.notEqual(build(dir).status,0,mutate.toString());
  assert.equal(await readFile(join(dir,'dist/receipt.txt'),'utf8'),'previous build');
 }
 for(const slug of ['..','../../escape','about','jaren-lockhart"']) {
  const data={...caseData,slug};const pub=structuredClone(publication);pub.stories[0].slug=slug;
  await writeFile(join(dir,'site/content/jaren-lockhart.json'),JSON.stringify(data));
  await writeFile(join(dir,'site/content/publication.json'),JSON.stringify(pub));
  assert.notEqual(build(dir).status,0,slug);
 }
 await writeFile(join(dir,'site/content/jaren-lockhart.json'),JSON.stringify(caseData));
 for(const stories of [[],[publication.stories[0],publication.stories[0]],null]){
  await writeFile(join(dir,'site/content/publication.json'),JSON.stringify({...publication,stories}));
  assert.notEqual(build(dir).status,0);
 }
});
test('malicious synthetic prose stays text in generated HTML and Article JSON',async t=>{
 const dir=await fixture(t);
 const payload='</script><img src=x onerror="synthetic()"> & "quoted"';
 const data=structuredClone(caseData),pub=structuredClone(publication);
 data.sources[0].title=payload;data.sources[0].description=payload;
 data.timeline[0].text=payload;data.timeline[0].title=payload;data.timeline[0].locator=payload;
 pub.stories[0].title=payload;pub.stories[0].summary=payload;pub.author=payload;
 await writeFile(join(dir,'site/content/jaren-lockhart.json'),JSON.stringify(data));
 await writeFile(join(dir,'site/content/publication.json'),JSON.stringify(pub));
 const result=build(dir,'https://example.test');assert.equal(result.status,0,result.stderr);
 for(const path of ['index.html','stories/jaren-lockhart/index.html','stories/jaren-lockhart/timeline/index.html','stories/jaren-lockhart/sources/index.html']){
  const html=await readFile(join(dir,'dist',path),'utf8');
  assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;/script&gt;'));
 }
 const html=await readFile(join(dir,'dist/stories/jaren-lockhart/index.html'),'utf8');
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 assert.equal(schema.author.name,payload);
 // Escaping also protects direct renderer callers, independently of build validation.
 data.sources[0].id='x"><img src=x>';data.sources[0].type='<img src=x>';
 assert.ok(!sources(data).includes('<img src=x'));
 data.timeline[0].id='x"><img src=x>';
 for (const event of data.timeline) if (event.source==='appeal-2016') event.source=data.sources[0].id;
 assert.ok(!timeline(data).includes('<img src=x'));
 data.sources[0].url='javascript:synthetic()';assert.throws(()=>sources(data));
});
test('SITE_URL rejects parser repairs and malformed origins without network access',async t=>{
 const dir=await fixture(t);
 assert.throws(()=>siteOrigin('https://example.test\u0000'));
 for(const origin of ['http://example.test','https:example.test','https:/example.test','https:\\example.test',' https://example.test','https://example.test\n','https://example.test\u0001','https://example.test/.','https://example.test/%2e','https://example.test?','https://example.test#','https://user:synthetic@example.test','https://example.test/path','https://example.test:99999','not a url']){
  const result=build(dir,origin);assert.notEqual(result.status,0,JSON.stringify(origin));
 }
 for(const origin of ['https://example.test','https://example.test/','https://example.test:443']){
  const result=build(dir,origin);assert.equal(result.status,0,result.stderr);
  assert.match(await readFile(join(dir,'dist/index.html'),'utf8'),/rel="canonical" href="https:\/\/example.test\/"/);
 }
});
function get(port,path,method='GET') {
 return new Promise((resolve,reject)=>{
  const req=request({hostname:'127.0.0.1',port,path,method},res=>{let body='';res.setEncoding('utf8');res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});
  req.on('error',reject);req.end();
 });
}
test('local preview keeps headers on errors and redirects, rejects external redirects and escaping symlinks',async t=>{
 const dir=await fixture(t);assert.equal(build(dir).status,0);
 await writeFile(join(dir,'outside.txt'),'synthetic outside output');
 await symlink(join(dir,'outside.txt'),join(dir,'dist/link.txt'));
 const server=await createPreviewServer(join(dir,'dist'));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const port=server.address().port;
 for(const [path,status] of [['/',200],['/about',301],['/%2fabout',400],['/about/%2e%2e%2fdefault.htm',400],['/%ZZ',400],['/missing',404],['/link.txt',403],['/%64efault.htm',200]]){
  const response=await get(port,path);assert.equal(response.status,status,path);
  assert.equal(response.headers['x-robots-tag'],'noindex, nofollow',path);
  assert.ok(response.headers['content-security-policy'],path);
  assert.ok(!response.headers.location?.startsWith('//'),path);
  assert.ok(!response.body.includes('synthetic outside output'),path);
 }
 assert.match((await get(port,'/%64efault.htm')).headers['content-security-policy'],/default-src 'none'/);
 assert.equal((await get(port,'/about')).headers.location,'/about/');
 assert.equal((await get(port,'/missing','HEAD')).body,'');
 await rm(join(dir,'dist/404.html'));
 await symlink(join(dir,'outside.txt'),join(dir,'dist/404.html'));
 const fallback=await get(port,'/missing');
 assert.equal(fallback.status,500);assert.ok(!fallback.body.includes('synthetic outside output'));
 assert.equal(fallback.headers['x-robots-tag'],'noindex, nofollow');
});
