// Entirely fictional. Offline responses only; no publisher descriptions, personal profile or API calls.
export function feedResponse(mode='completed',revision=1) {
  const facts={company:'Example Studio',job_title:'Lead Product Designer',location:'United States',remote_eligibility:null,compensation_text:'USD 175,000–200,000 annually'};
  const offset=mode==='partial'?200:mode==='fresh'?300:mode==='untrusted'?400:100;
  const cards=Array.from({length:5},(_,i)=>({facts:i%2?{...facts,company:null,location:null,compensation_text:null}:{...facts,company:`Example Studio ${i+1}`},claims:{...facts,company:`Example Studio ${i+1}`,location:'US remote (AI claim)'},original_url:`https://job-boards.greenhouse.io/fictional/jobs/${i+offset}`,discovery_url:`https://job-boards.greenhouse.io/fictional/jobs/${i+offset}`,
    evidence:[{field:'job_title',url:`https://job-boards.greenhouse.io/fictional/jobs/${i+offset}`,support:'Example role',origin:'ai_discovery'}],
    assessment:{why_fit:['Hands-on design scope may fit the reviewed profile.'],concerns_or_unknowns:['Geographic remote eligibility needs clarification.'],wildcard_rationale:i===4?'Adjacent sector with relevant design scope.':null},
    verification:{availability:i%2?'uncertain':'appears_available',consultation:'search_only',reason:i%2?'unsupported_check_destination':'structured_posting_retrieved',checked_at:'2026-10-16T15:00:00Z',application:{status:i%2?'not_established':'control_visible',url:null}}}));
  if(mode==='untrusted'){cards[0].facts.company='<img src=x onerror=alert(1)>';cards[0].assessment.why_fit=['<script>alert(1)</script>'];}
  return {id:'99999999-9999-4999-8999-999999999999',timestamp:'2026-10-16T15:00:00Z',profile_revision:revision,status:mode==='partial'?'partial':mode==='failed'?'failed':'completed',opportunities:mode==='empty'||mode==='failed'?[]:cards,estimated_cost:{usd:0.04,confirmed:false}};
}
