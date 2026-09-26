import {createServer} from 'node:http';
import {readFile,stat,realpath} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const mime={'.html':'text/html; charset=utf-8','.htm':'text/html; charset=windows-1252','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.txt':'text/plain','.md':'text/plain; charset=utf-8','.xml':'application/xml'};
export async function createPreviewServer(directory) {
 const root=await realpath(directory);
 const config=JSON.parse(await readFile(resolve(root,'staticwebapp.config.json'),'utf8'));
 const inside=path=>path===root || path.startsWith(root+sep);
 return createServer(async(req,res)=>{
  const headers={...config.globalHeaders};
  const send=(status,body='',extra={})=>{res.writeHead(status,{...headers,...extra});res.end(req.method==='HEAD'?undefined:body);};
  try {
   const url=new URL(req.url,'http://localhost');
   if (/%(?:2f|5c)/i.test(url.pathname)) {send(400,'Bad request');return;}
   const pathname=decodeURIComponent(url.pathname);
   if (!pathname.startsWith('/') || pathname.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(pathname)) {send(400,'Bad request');return;}
   const path=resolve(root,`.${pathname}`);
   if (!inside(path)) {send(403);return;}
   for(const route of config.routes){if(route.route.endsWith('*')?pathname.startsWith(route.route.slice(0,-1)):pathname===route.route){Object.assign(headers,route.headers);break;}}
   try {
    let file=await realpath(path);
    if (!inside(file)) {send(403);return;}
    if ((await stat(file)).isDirectory()) {
     if (!pathname.endsWith('/')) {send(301,'',{Location:`${url.pathname}/${url.search}`});return;}
     file=await realpath(resolve(file,'index.html'));
     if (!inside(file)) {send(403);return;}
    }
    const bytes=await readFile(file);
    send(200,bytes,{'Content-Type':mime[extname(file)]||'application/octet-stream'});
   } catch {
    const fallback=await realpath(resolve(root,'404.html'));
    if (!inside(fallback)) {send(500,'Preview page unavailable');return;}
    send(404,await readFile(fallback),{'Content-Type':'text/html; charset=utf-8'});
   }
  } catch {send(400,'Bad request');}
 });
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const server=await createPreviewServer(fileURLToPath(new URL('../dist',import.meta.url)));
 server.listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log(`Preview: http://localhost:${server.address().port}`));
}
