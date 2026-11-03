import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const D=JSON.parse(readFileSync('data/preelection.json','utf8'));
const html=readFileSync('site/index.html','utf8');
const J=/const J=`([^`]+)`/.exec(html)[1].split('|').map(r=>r.split(','));
test('page script parses',()=>{new Function(html.split('<script>')[1].split('</script>')[0])});
test('36 races, one per state, matching the registry governor flags',()=>{
  assert.equal(D.races.length,36);assert.equal(new Set(D.races.map(r=>r.state)).size,36);
  const TERR=['VI','GU','MP']; // 2026 territory governor races: nominee data not yet collected
  const reg=J.filter(a=>a[3]==='1'&&!TERR.includes(a[0])).map(a=>a[0]).sort();assert.deepEqual(D.races.map(r=>r.state).sort(),reg)});
test('open-seat flags match registry',()=>{for(const r of D.races){const a=J.find(x=>x[0]===r.state);assert.equal(a[4]==='1',r.openSeat,r.state)}});
test('every race has two nominees; polling is sourced and sane',()=>{
  for(const r of D.races){assert.equal(r.candidates.length,2);for(const c of r.candidates)assert.ok(c.name&&['D','R'].includes(c.party));
    if(r.polling){assert.match(r.polling.url,/^https:\/\//);assert.ok(r.polling.asOf);const s=r.polling.avg.reduce((a,b)=>a+b.pct,0);assert.ok(s>60&&s<=101,r.state+' '+s);assert.ok(r.polling.polls.length>=1)}}});
test('stale polling is flagged',()=>{assert.ok(D.races.find(r=>r.state==='FL').polling.stale)});
