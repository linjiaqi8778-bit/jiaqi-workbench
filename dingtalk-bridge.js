const {execFile}=require('child_process');
const fs=require('fs');
const path=require('path');
const bin=path.join(require('os').homedir(),'.local','bin','dws.exe');
const localProfile=path.join(__dirname,'.dingtalk-profile.local');
const profile=process.env.DINGTALK_DWS_PROFILE||process.env.DWS_PROFILE||(fs.existsSync(localProfile)?fs.readFileSync(localProfile,'utf8').trim():'');
function run(args){const finalArgs=profile?[...args,'--profile',profile,'--format','json']:[...args,'--format','json'];return new Promise((resolve,reject)=>execFile(bin,finalArgs,{windowsHide:true,timeout:45000,maxBuffer:4194304},(err,out)=>{try{const r=JSON.parse(out);if(err||r.error||r.success===false||r.ok===false||(r.outcome&&r.outcome!=='success'))throw Error();resolve(r);}catch{reject(Error('读取未成功，请检查钉钉授权或稍后刷新'));}}));}
function day(n){return new Date(Date.now()+28800000+n*86400000).toISOString().slice(0,10)+'T00:00:00+08:00';}
function section(r,key,map){const d=r.data||r.result;if(!d||!Array.isArray(d[key]))throw Error('数据结构异常，未同步');return {ok:true,items:d[key].map(map),partial:d.complete===false||d.hasMore===true||Boolean(d.nextCursor)||r.meta?.pagination?.endpoint_exhausted===false};}
let cache,pending;
async function collect(){
 const a=await run(['auth','status']);if(!a.authenticated||!a.token_valid)return {connected:false,error:'钉钉登录失效，请运行 dws auth login'};
 const jobs={
 todos:async()=>section(await run(['todo','+get-my-tasks','--all','--status','false']),'todos',x=>({id:x.taskId,title:x.subject||x.title||'未命名待办',date:x.dueTime||x.dueDate||''})),
 calendar:async()=>section(await run(['calendar','event','list','--start',day(0),'--end',day(7)]),'events',x=>({id:x.id||x.eventId,title:x.summary||x.title||'未命名日程',date:x.start?.dateTime||x.start?.date||''})),
 reports:async()=>section(await run(['report','+outbox-list','--start',day(-6),'--end',day(1),'--cursor','0','--size','20']),'reports',x=>({id:x.reportId,title:x.templateName,date:x.createTime})),
 docs:async()=>section(await run(['drive','+recent','--limit','10']),'items',x=>({id:x.nodeId,title:x.name,date:x.accessTime,url:x.docUrl}))};
 const values=await Promise.all(Object.entries(jobs).map(async([k,fn])=>{try{return [k,await fn()];}catch(e){return [k,{ok:false,error:e.message}];}}));
 return {connected:true,user:a.user_name,organization:a.corp_name,syncedAt:new Date().toISOString(),...Object.fromEntries(values)};
}
async function snapshot(refresh=false){if(pending)return pending;if(cache&&!refresh&&Date.now()-cache.time<60000)return cache.value;pending=collect().then(value=>{cache={value,time:Date.now()};return value;}).finally(()=>pending=null);return pending;}
module.exports={snapshot};
