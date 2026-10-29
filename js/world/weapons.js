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
    const arrow=new THREE.Group();arrow.add(shaft(.008,.7,p.wrap,.20),blade([[.53,.025,.012],[.62,0,0]],p.steel));g.add(arrow);g.userData.ammunition=arrow;
  } else if (kind==='wand') {
    g.add(shaft(.024,.43,p.wrap,.10),band(.028,.008,p.gold,.29));
    const gem=mesh(new THREE.OctahedronGeometry(.062),material(0x91bfff,.2,.3),0,0,.37);gem.scale.z=1.5;g.add(gem);
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
    } else {
      g.add(mesh(new THREE.BoxGeometry(.075, .07, .64), p.wrap, 0, .025, .24));
      g.add(curvedRod([[-.5, 0, .29], [-.34, 0, .48], [0, 0, .53], [.34, 0, .48], [.5, 0, .29]], .025, p.iron));
      g.add(curvedRod([[-.5, .025, .29], [0, .025, .08], [.5, .025, .29]], .004, p.edge));
      const ammo=new THREE.Group();ammo.position.y=.075;g.add(ammo);
      ammo.add(shaft(.008,.59,p.wrap,.32),blade([[.6,.025,.012],[.69,0,0]],p.steel));g.userData.ammunition=ammo;
    }
  }
  g.name = kind;
  Object.assign(g.userData,{kind,ranged:true,supportGrip:new THREE.Vector3(0,-.08,.10),muzzle:new THREE.Vector3(0,kind==='gun'?.055:0,kind==='gun'?.79:kind==='crossbow'?.69:kind==='wand'?.45:kind==='bow'?.62:.4)});
  return g;
}

function starterWeapon(kind) {
  const g=new THREE.Group(),p=palette();
  let len=.63;
  g.add(shaft(.026,.23,p.leather,-.02));
  if(kind==='starter-hammer') {
    len=.85; g.add(shaft(.031,.85,p.wrap,.25));
    const head=mesh(new THREE.CylinderGeometry(.15,.17,.37,10),p.wrap,0,0,.68); head.rotation.z=Math.PI/2; g.add(head);
    const binding=material(0x4f7950);
    for(const x of [-.1,0,.1]) { const ring=mesh(new THREE.TorusGeometry(.162,.014,6,16),binding,x,0,.68); ring.rotation.y=Math.PI/2; g.add(ring); }
  } else if(kind==='starter-mace') {
    g.add(shaft(.025,.56,p.wrap,.22));
    for(let i=0;i<4;i++) { const flange=plate([[0,.42],[.13,.49],[.065,.56],[0,.63]],.018,p.steel,.004); flange.rotation.z=i*Math.PI/2; g.add(flange); }
  } else if(kind==='starter-axe') {
    g.add(shaft(.025,.65,p.wrap,.2));
    g.add(plate([[0,.38],[.16,.33],[.20,.44],[.17,.61],[0,.55]],.025,p.steel,.006));
  } else {
    len=kind==='starter-dagger'?.37:.68;
    g.add(mesh(new THREE.BoxGeometry(kind==='starter-dagger'?.16:.23,.035,.025),p.iron,0,0,.105));
    if(kind==='starter-scimitar') g.add(plate([[0,.11],[.045,.23],[.10,.45],[.17,.65],[.10,.58],[.02,.41],[-.03,.15]],.018,p.steel,.003));
    else g.add(blade([[.11,.027,.016],[len*.7,.033,.018],[len,0,0]],p.steel));
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

export function weapon(kind) {
  kind = canonicalKind(kind);
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
    // Plain wooden staff for future caster outfits; shares the same grip/trail contract.
    g.add(shaft(.035, len + .5, p.leather, (len - .5) / 2));
    for (const z of [-.45, .18, len - .06]) g.add(band(.038, .012, p.iron, z));
  } else if (type === 6) {
    g.add(shaft(.031, len + .35, p.wrap, (len - .35) / 2));
    for (const z of [-.3, .25, len * .76]) g.add(band(.035, .009, p.iron, z));
    g.add(blade([[len * .76, .04, .026], [len * .88, .11, .035], [len * 1.08, .065, .024], [len * 1.2, 0, 0]], p.steel));
    g.add(shaft(.045, .14, p.iron, len * .78));
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
    g.add(blade([[0.14, width * 0.75, 0.022], [0.23, width, 0.029], [len * 0.78, width * 0.64, 0.023], [len * 0.91, width * 0.42, 0.017], [len, 0, 0]], p.steel));
    // Narrow inset along both sides of the ridge, fading before the point.
    for (const side of [-1, 1]) {
      const fuller = plate([[-0.009, 0.25], [0.009, 0.25], [0.006, len * 0.72], [0, len * 0.81], [-0.006, len * 0.72]], 0.002, p.iron, 0.001);
      fuller.position.y = side * 0.027;
      g.add(fuller);
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
