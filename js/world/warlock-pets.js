import * as THREE from 'three';
import {material,mesh,ellipsoid,block,joint,bone,curve,horn,eyes,wing,setup,finish} from './companion-shapes.js';

export const WARLOCK_PETS=Object.freeze(['imp','voidwalker','succubus','incubus','felhunter','infernal','doomguard','felguard']);

function humanoid(root,kind,p) {
  const {body,rig}=root.userData,{skin,dark,metal,ivory,eye,fel}=p;
  const imp=kind==='imp',guard=kind==='doomguard'||kind==='felguard',female=kind==='succubus';
  const scale=imp?.62:guard?1.30:1;
  body.scale.setScalar(scale);root.userData.biped=true;
  ellipsoid(body,skin,[0,1.05,0],[guard?.33:female?.18:.23,.35,.15]);
  ellipsoid(body,skin,[0,.75,0],[female?.21:.19,.17,.15]);
  if(!imp){
    ellipsoid(body,dark,[0,.88,0],[.20,.20,.155]);
    block(body,metal,[0,.81,.16],[.31,.065,.04]);
    if(female)ellipsoid(body,dark,[0,1.16,.08],[.20,.135,.12]);
  }
  const head=joint(body,[0,1.52,0]);rig.head=head;
  ellipsoid(head,skin,[0,0,0],[imp?.18:.145,imp?.19:.20,.13]);
  ellipsoid(head,skin,[0,-.10,.09],[.10,.08,.10]);
  eyes(head,eye,.062,.025,.122,imp?.035:.025);
  for(const s of [-1,1]){
    curve(head,ivory,[[s*.10,.13,0],[s*.20,.25,-.04],[s*.23,.38,-.10],[s*.16,.45,-.12]],.035);
    if(imp)horn(head,skin,[s*.13,.02,0],[s*.39,.08,-.06],.08);
    const arm=joint(body,[s*(guard?.31:.20),1.25,0]);rig.legs.push({node:arm,phase:s===1?Math.PI:0,arm:true});
    bone(arm,skin,[0,0,0],[s*.06,-.28,.01],guard?.105:.065,guard?.09:.05);
    bone(arm,skin,[s*.06,-.28,.01],[s*.10,-.52,.08],guard?.08:.05,.045);
    ellipsoid(arm,skin,[s*.1,-.55,.09],[.065,.09,.055]);
    if(guard){ellipsoid(arm,metal,[s*.02,-.02,0],[.19,.12,.17]);horn(arm,ivory,[s*.06,.04,0],[s*.18,.21,-.03],.07);block(arm,metal,[s*.09,-.41,.04],[.16,.17,.16]);}
    const leg=joint(body,[s*.12,.72,0]);rig.legs.push({node:leg,phase:s===1?0:Math.PI});
    bone(leg,skin,[0,0,0],[0,-.30,.06],.09,.06);bone(leg,skin,[0,-.30,.06],[0,-.59,-.05],.06,.045);
    block(leg,dark,[0,-.66,.025],[.14,.12,.22]);block(leg,ivory,[0,-.67,.137],[.012,.08,.01]);
    if(!imp&&kind!=='felguard') {const w=wing(body,skin,s,{bat:true,size:guard?.92:.60});w.position.set(s*.14,1.30,-.10);w.rotation.y=-s*.30;rig.wings.push({node:w,side:s,folded:true});}
    if((female||kind==='incubus')&&s===-1){curve(arm,dark,[[s*.1,-.60,.09],[-.18,-.68,.25],[-.28,-.50,.50],[-.22,-.10,.68],[-.12,.05,.46]],.018);}
    if(guard&&s===-1){
      bone(arm,metal,[-.10,-.55,-.20],[-.10,-.55,.68],.035);
      const blade=block(arm,metal,[-.10,-.55,.65],[.06,.38,.25]);blade.rotation.x=.3;
      horn(arm,ivory,[-.10,-.69,.65],[-.10,-.83,.77],.07);
    }
    if(imp){const flame=ellipsoid(arm,fel,[s*.10,-.55,.17],[.07,.11,.07]);rig.castGlow=flame;}
  }
  const tail=joint(body,[0,.77,-.12]);rig.tails.push(tail);
  curve(tail,skin,[[0,0,0],[.18,-.19,-.22],[.30,-.12,-.40],[.25,.07,-.48]],.028);
  horn(tail,dark,[.25,.07,-.48],[.23,.20,-.48],.065);
  if(female||kind==='incubus'){
    ellipsoid(head,dark,[0,.10,-.055],[.15,.14,.12]);
    for(const s of [-1,1])ellipsoid(head,dark,[s*.12,-.12,-.045],[.05,.23,.08]);
  }
}
function voidwalker(root,p) {
  const {body,rig}=root.userData;root.userData.floating=true;
  ellipsoid(body,p.skin,[0,1.02,0],[.40,.43,.23]);
  const head=joint(body,[0,1.39,.035]);rig.head=head;ellipsoid(head,p.skin,[0,0,0],[.18,.20,.14]);eyes(head,p.eye,.075,.025,.13,.035);
  for(const s of [-1,1]){
    const arm=joint(body,[s*.33,1.19,0]);rig.legs.push({node:arm,phase:s===1?0:Math.PI,arm:true});
    bone(arm,p.skin,[0,0,0],[s*.15,-.26,.03],.16,.12);bone(arm,p.skin,[s*.15,-.26,.03],[s*.16,-.51,.12],.12,.13);
    block(arm,p.metal,[s*.16,-.39,.08],[.26,.12,.25]);ellipsoid(arm,p.skin,[s*.16,-.56,.14],[.14,.17,.13]);
  }
  const vortex=joint(body);rig.vortex=vortex;
  for(let i=0;i<7;i++){
    const ring=mesh(vortex,new THREE.TorusGeometry(.09+i*.033,.04,6,20),p.skin,[Math.sin(i)*.04,.18+i*.082,0]);ring.rotation.x=Math.PI/2;ring.rotation.y=i*.09;
  }
}
function felhunter(root,p) {
  const {body,rig}=root.userData;
  ellipsoid(body,p.skin,[0,.52,0],[.29,.28,.48]);
  const head=joint(body,[0,.51,.44]);rig.head=head;ellipsoid(head,p.skin,[0,0,0],[.23,.18,.27]);
  ellipsoid(head,p.dark,[0,-.06,.22],[.18,.11,.09]);
  for(const s of [-1,1]){
    for(let i=0;i<4;i++)horn(head,p.ivory,[s*(.04+i*.035),.01,.28],[s*(.04+i*.035),-.13,.30],.023);
    for(const front of [true,false]){
      const leg=joint(body,[s*.22,.48,front?.26:-.29]);rig.legs.push({node:leg,phase:((s===1)===front)?0:Math.PI});
      bone(leg,p.skin,[0,0,0],[s*.09,-.22,-.07],.095,.06);bone(leg,p.skin,[s*.09,-.22,-.07],[s*.10,-.42,.07],.06,.04);
      ellipsoid(leg,p.dark,[s*.10,-.43,.12],[.09,.06,.13]);
    }
    const feeler=joint(body,[s*.18,.72,.15]);rig.tails.push(feeler);
    curve(feeler,p.skin,[[0,0,0],[s*.20,.22,-.08],[s*.31,.40,.05],[s*.25,.42,.28]],.032);
    ellipsoid(feeler,p.fel,[s*.25,.42,.28],[.07,.06,.08]);
    for(let i=0;i<4;i++)horn(body,p.ivory,[s*.16,.74,.1-i*.15],[s*.29,.94,.04-i*.15],.06);
  }
}
function infernal(root,p) {
  const {body,rig}=root.userData;root.userData.biped=true;
  const rock=(parent,pos,scale)=>mesh(parent,new THREE.IcosahedronGeometry(1,1),p.dark,pos,scale);
  ellipsoid(body,p.fel,[0,1,0],[.34,.39,.23]);rock(body,[0,1.1,0],[.43,.40,.28]);rock(body,[0,.69,0],[.28,.20,.23]);
  const head=joint(body,[0,1.60,0]);rig.head=head;rock(head,[0,0,0],[.22,.25,.20]);eyes(head,p.fel,.08,.02,.18,.04);
  for(const s of [-1,1]){
    const arm=joint(body,[s*.42,1.25,0]);rig.legs.push({node:arm,phase:s===1?Math.PI:0,arm:true});
    rock(arm,[s*.06,-.10,0],[.24,.25,.22]);ellipsoid(arm,p.fel,[s*.12,-.31,0],[.13,.13,.13]);rock(arm,[s*.16,-.48,.05],[.17,.25,.18]);rock(arm,[s*.18,-.69,.10],[.20,.18,.19]);
    const leg=joint(body,[s*.18,.61,0]);rig.legs.push({node:leg,phase:s===1?0:Math.PI});
    rock(leg,[0,-.13,0],[.15,.23,.17]);ellipsoid(leg,p.fel,[0,-.31,0],[.10,.11,.1]);rock(leg,[0,-.45,.03],[.13,.18,.14]);rock(leg,[0,-.56,.10],[.17,.08,.23]);
    for(let i=0;i<3;i++)horn(body,p.fel,[s*(.20+i*.09),1.28,0],[s*(.23+i*.12),1.56+i*.05,-.03],.07);
  }
}
export function buildWarlockPet(kind='imp') {
  if(!WARLOCK_PETS.includes(kind))throw new RangeError('Unknown warlock pet: '+kind);
  const root=setup(kind,'warlock');
  const skinColor=kind==='voidwalker'?0x3459a9:kind==='imp'?0x858b45:kind==='felhunter'?0x7e343c:kind==='doomguard'?0x83464d:kind==='felguard'?0x5c7390:0x9c637d;
  const p={skin:material(skinColor,kind==='voidwalker'?0x182e70:0),dark:material(0x302b3b),metal:material(0x6b6558),ivory:material(0xd1c1a2),eye:material(0xcbe793,0x95cb4c),fel:material(0x90ec48,0x5ae52a)};
  if(kind==='voidwalker')voidwalker(root,p);else if(kind==='felhunter')felhunter(root,p);else if(kind==='infernal')infernal(root,p);else humanoid(root,kind,p);
  const used=new Set();root.traverse(o=>{if(o.material)used.add(o.material);});for(const m of Object.values(p))if(!used.has(m))m.dispose();
  return finish(root);
}
