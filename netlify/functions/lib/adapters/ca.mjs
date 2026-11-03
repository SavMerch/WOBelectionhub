// California SOS Election Night feed. Endpoint from the SOS API guide (api.sos.ca.gov/returns/governor).
// UNTESTED against a live response: shape handling is defensive, and anything unrecognized throws,
// so bad data is never published. Verify with: node scripts/probe.mjs CA
export const id='CA';
export const url='https://api.sos.ca.gov/returns/governor';
export async function fetchRaces(fetchImpl=fetch){
  const res=await fetchImpl(url,{headers:{accept:'application/json'}});
  if(!res.ok)throw new Error('CA feed HTTP '+res.status);
  return parse(await res.json());
}
export function parse(j){
  const root=Array.isArray(j)?j[0]:j;
  const list=root?.Candidates||root?.candidates||root?.candidateList;
  if(!Array.isArray(list))throw new Error('CA: unrecognized response shape');
  return[{state:'CA',office:'Governor',sourceName:'California Secretary of State',sourceUrl:'https://electionresults.sos.ca.gov/',
    sourceUpdated:root.lastUpdated||root.LastUpdated||null,reportingPct:root.precinctsReportingPct??root.PrecinctsReportingPct??null,
    candidates:list.map(c=>({name:c.Name||c.name,party:c.Party||c.party,votes:c.Votes??c.votes,pct:c.Percent??c.percent}))}];
}
