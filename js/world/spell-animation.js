// Cosmetic spell poses. Class controllers own cast success, interrupts, targets and damage.
import * as THREE from 'three';
import {poseArm} from './ranged-animation.js';
export const SPELL_COLORS=Object.freeze({fire:0xff793c,frost:0x73d7ff,arcane:0xc787ff,nature:0x76de83,holy:0xffdd78,shadow:0x864ed0});

export function stopSpell(model) {
  const fx=model.userData.spellEffects;if(!fx)return;
  fx.group.visible=false;
  for(const [weapon,visible]of fx.held)weapon.visible=visible;
  fx.held=[];model.userData.spell=null;
}
export function startSpell(model,{mode='cast',color='arcane',duration=mode==='instant'?.55:mode==='channel'?3:2}={}) {
  if(!['instant','cast','channel'].includes(mode))throw new RangeError('Unknown spell pose: '+mode);
  if(!Object.hasOwn(SPELL_COLORS,color))throw new RangeError('Unknown spell color: '+color);
  if(!Number.isFinite(duration)||duration<=0)throw new RangeError('Spell duration must be positive');
  stopSpell(model);if(model.userData.anim.dead)return;
  let fx=model.userData.spellEffects;
  if(!fx){
    const group=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:SPELL_COLORS[color],transparent:true,opacity:.8,depthWrite:false});
    const hands=['R','L'].map(()=>{const g=new THREE.Group(),orb=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),material),ring=new THREE.Mesh(new THREE.TorusGeometry(.105,.009,6,24),material);g.add(orb,ring);group.add(g);return {g,orb,ring};});
    const burst=new THREE.Mesh(new THREE.TorusGeometry(.12,.016,6,28),material);group.add(burst);
    model.userData.body.add(group);fx=model.userData.spellEffects={group,material,hands,burst,held:[]};
  }
  fx.material.color.setHex(SPELL_COLORS[color]);fx.group.visible=true;
  fx.held=['R','L'].map(side=>model.userData.rig['weapon'+side]).filter(Boolean).map(w=>[w,w.visible]);
  model.userData.spell={mode,color,duration,elapsed:0};
  for(const key of ['mh','oh','ranged','spin','cheer'])model.userData.anim[key]=0;
  const ranged=model.userData.rangedEffects;if(ranged){ranged.flight.visible=ranged.flash.visible=false;ranged.released=false;}
}
export function animateSpell(model,dt) {
  const d=model.userData,spell=d.spell;if(!spell)return;
  if(d.anim.dead){stopSpell(model);return;}
  spell.elapsed+=Math.max(0,Number.isFinite(dt)?dt:0);
  if(spell.elapsed>=spell.duration){stopSpell(model);return;}
  const j=d.rig,fx=d.spellEffects,p=spell.elapsed/spell.duration,t=spell.elapsed;
  for(const [w]of fx.held)w.visible=false;
  if(d.rangedEffects)d.rangedEffects.flight.visible=d.rangedEffects.flash.visible=false;
  // Casting gathers both palms; channels sustain an outstretched stance; instant spells thrust once.
  const release=spell.mode==='instant'?Math.sin(Math.PI*p):spell.mode==='cast'?THREE.MathUtils.smoothstep(p,.78,1):0;
  j.spine.rotation.y=spell.mode==='instant'?-.12*release:0;
  for(const [i,side]of ['R','L'].entries()){
    const sign=side==='R'?-1:1,channel=spell.mode==='channel';
    poseArm(j,side,new THREE.Vector3(sign*(channel?.22:.18),channel?.34:.28+.06*Math.sin(t*3+i),channel?.43:.29+.16*release),new THREE.Vector3(sign,-1,0));
    j['wrist'+side].rotation.set(-.35,0,sign*.2);
  }
  d.body.updateWorldMatrix(true,true);
  for(const [i,side]of ['R','L'].entries()){
    const h=fx.hands[i];h.g.position.copy(d.body.worldToLocal(j['wrist'+side].getWorldPosition(new THREE.Vector3())));h.g.position.z+=.055;
    const pulse=spell.mode==='channel'?1+.15*Math.sin(t*12+i):.65+.5*p;
    h.orb.scale.setScalar(pulse);h.ring.rotation.set(t*2+i,t*3,0);h.ring.scale.setScalar(pulse);
  }
  fx.burst.visible=spell.mode==='instant'||spell.mode==='channel'||p>.78;
  fx.burst.position.copy(fx.hands[0].g.position).lerp(fx.hands[1].g.position,.5);fx.burst.position.z+=.12;
  fx.burst.scale.setScalar(spell.mode==='channel'?1.1+.25*Math.sin(t*9):1+release*2);
  fx.material.opacity=spell.mode==='instant'?.9*(1-p):.65+.2*Math.sin(t*5)**2;
}
