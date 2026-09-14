import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist',import.meta.url));
const config=JSON.parse(await readFile(resolve(root,'staticwebapp.config.json'),'utf8'));
const mime={'.html':'text/html; charset=utf-8','.htm':'text/html; charset=windows-1252','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.txt':'text/plain','.md':'text/plain; charset=utf-8','.xml':'application/xml'};
createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  const pathname=decodeURIComponent(url.pathname);
  const path=resolve(root,`.${pathname}`);
  if(path!==root && !path.startsWith(root+sep)) {res.writeHead(403);res.end();return;}
  const headers={...config.globalHeaders};
  for(const route of config.routes){if(route.route.endsWith('*')?pathname.startsWith(route.route.slice(0,-1)):pathname===route.route){Object.assign(headers,route.headers);break;}}
  let file=path;
  try {if((await stat(file)).isDirectory()) {if(!pathname.endsWith('/')){res.writeHead(301,{Location:`${pathname}/${url.search}`});res.end();return;}file=resolve(file,'index.html');}const bytes=await readFile(file);res.writeHead(200,{...headers,'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);}
  catch {res.writeHead(404,{...headers,'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(resolve(root,'404.html')));}
 } catch {res.writeHead(400);res.end('Bad request');}
}).listen(Number(process.env.PORT||4173),'0.0.0.0',()=>console.log('Preview: http://localhost:4173'));
