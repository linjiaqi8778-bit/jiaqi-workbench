const http=require('http'),fs=require('fs'),path=require('path');
const {snapshot}=require('./dingtalk-bridge');
const assets=new Set(['index.html','styles.css','app.js','dingtalk-ui.js','assets/avatar-jiaqi.jpg']);
http.createServer(async(req,res)=>{
 const host=req.headers.host||'';
 if(!/^(localhost|127\.0\.0\.1):4173$/.test(host)){res.writeHead(403);return res.end();}
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const url=new URL(req.url,'http://localhost:4173');
 if(url.pathname==='/api/dingtalk'){
  if(req.method!=='GET'||(req.headers.origin&&req.headers.origin!==`http://${host}`)||(req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))){res.writeHead(403);return res.end();}
  res.setHeader('Content-Type','application/json; charset=utf-8');
  try{res.end(JSON.stringify(await snapshot(url.searchParams.has('refresh'))));}catch{res.statusCode=503;res.end(JSON.stringify({error:'钉钉连接暂不可用，请刷新重试'}));}return;
 }
 const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
 if(!assets.has(name)){res.writeHead(404);return res.end('Not found');}
 fs.readFile(path.join(__dirname,name),(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':name.endsWith('.jpg')?'image/jpeg':'text/html; charset=utf-8');res.end(data);});
}).listen(4173,'127.0.0.1',()=>console.log('http://localhost:4173'));
