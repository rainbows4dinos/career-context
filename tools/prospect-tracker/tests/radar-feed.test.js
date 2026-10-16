import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalDatabase} from '../scripts/local-database.js';
import {createOpportunityData} from '../radar-feed-data.js';
import {createRadarDataAccess} from '../data.js';
import {createFeedController} from '../radar-feed-controller.js';
import {snapshot,decodeResearch,opportunityKey,decisionInputs} from '../radar-feed-model.js';
import {researchOpportunities,RESEARCH_ENABLED} from '../radar-research-client.js';
import {feedResponse} from './fixtures/feed-response.js';
import {createClient} from '../vendor/supabase.js';
import {startFixture} from './fixtures/radar-server.js';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const card=()=>snapshot(feedResponse().opportunities[0],1,'2026-10-16T15:00:00Z');
const stored=(s=card(),changes={})=>({id,owner_id:owner,identity_key:opportunityKey(s),snapshot:s,decision:'new',pass_reason:null,pass_note:null,decided_at:null,prospect_id:null,created_at:'2026-10-16T15:00:00.000001Z',last_seen_at:'2026-10-16T15:00:00.000001Z',updated_at:'2026-10-16T15:00:00.000001Z',...changes});

test('small-card decoder discards raw descriptions, preserves claims/facts and rejects unsafe/malformed results',()=>{
 const raw=feedResponse();raw.opportunities[0].job_description='DO NOT STORE';raw.opportunities[0].raw_response={secret:'DO NOT STORE'};
 const result=decodeResearch(raw,1),text=JSON.stringify(result);
 assert.ok(!text.includes('DO NOT STORE'));assert.equal(result.opportunities[1].facts.company,null);assert.equal(result.opportunities[1].claims.company,'Example Studio 2');
 assert.throws(()=>decodeResearch({...raw,profile_revision:2},1));assert.throws(()=>decodeResearch({...raw,opportunities:Array(6).fill(raw.opportunities[0])},1));
 raw.opportunities[0].discovery_url='javascript:alert(1)';assert.throws(()=>decodeResearch(raw,1));
 assert.equal(RESEARCH_ENABLED,false);
});

test('production research client cannot invoke a paid endpoint while disabled',async()=>{
 await assert.rejects(researchOpportunities({functions:{invoke:()=>assert.fail('Paid call')}},1,[],new AbortController().signal),/disabled/);
});

test('single-table PostgreSQL RLS, identity uniqueness, decisions, immutable ownership and owned Tracker links',async()=>{
 const db=await createLocalDatabase();
 const asUser=(user,fn)=>db.transaction(async tx=>{await tx.exec('set local role authenticated');await tx.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:user})]);return fn(tx);});
 try{
  await db.query('insert into auth.users(id) values ($1),($2)',[owner,other]);
  await asUser(owner,tx=>tx.query('insert into radar_opportunities(id,owner_id,identity_key,snapshot) values($1,$2,$3,$4)',[id,owner,opportunityKey(card()),JSON.stringify(card())]));
  assert.equal((await asUser(other,tx=>tx.query('select * from radar_opportunities'))).rows.length,0);
  assert.equal((await asUser(other,tx=>tx.query("update radar_opportunities set decision='passed' where id=$1 returning *",[id]))).rows.length,0);
  await assert.rejects(asUser(other,tx=>tx.query('insert into radar_opportunities(owner_id,identity_key,snapshot) values($1,$2,$3)',[owner,'forged',JSON.stringify(card())])),/row-level security/);
  await assert.rejects(asUser(owner,tx=>tx.query('insert into radar_opportunities(identity_key,snapshot) values($1,$2)',[opportunityKey(card()),JSON.stringify(card())])),/unique/);
  await assert.rejects(asUser(owner,tx=>tx.query('update radar_opportunities set owner_id=$1',[other])),/permission denied/);
  await assert.rejects(asUser(owner,tx=>tx.exec('delete from radar_opportunities')),/permission denied/);
  await db.exec('set role anon');await assert.rejects(db.query('select * from radar_opportunities'),/permission denied/);await db.exec('reset role');
  await asUser(owner,tx=>tx.query("update radar_opportunities set decision='passed',pass_reason='scope',pass_note='Optional feedback' where id=$1",[id]));
  let row=(await db.query('select *,updated_at::text as stamp from radar_opportunities')).rows[0];assert.equal(row.decision,'passed');assert.ok(row.decided_at);
  const oldStamp=row.stamp;
  await asUser(owner,tx=>tx.query("update radar_opportunities set decision='accepted',pass_reason=null,pass_note=null where id=$1",[id]));
  assert.equal((await asUser(owner,tx=>tx.query("update radar_opportunities set decision='new' where updated_at=$1 returning *",[oldStamp]))).rows.length,0);
  // Caller-owned insert assertion cannot cross accounts even after an Auth change.
  await assert.rejects(asUser(other,tx=>tx.query('insert into prospects(owner_id,company,title) values($1,$2,$3)',[owner,'Wrong owner','Designer'])),/row-level security/);
  await asUser(other,tx=>tx.query('insert into prospects(id,company,title) values($1,$2,$3)',[other,'Other account','Designer']));
  await assert.rejects(asUser(owner,tx=>tx.query('update radar_opportunities set prospect_id=$1 where id=$2',[other,id])),/owned prospect/);
  await asUser(owner,tx=>tx.query('insert into prospects(id,company,title,status) values($1,$2,$3,$4)',[id,'Example Studio','Designer','interviewing']));
  await asUser(owner,tx=>tx.query('update radar_opportunities set prospect_id=$1 where id=$1',[id]));
  await asUser(owner,tx=>tx.query("update radar_opportunities set decision='new' where id=$1",[id]));
  row=(await db.query('select * from radar_opportunities')).rows[0];assert.equal(row.decision,'new');assert.equal(row.decided_at,null);assert.equal(row.prospect_id,id);
  assert.equal((await db.query('select status from prospects where id=$1',[id])).rows[0].status,'interviewing');
  assert.equal((await db.query('select count(*)::int as n from prospect_status_events where prospect_id=$1',[id])).rows[0].n,1);
  await assert.rejects(asUser(owner,tx=>tx.query('update radar_opportunities set prospect_id=null where id=$1',[id])),/owned prospect/);
  await assert.rejects(db.query('update radar_opportunities set identity_key=$1 where id=$2',['changed',id]),/immutable/);
  await assert.rejects(asUser(owner,tx=>tx.query('insert into radar_opportunities(identity_key,snapshot) values($1,$2)',['raw',JSON.stringify({...card(),job_description:'forbidden'})])),/check constraint/);
 }finally{await db.close();}
});

// Lightweight injected store tests isolate async failure/order behavior. Integration below uses real SQL/RLS/SDK.
function harness(overrides={}) {
 const backing=[];let creates=0,historyFails=false,writeFails=false;const trackerRows=[];const calls=[];
 const data={load:async()=>{if(historyFails)throw new Error('history failed');return structuredClone(backing);},get:async(_owner,key)=>structuredClone(backing.find(r=>r.id===key) ?? null),insert:async(_owner,s,key)=>{if(writeFails)throw new Error('write failed');const r=stored(s,{id:key});backing.push(r);return structuredClone(r);},decide:async(r,decision,reason,note)=>{if(writeFails)throw new Error('write failed');const saved={...r,decision,pass_reason:reason,pass_note:note};backing[backing.findIndex(x=>x.id===r.id)]=saved;return saved;},link:async(r,prospect_id)=>{if(writeFails)throw new Error('link failed');const saved={...r,prospect_id};backing[backing.findIndex(x=>x.id===r.id)]=saved;return saved;}};
 const tracker={listProspectIdentities:async()=>trackerRows,getProspect:async key=>trackerRows.find(r=>r.id===key) ?? null,createProspect:async(input,expectedOwner)=>{calls.push(expectedOwner);creates++;const saved={...input,status:'prospect'};trackerRows.push(saved);return saved;}};
 let researchCalls=0;
 const c=createFeedController({owner,data,tracker,loadProfile:async()=>({revision:1,reviewed_at:'2026-10-16'}),research:async()=>{researchCalls++;return feedResponse();},onChange:()=>{},...overrides});
 return {c,backing,data,tracker,trackerRows,calls,get creates(){return creates;},get researchCalls(){return researchCalls;},failHistory(v){historyFails=v;},failWrite(v){writeFails=v;}};
}

test('failed history reads block research and preserve previous results, never substitute empty history',async()=>{
 const h=harness();h.backing.push(stored());await h.c.refresh();h.failHistory(true);await h.c.find();assert.equal(h.researchCalls,0);assert.equal(h.c.state.rows.length,1);assert.equal(h.c.state.ready,false);
});
test('Accept/Pass/reverse survive rediscovery; full history excludes older decisions beyond 100 inputs',async()=>{
 const h=harness();await h.c.find();assert.equal(h.c.state.rows.length,5);const r=h.c.state.rows[0];
 await h.c.decide(r,'passed','scope','Optional');assert.equal(h.creates,0);assert.equal(h.c.state.rows[0].decision,'passed');
 await h.c.find();assert.equal(h.c.state.rows.length,5);assert.equal(h.c.state.rows[0].decision,'passed');
 await h.c.decide(h.c.state.rows[0],'accepted');assert.equal(h.creates,0);await h.c.decide(h.c.state.rows[0],'new');assert.equal(h.c.state.rows[0].decision,'new');
 const older=stored(card(),{id:crypto.randomUUID(),decision:'passed'});h.backing.length=0;h.backing.push(older,...Array.from({length:105},(_,i)=>stored({...card(),original_url:`https://employer.com/jobs/${i}`,discovery_url:`https://employer.com/jobs/${i}`},{id:crypto.randomUUID(),decision:'passed',updated_at:'2026-10-17T00:00:00Z'})));
 assert.equal(decisionInputs(h.backing).length,100);assert.ok(!decisionInputs(h.backing).some(d=>d.original_url===older.snapshot.original_url));await h.c.find();assert.equal(h.c.state.rows.filter(r=>r.identity_key===older.identity_key).length,1);assert.equal(h.c.state.rows.find(r=>r.id===older.id).decision,'passed');
});
test('failed decisions retain pending choice and optional reason for retry',async()=>{
 const h=harness();h.backing.push(stored());await h.c.refresh();h.failWrite(true);await h.c.decide(h.c.state.rows[0],'passed','scope','Keep this');assert.equal(h.c.state.rows[0].decision,'new');assert.equal(h.c.state.pending.get(id).note,'Keep this');h.failWrite(false);await h.c.decide(h.c.state.rows[0],'passed','scope','Keep this');assert.equal(h.c.state.rows[0].decision,'passed');assert.equal(h.c.state.pending.size,0);
});
test('research failures and partial output preserve saved cards; partial leads require explicit save',async()=>{
 for(const mode of ['failed','partial','empty']) {
  const h=harness({research:async()=>feedResponse(mode)});h.backing.push(stored());await h.c.refresh();await h.c.find();assert.ok(h.c.state.rows.some(r=>r.id===id));assert.equal(h.c.state.rows.length,1);
  if(mode==='partial'){assert.equal(h.c.state.partial.length,5);await h.c.keepPartial(h.c.state.partial[0]);assert.equal(h.backing.length,2);}
 }
});
test('failed result persistence retries without another research request',async()=>{
 const h=harness();h.failWrite(true);await h.c.find();assert.equal(h.c.state.unsaved.length,5);assert.equal(h.researchCalls,1);await h.c.find();assert.equal(h.researchCalls,1);h.failWrite(false);await h.c.retrySave();assert.equal(h.c.state.rows.length,5);assert.equal(h.researchCalls,1);
});
test('explicit handoff reconciles lost link response, creates once and preserves existing Tracker state',async()=>{
 const h=harness();h.backing.push(stored(card(),{decision:'accepted'}));await h.c.refresh();
 const original=h.data.link;let first=true;h.data.link=async(...args)=>{if(first){first=false;throw new Error('lost response');}return original(...args);};
 await h.c.handoff(h.c.state.rows[0]);assert.equal(h.creates,1);assert.equal(h.c.state.rows[0].prospect_id,null);await h.c.handoff(h.c.state.rows[0]);assert.equal(h.creates,1);assert.equal(h.c.state.rows[0].prospect_id,id);assert.deepEqual(h.calls,[owner]);
 const existing=harness();existing.backing.push(stored(card(),{decision:'accepted'}));existing.trackerRows.push({id:other,company:'Example Studio',title:'Designer',job_url:card().original_url,status:'interviewing'});await existing.c.refresh();await existing.c.handoff(existing.c.state.rows[0]);assert.equal(existing.creates,0);assert.equal(existing.c.state.rows[0].prospect_id,other);assert.equal(existing.trackerRows[0].status,'interviewing');
});
test('possible duplicates require explicit resolution; exact tracked roles are not reintroduced as new',async()=>{
 const h=harness();h.backing.push(stored(card(),{decision:'accepted'}));h.trackerRows.push({id:other,company:card().facts.company,title:card().facts.job_title,job_url:null,location:'United States',status:'applied'});await h.c.refresh();await h.c.handoff(h.c.state.rows[0]);assert.equal(h.creates,0);assert.ok(h.c.state.handoffChoices.has(id));await h.c.handoff(h.c.state.rows[0],other);assert.equal(h.c.state.rows[0].prospect_id,other);
 const exact=harness();exact.trackerRows.push({id:other,company:'Example',title:'Designer',job_url:card().original_url,status:'applied'});await exact.c.find();assert.equal(exact.c.state.rows.length,4);
});
test('disposing during research or history reads prevents late cards and subsequent writes',async()=>{
 let resolve;const pending=new Promise(done=>resolve=done);const h=harness({research:()=>pending});const p=h.c.find();await new Promise(done=>setTimeout(done,0));h.c.dispose();resolve(feedResponse());await p;assert.equal(h.backing.length,0);assert.equal(h.c.state.rows.length,0);
});

test('real SDK / SQL persistence survives reload, preserves decisions, guarded writes and explicit Tracker handoff',async()=>{
 const f=await startFixture();const client=createClient(f.origin,'sb_publishable_synthetic',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 try{
  assert.equal((await client.auth.signInWithPassword({email:'radar@example.invalid',password:'fixture-only-password'})).error,null);
  const data=createOpportunityData(client),tracker=createRadarDataAccess(client);
  const saved=await data.insert(owner,card(),id);assert.equal(saved.owner_id,owner);
  const passed=await data.decide(saved,'passed','scope','Optional reason');assert.equal((await createOpportunityData(client).load(owner))[0].decision,'passed');
  await assert.rejects(data.decide(saved,'accepted'),/changed elsewhere/);
  const accepted=await data.decide(passed,'accepted');assert.equal(accepted.pass_note,null);
  const c=createFeedController({owner,data,tracker,loadProfile:async()=>({revision:1,reviewed_at:'2026-10-16'}),onChange:()=>{}});await c.refresh();assert.equal((await tracker.listProspectIdentities()).length,0);await c.handoff(accepted);
  assert.equal((await data.load(owner))[0].prospect_id,id);assert.equal((await tracker.listProspectIdentities()).length,1);assert.equal((await tracker.listStatusEvents(id)).length,1);await c.handoff(c.state.rows[0]);assert.equal((await tracker.listStatusEvents(id)).length,1);
  const reversed=await data.decide(c.state.rows[0],'new');assert.equal(reversed.prospect_id,id);assert.equal((await tracker.getProspect(id)).status,'prospect');
  const duplicate=await data.insert(owner,card(),crypto.randomUUID());assert.equal(duplicate.id,id);assert.equal((await data.load(owner)).length,1);
 }finally{await client.auth.signOut({scope:'local'});await f.close();}
});

test('generic tracking aliases share Tracker identity; several exact matches require a resolvable explicit choice',async()=>{
 const h=harness();const s={...card(),original_url:'https://employer.com/jobs/123?utm_source=radar',discovery_url:'https://employer.com/jobs/123?utm_source=radar'};
 h.backing.push(stored(s,{decision:'accepted'}));
 h.trackerRows.push({id:other,company:'Example Studio',title:'Designer',job_url:'https://employer.com/jobs/123?utm_source=tracker',status:'applied'},{id:'33333333-3333-4333-8333-333333333333',company:'Example Studio',title:'Designer',job_url:'https://employer.com/jobs/123',status:'interviewing'});
 await h.c.refresh();await h.c.handoff(h.c.state.rows[0]);assert.equal(h.creates,0);assert.equal(h.c.state.handoffChoices.get(id).length,2);
 await h.c.handoff(h.c.state.rows[0],other);assert.equal(h.c.state.rows[0].prospect_id,other);assert.equal(h.creates,0);
});

test('a profile revision change during research prevents result persistence',async()=>{
 let reads=0;const h=harness({loadProfile:async()=>({revision:++reads,reviewed_at:'2026-10-16'})});await h.c.find();assert.equal(h.backing.length,0);assert.equal(h.c.state.phase,'error');
});

test('failed read after research blocks merging without discarding saved cards',async()=>{
 const h=harness({research:async()=>{h.failHistory(true);return feedResponse();}});h.backing.push(stored());await h.c.find();assert.equal(h.backing.length,1);assert.equal(h.c.state.rows[0].id,id);assert.equal(h.c.state.ready,false);
});

test('a lost response after the Radar link committed reconciles as success, with no duplicate Tracker write',async()=>{
 const h=harness();h.backing.push(stored(card(),{decision:'accepted'}));await h.c.refresh();const original=h.data.link;let first=true;
 h.data.link=async(...args)=>{const row=await original(...args);if(first){first=false;throw new Error('response lost after commit');}return row;};
 await h.c.handoff(h.c.state.rows[0]);assert.equal(h.c.state.phase,'error');await h.c.handoff(h.c.state.rows[0]);assert.equal(h.c.state.phase,'ready');assert.equal(h.c.state.rows[0].prospect_id,id);assert.equal(h.creates,1);
});
