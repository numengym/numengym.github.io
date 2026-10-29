// Visual-only API. Combat, ownership, summon timers and following belong to class systems.
import {buildHunterPet,HUNTER_PETS,HUNTER_SUMMONS} from './hunter-pets.js';
import {buildWarlockPet,WARLOCK_PETS} from './warlock-pets.js';
import {buildTotem,TOTEM_ELEMENTS,TOTEM_RACES} from './totems.js';
import {disposeCharacter} from './characters.js';
export {HUNTER_PETS,HUNTER_SUMMONS,WARLOCK_PETS,TOTEM_ELEMENTS,TOTEM_RACES};

export function makeCompanion({category='hunter',kind,race,skin}={}) {
  kind??=category==='warlock'?'imp':category==='totem'?'earth':'wolf';
  if(category==='hunter')return buildHunterPet(kind,{skin});
  if(category==='warlock')return buildWarlockPet(kind);
  if(category==='totem')return buildTotem(kind,{race});
  throw new RangeError('Unknown companion category: '+category);
}

export function animateCompanion(model,{dt=0,speed=0}={}) {
  const {body,rig,anim:a,category,flying,floating,biped}=model.userData;
  dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.1));speed=Number.isFinite(speed)?Math.max(-1,Math.min(1,speed)):0;
  a.time+=dt;a.death=a.dead?Math.min(1,a.death+dt*2):0;
  body.traverse(o=>{if(o.userData.restPosition){o.position.copy(o.userData.restPosition);o.rotation.copy(o.userData.restRotation);}});
  const t=a.time,move=Math.abs(speed),phase=t*(biped?8:11)*Math.sign(speed||1),alive=1-a.death;
  const attack=Math.sin(Math.PI*(1-a.attack)),cast=Math.sin(Math.PI*(1-a.cast));
  if(category==='totem') {
    rig.aura.position.y+=Math.sin(t*2)*.025;rig.aura.rotation.y=t*.35;
    body.scale.setScalar(1-a.death);model.visible=a.death<1;return;
  }
  body.position.y+=(flying?.045*Math.sin(t*4):floating?.045*Math.sin(t*2):Math.abs(Math.sin(phase))*.025*move)*alive;
  body.position.z+=attack*.10*alive;
  body.rotation.x+=(-attack*.14+cast*.08)*alive;
  for(const {node,phase:offset,spider,side,arm} of rig.legs) {
    const gait=Math.sin(phase+offset)*move*(arm?.40:.48)*alive;
    if(spider){node.rotation.y+=gait*.55;node.rotation.z+=Math.cos(phase+offset)*.14*move*side*alive;}
    else node.rotation.x+=gait+(arm?-attack*.9-cast*.8:0)*alive;
  }
  for(const {node,side,folded} of rig.wings)node.rotation.z+=side*(folded?.10*Math.sin(t*2):.48*Math.sin(t*(move?13:8)))*alive;
  for(const [i,node]of rig.tails.entries())node.rotation.y+=Math.sin(t*3+i)*.13*alive;
  for(const {node,side}of rig.claws||[])node.rotation.y-=side*attack*.35*alive;
  if(rig.head){rig.head.rotation.x+=(-attack*.30+Math.sin(t*1.8)*.025)*alive;rig.head.rotation.y+=Math.sin(t*.7)*.035*(1-move)*alive;}
  if(rig.vortex)rig.vortex.rotation.y=t;
  if(rig.castGlow)rig.castGlow.scale.copy(rig.castGlow.userData.restScale).multiplyScalar(1+cast*.5);
  body.rotation.z+=Math.sin(a.hit*Math.PI)*.13;
  body.rotation.x=body.rotation.x*alive-a.death*Math.PI*.48;
  if(flying||floating)body.position.y-=a.death*.38;
  for(const key of ['attack','cast','hit'])a[key]=a.dead?0:Math.max(0,(a[key]||0)-dt*(key==='hit'?3:key==='cast'?1.1:1.8));
}

export function disposeCompanion(model) {disposeCharacter(model);}
