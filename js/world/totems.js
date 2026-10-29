import * as THREE from 'three';
import {allowedClasses} from './appearance.js';
import {material,mesh,ellipsoid,block,joint,bone,curve,horn,setup,finish} from './companion-shapes.js';

export const TOTEM_ELEMENTS=Object.freeze(['earth','fire','water','air']);
export const TOTEM_RACES=Object.freeze(['RaceOrc','RaceTauren','RaceTroll','RaceDwarf','RaceWindshaperSkyborne']);
const accents={earth:0x95a658,fire:0xe9843b,water:0x62bcd5,air:0xb9a3df};

export function buildTotem(element='earth',{race='RaceOrc'}={}) {
  if(!TOTEM_ELEMENTS.includes(element))throw new RangeError('Unknown totem element: '+element);
  if(!TOTEM_RACES.includes(race)||!allowedClasses(race).includes('shaman'))throw new RangeError('No shaman totem model for '+race);
  const root=setup(element,'totem'),{body,rig}=root.userData;root.userData.race=race;
  const dwarf=race==='RaceDwarf',sky=race==='RaceWindshaperSkyborne',troll=race==='RaceTroll',tauren=race==='RaceTauren';
  const wood=material(dwarf?0x727b83:sky?0xd2c8b0:tauren?0x805335:0x624333),dark=material(0x343c42),trim=material(dwarf?0xb89452:sky?0x8d9c80:0xc5a275),paint=material(accents[element]),glow=material(accents[element],accents[element]);
  mesh(body,new THREE.CylinderGeometry(.23,.28,.12,8),dark,[0,.06,0]);
  mesh(body,new THREE.CylinderGeometry(dwarf?.18:.14,dwarf?.20:.18,.69,dwarf?6:8),wood,[0,.43,0]);
  for(const y of [.18,.53,.72])mesh(body,new THREE.CylinderGeometry(.185,.185,.055,8),trim,[0,y,0]);
  // Carved front face and painted elemental panels, readable at gameplay distance.
  block(body,paint,[0,.42,.158],[.20,.25,.025]);
  for(const s of [-1,1]){const brow=block(body,trim,[s*.06,.57,.17],[.10,.035,.035]);brow.rotation.z=-s*.25;ellipsoid(body,glow,[s*.055,.52,.182],[.024,.017,.01]);}
  horn(body,trim,[0,.50,.18],[0,.40,.23],.035);
  block(body,dark,[0,.34,.184],[.10,.025,.015]);
  if(tauren){
    bone(body,wood,[-.38,.69,0],[.38,.69,0],.09);
    for(const s of [-1,1]){
      curve(body,trim,[[s*.15,.78,0],[s*.30,.81,0],[s*.37,.96,-.02]],.04);
      bone(body,dark,[s*.31,.66,0],[s*.31,.43,0],.012);
      ellipsoid(body,paint,[s*.31,.40,0],[.04,.10,.018]);
    }
  } else if(troll){
    block(body,wood,[0,.55,.04],[.33,.43,.16]);
    for(const s of [-1,1]){horn(body,trim,[s*.12,.37,.16],[s*.18,.65,.24],.047);ellipsoid(body,glow,[s*.08,.61,.13],[.035,.025,.015]);}
    for(let i=-1;i<=1;i++)horn(body,paint,[i*.06,.76,0],[i*.13,1.02-Math.abs(i)*.06,-.05],.065);
  } else if(dwarf){
    block(body,wood,[0,.77,0],[.49,.17,.27]);
    block(body,trim,[0,.78,.14],[.13,.13,.02]);
    for(const s of [-1,1])block(body,trim,[s*.18,.77,0],[.06,.18,.29]);
  } else if(sky){
    for(const s of [-1,1])curve(body,trim,[[s*.12,.60,0],[s*.29,.79,0],[s*.20,.99,0],[s*.09,1.02,0]],.035);
    mesh(body,new THREE.OctahedronGeometry(.12),glow,[0,.88,0],[.65,1.35,.65]);
  } else {
    for(const s of [-1,1]){horn(body,trim,[s*.11,.70,0],[s*.29,.93,0],.075);block(body,dark,[s*.15,.63,0],[.09,.09,.22]);}
  }
  const aura=joint(body,[0,1.03,0]);rig.aura=aura;
  if(element==='fire')for(let i=-1;i<=1;i++){const flame=ellipsoid(aura,glow,[i*.07,.07,0],[.06,.14-Math.abs(i)*.035,.055]);flame.rotation.z=-i*.30;}
  if(element==='water'){
    const drop=mesh(aura,new THREE.SphereGeometry(.085,10,8),glow,[0,.03,0],[1,1.25,1]);horn(aura,glow,[0,.06,0],[0,.22,0],.07);rig.pulse=drop;
  }
  if(element==='earth')mesh(aura,new THREE.OctahedronGeometry(.12),paint,[0,.04,0],[1,.8,1]);
  if(element==='air')for(let i=0;i<2;i++){const ring=mesh(aura,new THREE.TorusGeometry(.12-i*.03,.014,6,24),glow,[0,.035+i*.1,0]);ring.rotation.x=Math.PI/2+i*.35;}
  rig.groundRing=mesh(body,new THREE.TorusGeometry(.34,.012,5,32),paint,[0,.016,0]);rig.groundRing.rotation.x=Math.PI/2;
  return finish(root);
}
