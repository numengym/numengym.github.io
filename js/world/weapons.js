// Original fantasy weapons. Grips sit at the origin; blades point along +Z.
// The two child markers retain the character rig's swing-trail contract.
import * as THREE from 'three';

const material = (color, metalness = 0, roughness = 0.65) => new THREE.MeshStandardMaterial({ color, metalness, roughness, envMapIntensity: metalness ? 0.85 : 0.3 });
const palette = () => ({ steel: material(0xc9d7df, 0.78, 0.3), edge: material(0xe7eef1, 0.85, 0.23), iron: material(0x303e4c, 0.65, 0.43), gold: material(0xc7a15b, 0.72, 0.35), leather: material(0x36221c, 0, 0.9), wrap: material(0x7a5140, 0, 0.9), blue: material(0x204c72, 0.3, 0.5) });
function mesh(geometry, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function shaft(radius, length, mat, z = 0) {
  const m = mesh(new THREE.CylinderGeometry(radius, radius, length, 10), mat, 0, 0, z);
  m.rotation.x = Math.PI / 2;
  return m;
}
function band(radius, thickness, mat, z) {
  return mesh(new THREE.TorusGeometry(radius, thickness, 4, 12), mat, 0, 0, z);
}
// Raised sockets and mirrored inlays stay readable from either hand.
function socket(g, p, z, size = .045) {
  for (const side of [-1, 1]) {
    const rim = mesh(new THREE.OctahedronGeometry(size), p.gold, 0, side * .035, z);
    rim.scale.y = .45;
    const gem = mesh(new THREE.OctahedronGeometry(size * .65), p.blue, 0, side * .051, z);
    gem.scale.y = .55;
    g.add(rim, gem);
  }
}
function shape(points) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y));
  s.closePath();
  return s;
}
// A beveled outline in the XZ plane, centered on its thickness in Y.
function plate(points, depth, mat, bevel = 0.006) {
  const geo = new THREE.ExtrudeGeometry(shape(points), { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, steps: 1, curveSegments: 1 });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, depth / 2, 0);
  return mesh(geo, mat);
}
// Four longitudinal faces meet at a raised center ridge, leaving a bright, sharp edge.
function blade(rings, mat) {
  const vertices = [];
  for (let i = 0; i < rings.length - 1; i++) {
    const [z0, w0, t0] = rings[i];
    const [z1, w1, t1] = rings[i + 1];
    const a = [[-w0, 0, z0], [0, t0, z0], [w0, 0, z0], [0, -t0, z0]];
    const b = [[-w1, 0, z1], [0, t1, z1], [w1, 0, z1], [0, -t1, z1]];
    for (let j = 0; j < 4; j++) {
      const n = (j + 1) % 4;
      vertices.push(...a[j], ...b[j], ...a[n], ...a[n], ...b[j], ...b[n]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.computeVertexNormals();
  return mesh(geo, mat);
}
function grip(g, p, big) {
  const length = big ? 0.29 : 0.23;
  g.add(shaft(0.029, length, p.leather, -0.01));
  for (let i = 0; i < 7; i++) {
    const ring = band(0.03, 0.005, p.wrap, -length / 2 + i * (length - 0.02) / 6);
    ring.rotation.y = 0.12;
    g.add(ring);
  }
  g.add(band(0.033, 0.009, p.gold, -length / 2 - 0.005));
  g.add(band(0.033, 0.009, p.gold, length / 2 - 0.01));
  const pommel = mesh(new THREE.OctahedronGeometry(0.052, 0), p.gold, 0, 0, -length / 2 - 0.043);
  pommel.scale.set(0.85, 0.85, 1.3);
  g.add(pommel);
}

const WEAPON_ALIASES = { sword: 9, axe: 1, dagger: 2, mace: 4, fist: 3, staff: '2h8', polearm: '2h6', '2h-mace': '2h4', '2h-sword': '2h9', '2h-axe': '2h1', shield: 7, throwing: 'thrown', 'throwing-weapon': 'thrown' };
const canonicalKind = (kind) => WEAPON_ALIASES[kind] ?? kind;
export const isTwoHandedWeapon = (kind) => {
  kind = canonicalKind(kind);
  return kind === 'greataxe' || ['bow', 'crossbow', 'gun', 'starter-hammer'].includes(kind) || (typeof kind === 'string' && kind.startsWith('2h'));
};
function curvedRod(points, radius, mat) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((v) => new THREE.Vector3(...v))), 24, radius, 8, false), mat);
}
function rangedWeapon(kind) {
  const g = new THREE.Group(), p = palette();
  if (kind === 'bow') {
    // After Rhok'delar: green living limbs with a pale belly, wound with vines in leaf and pink flower, golden tips.
    // Vertical limbs; every ranged weapon fires along local +Z.
    const limb = material(0x5f9420, 0.05, 0.6), belly = material(0xc8dde0, 0.3, 0.4), vine = material(0x7cb22e, 0, 0.65), leaf = material(0x3f6e1c, 0, 0.7);
    const goldTip = material(0xc8902a, 0.75, 0.3), petal = material(0xe0306a, 0, 0.5), heart = material(0xf2d24a, 0, 0.5);
    const curve = [[0,-.76,-.13],[0,-.64,.02],[0,-.38,.14],[0,0,0],[0,.38,.14],[0,.64,.02],[0,.76,-.13]];
    g.add(curvedRod(curve, .03, limb), curvedRod(curve.map(([x, y, z]) => [x, y * .97, z - .016]), .019, belly));
    const string=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.76,-.13),new THREE.Vector3(0,0,-.13),new THREE.Vector3(0,.76,-.13)]),new THREE.LineBasicMaterial({color:0xe7eef1}));
    g.add(string); g.userData.string=string;
    // The grip: wound green, leaves bursting out over it.
    const handle=mesh(new THREE.CylinderGeometry(.042,.042,.22,10),limb);g.add(handle);
    for(const y of [-.08,-.03,.03,.08]){const ring=mesh(new THREE.TorusGeometry(.043,.006,4,12),vine,0,y,0);ring.rotation.x=Math.PI/2;g.add(ring);}
    const leafAt=(y,z,tilt)=>{const l=mesh(new THREE.SphereGeometry(.05,6,4),leaf,0,y,z);l.scale.set(.25,1.2,.5);l.rotation.x=tilt;return l;};
    for(const side of [-1,1]) {
      g.add(leafAt(side*.07,.05,side*.6),leafAt(side*.12,.02,side*.9));
      // A vine looping in front of the limb and another up to the tip, golden horn tips past the string.
      g.add(curvedRod([[0,side*.1,.02],[.03,side*.24,.12],[-.02,side*.34,.21],[.02,side*.47,.15],[0,side*.58,.06]],.014,vine));
      g.add(curvedRod([[0,side*.48,.13],[.02,side*.58,.02],[0,side*.68,-.05]],.012,vine));
      g.add(leafAt(side*.62,-.01,side*.4),leafAt(side*.66,-.04,side*1.1));
      g.add(spike(goldTip,.02,[0,side*.72,-.08],[0,side*.84,-.18]));
    }
    // Pink flowers along the vines, open to either side.
    for(const [y,z] of [[-.45,.17],[-.6,.04],[-.3,.21],[.32,.2],[.52,.12]]) for(const face of [-1,1]) {
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const pe=mesh(new THREE.SphereGeometry(.021,6,4),petal,face*.026,y+Math.cos(a)*.025,z+Math.sin(a)*.025);pe.scale.x=.4;g.add(pe);}
      g.add(mesh(new THREE.SphereGeometry(.013,6,4),heart,face*.032,y,z));
    }
    const arrow=new THREE.Group();arrow.add(shaft(.008,.7,p.wrap,.20),blade([[.53,.025,.012],[.62,0,0]],p.steel));g.add(arrow);g.userData.ammunition=arrow;
  } else if (kind==='wand') {
    // After Torch of Light: a pale stone lantern, a golden light in its window and in its stone flower of a head.
    const stone=material(0x9a9c8a,0,.8), moss=material(0x6b7a4a,0,.85), light=glow(0xffd23a,0xffaa00,1);
    const butt=spike(moss,.024,[0,0,-.065],[0,0,-.13]);g.add(butt,mesh(new THREE.BoxGeometry(.05,.05,.02),stone,0,0,-.065));
    const handle=mesh(new THREE.CylinderGeometry(.017,.021,.26,8),stone,0,0,.065);handle.rotation.x=Math.PI/2;g.add(handle);
    g.add(curvedRod([[.019,0,-.05],[.016,.006,.05],[.019,-.004,.12],[.015,0,.19]],.004,moss));
    g.add(mesh(new THREE.BoxGeometry(.07,.07,.035),stone,0,0,.212),mesh(new THREE.BoxGeometry(.04,.04,.046),light,0,0,.247),mesh(new THREE.BoxGeometry(.076,.076,.042),stone,0,0,.291));
    for(const [x,y] of [[1,1],[1,-1],[-1,1],[-1,-1]])g.add(mesh(new THREE.BoxGeometry(.012,.012,.046),stone,x*.026,y*.026,.247));
    for(let i=0;i<4;i++){const petal=plate([[.02,.31],[.06,.33],[.095,.44],[.07,.47],[.04,.42]],.02,stone,.005);petal.rotation.z=i*Math.PI/2+Math.PI/4;g.add(petal);}
    const core=mesh(new THREE.SphereGeometry(.038,10,8),light,0,0,.39);core.scale.z=1.4;g.add(core);
  } else if (kind==='thrown') {
    // After Ankle Slicers: a six-pointed star of bright steel round a dark hub, held flat between the fingers.
    const steel=material(0xdfeef4,.5,.22), hub=material(0x6a7880,.6,.3), star=new THREE.Group();star.position.z=.1;g.add(star);
    for(let i=0;i<6;i++){const point=plate([[0,.025],[.022,.07],[0,.16],[-.022,.07]],.012,steel,.003);point.rotation.y=i*Math.PI/3;star.add(point);}
    const disc=mesh(new THREE.CylinderGeometry(.022,.022,.02,12),hub);star.add(disc);
  } else {
    // A stock sits behind the firing hand, with the barrel/bolt pointing along +Z.
    if (kind === 'gun') {
      // After Larvae of the Great Worm: a grub's plated olive body for the barrel, glowing orange beneath, its head
      // (with a glossy eye each side) the muzzle; a leg curling down for the grip and the tail's segments for a stock.
      const shell = material(0x7a7a2a, 0.3, 0.5), dark = material(0x2c3a1c, 0.2, 0.6), eye = material(0x0c0c14, 0.6, 0.15);
      const belly = glow(0xe0801a, 0xc05000, 0.8);
      const segment = (r0, r1, a, b, y, mat) => { const m = mesh(new THREE.CylinderGeometry(r1, r0, b - a, 8), mat, 0, y, (a + b) / 2); m.rotation.x = Math.PI / 2; return m; };
      g.add(segment(.08, .1, .136, .247, .05, dark), segment(.13, .13, .247, .519, .07, shell), segment(.13, .09, .519, .79, .07, shell));
      for (const z of [.247, .519]) { const ridge = band(.132, .012, dark, z); ridge.position.y = .07; g.add(ridge); }
      const under = mesh(new THREE.SphereGeometry(.1, 12, 8), belly, 0, -.05, .5); under.scale.set(1, .35, 2.6); g.add(under);
      for (const side of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(.024, 8, 6), eye, side * .07, .1, .755));
      for (const [x, z] of [[.03, .3], [-.05, .36], [.06, .43], [-.02, .6], [.05, .66], [-.06, .72]]) { const spot = mesh(new THREE.SphereGeometry(.014, 6, 4), dark, x, .19, z); spot.scale.y = .4; g.add(spot); }
      g.add(spike(shell, .018, [0, -.06, .374], [0, -.13, .38]));
      // The leg: down from the belly, curling back to a claw.
      g.add(curvedRod([[0, -.09, .527], [0, -.2, .53], [0, -.27, .48], [0, -.33, .4]], .028, shell), spike(shell, .028, [0, -.33, .4], [0, -.36, .33]));
      // The tail: two swollen segments and a claw behind the hand.
      const pod = (r, from, to) => {
        const a = new THREE.Vector3(...from), dir = new THREE.Vector3(...to).sub(a);
        const m = mesh(new THREE.SphereGeometry(1, 10, 8), shell);
        m.position.copy(a).addScaledVector(dir, .5);
        m.scale.set(r, dir.length() / 2, r);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        return m;
      };
      g.add(pod(.06, [0, .03, .14], [0, -.055, -.09]), pod(.085, [0, -.06, -.07], [0, -.17, -.3]), spike(dark, .03, [0, -.17, -.28], [0, -.28, -.34]));
    } else {
      // After Gravespike Repeater: a long olive stock veined in violet (its profile drawn upright), a violet prod,
      // a dark string and a violet-tipped bolt.
      const olive = material(0x6f7a32, 0, 0.7), violet = material(0x6a4aa8, 0.35, 0.45), dusk = material(0x2a1f3a, 0.2, 0.6);
      const body = plate([[.056,-.44],[.05,-.34],[.04,-.17],[.045,0],[.04,.39],[-.05,.4],[-.04,.376],[-.028,-.065],[-.04,-.45]], .075, olive, .01);
      body.rotation.z = Math.PI / 2;
      g.add(body, mesh(new THREE.BoxGeometry(.03, .012, .6), dusk, 0, .058, .1), mesh(new THREE.BoxGeometry(.09, .105, .025), violet, 0, .005, .04));
      for(const side of [-1,1]) g.add(curvedRod([[side*.043,.03,-.43],[side*.043,-.01,-.34],[side*.043,.025,-.26],[side*.043,0,-.16],[side*.043,.02,-.05],[side*.043,-.005,.05]],.007,violet));
      g.add(curvedRod([[-.5, 0, .29], [-.34, 0, .48], [0, 0, .53], [.34, 0, .48], [.5, 0, .29]], .03, violet));
      const hook = mesh(new THREE.OctahedronGeometry(.055), violet, 0, -.02, .53); hook.scale.set(1.2, .8, 1.4); g.add(hook);
      g.add(curvedRod([[-.5, .025, .29], [0, .025, .08], [.5, .025, .29]], .006, dusk));
      const ammo=new THREE.Group();ammo.position.y=.075;g.add(ammo);
      ammo.add(shaft(.008,.59,dusk,.32),blade([[.6,.025,.012],[.69,0,0]],glow(0x9a7ae0,0x5a30c0,.5)));g.userData.ammunition=ammo;
      for(const side of [-1,1]) {
        g.add(curvedRod([[side*.10,0,.52],[side*.30,0,.49],[side*.43,0,.38]],.036,violet));
        g.add(mesh(new THREE.SphereGeometry(.022,8,6),violet,side*.045,.07,.15));
      }
    }
  }
  g.name = kind;
  Object.assign(g.userData,{kind,ranged:true,supportGrip:new THREE.Vector3(0,-.08,.10),muzzle:new THREE.Vector3(0,kind==='gun'?.055:0,kind==='gun'?.79:kind==='crossbow'?.69:kind==='wand'?.45:kind==='bow'?.62:.4)});
  return g;
}

function starterWeapon(kind) {
  const g=new THREE.Group(),p=palette();
  let len=.63;
  grip(g,p,false);
  if(kind==='starter-hammer') {
    len=.85; g.add(shaft(.031,.85,p.wrap,.25));
    const head=mesh(new THREE.BoxGeometry(.37,.19,.23),p.iron,0,0,.68);g.add(head);
    for(const side of [-1,1])g.add(mesh(new THREE.BoxGeometry(.045,.22,.26),p.steel,side*.18,0,.68));
    const binding=material(0x4f7950);
    g.add(mesh(new THREE.BoxGeometry(.09,.205,.245),binding,0,0,.68));socket(g,p,.68,.052);
  } else if(kind==='starter-mace') {
    g.add(shaft(.025,.56,p.wrap,.22));
    for(let i=0;i<4;i++) { const flange=plate([[0,.42],[.13,.49],[.065,.56],[0,.63]],.018,p.steel,.004); flange.rotation.z=i*Math.PI/2; g.add(flange); }
    g.add(band(.055,.012,p.gold,.43),band(.045,.012,p.gold,.58));
  } else if(kind==='starter-axe') {
    g.add(shaft(.025,.65,p.wrap,.2));
    g.add(plate([[0,.38],[.10,.36],[.19,.29],[.235,.37],[.245,.52],[.19,.65],[.10,.56],[0,.55]],.026,p.edge,.007));
    g.add(plate([[0,.40],[.10,.39],[.17,.35],[.195,.40],[.20,.51],[.17,.58],[.09,.53],[0,.52]],.043,p.iron,.004));
    g.add(shaft(.045,.20,p.gold,.47));socket(g,p,.47,.035);
  } else {
    len=kind==='starter-dagger'?.37:.68;
    const w=kind==='starter-dagger'?.10:.15;
    g.add(plate([[-w,.15],[-w*.85,.085],[-.035,.10],[0,.12],[.035,.10],[w*.85,.085],[w,.15],[.04,.14],[-.04,.14]],.035,p.gold));
    if(kind==='starter-scimitar') g.add(plate([[0,.11],[.045,.23],[.10,.45],[.17,.65],[.10,.58],[.02,.41],[-.03,.15]],.018,p.steel,.003));
    else {
      g.add(blade([[.11,.038,.019],[.20,.052,.024],[len*.72,.041,.021],[len*.91,.022,.012],[len,0,0]],p.edge));
      for(const side of [-1,1]){const inset=plate([[-.013,.21],[.013,.21],[.009,len*.70],[0,len*.84],[-.009,len*.70]],.003,p.blue,.001);inset.position.y=side*.023;g.add(inset);}
    }
    socket(g,p,.125,.028);
  }
  const base=new THREE.Object3D(),tip=new THREE.Object3D(); base.position.z=.2;tip.position.z=len;g.add(base,tip);g.userData={kind,base,tip};return g;
}
function buckler() {
  const g=new THREE.Group(),wood=material(0x82633d),iron=material(0x77766b,.45);
  const panel=new THREE.Group();panel.rotation.y=Math.PI/2;g.add(panel);
  panel.add(mesh(new THREE.CylinderGeometry(.245,.245,.036,32),wood));
  panel.children[0].rotation.x=Math.PI/2;
  panel.add(mesh(new THREE.TorusGeometry(.239,.015,6,32),iron,0,0,.014));
  for(const x of [-.13,-.065,0,.065,.13]) { const len=2*Math.sqrt(.23*.23-x*x); panel.add(mesh(new THREE.BoxGeometry(.004,len,.003),material(0x554329),x,0,.021)); }
  const boss=mesh(new THREE.SphereGeometry(.07,16,10),iron,0,0,.025);boss.scale.z=.42;panel.add(boss);
  g.userData={kind:'shield'};g.name='buckler';return g;
}

// The two-handed axe, after Nightfall: a long blood-red haft wound with black, a spiked pommel, a row of flame spikes
// under the head, and two hooked crescent blades glowing orange to yellow at the edge around a faceted red hub.
let stripes = null; // the haft's black spiral, shared by every copy
function haftStripes() {
  if (stripes) return stripes;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d');
  c.fillStyle = '#7a160e';
  c.fillRect(0, 0, 64, 64);
  c.fillStyle = '#1a0503';
  for (const o of [-64, 0, 64]) { c.beginPath(); c.moveTo(o, 64); c.lineTo(o + 22, 64); c.lineTo(o + 86, 0); c.lineTo(o + 64, 0); c.fill(); }
  stripes = new THREE.CanvasTexture(canvas);
  stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
  stripes.repeat.set(1, 7);
  stripes.colorSpace = THREE.SRGBColorSpace;
  return stripes;
}
// A mesh colored from one color to another along the weapon (z0 to z1), on its own material.
function tint(m, near, far, z0, z1) {
  const pos = m.geometry.attributes.position, a = new THREE.Color(near), b = new THREE.Color(far), c = new THREE.Color(), colors = [];
  for (let i = 0; i < pos.count; i++) { c.copy(a).lerp(b, THREE.MathUtils.clamp((pos.getZ(i) - z0) / (z1 - z0), 0, 1)); colors.push(c.r, c.g, c.b); }
  m.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  m.material.vertexColors = true;
  return m;
}
const glow = (color, emissive, intensity) => Object.assign(material(color, 0.2, 0.45), { emissive: new THREE.Color(emissive), emissiveIntensity: intensity });
function nightfallAxe() {
  const g = new THREE.Group();
  const red = material(0x8a1a10, 0.55, 0.4), dark = material(0x4a0c08, 0.5, 0.5), pink = material(0xc0605a, 0.7, 0.35);
  const flame = glow(0xff7a1a, 0xff4a00, 0.9), ember = glow(0xa3160a, 0x6a0a00, 0.7), gold = glow(0xffc23a, 0xff9a10, 0.8);
  // The haft: wound with black up to the bands, plain red under the head.
  const wound = mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.66, 12), new THREE.MeshStandardMaterial({ map: haftStripes(), metalness: 0.3, roughness: 0.55 }), 0, 0, 0.235);
  wound.rotation.x = Math.PI / 2;
  g.add(wound, shaft(0.03, 0.56, red, 0.84));
  // The pommel: a faceted collar and a long spike under the hands.
  const collar = (r0, r1, h, z) => { const m = mesh(new THREE.CylinderGeometry(r1, r0, h, 8), red, 0, 0, z); m.rotation.x = Math.PI / 2; return m; };
  g.add(collar(0.032, 0.075, 0.07, -0.135), collar(0.075, 0.038, 0.1, -0.05), band(0.07, 0.012, dark, -0.1));
  const spike = mesh(new THREE.ConeGeometry(0.03, 0.32, 8), dark, 0, 0, -0.33);
  spike.rotation.x = -Math.PI / 2;
  g.add(spike);
  // The bands and a riveted collar between the wound haft and the spikes.
  for (const z of [0.58, 0.63, 0.92, 0.99]) g.add(band(0.036, 0.009, pink, z));
  g.add(shaft(0.045, 0.08, red, 0.76));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(mesh(new THREE.SphereGeometry(0.011, 6, 4), pink, Math.cos(a) * 0.047, Math.sin(a) * 0.047, 0.76)); }
  // The flame spikes, a pair on each side of the haft.
  for (const z of [0.72, 0.84, 0.955, 1.035]) {
    for (const side of [-1, 1]) {
      const s = mesh(new THREE.OctahedronGeometry(0.07, 0), flame, side * 0.09, 0, z);
      s.scale.set(1, 0.3, 0.32);
      g.add(s);
    }
  }
  // The hub: a faceted red block, a golden point toward the hands.
  const hub = plate([[-0.09, 1.1], [0.09, 1.1], [0.15, 1.17], [0.15, 1.37], [0.09, 1.44], [-0.09, 1.44], [-0.15, 1.37], [-0.15, 1.17]], 0.11, red, 0.02);
  const point = mesh(new THREE.ConeGeometry(0.07, 0.11, 4), gold, 0, 0, 1.05);
  point.rotation.x = -Math.PI / 2;
  g.add(hub, point);
  for (const face of [-1, 1]) {
    const facet = mesh(new THREE.OctahedronGeometry(0.1, 0), dark, 0, face * 0.06, 1.27);
    facet.scale.set(1.1, 0.25, 1.4);
    g.add(facet);
  }
  // The blades: hooked back toward the hands, the bright edge around a deep red heart.
  const outline = [[0.2, 0.735], [0.458, 1.25], [0.45, 1.49], [0.231, 1.596], [0.17, 1.44], [0.17, 1.08]];
  const [cx, cz] = [0.33, 1.27];
  const heart = outline.map(([x, z]) => [cx + (x - cx) * 0.7, cz + (z - cz) * 0.7]);
  for (const side of [-1, 1]) {
    g.add(plate(outline.map(([x, z]) => [x * side, z]), 0.03, flame, 0.01));
    g.add(plate(heart.map(([x, z]) => [x * side, z]), 0.046, ember, 0.006));
  }
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.52;
  tip.position.z = 1.6;
  g.add(base, tip);
  g.userData = { base, tip, kind: '2h1' };
  return g;
}

// The two-handed sword, after Nightblade: a pale blade that steps out wider three times along its length (blushing
// red by the hilt), a dark crossguard of swept spikes, a red leather grip and a faceted dark pommel.
function nightbladeSword() {
  const g = new THREE.Group();
  const dark = material(0x2c2326, 0.6, 0.38), steel = material(0x6b5d60, 0.75, 0.3), leather = material(0x7c2a22, 0, 0.75), lace = material(0x4a1712, 0, 0.85);
  // White steel, flushed rose toward the guard.
  const edge = blade([[0.2, 0.06, 0.02], [0.25, 0.096, 0.028], [0.4, 0.08, 0.026], [0.437, 0.098, 0.027], [0.738, 0.068, 0.023], [0.769, 0.086, 0.024], [1.0, 0.055, 0.02], [1.04, 0.068, 0.02], [1.5, 0, 0]], material(0xffffff, 0.55, 0.28));
  g.add(tint(edge, 0xe7b0ae, 0xeef1f4, 0.25, 0.55));
  // The crossguard: swept spikes reaching up the blade, a dark medallion at its heart.
  const wing = [[0.105, 0.141], [0.16, 0.209], [0.307, 0.32], [0.092, 0.264]];
  g.add(plate([[0, 0.172], ...wing, [0, 0.246], ...wing.map(([x, z]) => [-x, z]).reverse()], 0.05, dark, 0.008));
  for (const face of [-1, 1]) {
    const medal = mesh(new THREE.OctahedronGeometry(0.05, 0), steel, 0, face * 0.028, 0.2);
    medal.scale.set(1, 0.35, 1.2);
    g.add(medal);
  }
  // The grip: red leather between dark collars, laced across.
  g.add(shaft(0.035, 0.27, leather, 0), shaft(0.043, 0.055, dark, 0.162), shaft(0.04, 0.085, dark, -0.177));
  for (let i = 0; i < 6; i++) {
    const ring = band(0.036, 0.004, lace, -0.11 + i * 0.044);
    ring.rotation.y = 0.25;
    g.add(ring);
  }
  // The pommel: faceted dark steel with a pale stone set in each face.
  const pommel = mesh(new THREE.OctahedronGeometry(0.058, 0), dark, 0, 0, -0.26);
  pommel.scale.set(1, 1, 1.15);
  g.add(pommel);
  for (const face of [-1, 1]) {
    const stone = mesh(new THREE.OctahedronGeometry(0.022, 0), steel, 0, face * 0.042, -0.26);
    stone.scale.y = 0.4;
    g.add(stone);
  }
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.52;
  tip.position.z = 1.5;
  g.add(base, tip);
  g.userData = { base, tip, kind: '2h9' };
  return g;
}

// A faceted spike from one point to another.
function spike(mat, radius, from, to) {
  const a = new THREE.Vector3(...from), dir = new THREE.Vector3(...to).sub(a);
  const m = mesh(new THREE.ConeGeometry(radius, dir.length(), 6), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}
// The two-handed mace, after The Unstoppable Force: a heavy dark slab of a head bristling with steel spikes, a brass
// collar studded and spiked, a long steel haft, and a spike for a pommel.
function unstoppableMace() {
  const g = new THREE.Group();
  const steel = material(0xb9b3a3, 0.85, 0.28), dark = material(0x3d3340, 0.6, 0.42), haft = material(0x7d8188, 0.8, 0.35), brass = material(0x8f7a3c, 0.75, 0.35);
  // The pommel: a spike behind a faceted dark collar.
  g.add(spike(steel, 0.075, [0, 0, -0.37], [0, 0, -0.62]));
  const collar = (r0, r1, h, z) => { const m = mesh(new THREE.CylinderGeometry(r1, r0, h, 8), dark, 0, 0, z); m.rotation.x = Math.PI / 2; return m; };
  g.add(collar(0.06, 0.072, 0.1, -0.31), collar(0.072, 0.05, 0.12, -0.2));
  // The haft, and the brass collar under the head: studs on its faces, a spike to each side.
  g.add(shaft(0.045, 0.6, haft, 0.14), shaft(0.088, 0.5, brass, 0.69));
  for (const z of [0.6, 0.78]) {
    for (const face of [-1, 1]) {
      const stud = mesh(new THREE.OctahedronGeometry(0.04, 0), steel, 0, face * 0.086, z);
      stud.scale.y = 0.4;
      g.add(stud);
    }
  }
  for (const side of [-1, 1]) {
    const s = mesh(new THREE.OctahedronGeometry(0.1, 0), steel, side * 0.175, 0, 0.69);
    s.scale.set(1, 0.45, 0.45);
    g.add(s);
  }
  // The head: a broad slab, a long spike up and down, and spikes bristling forward off its face; drawn full size and
  // shrunk to three quarters around its middle, so it stays in proportion to the one who swings it.
  const head = new THREE.Group();
  head.scale.setScalar(0.75);
  head.position.z = 1.12 * 0.25;
  g.add(head);
  head.add(plate([[-0.24, 0.9], [0.24, 0.9], [0.36, 0.96], [0.39, 1.12], [0.35, 1.3], [0.24, 1.35], [-0.24, 1.35], [-0.35, 1.3], [-0.39, 1.12], [-0.36, 0.96]], 0.3, dark, 0.05));
  for (const side of [-1, 1]) {
    head.add(spike(steel, 0.075, [side * 0.36, 0, 1.12], [side * 0.72, 0, 1.08]));
    for (const x of [0.07, 0.24]) head.add(spike(steel, 0.065, [side * x, 0, 1.32], [side * (x + 0.12), 0, 1.66]));
    head.add(spike(steel, 0.05, [side * 0.36, 0, 1.28], [side * 0.55, 0, 1.46]));
  }
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.52;
  tip.position.z = 1.35;
  g.add(base, tip);
  g.userData = { base, tip, kind: '2h4' };
  return g;
}

// The staff, after Ironbark Staff: a long pale haft with a carved violet grip, a green crystal at its foot, and at its
// head a violet collar, a cage of teal prongs and a long green crystal.
function ironbarkStaff() {
  const g = new THREE.Group();
  const haft = material(0xb3b09a, 0.55, 0.38), dark = material(0x25213a, 0.5, 0.45), violet = material(0x4b3d7c, 0.4, 0.45), lilac = material(0xa78fd8, 0.3, 0.45), teal = material(0x3f7f88, 0.7, 0.35);
  const crystal = glow(0x46e27c, 0x12a845, 0.85);
  const ring = (r, length, mat, z) => g.add(shaft(r, length, mat, z));
  // The foot: a green crystal under a dark collar.
  g.add(spike(crystal, 0.046, [0, 0, -0.78], [0, 0, -0.88]), spike(crystal, 0.046, [0, 0, -0.78], [0, 0, -0.765]));
  ring(0.04, 0.025, dark, -0.768);
  g.add(shaft(0.025, 1.53, haft, 0.007));
  // The grip: dark bands, carved lilac, violet between.
  for (const [a, b] of [[0.019, 0.05], [0.113, 0.138], [0.325, 0.344], [0.406, 0.431]]) ring(0.036, b - a, dark, (a + b) / 2);
  for (const [a, b] of [[0.05, 0.113], [0.344, 0.406]]) ring(0.034, b - a, lilac, (a + b) / 2);
  ring(0.031, 0.187, violet, 0.231);
  ring(0.032, 0.03, lilac, 0.231);
  // The head: a flared violet collar, a dark needle, the cage and its crystal.
  const collar = mesh(new THREE.CylinderGeometry(0.052, 0.038, 0.11, 10), violet, 0, 0, 0.825);
  collar.rotation.x = Math.PI / 2;
  g.add(collar, band(0.05, 0.008, lilac, 0.875), spike(dark, 0.02, [0, 0, 0.88], [0, 0, 0.99]));
  for (let i = 0; i < 4; i++) {
    const [c, s] = [Math.cos(i * Math.PI / 2), Math.sin(i * Math.PI / 2)];
    g.add(curvedRod([[c * 0.045, s * 0.045, 0.875], [c * 0.105, s * 0.105, 0.94], [c * 0.07, s * 0.07, 1.0], [c * 0.04, s * 0.04, 1.045]], 0.009, teal));
  }
  g.add(spike(crystal, 0.062, [0, 0, 1.025], [0, 0, 0.925]), spike(crystal, 0.062, [0, 0, 1.025], [0, 0, 1.27]));
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.5;
  tip.position.z = 1.27;
  g.add(base, tip);
  g.userData = { base, tip, kind: '2h8' };
  return g;
}

// The polearm, after Thunderstrike: a silver trident with barbed prongs on a violet gem, a ribbed blue and violet
// sleeve under it, a slim silver haft with a banded grip, and a blue fork at its foot.
function thunderstrikePolearm() {
  const g = new THREE.Group();
  const silver = material(0xe0e3ea, 0.85, 0.25), blue = material(0x4a64c4, 0.55, 0.35), fork = material(0x9aaee6, 0.75, 0.3);
  const gem = glow(0xa52ce0, 0x7a10c0, 0.7);
  const cone = (r0, r1, a, b, mat) => { const m = mesh(new THREE.CylinderGeometry(r1, r0, b - a, 10), mat, 0, 0, (a + b) / 2); m.rotation.x = Math.PI / 2; return m; };
  // The foot: a fork of two horns sweeping back, on a violet gem.
  const horns = [[0.122, -0.986], [0.134, -0.736], [0.077, -0.691], [0.026, -0.64], [-0.026, -0.64], [-0.077, -0.691], [-0.134, -0.736], [-0.122, -0.986],
    [-0.092, -0.87], [-0.045, -0.787], [0, -0.768], [0.045, -0.787], [0.092, -0.87]];
  g.add(plate(horns, 0.035, fork, 0.008), cone(0.058, 0.05, -0.69, -0.62, gem));
  // The haft: silver cones and a slim shaft, the grip banded blue and violet.
  g.add(cone(0.03, 0.045, -0.62, -0.435, silver), band(0.03, 0.008, gem, -0.428), shaft(0.019, 0.75, silver, -0.05));
  g.add(cone(0.019, 0.038, -0.134, -0.045, silver), cone(0.028, 0.028, -0.045, 0.051, blue), cone(0.02, 0.02, 0.051, 0.23, gem), cone(0.024, 0.024, 0.23, 0.294, blue));
  // The sleeve under the head: blue, violet, ribbed blue.
  g.add(cone(0.032, 0.05, 0.294, 0.397, silver), cone(0.052, 0.052, 0.397, 0.474, blue), cone(0.054, 0.054, 0.474, 0.595, gem), cone(0.052, 0.052, 0.595, 0.717, blue), cone(0.05, 0.035, 0.717, 0.755, silver));
  for (const z of [0.62, 0.65, 0.68]) g.add(band(0.053, 0.006, fork, z));
  // The trident: a barbed center prong on a violet stem, and the two side prongs, each swept back in a spike.
  g.add(shaft(0.016, 0.28, gem, 0.89));
  const heart = mesh(new THREE.OctahedronGeometry(0.05, 0), gem, 0, 0, 0.785);
  heart.scale.set(0.9, 0.6, 1.4);
  g.add(heart);
  g.add(plate([[0, 1.21], [0.06, 1.03], [0.02, 1.088], [0.01, 1.0], [-0.01, 1.0], [-0.02, 1.088], [-0.06, 1.03]], 0.026, silver, 0.006));
  const prong = [[0.151, 0.621], [0.12, 0.8], [0.115, 0.96], [0.173, 0.955], [0.1, 1.075], [0.08, 0.98], [0.087, 0.82], [0.012, 0.8], [0.006, 0.765], [0.08, 0.755], [0.115, 0.715]];
  for (const side of [-1, 1]) g.add(plate(prong.map(([x, z]) => [x * side, z]), 0.03, silver, 0.006));
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.52;
  tip.position.z = 1.21;
  g.add(base, tip);
  g.userData = { base, tip, kind: '2h6' };
  return g;
}

// The dagger of a melee class, after Heartseeker: a wavy blade, white at the edge and blushing toward the hilt, a dark
// crossguard with red inlays swept toward the blade, a red grip ringed in silver and a spiked pommel.
function heartseekerDagger() {
  const g = new THREE.Group();
  const dark = material(0x33373d, 0.7, 0.35), silver = material(0xc7ccd2, 0.85, 0.25), red = material(0xa3261a, 0.2, 0.5);
  const edge = material(0xf2f3f5, 0.6, 0.22), heart = material(0xffffff, 0.45, 0.3);
  // The pommel and grip.
  g.add(spike(dark, 0.04, [0, 0, -0.124], [0, 0, -0.18]), shaft(0.03, 0.02, dark, -0.115), shaft(0.027, 0.19, red, -0.012), shaft(0.032, 0.026, dark, 0.093));
  for (const z of [-0.094, -0.025, 0.029]) g.add(shaft(0.03, 0.014, silver, z));
  // The crossguard: two wings swept toward the blade, red toward their tips.
  const wing = [[0.035, 0.106], [0.09, 0.112], [0.148, 0.156], [0.085, 0.18], [0.03, 0.186]];
  g.add(plate([[0, 0.1], ...wing, [0, 0.192], ...wing.map(([x, z]) => [-x, z]).reverse()], 0.04, dark, 0.006));
  for (const side of [-1, 1]) g.add(plate([[0.07, 0.122], [0.13, 0.153], [0.08, 0.172]].map(([x, z]) => [x * side, z]), 0.046, red, 0.003));
  const knot = mesh(new THREE.OctahedronGeometry(0.035, 0), silver, 0, 0, 0.15);
  knot.scale.set(1, 1.5, 1.2);
  g.add(knot);
  // The blade: its waves, a blushing heart within the white edge, and a dark fuller.
  const waves = [[0.038, 0.184], [0.083, 0.234], [0.038, 0.291], [0.04, 0.356], [0.055, 0.391], [0.022, 0.431], [0.028, 0.536], [0.043, 0.566], [0, 0.661]];
  const outline = (w, tip) => [...w.slice(0, -1), [0, tip], ...w.slice(0, -1).map(([x, z]) => [-x, z]).reverse()];
  g.add(plate(outline(waves, 0.661), 0.016, edge, 0.004));
  g.add(tint(plate(outline(waves.map(([x, z]) => [x * 0.68, z]), 0.62), 0.024, heart, 0.003), 0xd9a8a4, 0xeef0f2, 0.2, 0.5));
  g.add(plate([[-0.004, 0.2], [0.004, 0.2], [0.003, 0.6], [0, 0.625], [-0.003, 0.6]], 0.03, dark, 0.001));
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.2;
  tip.position.z = 0.66;
  g.add(base, tip);
  g.userData = { base, tip, kind: 2 };
  return g;
}

// A caster's dagger, after Mindfang: a curved blade, dusky violet by the hilt, sweeping up to its point; a wooden grip
// set with two lilac stones between dark violet wrappings, and a hooked pommel.
function mindfangDagger() {
  const g = new THREE.Group();
  const violet = material(0x3d3550, 0.4, 0.5), wood = material(0x8a7a45, 0, 0.8), stone = material(0xb9a6e6, 0.2, 0.4);
  g.add(plate([[0.03, -0.088], [0.03, -0.12], [0, -0.128], [-0.06, -0.122], [-0.068, -0.105], [-0.03, -0.088]], 0.055, violet, 0.008));
  g.add(shaft(0.026, 0.18, wood, 0), shaft(0.03, 0.07, violet, 0.117));
  for (const z of [-0.033, 0.033]) {
    for (const face of [-1, 1]) {
      const s = mesh(new THREE.OctahedronGeometry(0.014, 0), stone, 0, face * 0.025, z);
      s.scale.y = 0.5;
      g.add(s);
    }
  }
  const curve = [[0.025, 0.149], [0, 0.231], [-0.053, 0.341], [-0.063, 0.451], [-0.011, 0.589], [-0.08, 0.506], [-0.121, 0.396], [-0.133, 0.303], [-0.105, 0.292], [-0.08, 0.231], [-0.047, 0.154]];
  g.add(tint(plate(curve, 0.02, material(0xffffff, 0.65, 0.28), 0.005), 0x5a4a5e, 0xd8dce6, 0.17, 0.36));
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.17;
  tip.position.set(-0.011, 0, 0.589);
  g.add(base, tip);
  g.userData = { base, tip, kind: 2 };
  return g;
}

// The fist weapon, after Rage Paw: a beast's paw of shaggy orange fur over the fist, a blue band round its cuff, the
// fur bristling at the wrist, and four dark claws (one a thumb's).
let fur = null; // the paw's shaggy streaks, shared by every copy
function furTexture() {
  if (fur) return fur;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d');
  c.fillStyle = '#c4773f';
  c.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 140; i++) {
    const x = (i * 37) % 64, y = (i * 23) % 64;
    c.strokeStyle = i % 3 ? '#e09a5c' : '#8a4a24';
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + ((i % 5) - 2), y + 9); c.stroke();
  }
  fur = new THREE.CanvasTexture(canvas);
  fur.wrapS = fur.wrapT = THREE.RepeatWrapping;
  fur.colorSpace = THREE.SRGBColorSpace;
  return fur;
}
function ragePaw() {
  // Built with its claws along +Z, then turned to reach past the knuckles (-X) with the cuff over the wrist (+X).
  const outer = new THREE.Group(), g = new THREE.Group();
  g.rotation.y = -Math.PI / 2;
  outer.add(g);
  const hide = new THREE.MeshStandardMaterial({ map: furTexture(), roughness: 0.95 }), band = material(0x26386e, 0.2, 0.6), claw = material(0x2a282c, 0.5, 0.35);
  const paw = mesh(new THREE.SphereGeometry(0.1, 14, 10), hide, 0, 0, 0.05);
  paw.scale.set(1.15, 0.85, 1.25);
  g.add(paw);
  // The cuff over the wrist: its band, and the fur bristling round its open end.
  const cuff = mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.2, 14, 1, true), hide, 0, 0, -0.1);
  cuff.rotation.x = Math.PI / 2;
  cuff.material.side = THREE.DoubleSide;
  g.add(cuff, mesh(new THREE.TorusGeometry(0.096, 0.013, 6, 18), band, 0, 0, -0.12));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, r = 0.1, out = 0.12 + (i % 3) * 0.02;
    g.add(spike(hide, 0.022, [Math.cos(a) * r, Math.sin(a) * r, -0.18], [Math.cos(a) * out, Math.sin(a) * out, -0.25 - (i % 2) * 0.03]));
  }
  // The claws, curving down from the front of the paw, and the thumb's from its side.
  for (const x of [-0.055, 0, 0.055]) g.add(spike(claw, 0.016, [x, -0.03, 0.15], [x * 1.2, -0.08, 0.27]));
  g.add(spike(claw, 0.015, [0.11, 0.0, 0.03], [0.18, -0.03, 0.13]));
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.05;
  tip.position.set(0, -0.08, 0.27);
  g.add(base, tip);
  outer.userData = { base, tip, kind: 3 };
  return outer;
}

// The one-handed axe, after Annihilator: a violet head with a toothed blade below the haft and two horns rising behind
// it, on a dark wooden haft with a blue wrapped grip.
function annihilatorAxe() {
  const g = new THREE.Group();
  const wood = material(0x5c2b2e, 0, 0.75), wrap = material(0x2d5c96, 0.1, 0.7), rose = material(0x9a6a78, 0.7, 0.35);
  const steel = material(0x7b78d0, 0.7, 0.32), lilac = material(0xa384c0, 0.55, 0.38), sleeve = material(0x6b5fae, 0.7, 0.35), bronze = material(0x8a5a4a, 0.7, 0.35);
  const cone = (r0, r1, a, b, mat) => { const m = mesh(new THREE.CylinderGeometry(r1, r0, b - a, 10), mat, 0, 0, (a + b) / 2); m.rotation.x = Math.PI / 2; return m; };
  g.add(cone(0.042, 0.03, -0.3, -0.27, wood), shaft(0.028, 0.84, wood, 0.15), shaft(0.032, 0.216, wrap, 0.001));
  for (const z of [-0.11, 0.11]) g.add(shaft(0.034, 0.025, rose, z));
  for (let i = 0; i < 5; i++) { const ring = band(0.033, 0.004, rose, -0.08 + i * 0.04); ring.rotation.y = 0.35; g.add(ring); }
  g.add(shaft(0.046, 0.16, sleeve, 0.437), cone(0.034, 0.03, 0.517, 0.557, bronze));
  // The head: the blade's edge to +X (the way an axe faces), the horns behind.
  g.add(plate([[0.136, 0.221], [0.08, 0.357], [0.032, 0.365], [-0.243, 0.405], [-0.12, 0.509], [-0.032, 0.541], [-0.04, 0.653], [-0.163, 0.752], [0.216, 0.685], [0.296, 0.469]], 0.03, steel, 0.008));
  g.add(plate([[0.04, 0.381], [0.04, 0.621], [0.128, 0.637], [0.168, 0.605], [0.216, 0.565], [0.176, 0.525], [0.224, 0.485], [0.176, 0.445], [0.224, 0.405], [0.168, 0.365], [0.208, 0.325], [0.152, 0.285], [0.096, 0.349]], 0.042, lilac, 0.004));
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.3;
  tip.position.set(0.25, 0, 0.6);
  g.add(base, tip);
  g.userData = { base, tip, kind: 1 };
  return g;
}

// The one-handed mace of a melee fighter, after Persuader: a block of a head, red at both ends around dark steel, on a
// wooden haft banded with red studs, a steel collar studded with silver, and a ring for a pommel.
function persuaderMace() {
  const g = new THREE.Group();
  const wood = material(0x7a5530, 0, 0.75), dark = material(0x34302f, 0.7, 0.38), silver = material(0xc9ccd0, 0.85, 0.25), red = material(0xb3201a, 0.4, 0.4);
  const cone = (r0, r1, a, b, mat) => { const m = mesh(new THREE.CylinderGeometry(r1, r0, b - a, 10), mat, 0, 0, (a + b) / 2); m.rotation.x = Math.PI / 2; return m; };
  // The pommel: a dark ring set with four silver points.
  const ring = mesh(new THREE.TorusGeometry(0.034, 0.011, 6, 16), dark, 0, 0, -0.273);
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.add(spike(silver, 0.012, [x * 0.04, 0, -0.273 + z * 0.04], [x * 0.066, 0, -0.273 + z * 0.066]));
  // The haft: a wooden collar, the studded steel, a silver ring and the wood banded with red studs.
  g.add(cone(0.046, 0.046, -0.24, -0.157, wood), cone(0.045, 0.045, -0.157, 0.032, dark), cone(0.05, 0.05, 0.032, 0.084, silver), cone(0.048, 0.062, 0.084, 0.42, wood));
  for (const z of [-0.073, -0.01]) {
    for (const [x, y] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const stud = mesh(new THREE.OctahedronGeometry(0.017, 0), silver, x * 0.045, y * 0.045, z);
      stud.scale.set(x ? 0.5 : 1, y ? 0.5 : 1, 1.3);
      g.add(stud);
    }
  }
  for (const z of [0.147, 0.273]) {
    g.add(cone(0.054, 0.056, z - 0.032, z + 0.032, dark));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.add(mesh(new THREE.SphereGeometry(0.011, 6, 4), red, Math.cos(a) * 0.057, Math.sin(a) * 0.057, z)); }
  }
  // The head: dark steel between red ends, a wooden cap through it with a red ring.
  g.add(mesh(new THREE.BoxGeometry(0.21, 0.22, 0.252), dark, 0, 0, 0.546));
  for (const side of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(0.07, 0.225, 0.256), red, side * 0.14, 0, 0.546));
    g.add(mesh(new THREE.BoxGeometry(0.012, 0.23, 0.26), dark, side * 0.108, 0, 0.546));
  }
  g.add(cone(0.06, 0.055, 0.672, 0.74, wood), band(0.061, 0.008, red, 0.7));
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.3;
  tip.position.z = 0.74;
  g.add(base, tip);
  g.userData = { base, tip, kind: 4 };
  return g;
}

// The one-handed mace of a caster or healer, after Masterwork Stormhammer: a golden hammer with a lightning emblem on
// its faces and a knob beyond, on a wooden haft, with a lavender cloth grip between golden bands and a flared pommel.
function stormhammerMace() {
  const g = new THREE.Group();
  const gold = material(0xc9a94a, 0.85, 0.3), cloth = material(0x8a88c8, 0, 0.75), wood = material(0x6a4428, 0, 0.8), amber = material(0xd07a2a, 0.4, 0.45);
  const emblem = glow(0xa9a6e0, 0x5a50c0, 0.35);
  const cone = (r0, r1, a, b, mat) => { const m = mesh(new THREE.CylinderGeometry(r1, r0, b - a, 10), mat, 0, 0, (a + b) / 2); m.rotation.x = Math.PI / 2; return m; };
  // The pommel, the grip and its bands.
  g.add(spike(gold, 0.06, [0, 0, -0.19], [0, 0, -0.24]), cone(0.06, 0.04, -0.19, -0.133, gold), cone(0.042, 0.042, -0.133, -0.105, gold), band(0.043, 0.006, amber, -0.119));
  g.add(cone(0.034, 0.034, -0.11, 0.105, cloth));
  for (let i = 0; i < 5; i++) g.add(mesh(new THREE.SphereGeometry(0.006, 6, 4), gold, 0, 0.034, -0.08 + i * 0.04));
  g.add(cone(0.037, 0.037, 0.105, 0.171, gold), cone(0.04, 0.046, 0.171, 0.238, gold));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const spot = mesh(new THREE.SphereGeometry(0.01, 6, 4), amber, Math.cos(a) * 0.036, Math.sin(a) * 0.036, 0.138); spot.scale.z = 1.6; g.add(spot); }
  // The haft, a golden ring, and the head with its emblem and knob.
  g.add(cone(0.027, 0.027, 0.238, 0.409, wood), cone(0.034, 0.034, 0.409, 0.447, gold));
  g.add(plate([[0.247, 0.447], [0.247, 0.608], [0.085, 0.656], [-0.19, 0.656], [-0.19, 0.447]], 0.16, gold, 0.02));
  g.add(plate([[-0.19, 0.44], [-0.19, 0.663], [-0.25, 0.66], [-0.285, 0.63], [-0.285, 0.47], [-0.25, 0.443]], 0.19, gold, 0.015));
  for (const face of [-1, 1]) {
    const bolt = plate([[0.17, 0.49], [0.06, 0.53], [0.14, 0.6], [0.01, 0.575], [-0.12, 0.625], [-0.05, 0.55], [-0.15, 0.49], [0.0, 0.515]], 0.004, emblem, 0.001);
    bolt.position.y = face * 0.102;
    g.add(bolt);
  }
  g.add(cone(0.045, 0.04, 0.656, 0.69, gold), spike(gold, 0.045, [0, 0, 0.69], [0, 0, 0.75]));
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.3;
  tip.position.z = 0.75;
  g.add(base, tip);
  g.userData = { base, tip, kind: 4 };
  return g;
}

// The one-handed sword of a caster or healer, after Sageblade: a slender blade, deep blue at the hilt and pale violet
// toward the point, a narrow violet crossguard, a pale grip and a carved violet pommel.
function sagebladeSword() {
  const g = new THREE.Group();
  const violet = glow(0x7a3ae0, 0x5a10c0, 0.4), pale = material(0xb8c8d8, 0.7, 0.3);
  const cone = (r0, r1, a, b, mat) => { const m = mesh(new THREE.CylinderGeometry(r1, r0, b - a, 8), mat, 0, 0, (a + b) / 2); m.rotation.x = Math.PI / 2; return m; };
  g.add(cone(0.045, 0.035, -0.178, -0.128, violet), cone(0.036, 0.036, -0.128, -0.06, violet), cone(0.03, 0.03, -0.06, 0.06, pale));
  for (let i = 0; i < 4; i++) g.add(band(0.031, 0.004, violet, -0.045 + i * 0.03));
  const wing = [[0.04, 0.07], [0.14, 0.085], [0.04, 0.1]];
  g.add(plate([[0, 0.055], ...wing, [0, 0.115], ...wing.map(([x, z]) => [-x, z]).reverse()], 0.04, violet, 0.005));
  g.add(cone(0.045, 0.04, 0.11, 0.16, violet));
  g.add(tint(blade([[0.15, 0.042, 0.02], [0.6, 0.036, 0.018], [0.82, 0.03, 0.015], [0.95, 0, 0]], material(0xffffff, 0.15, 0.4)), 0x1e3466, 0xd8dcff, 0.2, 1.0));
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.35;
  tip.position.z = 0.95;
  g.add(base, tip);
  g.userData = { base, tip, kind: 9 };
  return g;
}

// The one-handed sword of a melee fighter, after Ravencrest Legacy: a golden dragon's head for a guard, red-eyed, its
// horn and jaw swept back over a teal grip, a curved pale blade inlaid with gold and red, and a golden pommel.
function ravencrestSword() {
  const g = new THREE.Group();
  const gold = material(0xd4b020, 0.8, 0.35), teal = material(0x5f8f8a, 0.6, 0.35), red = glow(0xc01818, 0x800000, 0.6);
  g.add(plate([[-0.015, -0.234], [0.058, -0.131], [0.029, -0.08], [-0.036, -0.08], [-0.076, -0.131]], 0.06, gold, 0.008));
  g.add(shaft(0.034, 0.21, teal, 0.015), shaft(0.04, 0.11, gold, 0.145));
  // The dragon: its head above, the jaw below with its teeth, a horn and a spur swept back, red eyes.
  g.add(plate([[0.03, 0.088], [0.1, 0.146], [0.12, 0.234], [0.105, 0.307], [0.11, 0.38], [0.075, 0.402], [0.04, 0.37], [0.03, 0.3]], 0.06, gold, 0.008));
  g.add(plate([[-0.03, 0.088], [-0.088, 0.175], [-0.08, 0.365], [-0.044, 0.372], [-0.03, 0.307], [-0.015, 0.175]], 0.055, gold, 0.008));
  g.add(spike(gold, 0.02, [0.095, 0, 0.117], [0.112, 0, -0.066]), spike(gold, 0.018, [-0.07, 0, 0.13], [-0.085, 0, 0.03]));
  for (const z of [0.25, 0.29, 0.33]) g.add(spike(gold, 0.007, [-0.03, 0, z], [-0.004, 0, z + 0.012]));
  for (const face of [-1, 1]) g.add(mesh(new THREE.SphereGeometry(0.011, 8, 6), red, 0.088, face * 0.032, 0.277));
  // The blade: a hump by the guard, the tip curving up; pale teal to white, inlaid down its middle.
  const edge = plate([[0.044, 0.38], [0.146, 0.467], [0.095, 0.526], [0.066, 0.672], [0.051, 1.0], [-0.036, 0.876], [-0.088, 0.686], [-0.088, 0.365]], 0.022, material(0xffffff, 0.5, 0.28), 0.004);
  g.add(tint(edge, 0x9fd6cc, 0xf2f6f6, 0.4, 0.95));
  for (const face of [-1, 1]) {
    const inlay = plate([[0, 0.37], [0.03, 0.42], [0.02, 0.5], [0.035, 0.58], [0, 0.66], [-0.035, 0.58], [-0.02, 0.5], [-0.03, 0.42]], 0.003, gold, 0.001);
    inlay.position.y = face * 0.016;
    g.add(inlay);
    for (const z of [0.45, 0.52, 0.58]) g.add(mesh(new THREE.SphereGeometry(0.009, 6, 4), red, 0, face * 0.019, z));
  }
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.45;
  tip.position.set(0.051, 0, 1.0);
  g.add(base, tip);
  g.userData = { base, tip, kind: 9 };
  return g;
}

// A held-in-off-hand item (an orb, a tome), after Skull of Impending Doom: a horned skull with glowing orange eyes on a
// short grey handle capped in copper. Its face looks out past the knuckles (-X), its crown away from the hand (+Z).
function doomSkull() {
  const g = new THREE.Group();
  const steel = material(0x8d9096, 0.6, 0.35), copper = material(0xb8622a, 0.75, 0.3), wrap = material(0x3a3a34, 0, 0.8);
  const bone = material(0xa9b3a0, 0, 0.7), hollow = material(0x1a1c18, 0, 0.9), horn = material(0x3c5a48, 0.2, 0.55), ember = glow(0xff8a1a, 0xff5a00, 1.2);
  g.add(shaft(0.028, 0.17, steel, -0.005), spike(copper, 0.03, [0, 0, -0.09], [0, 0, -0.13]), band(0.03, 0.008, copper, 0.04), shaft(0.031, 0.05, wrap, 0.075));
  const skull = mesh(new THREE.SphereGeometry(0.1, 14, 10), bone, 0, 0, 0.2);
  skull.scale.set(1, 0.9, 1.1);
  g.add(skull);
  for (const side of [-1, 1]) {
    g.add(mesh(new THREE.SphereGeometry(0.026, 8, 6), hollow, -0.078, side * 0.036, 0.205), mesh(new THREE.SphereGeometry(0.014, 8, 6), ember, -0.092, side * 0.036, 0.205));
    // A ram's horn curling up from the crown and forward.
    g.add(curvedRod([[0, side * 0.075, 0.26], [0.02, side * 0.15, 0.3], [0, side * 0.17, 0.4], [-0.04, side * 0.12, 0.45], [-0.065, side * 0.09, 0.41]], 0.022, horn));
  }
  g.add(mesh(new THREE.OctahedronGeometry(0.016, 0), hollow, -0.097, 0, 0.17));
  const jaw = mesh(new THREE.BoxGeometry(0.07, 0.09, 0.05), bone, -0.055, 0, 0.125);
  g.add(jaw);
  for (let i = 0; i < 5; i++) g.add(mesh(new THREE.BoxGeometry(0.012, 0.012, 0.022), material(0xd8d6c4, 0, 0.5), -0.092, -0.03 + i * 0.015, 0.14));
  const base = new THREE.Object3D(), tip = new THREE.Object3D();
  base.position.z = 0.1;
  tip.position.z = 0.3;
  g.add(base, tip);
  g.userData = { base, tip, kind: 5 };
  return g;
}

// A melee fighter's dagger is Heartseeker, mace Persuader and sword Ravencrest Legacy; a caster's or healer's are
// Mindfang, Masterwork Stormhammer and Sageblade. Their look says which (main.js handsLook); without it, the cloth classes are the casters.
const CASTERS = new Set(['mage', 'warlock', 'priest']);

// A weapon enchant's glow, by enchant id, in the colour its effect has: Crusader's holy light, Fiery Weapon's flame,
// Icy Chill's frost, the spell power enchants' arcane violet... A counterweight, a chain or Dismantle does not glow.
const ENCHANT_GLOWS = {};
for (const [color, ids] of [
  [0xfff0c0, [1900, 7940]], // Crusader, Grand Crusader: holy white and gold
  [0xff6a10, [803, 36]], // Fiery Weapon, Fiery Blaze: flame
  [0x8fd8ff, [1894, 2443]], // Icy Chill, Winter's Might: frost
  [0x9a2ad0, [1898]], // Lifestealing: shadow violet
  [0x4ce060, [1899]], // Unholy Weapon: sickly green
  [0xc0105a, [912]], // Demonslaying: crimson
  [0xb070ff, [2504, 8211, 7662, 7941, 7942]], // Spell Power, Mighty Spell Power, Spellblasting, Grand Arcanist and Sorcerer
  [0x8affd0, [2505, 8212, 8721]], // Healing Power, Mighty Healing Power, Recovery: soft green-white
  [0xffd060, [7943]], // Grand Inquisitor: gold
  [0x3a7aff, [723, 1904, 2568, 8216]], // Intellect and Insight: blue
  [0x40d0c0, [851, 1903, 2567, 8217]], // Spirit and Revelation: teal
  [0xffe040, [2564, 2618, 2646]], // Agility: yellow
  [0xe02a2a, [2563, 8215, 241, 250, 943, 805, 1897, 963, 1896, 8205]], // Strength, Striking and Impact: red
  [0xd08030, [249, 853]], // Beastslayer: amber
  [0x80c0ff, [854]], // Elemental Slayer: pale blue
]) for (const id of ids) ENCHANT_GLOWS[id] = color;

// Wraps a weapon's blade or head (every part from its base marker toward its tip) in a slightly larger, softly pulsing
// shell of the glow's colour: added light, strongest at the edges and the outline (a rim glow, so the weapon's own
// look still shows through its middle), which the bloom picks up.
function glowWeapon(g, color) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, strength: { value: 1 } },
    vertexShader: 'varying vec3 vNormal; varying vec3 vView; void main() { vec4 p = modelViewMatrix * vec4(position, 1.0); vNormal = normalize(normalMatrix * normal); vView = normalize(-p.xyz); gl_Position = projectionMatrix * p; }',
    fragmentShader: 'uniform vec3 color; uniform float strength; varying vec3 vNormal; varying vec3 vView; void main() { float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.0); gl_FragColor = vec4(color * (0.1 + rim * 1.4) * strength, 1.0); }',
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  g.updateMatrixWorld(true);
  const toWeapon = g.matrixWorld.clone().invert();
  const at = (o) => o.getWorldPosition(new THREE.Vector3()).applyMatrix4(toWeapon);
  const base = g.userData.base ? at(g.userData.base) : new THREE.Vector3(0, 0, 0.3), tip = g.userData.tip ? at(g.userData.tip) : new THREE.Vector3(0, 0, 1);
  const along = tip.clone().sub(base).normalize();
  const shells = [];
  g.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const middle = o.geometry.boundingBox.getCenter(new THREE.Vector3());
    if (middle.clone().applyMatrix4(o.matrixWorld).applyMatrix4(toWeapon).sub(base).dot(along) < -0.05) return;
    const shell = new THREE.Mesh(o.geometry, mat);
    shell.matrixAutoUpdate = false;
    // Thin parts (a blade's flat) swell more across their thickness, so the glow shows from the side too.
    const size = o.geometry.boundingBox.getSize(new THREE.Vector3()), swell = (s) => 1 + Math.max(0.15, Math.min(1.2, 0.02 / Math.max(s, 0.001)));
    shell.matrix.copy(o.matrix).multiply(new THREE.Matrix4().makeTranslation(middle.x, middle.y, middle.z)).multiply(new THREE.Matrix4().makeScale(swell(size.x), swell(size.y), swell(size.z))).multiply(new THREE.Matrix4().makeTranslation(-middle.x, -middle.y, -middle.z));
    shells.push([o.parent, shell]);
  });
  for (const [parent, shell] of shells) parent.add(shell);
  if (shells.length) shells[0][1].onBeforeRender = () => { mat.uniforms.strength.value = 0.8 + 0.25 * Math.sin(performance.now() / 260); };
}

// A weapon of the kind, held by a class (a caster's or healer's look: caster), its enchant glowing.
export function weapon(kind, { classId = null, caster = null, enchant = null } = {}) {
  const g = buildWeapon(kind, { classId, caster });
  const color = ENCHANT_GLOWS[enchant];
  if (color && !g.userData.ranged && g.userData.kind !== 'shield' && g.userData.kind !== 'buckler') glowWeapon(g, color);
  return g;
}

function buildWeapon(kind, { classId = null, caster = null } = {}) {
  kind = canonicalKind(kind);
  const casts = caster ?? CASTERS.has(classId);
  if (kind === 2 || kind === '2') return casts ? mindfangDagger() : heartseekerDagger();
  if (kind === 4 || kind === '4') return casts ? stormhammerMace() : persuaderMace();
  if (kind === 9 || kind === '9') return casts ? sagebladeSword() : ravencrestSword();
  if (kind === 3 || kind === '3') return ragePaw();
  if (kind === 5 || kind === '5') return doomSkull();
  if (kind === 1 || kind === '1') return annihilatorAxe();
  if (kind === '2h6') return thunderstrikePolearm();
  if (kind === '2h1') return nightfallAxe();
  if (kind === '2h9') return nightbladeSword();
  if (kind === '2h4') return unstoppableMace();
  if (kind === '2h8') return ironbarkStaff();
  if(kind === 'buckler') return buckler();
  if(typeof kind === 'string' && kind.startsWith('starter-')) return starterWeapon(kind);
  if (kind === 7 || kind === '7') return shield();
  if (['bow', 'crossbow', 'gun', 'thrown', 'wand'].includes(kind)) return rangedWeapon(kind);
  const g = new THREE.Group();
  const p = palette();
  const twoHand = typeof kind === 'string' && kind.startsWith('2h');
  const big = kind === 'greataxe' || twoHand;
  const type = kind === 'greataxe' ? 1 : twoHand ? Number(kind.slice(2)) : Number(kind) || 9;
  const len = big ? 1.5 : type === 2 ? 0.5 : type === 3 ? 0.48 : 1;
  grip(g, p, big);

  if (type === 8) {
    // Carved staff with a metal cradle and faceted focus, within the original reach.
    g.add(shaft(.035, len + .5, p.leather, (len - .5) / 2));
    for (const z of [-.45, .18, len - .06]) g.add(band(.038, .012, p.iron, z));
    const focus=mesh(new THREE.OctahedronGeometry(.105),p.blue,0,0,len-.08);focus.scale.z=1.5;g.add(focus);
    for(const side of [-1,1])g.add(curvedRod([[side*.025,0,len-.36],[side*.12,0,len-.18],[side*.07,0,len+.015]],.022,p.gold));
    for(const z of [len-.38,len-.31])g.add(band(.04,.012,p.gold,z));
  } else if (type === 6) {
    g.add(shaft(.031, len + .35, p.wrap, (len - .35) / 2));
    for (const z of [-.3, .25, len * .76]) g.add(band(.035, .009, p.iron, z));
    g.add(blade([[len * .76, .04, .026], [len * .88, .11, .035], [len * 1.08, .065, .024], [len * 1.2, 0, 0]], p.steel));
    g.add(shaft(.045, .14, p.iron, len * .78));
    g.add(plate([[0,len*.79],[.14,len*.72],[.19,len*.82],[.12,len*.94],[.08,len*.86],[0,len*.87]],.025,p.edge));
    socket(g,p,len*.81,.043);
  } else if (type === 1) {
    g.add(shaft(big ? 0.033 : 0.026, len * 0.85, p.iron, len * 0.4));
    for (const z of [0.2, 0.42, 0.64]) g.add(band(big ? 0.036 : 0.03, 0.008, p.gold, z * len));
    const w = big ? 0.43 : 0.3;
    const z = len * 0.71;
    const head = [[0, z - 0.12], [w * 0.3, z - 0.1], [w * 0.72, z - 0.27], [w, z - 0.13], [w * 1.08, z + 0.1], [w * 0.89, z + 0.26], [w * 0.44, z + 0.12], [0, z + 0.09]];
    for (const side of big ? [-1, 1] : [1]) {
      const bladeHead = plate(head.map(([x, zz]) => [x * side, zz]), 0.026, p.edge, 0.012);
      g.add(bladeHead);
      // Dark inset leaves a broad, polished cutting bevel visible around the silhouette.
      const inset = plate([[0.02, z - 0.075], [w * 0.32, z - 0.065], [w * 0.65, z - 0.18], [w * 0.84, z - 0.09], [w * 0.87, z + 0.08], [w * 0.72, z + 0.17], [w * 0.4, z + 0.075], [0.02, z + 0.05]].map(([x, zz]) => [x * side, zz]), 0.044, p.iron, 0.004);
      g.add(inset);
      for (const face of [-1, 1]) {
        const rivet = mesh(new THREE.OctahedronGeometry(0.025, 0), p.gold, w * 0.45 * side, 0.028 * face, z);
        rivet.scale.y = 0.4;
        g.add(rivet);
      }
    }
    g.add(shaft(big ? 0.052 : 0.043, 0.22, p.gold, z));
    socket(g,p,z,big?.06:.045);
    if (type === 6) g.add(blade([[len * 0.8, 0.045, 0.025], [len * 1.03, 0.055, 0.018], [len * 1.2, 0, 0]], p.steel));
  } else if (type === 4) {
    g.add(shaft(big ? 0.036 : 0.026, len * 0.7, p.iron, len * 0.36));
    const z = len * 0.79;
    const r = big ? 0.17 : 0.12;
    g.add(shaft(r * 0.65, len * 0.26, p.iron, z));
    for (let i = 0; i < 6; i++) {
      const flange = plate([[0, z - 0.15 * len], [r * 0.7, z - 0.15 * len], [r * 1.3, z - 0.08 * len], [r * 1.3, z + 0.08 * len], [r * 0.7, z + 0.15 * len], [0, z + 0.15 * len]], 0.023, p.steel, 0.006);
      flange.rotation.z = i * Math.PI / 3;
      g.add(flange);
    }
    for (const zz of [z - len * 0.14, z + len * 0.14]) g.add(band(r * 0.66, 0.014, p.gold, zz));
    g.add(mesh(new THREE.OctahedronGeometry(r * 0.6, 0), p.gold, 0, 0, z + len * 0.19));
    for(const zz of [.24,.40])g.add(band(big?.04:.03,.007,p.gold,zz*len));
  } else if (type === 3) {
    const knuckle = plate([[-0.14, -0.02], [0.14, -0.02], [0.16, 0.13], [-0.16, 0.13]], 0.065, p.iron, 0.01);
    knuckle.position.y = -0.025;
    g.add(knuckle);
    for (const x of [-0.1, 0, 0.1]) {
      const claw = blade([[0.08, 0.033, 0.022], [0.32, 0.026, 0.014], [len, 0, 0]], p.edge);
      claw.position.set(x, -0.015, 0);
      g.add(claw, mesh(new THREE.OctahedronGeometry(0.027, 0), p.gold, x, 0.023, 0.035));
    }
  } else {
    const width = big ? 0.12 : type === 2 ? 0.055 : 0.085;
    const guardWidth = big ? 0.27 : type === 2 ? 0.15 : 0.21;
    const guard = plate([[-guardWidth, 0.19], [-guardWidth * 0.86, 0.1], [-0.065, 0.09], [0, 0.105], [0.065, 0.09], [guardWidth * 0.86, 0.1], [guardWidth, 0.19], [guardWidth * 0.8, 0.17], [0.05, 0.15], [-0.05, 0.15], [-guardWidth * 0.8, 0.17]], 0.045, p.gold, 0.008);
    g.add(guard);
    g.add(blade([[0.14, width * 0.75, 0.022], [0.23, width, 0.029], [len * 0.43, width * .84, .028], [len * 0.78, width * 0.64, 0.023], [len * 0.91, width * 0.42, 0.017], [len, 0, 0]], p.edge));
    // Narrow inset along both sides of the ridge, fading before the point.
    for (const side of [-1, 1]) {
      const fuller = plate([[-0.009, 0.25], [0.009, 0.25], [0.006, len * 0.72], [0, len * 0.81], [-0.006, len * 0.72]], 0.002, p.iron, 0.001);
      fuller.position.y = side * 0.027;
      g.add(fuller);
      const inlay=plate([[-width*.5,.24],[0,.30],[width*.5,.24],[width*.42,.28],[0,.35],[-width*.42,.28]],.002,p.gold,.001);
      inlay.position.y=side*.029;g.add(inlay);
    }
    const jewel = mesh(new THREE.OctahedronGeometry(0.035, 0), p.blue, 0, 0.038, 0.13);
    jewel.scale.y = 0.6;
    g.add(jewel);
  }

  const base = new THREE.Object3D();
  const tip = new THREE.Object3D();
  base.position.z = type === 3 ? 0.12 : len * 0.35;
  tip.position.z = type === 6 ? len * 1.2 : len;
  g.add(base, tip);
  g.userData = { base, tip, kind };
  return g;
}

export function shield() {
  const g = new THREE.Group();
  const p = palette();
  const panel = new THREE.Group();
  panel.rotation.y = Math.PI / 2; // anatomical left is +X when the character faces +Z
  g.add(panel);
  // After Wall of the Dead: an eleven-sided riveted rim of dark metal, a grey inner ring, a tan field, and a silver
  // skull at its heart with red glowing eyes.
  const rimMetal = material(0x6e5a50, 0.6, 0.5), rivet = material(0x4a3a34, 0.6, 0.45), ring = material(0x9a9a92, 0.65, 0.35);
  const field = material(0xd08a48, 0.15, 0.5), bronze = material(0x8a5a30, 0.5, 0.45), silver = material(0xc0c4cc, 0.8, 0.28), hollow = material(0x1c1c20, 0, 0.9);
  const eyes = glow(0xff2a1a, 0xff1000, 1.2);
  const disc = (r, depth, z, mat, sides = 32) => { const m = mesh(new THREE.CylinderGeometry(r, r, depth, sides), mat, 0, 0, z); m.rotation.x = Math.PI / 2; panel.add(m); return m; };
  disc(0.4, 0.05, 0, rimMetal, 11);
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; panel.add(mesh(new THREE.SphereGeometry(0.013, 6, 4), rivet, Math.cos(a) * 0.355, Math.sin(a) * 0.355, 0.028)); }
  disc(0.3, 0.06, 0.008, ring);
  disc(0.27, 0.066, 0.012, field);
  const edge = mesh(new THREE.TorusGeometry(0.27, 0.012, 6, 32), bronze, 0, 0, 0.045);
  panel.add(edge);
  const skull = mesh(new THREE.SphereGeometry(0.12, 16, 12), silver, 0, 0.01, 0.06);
  skull.scale.set(1, 1.05, 0.6);
  panel.add(skull);
  for (const side of [-1, 1]) panel.add(mesh(new THREE.SphereGeometry(0.03, 8, 6), hollow, side * 0.045, 0.0, 0.115), mesh(new THREE.SphereGeometry(0.016, 8, 6), eyes, side * 0.045, 0.0, 0.125));
  panel.add(mesh(new THREE.OctahedronGeometry(0.016, 0), hollow, 0, -0.045, 0.13));
  for (let i = 0; i < 5; i++) panel.add(mesh(new THREE.BoxGeometry(0.014, 0.022, 0.012), silver, -0.032 + i * 0.016, -0.09, 0.115));
  for (const side of [-1, 1]) {
    const strap = mesh(new THREE.TorusGeometry(0.08, 0.016, 4, 12, Math.PI), p.leather, 0.12 * side, 0, -0.04);
    strap.rotation.x = Math.PI / 2;
    panel.add(strap);
  }
  g.position.set(-0.08, 0, 0.05);
  g.name = 'shield';
  g.userData = { kind: 'shield' };
  return g;
}
