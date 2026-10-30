import { makeCharacter, animateCharacter, disposeCharacter } from './characters.js';
import { healingAnchor } from './chain-heal.js';

// Solo practice raid members previously existed only in the health frames.
export class HealingTargets {
  constructor(arena){this.arena=arena;this.models=new Map();this.raid=null;}
  update(raid,dt=0){
    if(this.raid!==raid){
      for(const model of this.models.values()){this.arena.scene.remove(model);disposeCharacter(model);}
      this.models.clear();this.raid=raid;
      if(raid&&!raid.real){
        const units=raid.units.filter(u=>!u.me);
        units.forEach((unit,i)=>{
          const race=unit.cls==='druid'?'RaceTauren':unit.cls==='shaman'?'RaceTroll':'RaceHuman';
          const model=makeCharacter({race,classId:unit.cls});
          model.name=unit.name;
          model.userData.healingUnit=unit.id;
          const x=(i%3-1)*3.2,z=-4-Math.floor(i/3)*3;
          model.position.set(x,this.arena.groundY(x,z),z);
          this.arena.scene.add(model);this.models.set(unit.id,model);
        });
      }
    }
    for(const [id,model]of this.models){
      const unit=raid.unit(id);model.userData.anim.dead=raid.isDead(unit);
      animateCharacter(model,{dt,speed:0,combat:false});
    }
  }
  anchor(id,state,hands=false){
    const raid=state.fight?.raid,unit=raid?.unit(id);
    if(id==='me'||unit?.me)return healingAnchor(this.arena.player,hands);
    if(id===state.tankBot?.id)return healingAnchor(this.arena.tank);
    const model=state.raidBots?.find(b=>b.id===id)?.model || state.group?.views.get(id)?.model || this.models.get(id);
    return healingAnchor(model);
  }
}
