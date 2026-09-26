import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const script=await readFile(new URL('../site/assets/site.js',import.meta.url),'utf8');
const data=JSON.parse(await readFile(new URL('../site/content/jaren-lockhart.json',import.meta.url),'utf8'));
// Run the actual enhancement script against only the DOM surface it uses.
function fixture(kind) {
 const node=extra=>({hidden:false,listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},...extra});
 const input=node({value:'',focus(){this.focused=true;}});
 const categories=kind==='sources'?['all','Court record','Official account','Reporting','Archive']:['all','Court proceedings','Archive updates'];
 const buttons=categories.map(category=>node({dataset:{filter:category},setAttribute(name,value){this[name]=value;}}));
 const rows=(kind==='sources'?data.sources:data.timeline).map(item=>node({id:item.id,dataset:{category:item.type||item.category},textContent:Object.values(item).join(' '),scrollIntoView(){this.scrolled=true;}}));
 const count=node({textContent:''}),empty=node(),reset=node();
 const bar=node({querySelector:()=>input,querySelectorAll:()=>buttons});
 const list={querySelector:selector=>({'.filter-bar':bar,'.result-count':count,'.empty-state':empty,'.reset-filters':reset,'.timeline':kind==='timeline'?{}:null})[selector],querySelectorAll:()=>rows};
 const window=node({location:{hash:''}});
 const document={querySelectorAll:selector=>selector==='[data-filter-list]'?[list]:[]};
 runInNewContext(script,{document,window});
 return {input,buttons,rows,count,empty,reset,window};
}
test('history-restored search updates rows and count on pageshow for sources and timeline',()=>{
 for(const [kind,query,expected] of [['sources','WXXV',1],['timeline','Obstruction sentence enhanced',1]]) {
  const f=fixture(kind);
  assert.equal(f.rows.filter(r=>!r.hidden).length,f.rows.length);
  // Browsers restore form values after initial script execution, without input events.
  f.input.value=query;f.window.listeners.pageshow();
  assert.equal(f.rows.filter(r=>!r.hidden).length,expected);
  assert.equal(f.count.textContent,`${expected} of ${f.rows.length} ${kind==='timeline'?'events':'sources'} shown`);
 }
});
test('same-fragment popstate reveals a source hidden by intentional filtering',()=>{
 const f=fixture('sources');f.window.location.hash='#plea-2016';
 f.buttons.find(b=>b.dataset.filter==='Reporting').listeners.click();
 const target=f.rows.find(r=>r.id==='plea-2016');assert.equal(target.hidden,true);
 f.window.listeners.popstate();
 assert.equal(target.hidden,false);assert.equal(target.scrolled,true);
 assert.equal(f.input.value,'');assert.equal(f.count.textContent,'4 of 4 sources shown');
 assert.equal(f.buttons[0]['aria-pressed'],'true');
});
test('empty state, clear filters and changed-fragment navigation remain coherent',()=>{
 const f=fixture('timeline');
 f.input.value='synthetic-no-such-event';f.input.listeners.input();
 assert.equal(f.empty.hidden,false);assert.equal(f.count.textContent,'0 of 13 events shown');
 f.reset.listeners.click();assert.equal(f.empty.hidden,true);assert.equal(f.input.focused,true);
 f.buttons.find(b=>b.dataset.filter==='Archive updates').listeners.click();
 f.window.location.hash='#indictment';f.window.listeners.hashchange();
 assert.equal(f.rows.find(r=>r.id==='indictment').hidden,false);
 assert.equal(f.count.textContent,'13 of 13 events shown');
});
