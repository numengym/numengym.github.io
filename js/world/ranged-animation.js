// Cosmetic ranged poses and release effects. No damage, cooldown or equipment-slot logic.
import * as THREE from 'three';

const smooth = t => { t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t); };
export function poseArm(j,side,target,bend=null) {
  const shoulder=j['shoulder'+side],elbow=j['elbow'+side];
  const direction=target.clone().sub(shoulder.position);
  const distance=Math.min(.548,Math.max(.04,direction.length()));direction.normalize();
  const bendDirection=bend?bend.clone():new THREE.Vector3(side==='R'?-.65:.65,-.65,-.2);
  bendDirection.addScaledVector(direction,-bendDirection.dot(direction)).normalize();
  const along=(.29**2-.26**2+distance**2)/(2*distance);
  const upper=direction.clone().multiplyScalar(along).addScaledVector(bendDirection,Math.sqrt(Math.max(0,.29**2-along**2)));
  const lower=direction.clone().multiplyScalar(distance).sub(upper).normalize();
  const down=new THREE.Vector3(0,-1,0);
  shoulder.quaternion.setFromUnitVectors(down,upper.normalize());
  elbow.quaternion.setFromUnitVectors(down,lower.applyQuaternion(shoulder.quaternion.clone().invert()));
}

// A two-handed weapon is carried close: both hands together in front of the belly, the weapon nearly upright and
// leaning over the right shoulder. A swing lifts the hands by the shoulder for the windup, then drives them out
// and down for the blow.
export function supportMelee(model) {
  const lerp=THREE.MathUtils.lerp,j=model.userData.rig,a=model.userData.anim;
  let angle=lerp(-1.3,-1.05,a.combat),lean=lerp(-.25,-.15,a.combat);
  let hand=[-.04,.06,lerp(.22,.26,a.combat)];
  if(a.mh>0) {
    const p=1-a.mh,rest=angle,from=hand;
    const windup=[-.1,.3,.12],blow=[-.03,.12,.42];
    if(p<.3){const k=smooth(p/.3);angle=lerp(rest,-2.1,k);hand=from.map((v,i)=>lerp(v,windup[i],k));}
    else if(p<.6){const k=smooth((p-.3)/.3);angle=lerp(-2.1,.45,k);hand=windup.map((v,i)=>lerp(v,blow[i],k));}
    else{const k=smooth((p-.6)/.4);angle=lerp(.45,rest,k);hand=blow.map((v,i)=>lerp(v,from[i],k));}
    lean*=1-Math.sin(Math.min(1,p/.6)*Math.PI);
  }
  if(a.spin>0){angle=.08;lean=0;hand=[-.035,.2,.4];}
  if(a.cheer>0){angle=-1.6;lean=0;hand=[-.035,.42,.3];}
  poseArm(j,'R',new THREE.Vector3(hand[0],hand[1]+Math.sin(a.walk)*a.move*.012,hand[2]));
  orientHeld(j,'R',new THREE.Euler(angle,lean,Math.PI/2));
  j.spine.updateWorldMatrix(true,true);
  poseArm(j,'L',j.spine.worldToLocal(j.weaponR.localToWorld(new THREE.Vector3(0,.06,-.15)))); // a hand's width below the right
  j.wristL.rotation.set(0,0,0);
}

function orientHeld(j,side,rotation) {
  const held=j['weapon'+side];
  const arm=j['shoulder'+side].quaternion.clone().multiply(j['elbow'+side].quaternion);
  const desired=new THREE.Quaternion().setFromEuler(rotation);
  // Cancel the spine hunch as well as the arm pose: muzzle +Z is character forward.
  j['wrist'+side].quaternion.copy(arm.invert().multiply(j.spine.quaternion.clone().invert()).multiply(desired).multiply(held.quaternion.clone().invert()));
}

export function createRangedEffects(body,held) {
  const kind=held.userData.kind,flight=new THREE.Group();flight.visible=false;
  // The wand's bolt is golden light (Torch of Light); a thrown weapon flies as a six-pointed star, spinning edge-on.
  const material=new THREE.MeshBasicMaterial({color:kind==='wand'?0xffd86a:kind==='gun'?0xffd694:0xd8d9d0,side:THREE.DoubleSide});
  let geometry;
  if(kind==='wand') geometry=new THREE.SphereGeometry(.035,10,8);
  else if(kind==='thrown') {
    const star=new THREE.Shape();
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2,r=i%2?.022:.075;i?star.lineTo(Math.cos(a)*r,Math.sin(a)*r):star.moveTo(r,0);}
    geometry=new THREE.ShapeGeometry(star);geometry.rotateY(Math.PI/2);
  }
  else {geometry=new THREE.ConeGeometry(.012,kind==='gun'?.16:.32,6);geometry.rotateX(Math.PI/2);}
  flight.add(new THREE.Mesh(geometry,material));body.add(flight);
  const flash=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),new THREE.MeshBasicMaterial({color:kind==='wand'?0xffe08a:0xffd280}));flash.visible=false;body.add(flash);
  flight.userData.visualLayer=flash.userData.visualLayer='weapon';
  flight.traverse(o=>{if(o.isMesh)o.userData.visualLayer='weapon';});
  return {flight,flash,origin:new THREE.Vector3(),age:0,released:false};
}

export function animateRanged(model,s) {
  const j=model.userData.rig,a=model.userData.anim,w=j.weaponR,fx=model.userData.rangedEffects;
  if(!w?.userData.ranged || !fx)return;
  const kind=w.userData.kind;
  if(a.dead) {a.ranged=0;fx.released=false;fx.flight.visible=fx.flash.visible=false;w.visible=true;return;}
  const active=a.ranged>0,p=active?1-a.ranged:0;
  if(active&&p<.52)fx.released=false;
  const ready=active? smooth(p/.18)*(1-smooth((p-.80)/.20)):a.combat;
  const shot=p>=.52&&p<.72?Math.sin((p-.52)/.20*Math.PI):0;
  // Bows stay in the right/main hand; the free left hand draws the string.
  if(kind==='bow') {
    const draw=active&&p<.52?.19*smooth(p/.48):active?.19*(1-smooth((p-.52)/.1)):.12*a.combat;
    // Extend the bow as the string draws back, keeping both hands within reach.
    poseArm(j,'R',new THREE.Vector3(-.22,.40,.36+draw*.7));
    orientHeld(j,'R',new THREE.Euler(0,0,-.35));
    j.spine.updateWorldMatrix(true,true);
    const string=w.userData.string.geometry.attributes.position;string.setZ(1,-.13-draw);string.needsUpdate=true;w.userData.string.geometry.computeBoundingSphere();
    const target=j.spine.worldToLocal(w.localToWorld(new THREE.Vector3(0,0,-.13-draw)));
    poseArm(j,'L',target);j.wristL.rotation.set(0,0,0);
    w.userData.ammunition.position.z=-draw;
    w.userData.ammunition.visible=!active||p<.52||p>.88;
  } else if(kind==='gun'||kind==='crossbow') {
    // Turn the torso so the stock sits outside the right ribs, not through the chest.
    j.spine.rotation.set(0,-1.05,0);
    j.head.rotation.y+=1.05;
    const compact=model.userData.body.scale.y<.6 && model.userData.bodyType==='body2';
    poseArm(j,'R',new THREE.Vector3(-.08,.30,(compact?.32:.26)-shot*.018),new THREE.Vector3(-1,1,0));
    orientHeld(j,'R',new THREE.Euler(.12*(1-ready)-shot*(kind==='gun'?.06:.02),0,0));
    j.spine.updateWorldMatrix(true,true);
    poseArm(j,'L',j.spine.worldToLocal(w.localToWorld(w.userData.supportGrip.clone())),new THREE.Vector3(1,compact?1:0,compact?0:1));j.wristL.rotation.set(0,0,0);
    if(w.userData.ammunition)w.userData.ammunition.visible=!active||p<.52||p>.88;
  } else if(kind==='wand') {
    poseArm(j,'R',new THREE.Vector3(-.25,.10+.20*ready,.12+.34*ready));
    orientHeld(j,'R',new THREE.Euler(.8*(1-ready)-shot*.13,0,0));
  } else {
    // Overarm windup, forward release, follow-through, then recover the next knife.
    const reach=active?smooth((p-.32)/.20):0,recover=active?smooth((p-.76)/.24):1;
    const wind=new THREE.Vector3(-.24,.66,-.12),release=new THREE.Vector3(-.19,.40,.48),rest=new THREE.Vector3(-.31,.02,.10);
    const target=wind.lerp(release,reach).lerp(rest,recover);
    poseArm(j,'R',target);orientHeld(j,'R',new THREE.Euler(active?-1.6*(1-reach):.85,0,0));
    w.visible=!active||p<.52||p>.90;
  }
  if(active&&p>=.52&&!fx.released) {
    fx.released=true;fx.age=0;
    model.updateWorldMatrix(true,true);
    fx.origin.copy(model.userData.body.worldToLocal(w.localToWorld(w.userData.muzzle.clone())));
    fx.flight.position.copy(fx.origin);fx.flight.visible=true;fx.flash.position.copy(fx.origin);
  }
  if(!active)fx.released=false;
  if(fx.flight.visible) {
    fx.age+=s.dt;fx.flight.position.copy(fx.origin);fx.flight.position.z+=fx.age*(kind==='gun'?18:kind==='wand'?9:12);
    if(kind==='thrown')fx.flight.rotation.x=fx.age*18;else fx.flight.rotation.set(0,0,0);
    if(fx.age>.38)fx.flight.visible=false;
  }
  fx.flash.visible=(kind==='gun'||kind==='wand')&&fx.flight.visible&&fx.age<.07;
  a.ranged=Math.max(0,(a.ranged||0)-s.dt*.85);
}
