import { getRadarClient } from '../../supabase-client.js';
import { mountRadarFeed } from '../../radar-feed-app.js';
if(!['127.0.0.1','localhost'].includes(window.location.hostname))throw new Error('Offline loopback fixture only.');
const client=await getRadarClient();
if(new URL(client.supabaseUrl).origin!==window.location.origin)throw new Error('Synthetic fixture requires same-origin Supabase endpoints.');
// Disposable local account only; avoids password-manager interference with browser acceptance.
await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'});
const root=document.getElementById('radar-feed');
await mountRadarFeed(root,{client,research:async(revision,rows,signal)=>{
  const {data,error}=await client.functions.invoke('research-opportunities',{body:{profile_revision:revision,decisions:rows.filter(r=>r.decision!=='new').slice(0,100).map(r=>({decision:r.decision==='passed'?'pass':'accept',...{original_url:r.snapshot.original_url,company:r.snapshot.claims.company,job_title:r.snapshot.claims.job_title}}))},signal});
  if(error)throw error;return data;
}});
const status=document.createElement('p');status.setAttribute('role','status');status.id='fixture-status';
const controls=document.createElement('aside');controls.append(status);controls.setAttribute('aria-label','Offline fixture controls');
for(const mode of ['completed','fresh','partial','empty','error','slow','untrusted']) {const b=document.createElement('button');b.textContent=`Mock ${mode}`;b.onclick=async()=>{await fetch('/__feed/control',{method:'POST',body:JSON.stringify({mode})});status.textContent=`Mock ${mode} ready`;};controls.append(b);}
for(const [label,input] of [['Fail next save',{failSave:true}],['Fail next history read',{failHistory:true}]]) {const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{await fetch('/__feed/control',{method:'POST',body:JSON.stringify(input)});status.textContent=`${label} ready`;};controls.append(b);}
document.body.append(controls);
