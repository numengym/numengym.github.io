// Dedicated druid anatomy; the companion rig keeps its existing gait and attack contract.
// A form wears its race's look: a night elf's and a tauren's bear a spiked mane and a collar with a charm, a tauren's
// bear short horns, a cat a mane and collar bands; a Skyborne's are feathered: a hooked beak, a feather crest, plumes
// down the legs and a feathered tail. Every form has the painted circle and crescent on its shoulders.
import * as THREE from 'three';
import {material,ellipsoid,joint,bone,curve,horn,setup,finish} from './companion-shapes.js';

function torso(parent,mat,rings){
  const vertices=[],indices=[],sides=20;
  rings.forEach(([z,y,w,h])=>{for(let i=0;i<=sides;i++){const a=i/sides*Math.PI*2;vertices.push(Math.cos(a)*w,y+Math.sin(a)*h,z);}});
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<sides;i++){const a=r*(sides+1)+i,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
}

// The painted mark on a flank (side -1 / 1): a ring with a crescent curving under it, flat on the fur.
function shoulderMark(parent,mat,side,[x,y,z],size){
  const g=joint(parent,[x,y,z]);g.rotation.y=side*Math.PI/2;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(size*.55,size*.16,6,20),mat);ring.position.y=size*.35;g.add(ring);
  const smile=new THREE.Mesh(new THREE.TorusGeometry(size*1.05,size*.17,6,20,Math.PI*.8),mat);smile.rotation.z=Math.PI*1.1;smile.position.y=size*.55;g.add(smile);
  return g;
}

// A feather: a flat pointed blade from a to b, its broad side toward up.
function feather(parent,mat,a,b,width){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start),len=d.length();
  const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(width,len*.35,0,len);shape.quadraticCurveTo(-width,len*.35,0,0);
  const m=new THREE.Mesh(new THREE.ShapeGeometry(shape,4),mat);
  m.position.copy(start);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  m.castShadow=m.receiveShadow=true;parent.add(m);return m;
}

// palette: { base, light, dark, mane, mark, eye } (druid-colors.js).
export function druidBeast(kind,race,palette){
  const root=setup(kind+'Form','druid'),{body,rig}=root.userData,bear=kind==='bear',tauren=race==='RaceTauren',sky=/Skyborne/.test(race||'');
  const skin=material(palette.base),light=material(palette.light),dark=material(palette.dark),mane=material(palette.mane);
  const mark=material(palette.mark,sky?palette.mark:0),nose=material(0x17171d),ivory=material(0xe5d6b5),eye=material(palette.eye,palette.eye);
  const leather=material(0x4a2e22),charm=material(0xa8a294);
  for(const m of [mane,light,dark])m.side=THREE.DoubleSide;
  const h=bear?.68:.49;
  torso(body,skin,bear?[[-.60,.66,.015,.02],[-.46,.67,.28,.25],[-.20,.69,.35,.30],[.13,.77,.39,.38],[.35,.76,.32,.31],[.49,.73,.12,.16]]:[[-.57,.50,.01,.02],[-.43,.51,.21,.20],[-.20,.50,.18,.16],[.05,.52,.23,.23],[.30,.54,.25,.25],[.43,.56,.13,.15]]);
  if(bear){
    ellipsoid(body,mane,[0,.98,.18],[.30,.19,.30]);
    ellipsoid(body,light,[0,.57,.43],[.23,.24,.09]);
    ellipsoid(body,light,[0,.50,0],[.3,.12,.42]);
  }else{
    ellipsoid(body,light,[0,.42,.32],[.16,.16,.13]);
    ellipsoid(body,light,[0,.38,0],[.17,.08,.34]);
    for(const s of [-1,1])ellipsoid(body,skin,[s*.14,.50,-.39],[.12,.21,.19]);
  }
  // The mane, crest or ruff along the back: spikes of fur, or feathers on a Skyborne.
  const ridge=bear?[[.42,1.04],[.28,1.12],[.12,1.14],[-.05,1.08],[-.22,1.0],[-.38,.92]]:[[.38,.80],[.28,.79],[.17,.76]];
  ridge.forEach(([z,y],i)=>{
    for(const s of [-.5,0,.5]){
      const tip=[s*(bear?.14:.08),y+(bear?.14:.12)-i*.012,z-(bear?.16:.14)];
      if(sky)feather(body,i%2?mane:dark,[s*.1,y-.05,z],tip,bear?.07:.05);else horn(body,i%2?mane:dark,[s*.1,y-.05,z],tip,bear?.07:.05);
    }
  });
  for(const s of [-1,1])shoulderMark(body,mark,s,bear?[s*.385,.86,.16]:[s*.245,.6,.2],bear?.09:.06);
  const head=joint(body,[0,bear?.84:.66,bear?.50:.47]);rig.head=head;
  ellipsoid(head,sky?light:skin,[0,0,.03],[bear?.25:.19,bear?.23:.18,.23]);
  if(!sky)ellipsoid(head,dark,[0,-.12,.19],[bear?.16:.12,.075,.14]);
  for(const s of [-1,1]){
    if(!sky)ellipsoid(head,light,[s*(bear?.075:.058),-.06,.23],[bear?.115:.085,.085,.12]);
    ellipsoid(head,dark,[s*(bear?.15:.115),.065,.193],[.066,.047,.031]);
    ellipsoid(head,eye,[s*(bear?.15:.115),.065,.218],[bear?.026:.031,.017,.012]);
    if(!sky)ellipsoid(head,nose,[s*(bear?.15:.115),.065,.229],[.006,.014,.004]);
    const brow=ellipsoid(head,sky?light:skin,[s*(bear?.15:.115),.11,.20],[.09,.035,.052]);brow.rotation.z=s*.22;
    if(sky){
      // Feather tufts sweeping back from the cheeks and up from the brow.
      for(let i=0;i<4;i++)feather(head,i%2?light:mane,[s*.13,.02-i*.05,.05],[s*(.27+i*.02),.1-i*.06,-.2-i*.03],.05);
      feather(head,mane,[s*.1,.16,.05],[s*.22,.42,-.12],.06);
    }else if(bear){
      ellipsoid(head,skin,[s*.19,.19,-.025],[.085,.09,.055]);
      ellipsoid(head,dark,[s*.19,.195,.018],[.052,.057,.016]);
      if(tauren){horn(head,material(0x2a2420),[s*.17,.15,0],[s*.33,.26,.12],.045);}
    }else{
      horn(head,skin,[s*.135,.12,-.01],[s*.21,.33,-.045],.085);
      horn(head,light,[s*.14,.16,.027],[s*.195,.285,.0],.043);
      curve(head,ivory,[[s*.10,-.055,.27],[s*.108,-.16,.29],[s*.09,-.23,.31]],.018);
      if(tauren)horn(head,material(0x2a2420),[s*.13,.18,-.03],[s*.24,.3,.07],.03);
    }
    // Angular cheek ruff and backward pointing mane locks.
    if(!sky)for(let i=0;i<(bear?4:5);i++)horn(head,i%2?skin:mane,[s*(.15+i*.008),.06-i*.045,-.01],[s*(.26+(bear?.025:0)),-.01-i*.045,-.13],bear?.065:.048);
    if(!bear&&!sky)for(let i=0;i<4;i++){
      const stripe=ellipsoid(body,dark,[s*(.215-i*.009),.57,.18-i*.14],[.018,.115,.025]);stripe.rotation.x=-.45;
    }
  }
  if(sky){
    // A hooked beak in place of the nose and jaw, a crest of feathers over the crown.
    const beak=material(0x2a2a30);
    ellipsoid(head,beak,[0,-.06,.24],[bear?.1:.08,.08,.11]);
    curve(head,beak,[[0,-.03,.3],[0,-.07,.38],[0,-.15,.38]],bear?.04:.032);
    ellipsoid(head,beak,[0,-.14,.27],[bear?.07:.055,.03,.07]);
    for(let i=0;i<5;i++)feather(head,i%2?mane:light,[(i-2)*.04,.18,.02],[(i-2)*.09,.42+Math.abs(i-2)*-.04,-.18],.055);
  }else{
    ellipsoid(head,nose,[0,-.02,.335],[bear?.095:.064,.044,.037]);
    curve(head,nose,[[0,-.055,.337],[0,-.11,.33],[-.05,-.12,.315]],.005);
    curve(head,nose,[[0,-.11,.33],[.05,-.12,.315]],.005);
  }
  // A collar round the neck, a charm hanging from it (not on a Skyborne).
  if(!sky){
    const collar=new THREE.Mesh(new THREE.TorusGeometry(bear?.25:.17,bear?.03:.022,6,20),leather);
    collar.position.set(0,bear?.78:.6,bear?.42:.4);collar.rotation.x=Math.PI/2-.5;collar.castShadow=true;body.add(collar);
    ellipsoid(body,charm,[0,bear?.6:.48,bear?.62:.53],[bear?.06:.04,bear?.06:.04,.02]);
    feather(body,mane,[.03,bear?.6:.48,bear?.63:.54],[.12,bear?.45:.36,bear?.6:.52],.03);
  }
  // Full upper limbs taper into ankles, with separate toes and forward-facing claws.
  for(const s of [-1,1])for(const front of [true,false]){
    const y=bear?.65:.48,x=s*(bear?.255:.17),z=front?.29:-.38;
    const leg=joint(body,[x,y,z]);rig.legs.push({node:leg,phase:((s===1)===front)?0:Math.PI});
    const r=bear?.13:.075,knee=front?-.035:.09;
    ellipsoid(leg,skin,[0,-.12,0],[r*1.16,.23,r*1.2]);
    bone(leg,sky?dark:skin,[0,-.10,0],[0,-y+.13,knee],r,r*.61);
    ellipsoid(leg,dark,[0,-y+.075,.06],[r*1.15,.075,r*1.6]);
    // Feathers down the back of a Skyborne's legs; a cat's band round the foreleg.
    if(sky)for(let i=0;i<3;i++)feather(leg,i%2?mane:dark,[0,-.12-i*.13,-r*.6],[s*.04,-.28-i*.13,-r*2.6],r*.7);
    else if(!bear&&front){const band=new THREE.Mesh(new THREE.TorusGeometry(r*.85,r*.22,6,16),leather);band.position.set(0,-y+.2,knee*.4);band.rotation.x=Math.PI/2;leg.add(band);}
    for(let k=-1;k<=1;k++){
      ellipsoid(leg,sky?dark:skin,[k*r*.56,-y+.055,.13],[r*.38,.045,.07]);
      horn(leg,sky?material(0x3a3226):ivory,[k*r*.56,-y+.055,.17],[k*r*.59,-y+.025,bear?.25:.22],bear?.017:.011);
    }
  }
  const tail=joint(body,[0,h,-.53]);rig.tails.push(tail);
  if(sky){
    // A fan of long tail feathers.
    for(let i=0;i<5;i++)feather(tail,i%2?mane:dark,[(i-2)*.03,0,0],[(i-2)*.12,bear?.1:.2,bear?-.55:-.75],bear?.08:.07);
  }else if(bear)ellipsoid(tail,skin,[0,.025,-.04],[.075,.075,.095]);
  else{
    curve(tail,skin,[[0,0,0],[.07,.02,-.25],[.14,.16,-.52],[.10,.33,-.66],[.04,.38,-.63]],.038);
    ellipsoid(tail,mane,[.065,.36,-.645],[.047,.075,.055]);
    if(tauren){ellipsoid(body,mane,[0,.65,.33],[.29,.27,.30]);for(const s of [-1,1])for(let i=0;i<5;i++)horn(body,mane,[s*.20,.74-i*.045,.26],[s*.28,.60-i*.06,.09],.06);}
  }
  return finish(root);
}
