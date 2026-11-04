import test from 'node:test';import assert from 'node:assert/strict';
import vendors,{cleanVendor,cleanLink} from '../netlify/functions/vendors.mjs';
const mem=()=>{const m=new Map();return {m,get:async k=>m.get(k)??null,setJSON:async(k,v)=>{m.set(k,v)}}};
const mk=(q,b)=>new Request('https://x.test/api/vendors?'+q,{method:'POST',body:JSON.stringify(b)});
test('cleanVendor validates state, category, firm and https contract link',()=>{
  const ok={state:'oh',category:'audit',firm:'CLA',contractUrl:'https://example.gov/c/1'};
  assert.equal(cleanVendor(ok).state,'OH');
  for(const bad of [{...ok,contractUrl:'http://x.gov'},{...ok,contractUrl:''},{...ok,category:'legal'},{...ok,firm:''},{...ok,state:'Ohio'}])assert.equal(cleanVendor(bad),null);
  assert.equal(cleanLink({state:'ca',url:'http://x'}),null);assert.ok(cleanLink({state:'ca',url:'https://x.gov/data.xlsx'}))});
test('vendors endpoint: token gate, add, dedupe, import, remove, link, public GET',async()=>{
  process.env.REFRESH_TOKEN='t';const st=mem();
  assert.equal((await vendors(mk('token=no',{}),{},{store:st})).status,403);
  const v={action:'add',state:'OH',category:'emergency',firm:'Tetra Tech',contractUrl:'https://example.gov/c/1'};
  assert.equal((await vendors(mk('token=t',v),{},{store:st})).status,200);
  const dup=await (await vendors(mk('token=t',{action:'import',rows:[v,{...v,firm:'IEM'},{firm:'bad'}]}),{},{store:st})).json();
  assert.equal(dup.added,1);assert.equal(dup.skipped,2);
  assert.equal((await vendors(mk('token=t',{...v,contractUrl:'ftp://x'}),{},{store:st})).status,400);
  const g=await (await vendors(new Request('https://x.test/api/vendors'),{},{store:st})).json();assert.equal(g.vendors.OH.length,2);
  await vendors(mk('token=t',{action:'link',state:'OH',url:'https://data.ohio.gov/c.csv'}),{},{store:st});
  assert.equal((await (await vendors(new Request('https://x.test/api/vendors'),{},{store:st})).json()).links.OH.length,1);
  await vendors(mk('token=t',{action:'remove',id:g.vendors.OH[0].id}),{},{store:st});assert.equal(st.m.get('manual-vendors').length,1)});
test('fetch action returns csv text and rejects pages',async()=>{
  process.env.REFRESH_TOKEN='t';const st=mem();
  const csv=await (await vendors(mk('token=t',{action:'fetch',url:'https://x.gov/a.csv'}),{},{store:st,safeFetch:async()=>({buf:Buffer.from('a,b\n1,2'),ct:'text/csv',url:'https://x.gov/a.csv'})})).json();assert.equal(csv.kind,'csv');
  assert.equal((await vendors(mk('token=t',{action:'fetch',url:'https://x.gov/p'}),{},{store:st,safeFetch:async()=>({buf:Buffer.from('<html>'),ct:'text/html',url:'https://x.gov/p'})})).status,422)});
