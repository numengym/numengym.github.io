import assert from 'node:assert/strict';
import {Unit} from '../js/engine/unit.js';
import {EnhancementFight} from '../js/classes/shaman/enhancement.js';
import {FeralFight} from '../js/classes/druid/feral.js';
for(const [name,Class]of [['base',Unit],['enhancement',EnhancementFight],['feral',FeralFight]]){
  for(const roll of [0,1]){
    const events=[],swings=[];
    const context={c:{windfuryAp:300},rng:()=>roll,emit:e=>events.push(e),whiteSwing:(...args)=>swings.push(args),totemUp:()=>false,maul:()=>false};
    Class.prototype.maybeWindfury.call(context);
    assert.equal(events.length,roll===0?1:0,name+' successful rolls only');
    assert.equal(swings.length,roll===0?1:0,name+' attack unchanged');
    if(events.length)assert.equal(events[0].type,'windfuryProc');
  }
  const events=[];
  Class.prototype.maybeWindfury.call({c:{windfuryAp:0},rng:()=>0,emit:e=>events.push(e),totemUp:()=>false});
  assert.equal(events.length,0,name+' no buff, no effect');
}
let emitted=0,swung=0;
FeralFight.prototype.maybeWindfury.call({c:{windfuryAp:300},rng:()=>0,emit:()=>emitted++,maul:()=>true,whiteSwing:()=>swung++});
assert.equal(emitted,1);assert.equal(swung,0);
console.log('PASS: all three proc paths, failed rolls, absent buffs, and Maul replacement.');
