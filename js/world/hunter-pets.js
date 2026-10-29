import {material,ellipsoid,block,joint,bone,curve,horn,eyes,wing,setup,finish} from './companion-shapes.js';

export const HUNTER_PETS=Object.freeze(['bat','bear','bird-of-prey','boar','carrion-bird','cat','crab','crocolisk','fox','gorilla','hyena','raptor','scorpid','spider','tallstrider','turtle','wind-serpent','wolf']);
export const HUNTER_SUMMONS=Object.freeze(['hawk']);
const colors={wolf:0x777b87,cat:0xc2914c,bear:0x694a38,boar:0x705344,fox:0xbf6334,hyena:0x9a794e,gorilla:0x4c4651,raptor:0x487e63,crocolisk:0x53724c,turtle:0x4d7057,crab:0xad523c,scorpid:0x554b6f,spider:0x473b50,bat:0x66516d,'bird-of-prey':0x826748,'carrion-bird':0x504c58,'wind-serpent':0x478d7d,hawk:0xa77b4e};

function leg(rig,parent,skin,foot,x,y,z,len,phase,thick=.065) {
  const g=joint(parent,[x,y,z]);rig.legs.push({node:g,phase});
  bone(g,skin,[0,0,0],[0,-len*.53,-.045],thick,thick*.78);
  bone(g,skin,[0,-len*.53,-.045],[0,-len+.07,.015],thick*.77,thick*.53);
  ellipsoid(g,foot,[0,-len+.045,.07],[thick*1.2,.06,thick*1.8]);return g;
}
function tail(rig,parent,skin,points,r=.045) {
  const g=joint(parent,points[0]);const origin=points[0];curve(g,skin,points.map(p=>p.map((v,i)=>v-origin[i])),r);rig.tails.push(g);return g;
}
function quadruped(root,kind,p) {
  const {body,rig}=root.userData,{skin,dark,light,eye,ivory}=p;
  const bear=kind==='bear',boar=kind==='boar',fox=kind==='fox',cat=kind==='cat',hyena=kind==='hyena',fel=kind==='felhunter';
  const h=bear?.67:boar?.43:fox?.45:.52,width=bear?.35:boar?.28:.22,length=bear?.48:.43;
  ellipsoid(body,skin,[0,h,0],[width,bear?.34:.23,length]);
  ellipsoid(body,skin,[0,h+.05,.29],[width*1.05,bear?.31:hyena?.31:.26,.27]);
  const head=joint(body,[0,h+.17,.47]);rig.head=head;
  ellipsoid(head,skin,[0,0,0],[bear?.23:.18,bear?.23:.17,.22]);
  ellipsoid(head,cat?light:skin,[0,-.055,.21],[cat?.15:bear?.16:.105,.09,cat?.11:.21]);
  ellipsoid(head,dark,[0,-.025,cat?.30:.405],[.069,.045,.035]);
  eyes(head,eye,bear?.14:.115,.055,.17,fel?.04:.027);
  for(const s of [-1,1]) {
    if(bear)ellipsoid(head,skin,[s*.17,.18,-.03],[.085,.09,.05]);
    else {
      horn(head,skin,[s*.125,.12,-.02],[s*(fox?.23:.18),fox?.39:.30,-.055],fox?.12:.085);
      horn(head,light,[s*.126,.15,.015],[s*(fox?.215:.17),fox?.34:.26,-.02],fox?.065:.04);
    }
    if(boar)curve(head,ivory,[[s*.13,-.11,.22],[s*.20,-.07,.32],[s*.22,.11,.31]],.033);
    if(cat)horn(head,ivory,[s*.10,-.055,.28],[s*.1,-.18,.28],.025);
  }
  if(boar) {
    ellipsoid(head,light,[0,-.025,.39],[.1,.07,.035]);
    for(const s of [-1,1])ellipsoid(head,dark,[s*.04,-.01,.418],[.016,.018,.009]);
    for(let i=0;i<7;i++)horn(body,dark,[0,h+.19,.25-i*.11],[0,h+.34-i*.006,.18-i*.11],.065);
  }
  if(hyena||kind==='wolf')for(let i=0;i<5;i++)horn(body,dark,[0,h+.22,.30-i*.09],[0,h+.40-i*.03,.20-i*.09],.08);
  for(const s of [-1,1])for(const front of [true,false])leg(rig,body,skin,dark,s*width*.75,h-.08,front?.27:-.30,h-.08,((s===1)===front)?0:Math.PI,bear?.11:boar?.075:.058);
  if(fox) {
    const t=tail(rig,body,skin,[[0,h,-.39],[.10,h-.02,-.66],[.16,h+.09,-.90]],.12);
    ellipsoid(t,light,[.17,.12,-.57],[.105,.11,.16]);
    ellipsoid(body,light,[0,h+.01,.37],[.16,.22,.07]);
  } else if(cat)tail(rig,body,skin,[[0,h,-.43],[.10,h+.03,-.72],[.16,h+.32,-.88],[.07,h+.40,-.85]],.035);
  else if(boar)tail(rig,body,dark,[[0,h,-.40],[.04,h+.06,-.55],[.10,h+.12,-.52],[.07,h+.14,-.46]],.018);
  else if(!bear)tail(rig,body,skin,[[0,h,-.41],[0,h-.08,-.65],[.04,h-.22,-.79]],.06);
  if(cat||hyena)for(const s of [-1,1])for(let i=0;i<6;i++) {
    const stripe=ellipsoid(body,dark,[s*width*.94,h+.08+(i%2)*.06,.28-i*.11],[.018,cat?.13:.035,cat?.025:.045]);stripe.rotation.x=.3;
  }
}
function bird(root,kind,p) {
  const {body,rig}=root.userData,{skin,dark,light,eye,ivory}=p,bat=kind==='bat',carrion=kind==='carrion-bird';
  root.userData.flying=true;
  ellipsoid(body,skin,[0,.88,0],[.17,.23,.28]);
  const head=joint(body,[0,1.08,.22]);rig.head=head;
  ellipsoid(head,carrion?light:skin,[0,0,0],[bat?.12:.16,.17,.15]);
  if(carrion){bone(body,light,[0,.91,.19],[0,1.10,.25],.065);ellipsoid(body,ivory,[0,.96,.2],[.17,.055,.12]);}
  if(kind==='bird-of-prey')for(const s of [-1,1])ellipsoid(head,light,[s*.073,.015,.12],[.075,.10,.03]);
  eyes(head,eye,.072,.03,.155,.035);
  horn(head,bat?dark:ivory,[0,-.02,.13],[0,bat?-.08:-.07,bat?.26:.36],bat?.055:.075);
  if(bat)for(const s of [-1,1])horn(head,skin,[s*.08,.10,0],[s*.18,.39,.01],.10);
  for(const s of [-1,1]){
    const w=wing(body,skin,s,{bat,size:carrion?1.1:1});w.position.set(s*.1,.93,-.02);rig.wings.push({node:w,side:s});
    bone(body,ivory,[s*.085,.72,.02],[s*.09,.58,.09],.025);
    for(let i=-1;i<=1;i++)bone(body,dark,[s*.09,.58,.09],[s*.09+i*.04,.56,.20],.013,.006);
  }
  for(let i=-1;i<=1;i++)ellipsoid(body,dark,[i*.07,.81,-.31],[.065,.025,.23]).rotation.x=-.2;
}
function reptile(root,kind,p) {
  const {body,rig}=root.userData,{skin,dark,light,eye,ivory}=p,croc=kind==='crocolisk',turtle=kind==='turtle',raptor=kind==='raptor',serpent=kind==='wind-serpent';
  if(serpent) {
    root.userData.flying=true;
    curve(body,skin,[[0,.85,.37],[0,.60,.15],[0,.68,-.2],[0,1,-.45],[0,.96,-.8],[.12,.72,-1]],.12);
    const head=joint(body,[0,.88,.43]);rig.head=head;ellipsoid(head,skin,[0,0,0],[.15,.14,.24]);eyes(head,eye,.10,.04,.17);
    for(const s of [-1,1]){horn(head,ivory,[s*.11,.10,-.09],[s*.22,.28,-.26],.05);const w=wing(body,light,s,{size:.85});w.position.set(s*.09,.86,-.1);rig.wings.push({node:w,side:s});}
    return;
  }
  const h=raptor?.72:turtle?.28:.25;
  ellipsoid(body,skin,[0,h,0],[turtle?.35:.24,raptor?.29:.16,turtle?.42:.52]);
  const head=joint(body,[0,raptor?1.02:h+.1,raptor?.40:.49]);rig.head=head;
  if(raptor)bone(body,skin,[0,.75,.28],[0,1.03,.4],.13,.10);
  ellipsoid(head,skin,[0,0,0],[.15,.14,croc?.34:.20]);
  block(head,dark,[0,-.035,croc?.15:.08],[.22,.025,croc?.43:.24]);
  eyes(head,eye,.12,.06,.1);
  if(!turtle)for(const s of [-1,1])for(let i=0;i<4;i++)horn(head,ivory,[s*.10,-.02,.06+i*.055],[s*.10,-.065,.06+i*.055],.015);
  if(turtle) {
    ellipsoid(body,dark,[0,.34,-.02],[.40,.24,.46]);
    for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)ellipsoid(body,light,[x*.20,.53-Math.abs(x)*.045-Math.abs(z)*.03,z*.23-.02],[.12,.025,.13]);
  }
  if(raptor) {
    for(const s of [-1,1]){
      leg(rig,body,skin,dark,s*.17,.64,-.02,.64,s===1?0:Math.PI,.10);
      const arm=joint(body,[s*.15,.82,.22]);rig.legs.push({node:arm,phase:s===1?Math.PI:0});
      bone(arm,skin,[0,0,0],[s*.06,-.16,.14],.035);horn(arm,ivory,[s*.06,-.16,.14],[s*.06,-.18,.23],.018);
      horn(body,ivory,[s*.18,.08,.14],[s*.18,.16,.31],.028);
    }
    for(let i=0;i<6;i++)horn(body,dark,[0,.88-i*.04,.14-i*.13],[0,1.04-i*.04,.10-i*.13],.055);
  } else for(const s of [-1,1])for(const front of [true,false])leg(rig,body,skin,dark,s*.26,.23,front?.25:-.28,.23,((s===1)===front)?0:Math.PI,.065);
  if(!turtle) {
    tail(rig,body,skin,[[0,h,-.41],[0,h-.04,-.73],[.07,h-.10,-1.10],[.14,h-.05,-1.34]],.075);
    if(croc)for(const s of [-1,1])for(let i=0;i<7;i++)horn(body,dark,[s*.09,h+.10,.36-i*.15],[s*.09,h+.21,.30-i*.15],.055);
  }
}
function arthropod(root,kind,p) {
  const {body,rig}=root.userData,{skin,dark,light,eye,ivory}=p,crab=kind==='crab',scorpid=kind==='scorpid';
  ellipsoid(body,skin,[0,.26,0],[crab?.38:.22,.18,crab?.27:.36]);
  if(!crab)ellipsoid(body,dark,[0,.29,-.32],[.25,.22,.30]);
  const head=joint(body,[0,.27,.26]);rig.head=head;ellipsoid(head,skin,[0,0,0],[.16,.1,.14]);
  if(!crab)eyes(head,eye,.07,.045,.13,.025);
  for(const s of [-1,1]){
    if(crab){bone(head,skin,[s*.10,0,.02],[s*.13,.14,.04],.022);ellipsoid(head,eye,[s*.13,.15,.04],[.035,.035,.03]);}
    for(let i=0;i<4;i++){
      const g=joint(body,[s*.15,.28,.20-i*.15]);rig.legs.push({node:g,phase:i*Math.PI*.55+(s===1?0:Math.PI),spider:true,side:s});
      const spread=.37+(i===1||i===2?.12:0),z=(1.5-i)*.11;
      bone(g,skin,[0,0,0],[s*spread,.09,z],.034,.026);bone(g,skin,[s*spread,.09,z],[s*(spread+.12),-.25,z+.08],.026,.007);
    }
    if(crab||scorpid){
      const claw=joint(body,[s*.23,.29,.18]);rig.claws??=[];rig.claws.push({node:claw,side:s});
      bone(claw,skin,[0,0,0],[s*.22,.05,.23],.065,.085);
      ellipsoid(claw,skin,[s*.25,.06,.31],[.13,.09,.17]);
      horn(claw,light,[s*.17,.06,.36],[s*.20,.07,.57],.055);horn(claw,skin,[s*.32,.06,.36],[s*.24,.07,.57],.07);
    } else horn(head,ivory,[s*.07,-.03,.1],[s*.06,-.15,.20],.035);
  }
  if(scorpid) {
    const t=tail(rig,body,skin,[[0,.31,-.44],[0,.47,-.66],[0,.79,-.61],[0,.94,-.34],[0,.85,-.08]],.065);
    horn(t,ivory,[0,.54,.36],[0,.40,.49],.07);
    for(let i=0;i<5;i++)ellipsoid(body,light,[0,.35+i*.10,-.53-Math.sin(i*.7)*.1],[.08,.07,.065]);
  }
}
function gorilla(root,p) {
  const {body,rig}=root.userData,{skin,dark,light,eye}=p;
  ellipsoid(body,skin,[0,.68,0],[.42,.47,.31]);ellipsoid(body,light,[0,.72,.26],[.28,.30,.07]);
  const head=joint(body,[0,1.12,.13]);rig.head=head;ellipsoid(head,skin,[0,0,0],[.24,.24,.22]);
  ellipsoid(head,dark,[0,-.065,.17],[.17,.13,.11]);eyes(head,eye,.095,.04,.20,.022);block(head,skin,[0,.085,.20],[.30,.07,.08]);
  for(const s of [-1,1]){
    leg(rig,body,skin,dark,s*.22,.41,-.10,.41,s===1?0:Math.PI,.12);
    const arm=joint(body,[s*.33,.97,.06]);rig.legs.push({node:arm,phase:s===1?Math.PI:0});
    bone(arm,skin,[0,0,0],[s*.17,-.36,.04],.16,.13);bone(arm,skin,[s*.17,-.36,.04],[s*.20,-.76,.20],.13,.09);ellipsoid(arm,dark,[s*.20,-.79,.20],[.13,.13,.14]);
  }
}
function tallstrider(root,p) {
  const {body,rig}=root.userData,{skin,dark,light,eye,ivory}=p;
  ellipsoid(body,skin,[0,.75,0],[.28,.29,.38]);bone(body,light,[0,.87,.22],[0,1.35,.37],.09,.06);
  const head=joint(body,[0,1.4,.39]);rig.head=head;ellipsoid(head,skin,[0,0,0],[.13,.14,.18]);eyes(head,eye,.10,.035,.12);
  horn(head,ivory,[0,-.03,.13],[0,-.06,.38],.065);
  for(const s of [-1,1])leg(rig,body,light,dark,s*.16,.64,-.04,.64,s===1?0:Math.PI,.036);
  for(let i=-1;i<=1;i++){ellipsoid(body,dark,[i*.08,.85,-.40],[.05,.045,.27]).rotation.x=.25;horn(head,light,[i*.035,.10,-.03],[i*.065,.31,-.11],.04);}
}

export function buildHunterPet(kind='wolf',{skin:variant='natural'}={}) {
  if(kind==='owl')kind='bird-of-prey';
  if(!HUNTER_PETS.includes(kind)&&!HUNTER_SUMMONS.includes(kind))throw new RangeError('Unknown hunter pet: '+kind);
  const root=setup(kind,'hunter'),base=variant==='snow'?0xb6bab4:variant==='dark'?0x393b43:colors[kind];
  const p={skin:material(base),dark:material(variant==='snow'?0x636b72:0x343039),light:material(variant==='dark'?0x797479:0xc6b897),eye:material(0xe2ba54),ivory:material(0xe3d3ac)};
  if(['wolf','cat','bear','boar','fox','hyena'].includes(kind))quadruped(root,kind,p);
  else if(['bat','bird-of-prey','carrion-bird','hawk'].includes(kind))bird(root,kind,p);
  else if(['raptor','crocolisk','turtle','wind-serpent'].includes(kind))reptile(root,kind,p);
  else if(['crab','scorpid','spider'].includes(kind))arthropod(root,kind,p);
  else if(kind==='gorilla')gorilla(root,p);
  else tallstrider(root,p);
  // Dispose palette entries that were not used by a mesh.
  const used=new Set();root.traverse(o=>{if(o.material)used.add(o.material);});for(const m of Object.values(p))if(!used.has(m))m.dispose();
  return finish(root);
}
