// Smooth, fitted starter garments derived from the supplied Forever screenshots.
import * as THREE from 'three';
import { armorPlate } from './armor.js';
import { buildHead } from './heads.js';
const mat = color => new THREE.MeshStandardMaterial({color,roughness:.92,envMapIntensity:.22});
const at = (o,x,y,z) => { o.position.set(x,y,z); return o; };
function mesh(geo,m) { const o=new THREE.Mesh(geo,m); o.castShadow=true; o.receiveShadow=true; return o; }
const ball = (r,m,x,y,z,sx=1,sy=1,sz=1) => { const o=mesh(new THREE.SphereGeometry(r,24,16),m); o.position.set(x,y,z); o.scale.set(sx,sy,sz); return o; };
function cord(points,m,r=.006) { return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),18,r,6,false),m); }
function surface(rings, material, { colorAt=null, bulge=null, folds=0, sides=48, rows=48 }={}) {
  const pos=[], uv=[], idx=[];
  for(let row=0;row<=rows;row++) {
    const y=THREE.MathUtils.lerp(rings[0][0],rings.at(-1)[0],row/rows);
    let n=0; while(n<rings.length-2 && y>rings[n+1][0]) n++;
    const a=rings[n],b=rings[n+1],prev=rings[Math.max(0,n-1)],next=rings[Math.min(rings.length-1,n+2)];
    const t=(y-a[0])/(b[0]-a[0]);
    const value=k=>{
      const m0=(b[k]-prev[k])/(b[0]-prev[0])*(b[0]-a[0]),m1=(next[k]-a[k])/(next[0]-a[0])*(b[0]-a[0]);
      return (2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*m1;
    };
    for(let s=0;s<=sides;s++) {
      const angle=s/sides*Math.PI*2, front=Math.cos(angle), ripple=folds*Math.cos(angle*12);
      const x=Math.sin(angle)*(value(1)+ripple);
      let z=front*(value(2)+ripple);
      if(bulge) z+=bulge(x,y,front);
      pos.push(x,y,z);
      uv.push(s/sides,row/rows);
    }
  }
  for(let r=0;r<rows;r++) for(let s=0;s<sides;s++) {
    const stride=sides+1,a=r*stride+s,b=a+1; idx.push(a,b,a+stride,b,b+stride,a+stride);
  }
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.setIndex(idx);
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  if(colorAt) {
    // Smooth garment edges and subtle painted folds without increasing geometry density.
    const canvas=document.createElement('canvas'); canvas.width=512;canvas.height=512;
    const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(512,512);
    for(let py=0;py<512;py++) {
      const y=THREE.MathUtils.lerp(rings.at(-1)[0],rings[0][0],py/511);
      let n=0;while(n<rings.length-2&&y>rings[n+1][0])n++;
      const t=(y-rings[n][0])/(rings[n+1][0]-rings[n][0]),width=THREE.MathUtils.lerp(rings[n][1],rings[n+1][1],t);
      for(let px=0;px<512;px++) {
        const a=px/511*Math.PI*2,c=colorAt(Math.sin(a)*width,y,Math.cos(a),a);
        const shade=.94+.035*Math.cos(a*12)+.015*Math.sin(a*27+y*16)+.006*Math.sin(px*2.1+py*1.7),i=(py*512+px)*4;
        pixels.data[i]=((c>>16)&255)*shade;pixels.data[i+1]=((c>>8)&255)*shade;pixels.data[i+2]=(c&255)*shade;pixels.data[i+3]=255;
      }
    }
    ctx.putImageData(pixels,0,0);
    material=material.clone();material.vertexColors=false;
    material.map=new THREE.CanvasTexture(canvas);material.map.colorSpace=THREE.SRGBColorSpace;material.map.userData.characterOwned=true;
  }
  geo.computeVertexNormals();
  // Weld lighting across the duplicated UV seam.
  const normal=geo.attributes.normal;
  for(let r=0;r<=rows;r++) {
    const a=r*(sides+1),b=a+sides,n=new THREE.Vector3(normal.getX(a)+normal.getX(b),normal.getY(a)+normal.getY(b),normal.getZ(a)+normal.getZ(b)).normalize();
    normal.setXYZ(a,n.x,n.y,n.z);normal.setXYZ(b,n.x,n.y,n.z);
  }
  return mesh(geo,material);
}
function garmentColor(o, look, x,y,front) {
  const ax=Math.abs(x), skin=look.skin, base=o.cloth, trim=o.trim, edge=o.accent||trim;
  if(y>.475 && ax<.08+(y-.475)*2) return skin;
  if(o.pattern==='harness') {
    if(y<.105 || (Math.abs(ax-.14)<.025 && y>.18) || Math.abs(y-.23)<.025) return o.leather;
    if(look.female && front>0 && y>.27 && y<.43 && ax<.20) return o.leather;
    return skin;
  }
  if(o.midriff && y<.19 && y>.045) return skin;
  if(front>0) {
    const cut=o.pattern==='druid' ? .19 : o.pattern==='recruit' || o.pattern==='vest' ? .29 : .32;
    const opening=(y-cut)*.42;
    if(y>cut && ax<opening) return skin;
    if(o.pattern==='sky') {
      if(y<.22 && ax<(.22-y)*1.1) return skin;
      if(Math.abs(y-(.29+ax*.85))<.012 || Math.abs(y-(.30-ax*.75))<.012) return trim;
      if(y>.4 && ax<.11) return o.accent;
    }
    if(o.pattern==='priest') {
      const v=.09+ax*.9;
      if(Math.abs(y-v)<.024 || Math.abs(y-(.32+ax*.8))<.018) return trim;
      if(Math.abs(y-v-.028)<.008) return edge;
    }
    if(o.pattern==='hunter' && y<.12+.018*Math.cos(x*60)) return trim;
    if(['robe','druid','shaman','trollShaman'].includes(o.pattern) && ax<.026 && y<.32) return trim;
  }
  if(o.pattern==='recruit' && y<.13) return o.leather;
  if(y<.035 || (front>0 && y>.30 && Math.abs(ax-(y-.30)*.42)<.009)) return trim;
  return base;
}
function limb(len,top,mid,bottom,m) {
  return surface([[-len,bottom,bottom],[-len*.65,mid,mid*.92],[-len*.2,top,top*.92],[.018,top*.88,top*.86]],m,{rows:20,sides:24});
}
export function dressStarter(j,look,o) {
  const skin=mat(look.skin),cloth=mat(o.cloth),pants=mat(o.pants),leather=mat(o.leather),trim=mat(o.trim),accent=mat(o.accent||o.trim);
  const painted=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,envMapIntensity:.22});
  const female=look.female, gnome=look.gnome;
  // The race's build (race-bodies.js): arm and leg thickness, hand and foot size, chest breadth and a belly.
  const arms=look.arms||1, legs=look.legs||1, chest=look.chest||1, belly=look.belly||0;
  const build=([y,w,d])=>[y,y>=.24?w*chest:w,(y>=.24?d*chest:d)+belly*Math.exp(-Math.pow((y-.15)/.09,2))];
  const torso=(female ? [[0,.165,.10],[.13,.145,.092],[.24,.172,.115],[.35,.218,.125],[.43,.225,.116],[.48,.18,.09],[.53,.062,.058]] : [[0,.185,.115],[.15,.20,.135],[.32,.26,.16],[.43,.28,.15],[.48,.22,.12],[.53,.075,.065]]).map(build);
  j.spine.add(surface(torso,painted,{colorAt:(x,y,f)=>garmentColor(o,look,x,y,f),bulge:(x,y,f)=> female && f>0 ? (look.bust||.075)*(Math.exp(-Math.pow((x-.1)/.092,2))+Math.exp(-Math.pow((x+.1)/.092,2)))*Math.exp(-Math.pow((y-.325)/(gnome?.135:.105),2))*Math.pow(f,.8) : 0}));
  // Front of the pelvis stays flat. Only the rear receives the rounded contour.
  const hips=ball(.17,pants,0,-.015,0,female?1.35:1.30,gnome?1.07:.9,1);
  const hp=hips.geometry.attributes.position;
  for(let i=0;i<hp.count;i++) {
    const x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i);
    if(z>0) hp.setZ(i,z*.54);
    else if(female) hp.setZ(i,z-(look.seat||.035)*(Math.exp(-Math.pow((x-.07)/.085,2))+Math.exp(-Math.pow((x+.07)/.085,2)))*Math.exp(-Math.pow((y+.02)/.12,2))*(-z/.17)**2);
  }
  hips.geometry.computeVertexNormals();
  if(o.skirt) hips.geometry.dispose(); else j.hips.add(hips);
  j.hips.add(surface([[.025,.18,.111],[.083,.174,.107]],leather,{rows:2,sides:32}));
  const buckle=armorPlate([[-.031,-.02],[.031,-.02],[.031,.02],[-.031,.02]],.008,trim,.002); j.hips.add(at(buckle,0,.055,.113));
  if(o.pattern==='recruit') {
    for(const x of [-.055,.055]) j.spine.add(at(armorPlate([[-.018,-.027],[.018,-.027],[.018,.027],[-.018,.027]],.006,trim,.002),x,.075,.112));
  }
  // Fine lacing follows the fitted chest rather than floating in front of it.
  if(['vest','hunter','shaman','buttons'].includes(o.pattern)) for(let n=0;n<4;n++) {
    const y=.18+n*.034,z=female?.15:.165;
    if(o.pattern==='buttons') j.spine.add(ball(.008,trim,0,y,z));
    else j.spine.add(cord([[-.024,y,z],[.024,y+.025,z]],trim,.003));
  }
  if(o.pattern==='sky') {
    j.spine.add(at(armorPlate([[0,.055],[.032,0],[0,-.055],[-.032,0]],.01,trim,.003),0,.31,female?.20:.17));
  }
  if(o.leaves) for(const side of [-1,1]) for(let n=0;n<6;n++) {
    const leaf=armorPlate([[0,.018],[.025,-.025],[.01,-.09],[-.015,-.03]],.006,n%2?cloth:trim,.001);
    leaf.position.set(side*(.09+n*.028),.47-Math.abs(n-2)*.012,.075); leaf.rotation.z=side*(.3+n*.07); j.spine.add(leaf);
  }
  if(o.skirt) {
    const skirt=surface([[-.79,.30,.21],[-.59,.277,.19],[-.30,.235,.16],[.025,.185,.12]],painted,{folds:.008,colorAt:(x,y,f,a)=>{
      if(y<-.735 || Math.abs(y+.67)<.016) return o.trim;
      if(o.pattern==='priest' && f>0 && Math.abs(y-(-.61+Math.abs(x)*.3))<.023) return o.trim;
      if(['shaman','trollShaman'].includes(o.pattern) && f>.5 && Math.abs(x)<.052) return Math.abs(Math.sin(y*42+x*30))<.35 ? o.trim : o.leather;
      if(o.sash && y>-.24+Math.abs(x)*.3) return o.trim;
      if(['robe','druid'].includes(o.pattern) && f>.5 && Math.abs(x)<.04) return o.trim;
      return o.pants;
    }}); j.hips.add(skirt); j.skirt=skirt;
  }
  for(const side of [-1,1]) {
    const k=side<0?'R':'L',thigh=j['thigh'+k],knee=j['knee'+k],foot=j['ankle'+k],shoulder=j['shoulder'+k],elbow=j['elbow'+k],wrist=j['wrist'+k];
    if(!o.skirt) {
      thigh.add(limb(.44,(female?.105:.112)*legs,(female?.092:.105)*legs,.072*legs,pants));
      knee.add(limb(.4,.075*legs,.067*legs,.043*legs,o.shorts||o.barefoot||o.undead?skin:pants));
    }
    if(o.shorts) {
      thigh.add(surface([[-.38,.085*legs,.08*legs],[-.32,.096*legs,.09*legs]],trim,{rows:2,sides:24}));
      if(o.pattern==='sky') thigh.add(surface([[-.40,.12,.10],[-.28,.128,.108],[.02,.098,.092]],painted,{rows:18,sides:32,colorAt:(x,y,f)=>y<-.37 || (f>.4 && Math.abs(x)>.075+y*.10) ? o.trim : o.pants}));
    }
    if(o.kneePatch) knee.add(at(armorPlate([[-.043,.025],[.043,.025],[.04,-.055],[-.025,-.07],[-.043,-.035]],.009,leather,.005),0,-.025,.072));
    const feet=look.feet||1;
    if(look.hooves) {
      const hoof=look.hoofColor?mat(look.hoofColor):leather;
      for(const t of [-1,1]) foot.add(ball(.065*feet,hoof,t*.04*feet,-.045,.045,.65,1,1.5));
    } else {
      foot.add(ball(.071*feet,o.barefoot?skin:leather,0,-.045,.062*feet,1,.75,1.7));
      if(!o.barefoot) {
        const height=o.bootHeight||.10,bw=Math.max(1,legs);
        foot.add(surface([[-.02,.073*bw,.07*bw],[height*.5,.071*bw,.065*bw],[height,.079*bw,.07*bw]],leather,{rows:14,sides:24}));
        foot.add(surface([[height-.02,.08*bw,.071*bw],[height,.08*bw,.071*bw]],trim,{rows:2,sides:24}));
        if(o.bootHeight>.2) for(let n=0;n<3;n++) foot.add(cord([[-.03,height-.045-n*.055,.071],[.03,height-.065-n*.055,.071]],trim,.003));
      }
    }
    shoulder.add(limb(.29,(female?.066:.091)*arms,(female?.058:.083)*arms,(female?.046:.062)*arms,skin));
    shoulder.add(ball((female?.063:.086)*arms,skin,0,.003,0,1,1,.95));
    elbow.add(limb(.26,(female?.047:.062)*arms,(female?.043:.058)*arms,(female?.034:.043)*arms,skin));
    if(o.pattern==='sky') {
      const ink=mat(new THREE.Color(look.skin).multiplyScalar(.58));
      shoulder.add(cord([[side*.035,-.015,.047],[0,-.065,.066],[side*.035,-.13,.050],[side*.012,-.21,.047]],ink,.003));
      elbow.add(cord([[side*.02,-.03,.041],[-side*.02,-.075,.040],[side*.018,-.13,.037],[0,-.18,.035]],ink,.003));
    }
    const upper=(female?.071:.097)*arms;
    if(['short','long','bell'].includes(o.sleeves)) shoulder.add(limb(o.sleeves==='short'?.16:.29,upper,upper*.92,upper*.82,cloth));
    if(['long','bell'].includes(o.sleeves)) {
      elbow.add(surface([[-.25,o.sleeves==='bell'?.095:.075,.067],[-.12,.068,.057],[.01,upper*.82,upper*.77]],cloth,{rows:20,sides:24}));
      elbow.add(surface([[-.25,o.sleeves==='bell'?.097:.077,.069],[-.23,o.sleeves==='bell'?.093:.074,.066]],trim,{rows:2,sides:24}));
    } else {
      elbow.add(surface([[-.24,(female?.039:.05)*arms,(female?.04:.05)*arms],[-.19,(female?.043:.054)*arms,(female?.043:.054)*arms]],leather,{rows:2,sides:24}));
      if(o.sleeves==='bands'||o.pattern==='harness') shoulder.add(surface([[-.17,upper*.96,upper*.89],[-.12,upper*.98,upper*.92]],o.pattern==='harness'?leather:trim,{rows:2,sides:24}));
    }
    // The hand, at the race's size (a held weapon keeps its grip at the wrist).
    const hand=new THREE.Group(); hand.scale.setScalar(look.hands||1); wrist.add(hand);
    hand.add(ball(.045,skin,0,-.038,.005,1,1.2,.62));
    for(let n=0;n<4;n++) hand.add(ball(.01,skin,(n-1.5)*.019,-.073,.017,.8,1.8,.9));
    hand.add(ball(.014,skin,-side*.04,-.035,.012,.9,1.45,1));
    if(o.undead) for(let n=0;n<4;n++) hand.add(at(mesh(new THREE.ConeGeometry(.006,.03,5),trim),(n-1.5)*.019,-.098,.02));
    if(o.undead) {
      knee.add(ball(.041,trim,0,.01,.055,1,.9,.45));
      elbow.add(ball(.026,trim,0,0,.04,1,.8,.5));
    }
  }
  const neckLength=look.gnome?.22:.16;
  j.neck.add(at(mesh(new THREE.CylinderGeometry(.046,.059,neckLength,20),skin),0,neckLength/2-.02,0));
  if(o.pattern==='sky') j.neck.add(at(mesh(new THREE.CylinderGeometry(.055,.062,.035,24),trim),0,.018,0));
  j.head.add(buildHead(look,j.hair));
  if(look.tail) {
    const tail=new THREE.Group(); tail.position.set(0,-.05,-.15); tail.rotation.x=.5;
    tail.add(cord([[0,0,0],[0,-.24,-.12],[0,-.5,-.16]],skin,.02),ball(.045,leather,0,-.51,-.16,1,1.5,1));
    j.hips.add(tail); j.hair.push({obj:tail,base:tail.rotation.clone(),amp:.25});
  }
  painted.dispose();
}
