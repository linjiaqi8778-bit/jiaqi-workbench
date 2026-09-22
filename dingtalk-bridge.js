const {execFile}=require('child_process');
const fs=require('fs');
const path=require('path');
const bin=path.join(require('os').homedir(),'.local','bin','dws.exe');
const localProfile=path.join(__dirname,'.dingtalk-profile.local');
const profile=process.env.DINGTALK_DWS_PROFILE||process.env.DWS_PROFILE||(fs.existsSync(localProfile)?fs.readFileSync(localProfile,'utf8').trim():'');
function run(args){const finalArgs=profile?[...args,'--profile',profile,'--format','json']:[...args,'--format','json'];return new Promise((resolve,reject)=>execFile(bin,finalArgs,{windowsHide:true,timeout:45000,maxBuffer:16777216},(err,out)=>{try{const r=JSON.parse(out);if(err||r.error||r.success===false||r.ok===false||(r.outcome&&r.outcome!=='success'))throw Error();resolve(r);}catch{reject(Error('读取未成功，请检查钉钉授权或稍后刷新'));}}));}
function day(n){return new Date(Date.now()+28800000+n*86400000).toISOString().slice(0,10)+'T00:00:00+08:00';}
function dayOnly(n){return day(n).slice(0,10);}
function section(r,key,map){const d=r.data||r.result;if(!d||!Array.isArray(d[key]))throw Error('数据结构异常，未同步');return {ok:true,items:d[key].map(map),partial:d.complete===false||d.hasMore===true||Boolean(d.nextCursor)||r.meta?.pagination?.endpoint_exhausted===false};}
function sameDay(value,target){if(!value)return false;const d=new Date(value);return !isNaN(d)&&d.toISOString().slice(0,10)===target;}
function ownerIncludes(value,userId){const list=Array.isArray(value)?value:[value];return list.some(x=>x&&x.userId===userId);}
function pickTopics(records,userId,today,yesterday){
 return records.map(r=>r.cells||{}).filter(c=>ownerIncludes(c['2yb4kgd'],userId)).filter(c=>{
  const dates=[c.seWEfMl,c['0LaEPDv'],c.RKh5JAF,c.Mdav1bn];
  return dates.some(x=>sameDay(x,today)||sameDay(x,yesterday));
 }).filter(c=>['P0','P1'].includes(c.vFlMw9a?.name)).map((c,i)=>({id:String(i),title:c.Kscxqei||'未命名任务',date:''})).filter(x=>x.title.trim()).slice(0,12);
}
let cache,pending;
async function collect(){
 const a=await run(['auth','status']);if(!a.authenticated||!a.token_valid)return {connected:false,error:'钉钉登录失效，请运行 dws auth login'};
 const userId=a.user_id;
 const today=dayOnly(0);
 const yesterday=dayOnly(-1);
 const jobs={
 todos:async()=>section(await run(['todo','+get-my-tasks','--all','--status','false']),'todos',x=>({id:x.taskId,title:x.subject||x.title||'未命名待办',date:x.dueTime||x.dueDate||''})),
 calendar:async()=>{
  const r=await run(['aitable','+record-query','--base-id','vy20BglGWOABmG5QIvzkYNLgJA7depqY','--table-id','ZjelwFf','--view-id','OFT6290','--field-ids','Kscxqei,2yb4kgd,seWEfMl,0LaEPDv,RKh5JAF,Mdav1bn,vFlMw9a','--all','--limit','20','--max-records','2000']);
  return {ok:true,items:pickTopics(r.data?.records||[],userId,today,yesterday),partial:Boolean(r.data?.hasMore)};
 },
 reports:async()=>section(await run(['report','+outbox-list','--start',day(-6),'--end',day(1),'--cursor','0','--size','20']),'reports',x=>({id:x.reportId,title:x.templateName,date:x.createTime})),
 docs:async()=>section(await run(['drive','+recent','--limit','10']),'items',x=>({id:x.nodeId,title:x.name,date:x.accessTime,url:x.docUrl})),
 attendance:async()=>{
  const [detail,result]=await Promise.all([
   run(['attendance','record','get','--user',userId,'--date',today]),
   run(['attendance','+check-result','--users',userId,'--start',today,'--end',today,'--limit','100','--offset','0'])
  ]);
  const base=detail.result||{};
  const records=Array.isArray(base.recordList)?base.recordList:[];
  const results=result.data?.records||[];
  const resultByRecord=new Map(results.map(x=>[String(x.recordId||x.id||x.planId),x]));
  return {ok:true,partial:result.meta?.pagination?.endpoint_exhausted===false,items:records.map((x,i)=>{
   const key=String(x.recordId||x.id||x.planId||'');
   const matched=resultByRecord.get(key)||results[i]||{};
   const status=matched.timeResult||matched.locationResult||(x.isNormal?'Normal':'Abnormal');
   return {id:key||String(i),title:`${x.checkTypeDesc||matched.checkType||'打卡'} · ${status}`,date:x.userCheckTime||matched.userCheckTime||'',detail:x.locationText||matched.record?.userAddress||matched.record?.deviceName||x.locationMethod||matched.sourceType||''};
  }),summary:{date:today,group:base.group?.name||base.scheduleGroup?.name||'',workTime:base.workTimeDesc||'',unsigned:Boolean(base.isUnSigned),rest:Boolean(base.isRest)}};
 }};
 const values=await Promise.all(Object.entries(jobs).map(async([k,fn])=>{try{return [k,await fn()];}catch(e){return [k,{ok:false,error:e.message}];}}));
 return {connected:true,user:a.user_name,organization:a.corp_name,syncedAt:new Date().toISOString(),...Object.fromEntries(values)};
}
async function snapshot(refresh=false){if(pending)return pending;if(cache&&!refresh&&Date.now()-cache.time<60000)return cache.value;pending=collect().then(value=>{cache={value,time:Date.now()};return value;}).finally(()=>pending=null);return pending;}
module.exports={snapshot};
