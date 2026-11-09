import assert from 'node:assert/strict';
import {Unit} from '../js/engine/unit.js';
import {EnhancementFight} from '../js/classes/shaman/enhancement.js';
import {FeralFight} from '../js/classes/druid/feral.js';
import {WINDFURY} from '../js/data/buffs.js';
// A stand-in fight with the class's Windfury methods: maybeWindfury, windfuryTotemAp, windfuryAttack.
const fight=(Class,{ap=300,roll=0,maul=false,t=0,A={}}={})=>{
  const ctx={c:{windfuryAp:ap},t,A,rng:()=>roll,events:[],swings:[],emit(e){this.events.push(e);},whiteSwing(...args){this.swings.push(args);},totemUp:()=>false,maul:()=>maul};
  for(const k of ['maybeWindfury','windfuryTotemAp','windfuryAttack','windfuryAttackPower','spendWindfury'])ctx[k]=Class.prototype[k];
  return ctx;
};
for(const [name,Class]of [['base',Unit],['enhancement',EnhancementFight],['feral',FeralFight]]){
  for(const roll of [0,1]){
    const f=fight(Class,{roll});
    f.maybeWindfury();
    assert.equal(f.events.length,roll===0?1:0,name+' successful rolls only');
    assert.equal(f.swings.length,roll===0?1:0,name+' one extra attack');
    if(f.events.length){
      assert.equal(f.events[0].type,'windfuryProc');
      assert.equal(f.windfuryAttackPower(),300,name+' attack power up with its charges');
      f.spendWindfury();f.spendWindfury();
      assert.equal(f.windfuryAttackPower(),0,name+' two autos spend it');
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
const late=fight(Unit);late.maybeWindfury();late.t=WINDFURY.duration;
assert.equal(late.windfuryAttackPower(),0,'gone after its second');
const bear=fight(FeralFight,{maul:true});bear.maybeWindfury();
assert.equal(bear.events.length,1);assert.equal(bear.swings.length,0,'a queued Maul takes the Windfury attack');
console.log('PASS: proc paths, failed rolls, absent buffs, charges, cooldown, ability rule and Maul replacement.');
