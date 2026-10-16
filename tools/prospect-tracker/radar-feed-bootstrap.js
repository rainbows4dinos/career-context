import { getRadarClient } from './supabase-client.js';
import { mountRadarFeed } from './radar-feed-app.js';
import { RESEARCH_ENABLED, researchOpportunities } from './radar-research-client.js';
const root=document.getElementById('radar-feed');
if(root) {
  try {const client=await getRadarClient();await mountRadarFeed(root,{client,research:RESEARCH_ENABLED?(revision,rows,signal)=>researchOpportunities(client,revision,rows,signal):undefined});}
  catch{root.textContent='Career Radar could not connect. Check the public Supabase configuration and reload.';}
}
