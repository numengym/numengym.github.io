import assert from 'node:assert/strict';
import {Unit} from '../js/engine/unit.js';
import {EnhancementFight} from '../js/classes/shaman/enhancement.js';
import {FeralFight} from '../js/classes/druid/feral.js';
// A stand-in fight with the class's Windfury methods: maybeWindfury, windfuryTotemAp. The strike itself (windfuryAttack)
// is counted here and checked below.
const fight=(Class,{ap=300,roll=0,t=0,A={}}={})=>{
  const ctx={c:{windfuryAp:ap},t,A,rng:()=>roll,events:[],strikes:0,emit(e){this.events.push(e);},windfuryAttack(){this.strikes++;},totemUp:()=>false};
  for(const k of ['maybeWindfury','windfuryTotemAp'])ctx[k]=Class.prototype[k];
  return ctx;
};
for(const [name,Class]of [['base',Unit],['enhancement',EnhancementFight],['feral',FeralFight]]){
  for(const roll of [0,1]){
    const f=fight(Class,{roll});
    f.maybeWindfury();
    assert.equal(f.events.length,roll===0?1:0,name+' successful rolls only');
    assert.equal(f.strikes,roll===0?1:0,name+' one strike');
    if(f.events.length){
      assert.equal(f.events[0].type,'windfuryProc');
      assert.equal(f.wfAp,300,name+' the strike takes the totem\'s attack power');
    }
  }
  const off=fight(Class,{ap:0});off.maybeWindfury();
  assert.equal(off.events.length,0,name+' no buff, no effect');
  const icd=fight(Class);icd.maybeWindfury();icd.maybeWindfury();
  assert.equal(icd.events.length,1,name+' 100 ms between procs');
  const special=fight(Class,{A:{bloodthirst:{spellId:23894},mortalStrike:{spellId:21553}}});
  special.maybeWindfury('bloodthirst');
  assert.equal(special.events.length,0,name+' an ability that neither requires a main hand nor replaces the swing');
  special.maybeWindfury('mortalStrike');
  assert.equal(special.events.length,1,name+' Mortal Strike rolls it');
}
// The strike (wowsims 91aeeee): a main-hand special with the totem's attack power, swing rage when it lands, no swing.
for(const outcome of ['hit','crit','dodge']){
  const calls=[];
  const s={target:{dead:false},wfAp:246,via:null,landed:(o)=>o==='hit'||o==='crit',
    rollYellow:(hand)=>{calls.push(['roll',hand]);return outcome;},
    weaponDamage:(hand,norm,bonus)=>{calls.push(['weapon',hand,norm,bonus]);return 100;},
    deal:(key,name,raw,o,t,opts)=>calls.push(['deal',key,raw,opts.yellow]),
    onWindfuryHit:(o)=>calls.push(['rage',o]),
    afterMelee:(o,t,ctx)=>calls.push(['after',ctx.windfury,ctx.white]),
    whiteSwing:()=>calls.push(['swing'])};
  Unit.prototype.windfuryAttack.call(s);
  const landed=outcome!=='dodge';
  assert.deepEqual(calls[0],['roll','mh'],'the special table');
  assert.ok(!calls.some((c)=>c[0]==='swing'),'no extra swing');
  assert.deepEqual(calls.find((c)=>c[0]==='deal'),['deal','windfury',landed?100:0,true],outcome+' damage');
  if(landed)assert.deepEqual(calls.find((c)=>c[0]==='weapon'),['weapon','mh',false,246],'weapon damage with +246 attack power');
  assert.equal(calls.some((c)=>c[0]==='rage'),landed,outcome+' swing rage only when it lands');
  assert.deepEqual(calls.at(-1),['after',true,undefined],'procs, marked as the Windfury strike, not white');
  assert.equal(s.via,null,'via restored');
}
console.log('PASS: proc paths, failed rolls, absent buffs, cooldown, ability rule and the strike.');
