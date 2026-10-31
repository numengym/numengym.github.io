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
    // Vertical limbs; every ranged weapon fires along local +Z.
    g.add(curvedRod([[0,-.76,-.13],[0,-.64,.02],[0,-.38,.14],[0,0,0],[0,.38,.14],[0,.64,.02],[0,.76,-.13]], .027, p.wrap));
    const string=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-.76,-.13),new THREE.Vector3(0,0,-.13),new THREE.Vector3(0,.76,-.13)]),new THREE.LineBasicMaterial({color:0xe7eef1}));
    g.add(string); g.userData.string=string;
    const handle=shaft(.036,.18,p.leather);handle.rotation.x=0;g.add(handle);
    for(const side of [-1,1]) {
      g.add(curvedRod([[0,side*.17,.02],[0,side*.36,.16],[0,side*.56,.10]],.035,p.gold));
      const tip=mesh(new THREE.OctahedronGeometry(.043),p.iron,0,side*.73,-.10);tip.scale.y=1.8;g.add(tip);
    }
    const arrow=new THREE.Group();arrow.add(shaft(.008,.7,p.wrap,.20),blade([[.53,.025,.012],[.62,0,0]],p.steel));g.add(arrow);g.userData.ammunition=arrow;
  } else if (kind==='wand') {
    g.add(shaft(.024,.43,p.wrap,.10),band(.028,.008,p.gold,.29));
    const gem=mesh(new THREE.OctahedronGeometry(.062),material(0x91bfff,.2,.3),0,0,.37);gem.scale.z=1.5;g.add(gem);
    for(const side of [-1,1])g.add(curvedRod([[side*.02,0,.24],[side*.065,0,.34],[side*.035,0,.41]],.012,p.gold));
  } else if (kind==='thrown') {
    g.add(shaft(.023,.15,p.leather,-.04),blade([[.04,.045,.015],[.28,.035,.012],[.40,0,0]],p.steel));
  } else {
    // A carved stock sits behind the firing hand, with the barrel/bolt pointing along +Z.
    const stock = plate([[-.075, -.33], [.075, -.33], [.055, -.12], [.035, .25], [-.035, .25], [-.055, -.12]], .095, p.wrap, .012);
    g.add(stock, mesh(new THREE.BoxGeometry(.065, .17, .085), p.leather, 0, -.07, -.025));
    if (kind === 'gun') {
      const barrel = shaft(.045, .86, p.iron, .35); barrel.position.y = .055; g.add(barrel);
      for (const z of [.12, .62, .78]) { const collar = band(.046, .009, p.steel, z); collar.position.y = .055; g.add(collar); }
      g.add(mesh(new THREE.CircleGeometry(.035, 16), material(0x11151a), 0, .055, .782));
      g.add(mesh(new THREE.BoxGeometry(.016, .035, .035), p.iron, 0, .115, .69));
      g.add(mesh(new THREE.BoxGeometry(.085, .065, .18), p.iron, 0, .05, -.02));
      const muzzle=shaft(.064,.07,p.gold,.75);muzzle.position.y=.055;g.add(muzzle);
      for(const side of [-1,1]){const lock=mesh(new THREE.BoxGeometry(.012,.055,.16),p.gold,side*.052,.018,-.12);g.add(lock);}
      const trigger=band(.052,.009,p.gold,-.02);trigger.rotation.y=Math.PI/2;trigger.position.y=-.12;g.add(trigger);
    } else {
      g.add(mesh(new THREE.BoxGeometry(.075, .07, .64), p.wrap, 0, .025, .24));
      g.add(curvedRod([[-.5, 0, .29], [-.34, 0, .48], [0, 0, .53], [.34, 0, .48], [.5, 0, .29]], .025, p.iron));
      g.add(curvedRod([[-.5, .025, .29], [0, .025, .08], [.5, .025, .29]], .004, p.edge));
      const ammo=new THREE.Group();ammo.position.y=.075;g.add(ammo);
      ammo.add(shaft(.008,.59,p.wrap,.32),blade([[.6,.025,.012],[.69,0,0]],p.steel));g.userData.ammunition=ammo;
      for(const side of [-1,1]) {
        g.add(curvedRod([[side*.10,0,.52],[side*.30,0,.49],[side*.43,0,.38]],.033,p.gold));
        g.add(mesh(new THREE.SphereGeometry(.022,8,6),p.steel,side*.045,.07,.15));
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
  const metal = Object.assign(material(0xffffff, 0.55, 0.28), { vertexColors: true });
  const edge = blade([[0.2, 0.06, 0.02], [0.25, 0.096, 0.028], [0.4, 0.08, 0.026], [0.437, 0.098, 0.027], [0.738, 0.068, 0.023], [0.769, 0.086, 0.024], [1.0, 0.055, 0.02], [1.04, 0.068, 0.02], [1.5, 0, 0]], metal);
  // White steel, flushed rose toward the guard.
  const pos = edge.geometry.attributes.position, colors = [], rose = new THREE.Color(0xe7b0ae), white = new THREE.Color(0xeef1f4), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { c.copy(rose).lerp(white, THREE.MathUtils.clamp((pos.getZ(i) - 0.25) / 0.3, 0, 1)); colors.push(c.r, c.g, c.b); }
  edge.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.add(edge);
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

export function weapon(kind) {
  kind = canonicalKind(kind);
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
  const outline = [[-0.36, 0.3], [-0.24, 0.4], [0.24, 0.4], [0.36, 0.3], [0.31, -0.13], [0.16, -0.37], [0, -0.52], [-0.16, -0.37], [-0.31, -0.13]];
  const layer = (scale, depth, z, mat) => {
    const geo = new THREE.ExtrudeGeometry(shape(outline.map(([x, y]) => [x * scale, y * scale])), { depth, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.008, bevelSegments: 1, steps: 1 });
    const m = mesh(geo, mat, 0, 0, z);
    panel.add(m);
    return m;
  };
  layer(1, 0.035, -0.02, p.gold);
  layer(0.91, 0.025, 0.018, p.iron);
  layer(0.84, 0.018, 0.044, p.blue);
  // A raised heraldic sun over a long central spear, readable at game camera distance.
  const crest = mesh(new THREE.OctahedronGeometry(0.14, 0), p.gold, 0, 0.08, 0.085);
  crest.scale.set(1, 1.4, 0.36);
  panel.add(crest);
  const spear = mesh(new THREE.ExtrudeGeometry(shape([[-0.025, 0.24], [0, 0.31], [0.025, 0.24], [0.018, -0.23], [0, -0.37], [-0.018, -0.23]]), { depth: 0.012, bevelEnabled: false }), p.gold, 0, 0, 0.079);
  panel.add(spear);
  for (const side of [-1, 1]) {
    const wing = mesh(new THREE.ExtrudeGeometry(shape([[0.06 * side, 0.06], [0.23 * side, 0.2], [0.19 * side, 0.05], [0.12 * side, -0.035], [0.05 * side, -0.045]]), { depth: 0.012, bevelEnabled: false }), p.gold, 0, 0, 0.079);
    panel.add(wing);
    for (const y of [0.25, -0.08]) panel.add(mesh(new THREE.SphereGeometry(0.016, 6, 4), p.gold, 0.28 * side, y, 0.055));
    const strap = mesh(new THREE.TorusGeometry(0.08, 0.016, 4, 12, Math.PI), p.leather, 0.12 * side, 0, -0.04);
    strap.rotation.x = Math.PI / 2;
    panel.add(strap);
  }
  g.position.set(-0.08, 0, 0.05);
  g.name = 'shield';
  g.userData = { kind: 'shield' };
  return g;
}
