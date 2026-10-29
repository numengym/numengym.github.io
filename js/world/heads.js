// Original race heads sculpted from contour meshes. The face, hair and ornaments share a small
// material palette per character; static pieces are batched without sharing disposable resources.
import * as THREE from 'three';

const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0, envMapIntensity: 0.3, ...extra });
const tint = (color, amount) => new THREE.Color(color).multiplyScalar(amount);
const group = (x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); return g; };
function mesh(geometry, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// A closed skull assembled from horizontal contours [y, half-width, front, back]. Broad, flatter
// front planes define cheekbones and jaws instead of overlapping round primitives.
function contours(rows, segments = 16, face = true) {
  const vertices = [], indices = [];
  for (const [y, width, front, back] of rows) {
    for (let i = 0; i < segments; i++) {
      const a = i / segments * Math.PI * 2;
      const c = Math.cos(a);
      vertices.push(Math.sin(a) * width, y, c >= 0 ? Math.pow(c, face ? 0.42 : 1) * front : c * back);
    }
  }
  for (let r = 0; r < rows.length - 1; r++) {
    for (let i = 0; i < segments; i++) {
      const a = r * segments + i, b = r * segments + (i + 1) % segments;
      indices.push(a, b, a + segments, b, b + segments, a + segments);
    }
  }
  for (const [r, reverse] of [[0, true], [rows.length - 1, false]]) {
    const center = vertices.length / 3;
    vertices.push(0, rows[r][0], 0);
    for (let i = 0; i < segments; i++) {
      const a = r * segments + i, b = r * segments + (i + 1) % segments;
      if (reverse) indices.push(center, b, a); else indices.push(center, a, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function smoothRows(rows) {
  const result=[];
  for(let n=0;n<rows.length-1;n++) for(let step=0;step<4;step++) {
    const a=rows[n],b=rows[n+1],prev=rows[Math.max(0,n-1)],next=rows[Math.min(rows.length-1,n+2)],t=step/4;
    result.push([THREE.MathUtils.lerp(a[0],b[0],t),...[1,2,3].map(k=>{
      const m0=(b[k]-prev[k])/(b[0]-prev[0])*(b[0]-a[0]),m1=(next[k]-a[k])/(next[0]-a[0])*(b[0]-a[0]);
      return Math.max(.003,(2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*m1);
    })]);
  }
  result.push(rows.at(-1)); return result;
}

// Bevelled silhouette, facing +Z. Used for lids, ears, facial planes and locks of hair.
function relief(points, depth = 0.012, bevel = 0.004) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, steps: 1, curveSegments: 1 });
}

// Curved horns/tusks taper all the way to a point. Their silhouettes are continuous, without the
// uniform thickness and open ends of a torus.
function taper(points, radii, sides = 8, steps = 14) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const positions = [], indices = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, p = curve.getPoint(t), tangent = curve.getTangent(t).normalize();
    const ref = Math.abs(tangent.z) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
    const right = new THREE.Vector3().crossVectors(tangent, ref).normalize();
    const up = new THREE.Vector3().crossVectors(tangent, right).normalize();
    const at = t * (radii.length - 1), lo = Math.min(radii.length - 2, Math.floor(at));
    const radius = THREE.MathUtils.lerp(radii[lo], radii[lo + 1], at - lo);
    for (let s = 0; s < sides; s++) {
      const a = s / sides * Math.PI * 2;
      const v = p.clone().addScaledVector(right, Math.cos(a) * radius).addScaledVector(up, Math.sin(a) * radius);
      positions.push(v.x, v.y, v.z);
    }
    if (i < steps) for (let s = 0; s < sides; s++) {
      const a = i * sides + s, b = i * sides + (s + 1) % sides;
      indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function moving(parent, hair, obj, amp) {
  if (obj.isGroup) batchStatic(obj);
  parent.add(obj);
  hair.push({ obj, base: obj.rotation.clone(), amp });
  return obj;
}

function band(radius, height, mat, y) {
  return mesh(new THREE.CylinderGeometry(radius, radius, height, 8), mat, 0, y, 0);
}

// All non-moving pieces of a head become one mesh per material. Hair pivots remain independent.
function batchStatic(head) {
  const buckets = new Map();
  for (const child of [...head.children]) {
    if (!child.isMesh) continue;
    child.updateMatrix();
    const geo = child.geometry.clone().applyMatrix4(child.matrix);
    const p = geo.getAttribute('position'), n = geo.getAttribute('normal'), index = geo.index;
    if (!buckets.has(child.material)) buckets.set(child.material, { positions: [], normals: [] });
    const bucket = buckets.get(child.material);
    for (let i = 0; i < (index ? index.count : p.count); i++) {
      const j = index ? index.getX(i) : i;
      bucket.positions.push(p.getX(j), p.getY(j), p.getZ(j));
      bucket.normals.push(n.getX(j), n.getY(j), n.getZ(j));
    }
    geo.dispose();
    child.geometry.dispose();
    head.remove(child);
  }
  for (const [mat, data] of buckets) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    head.add(mesh(geo, mat));
  }
  return head;
}

// Rounded, layered eyes for the human, dwarf and gnome. Every layer has real depth separation,
// avoiding the overlapping flat polygons that produced harsh sockets and flickering pupils.
function softEyes(head, look, p, { y, z, spread, wide }) {
  z -= .01; // Seat the rounded eyes in the face instead of leaving them proud of the cheek plane.
  const tall = look.gnome ? .019 : look.bushy ? .014 : .016;
  const white = material(0xe4dfd2, { roughness: .55 });
  const iris = material(look.iris || 0x5f7051, { roughness: .6 });
  const pupil = material(0x25231f, { roughness: .6 });
  const glint = material(0xf5eee0, { emissive: 0x48433b, emissiveIntensity: .15 });
  const lash = material(look.gnome ? 0x62483e : look.brows || 0x594438);
  const ellipsoid = (mat, x, yy, zz, sx, sy, sz) => {
    const eye = mesh(new THREE.SphereGeometry(1, 20, 12), mat, x, yy, zz);
    eye.scale.set(sx, sy, sz); head.add(eye);
  };
  const arc = (points, radius, mat) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((v) => new THREE.Vector3(...v))), 10, radius, 6, false), mat);
  for (const side of [-1, 1]) {
    const x = spread * side;
    ellipsoid(white, x, y, z + .005, wide, tall, .010);
    ellipsoid(iris, x, y, z + .014, tall * .72, tall * .82, .0028);
    ellipsoid(pupil, x, y, z + .017, tall * .34, tall * .47, .0018);
    ellipsoid(glint, x - .0035, y + .0045, z + .019, .0025, .0025, .001);
    // Skin-toned lids follow the almond outline, leaving only a fine upper lash line.
    const upper = [[x - wide, y, z + .007], [x - wide * .55, y + tall * .82, z + .012], [x + wide * .30, y + tall * .88, z + .013], [x + wide, y + .001, z + .006]];
    head.add(arc(upper, .0045, p.skin));
    head.add(arc(upper.map(([xx, yy, zz]) => [xx, yy - .001, zz + .002]), .0016, lash));
    head.add(arc([[x - wide, y, z + .005], [x, y - tall * .82, z + .011], [x + wide, y, z + .005]], .0035, p.skin));
    const brow = [[x - wide, y + tall + .022, z - .001], [x, y + tall + .031, z + .002], [x + wide, y + tall + .023, z - .002]];
    head.add(arc(brow, look.bushy ? .007 : .0035, lash));
  }
}

function eyes(head, look, palette, { y = 0.024, z = 0.16, spread = 0.078, wide = 0.035, tall = 0.014 } = {}) {
  if (look.softEyes) { softEyes(head, look, palette, { y, z, spread, wide }); return; }
  const gnome = look.gnome;
  const glow = look.eyeGlow || (look.tusks === 'orc' ? 0xd74226 : null);
  const eye = glow ? material(glow, { emissive: glow, emissiveIntensity: 0.75, roughness: 0.5 }) : palette.ivory;
  const iris = material(gnome ? 0x4e9970 : 0x60533a, { roughness: 0.7 });
  for (const side of [-1, 1]) {
    const x = spread * side;
    const socket = mesh(relief([[-wide - 0.012, 0], [-wide * 0.55, tall + 0.006], [wide * 0.68, tall + 0.004], [wide + 0.01, 0], [wide * 0.5, -tall - 0.005], [-wide * 0.6, -tall - 0.006]], 0.006, 0.002), palette.shadow, x, y, z - 0.005);
    socket.rotation.z = (gnome ? -0.05 : 0.12) * side;
    head.add(socket);
    const aperture = mesh(relief([[-wide, 0], [-wide * 0.55, tall], [wide * 0.62, tall * 0.8], [wide, 0], [wide * 0.5, -tall * 0.75], [-wide * 0.55, -tall * 0.85]], 0.003, 0), eye, x, y, z + 0.003);
    aperture.rotation.z = socket.rotation.z;
    head.add(aperture);
    if (!glow) {
      const r = tall * 0.85;
      head.add(mesh(new THREE.CircleGeometry(r, 10), iris, x, y, z + 0.008));
      head.add(mesh(new THREE.CircleGeometry(r * 0.48, 8), palette.shadow, x, y, z + 0.009));
      if (gnome) head.add(mesh(new THREE.CircleGeometry(0.003, 6), palette.ivory, x - 0.003, y + 0.005, z + 0.01));
    }
    // Broad, low brow planes shade the eye sockets; they merge into the forehead.
    const heavy = look.brow || look.undead;
    const brow = mesh(relief([[-wide - 0.012, 0], [-wide * 0.7, heavy ? 0.035 : 0.024], [wide * 0.75, heavy ? 0.032 : 0.018], [wide + 0.014, 0], [0, -0.006]], heavy ? 0.025 : 0.014, 0.004), palette.skin, x, y + tall + 0.01, z - 0.004);
    brow.rotation.z = 0.16 * side;
    head.add(brow);
    if (look.brows || gnome) {
      const brows = palette.brows;
      const b = mesh(relief([[-wide - 0.006, 0], [-wide * 0.6, look.bushy ? 0.025 : 0.013], [wide * 0.7, 0.012], [wide + 0.012, -0.004], [0, 0]], 0.006, 0.001), brows, x, y + tall + 0.024, z + 0.016);
      b.rotation.z = (gnome ? -0.12 : 0.16) * side;
      head.add(b);
    }
    if (look.longBrows) {
      const brow = mesh(relief([[0, 0], [0.17 * side, 0.055], [0.075 * side, -0.005]], 0.007, 0.001), palette.brows, x, y + 0.046, z + 0.013);
      head.add(brow);
    }
  }
}

function ears(head, look, p) {
  const kind = look.gnome ? 'gnome' : look.ears;
  for (const side of [-1, 1]) {
    let points;
    if (kind === 'elf') points = [[0, -0.045], [0.07, -0.012], [look.earLength || .33, 0.16], [0.12, 0.085], [0, 0.065]];
    else if (kind === 'troll') points = [[0, -0.055], [0.085, -0.018], [0.30, 0.06], [0.09, 0.09], [0, 0.055]];
    else if (kind === 'gnome') points = [[0,-.04],[.05,-.055],[.09,-.03],[.105,.015],[.075,.065],[.03,.07],[0,.04]];
    else if (kind === 'small') points = [[0, -0.04], [0.06, -0.015], [0.105, 0.065], [0, 0.045]];
    else points = [[0, -0.04], [0.035, -0.025], [0.043, 0.025], [0.02, 0.045], [0, 0.035]];
    const ear = mesh(relief(points.map(([x, y]) => [x * side, y]), 0.025, 0.007), p.skin, 0.175 * side, 0.015, -0.025);
    ear.rotation.y = -0.35 * side;
    head.add(ear);
    const inner = mesh(relief(points.map(([x, y]) => [(x * 0.66 + 0.012) * side, y * 0.56]), 0.003, 0), p.skinShade, 0.175 * side, 0.015, 0.009);
    inner.rotation.y = ear.rotation.y;
    head.add(inner);
  }
}

function hairCap(head, p, width = 1) {
  const geo = contours([[0.04, 0.202, 0.16, 0.19], [0.16, 0.19, 0.15, 0.18], [0.22, 0.12, 0.10, 0.12], [0.24, 0.01, 0.01, 0.01]], 32);
  // Raise the front hairline, keeping the cap low behind the ears.
  const positions = geo.getAttribute('position');
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2;
    positions.setY(i, 0.015 + Math.max(0, Math.cos(a)) * 0.115);
  }
  geo.computeVertexNormals();
  head.add(mesh(geo, p.hair));
  head.children[head.children.length - 1].scale.x = width;
}

function addHair(head, look, hair, p) {
  if (!look.hair) return;
  const style = look.hair.style;
  if (['short', 'long', 'pigtails', 'bob', 'braided', 'swept'].includes(style)) {
    hairCap(head, p);
    // Swept triangular locks break up the straight cap edge and catch the light along their bevels.
    for (let i = 0; i < 3; i++) {
      const x = -0.13 + i * 0.085;
      const lock = mesh(taper([[x-.025,.20,.08],[x+.015,.18,.135],[x+.055,.13,.155],[x+.065,.09,.145]],[.042,.04,.026,.001],10,14), i === 1 ? p.hairLight : p.hair);
      lock.scale.z=.82;
      head.add(lock);
    }
  }
  if (style === 'bob' || style === 'braided' || style === 'swept') {
    for(let i=0;i<9;i++) {
      const angle=Math.PI*.40+i/8*Math.PI*1.20;
      const x=Math.sin(angle)*.178,z=Math.cos(angle)*.177;
      const end=style==='bob'?-.23:style==='braided'?-.16:-.07;
      head.add(mesh(taper([[x,.10,z],[x*1.04,-.05,z*1.04],[x*.92,end,z],[x*.75,end-.025,z*.9]],[.046,.047,.028,.002],10,14),i%3===0?p.hairLight:p.hair));
    }
  }
  if (style === 'topknot') {
    const knot = group(0, 0.19, -0.055);
    knot.add(mesh(taper([[0, 0, 0], [0, 0.13, -0.025], [0, 0.18, -0.11], [0, 0.09, -0.21]], [0.048, 0.045, 0.028, 0.001], 7, 10), p.hair));
    knot.add(band(0.05, 0.025, p.gold, 0.04));
    moving(head, hair, knot, 0.13);
    head.add(mesh(relief([[-0.07, 0], [-0.045, 0.09], [0.045, 0.09], [0.07, 0]], 0.10, 0.008), p.hair, 0, 0.14, -0.13));
  }
  if (style === 'mohawk') {
    const crest = group(0, 0.15, 0);
    const m = mesh(relief([[-0.18, -0.02], [-0.19, 0.11], [-0.12, 0.25], [-0.10, 0.16], [-0.035, 0.27], [0, 0.17], [0.08, 0.24], [0.11, 0.13], [0.18, 0.16], [0.17, 0]], 0.04, 0.003), p.hair);
    m.rotation.y = Math.PI / 2;
    m.position.x = -0.02;
    crest.add(m);
    moving(head, hair, crest, 0.04);
  }
  if (style === 'long' || style === 'stringy') {
    const count = style === 'long' ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const x = count === 3 ? (i - 1) * 0.09 : (i ? 1 : -1) * 0.16;
      const strand = group(x, 0.08, -0.15);
      strand.add(mesh(taper([[0, 0, 0], [0, -0.16, -0.045], [x * 0.2, -0.36, -0.035], [x * 0.3, -0.49, 0]], style === 'long' ? [0.062, 0.065, 0.044, 0.002] : [0.023, 0.019, 0.014, 0.001], 7, 9), i === 1 ? p.hairLight : p.hair));
      moving(head, hair, strand, 0.13);
    }
  }
  if (style === 'pigtails') {
    for (const side of [-1, 1]) {
      const tail = group(side * 0.17, 0.15, -0.04);
      tail.rotation.z = -side * 0.75;
      tail.add(band(0.034, 0.035, p.gold, 0.025));
      tail.add(mesh(relief([[-0.025, 0.025], [-0.10, 0.19], [-0.055, 0.25], [-0.02, 0.19], [0.025, 0.26], [0.05, 0.20], [0.10, 0.225], [0.10, 0.14], [0.025, 0.025]], 0.05, 0.009), p.hair, 0, 0, -0.025));
      moving(head, hair, tail, 0.16);
    }
  }
}

function addBeard(head, look, hair, p) {
  if (look.stubble) {
    const beard = material(look.stubble, { roughness: 0.98 });
    head.add(mesh(relief([[-0.14, 0.015], [-0.11, -0.085], [-0.05, -0.12], [0.05, -0.12], [0.11, -0.085], [0.14, 0.015], [0.08, -0.035], [-0.08, -0.035]], 0.018, 0.003), beard, 0, -0.095, 0.133));
  }
  if (!look.beard) return;
  const beard = material(look.beard, { roughness: 0.98 });
  const beardLight = material(tint(look.beard, 1.22), { roughness: 0.98 });
  if(look.beardStyle==='goatee') {
    head.add(mesh(taper([[0,-.16,.13],[0,-.245,.13],[0,-.33,.10]],[.065,.039,.001],10,12),beard));
    return;
  }
  head.add(mesh(contours([[-0.40, 0.07, 0.07, 0.04], [-0.31, 0.13, 0.12, 0.04], [-0.19, 0.17, 0.13, 0.06], [-0.07, 0.15, 0.05, 0.04]], 12), beard, 0, 0, 0.10));
  for (const side of [-1, 1]) {
    const moustache = mesh(relief([[0, 0.01], [0.065 * side, 0.025], [0.13 * side, -0.03], [0.08 * side, -0.035], [0.025 * side, -0.012]], 0.025, 0.008), beardLight, 0, -0.078, 0.19);
    head.add(moustache);
    const braid = group(0.075 * side, -0.29, 0.19);
    // Alternating angular lobes read as a braid at the arena's camera distance.
    for (let i = 0; i < 4; i++) {
      const lobe = mesh(new THREE.IcosahedronGeometry(0.035, 0), i % 2 ? beardLight : beard, (i % 2 ? 1 : -1) * 0.008, -i * 0.037, 0);
      lobe.scale.set(0.82, 0.88, 0.82);
      braid.add(lobe);
    }
    braid.add(band(0.032, 0.03, p.gold, -0.125));
    braid.add(mesh(taper([[0, -0.135, 0], [0, -0.20, 0]], [0.027, 0.001], 7, 3), beard));
    moving(head, hair, braid, 0.08);
  }
}

function bullHead(look, hair, p) {
  const head = group();
  head.add(mesh(contours([[-0.16, 0.13, 0.14, 0.10], [-0.07, 0.18, 0.20, 0.14], [0.06, 0.24, 0.18, 0.17], [0.17, 0.23, 0.10, 0.16], [0.23, 0.13, 0.035, 0.08]], 16), p.skin));
  const muzzle = material(look.female ? 0x554e48 : 0xa5aaa0);
  head.add(mesh(contours([[-0.18, 0.095, 0.11, 0.02], [-0.13, 0.16, 0.145, 0.055], [-0.045, 0.15, 0.135, 0.055], [-0.005, 0.105, 0.075, 0.015]], 12), muzzle, 0, 0, 0.19));
  for (const side of [-1, 1]) {
    const nostril = mesh(relief([[-0.024, -0.008], [-0.023, 0.014], [0.012, 0.018], [0.024, -0.006]], 0.004, 0.003), p.shadow, 0.074 * side, -0.07, 0.326);
    nostril.rotation.z = -side * 0.25;
    head.add(nostril);
    const hornPoints=look.female ? [[.18*side,.15,-.025],[.27*side,.20,-.035],[.29*side,.30,-.055]] : [[.19*side,.15,-.015],[.34*side,.12,-.025],[.48*side,.17,-.05],[.53*side,.27,-.07]];
    head.add(mesh(taper(hornPoints,look.female?[.045,.032,.001]:[.065,.052,.025,.001],12),p.hair));
    const ear = mesh(relief([[0, -0.025], [0.17 * side, -0.05], [0.21 * side, 0.01], [0.08 * side, 0.065]], 0.028, 0.007), p.skin, 0.19 * side, 0.055, -0.02);
    head.add(ear);
    head.add(mesh(relief([[0.04 * side, -0.005], [0.15 * side, -0.025], [0.16 * side, 0.008], [0.07 * side, 0.035]], 0.004, 0), p.skinShade, 0.19 * side, 0.055, 0.014));
  }
  eyes(head, { ...look, brow: true }, p, { y: 0.07, z: 0.183, spread: 0.135, wide: 0.035, tall: 0.011 });
  head.add(mesh(new THREE.TorusGeometry(0.041, 0.009, 6, 16), p.gold, 0, -0.142, 0.345));
  head.add(mesh(relief([[-0.10, 0], [-0.055, -0.007], [0.055, -0.007], [0.10, 0], [0.045, -0.015], [-0.045, -0.015]], 0.003, 0), p.shadow, 0, -0.12, 0.332));
  const mane = group(0, 0.19, -0.045);
  mane.add(mesh(relief([[-0.16, -0.025], [-0.105, 0.075], [-0.055, 0.04], [0, 0.11], [0.045, 0.045], [0.12, 0.075], [0.16, -0.025], [0, -0.07]], 0.08, 0.012), p.hair, 0, 0, -0.04));
  moving(head, hair, mane, 0.05);
  head.add(mesh(taper([[0, -0.15, 0.16], [0, -0.29, 0.15], [0, -0.34, 0.14]], [0.06, 0.035, 0.001], 7, 5), p.hair));
  return batchStatic(head);
}

export function buildHead(look, hair) {
  const p = {
    skin: material(look.skin), skinShade: material(tint(look.skin, 0.66)),
    shadow: material(look.undead ? 0x26302a : 0x29201c),
    ivory: material(0xe8d9b2), gold: material(0xb99b54, { metalness: 0.6, roughness: 0.45 }),
    hair: material(look.hair ? look.hair.color : 0x302015, { roughness: 0.98 }),
    hairLight: material(tint(look.hair ? look.hair.color : 0x302015, 1.22), { roughness: 0.98 }),
    brows: material(look.brows || (look.hair && look.hair.color) || 0x302015, { roughness: 0.98 }),
  };
  if (look.tauren) return bullHead(look, hair, p);
  const head = group();
  const orc = look.tusks === 'orc', troll = look.tusks === 'troll', gnome = !!look.gnome;
  const jaw = look.jaw || 1;
  const rows = [
    [-0.205, (gnome ? 0.065 : 0.075) * jaw, orc ? 0.17 : 0.11, 0.045],
    [-0.165, 0.125 * jaw, orc ? 0.20 : 0.15, 0.10],
    [-0.085, (look.undead ? 0.12 : 0.165) * (orc ? 1.08 : 1), orc ? 0.19 : 0.16, 0.15],
    [-0.025, gnome ? 0.174 : 0.18, 0.163, 0.18],
    [0.035, 0.177, 0.145, 0.19],
    [0.095, orc ? 0.20 : 0.18, 0.16, 0.185],
    [0.17, 0.16, 0.13, 0.145],
    [0.21, 0.095, 0.07, 0.08],
    [0.225, 0.008, 0.008, 0.008],
  ];
  head.add(mesh(contours(smoothRows(rows), 32), p.skin));
  eyes(head, look, p, { y: gnome ? 0.021 : 0.023, z: 0.159, spread: gnome ? 0.075 : 0.078, wide: gnome ? 0.033 : orc ? 0.033 : 0.035, tall: gnome ? 0.024 : 0.012 });

  const noseWidth = orc ? 0.052 : look.nose === 'big' ? 0.044 : gnome ? 0.027 : 0.024;
  const noseDepth = troll ? 0.13 : orc ? 0.05 : look.nose === 'big' ? 0.065 : 0.04;
  head.add(mesh(contours(smoothRows([[-.063,noseWidth*.48,.006,.004],[-.049,noseWidth,.023,.005],[-.035,noseWidth*.8,noseDepth,.006],[.015,.015,noseDepth*.35,.005],[.043,.009,.004,.003]]),20),p.skin,0,0,.144));
  if (!gnome) for (const side of [-1, 1]) head.add(mesh(relief([[-0.008, 0], [0, 0.005], [0.009, 0], [0.005, -0.004]], 0.002, 0), p.skinShade, noseWidth * 0.57 * side, -0.053, 0.154 + noseDepth));

  const lipZ = orc ? 0.209 : 0.17;
  const mouth = look.female ? [[-0.033, 0.003], [0, -.001], [0.033, 0.003], [0.02, -.005], [-.02, -.005]] : [[-0.065, 0.004], [0.065, 0.004], [0.05, -0.008], [-0.05, -0.008]];
  head.add(mesh(relief(mouth, 0.003, 0), p.shadow, 0, -0.106, lipZ));
  if (gnome) head.add(mesh(relief([[-0.028, 0], [0, -0.007], [0.028, 0], [0, -0.013]], 0.004, 0.001), material(0xc58270), 0, -0.115, lipZ));

  if (look.undead) {
    head.add(mesh(relief([[-0.13, 0.015], [-0.115, -0.048], [-0.06, -0.083], [0.06, -0.083], [0.115, -0.048], [0.13, 0.015], [0.082, -0.03], [-0.082, -0.03]], 0.023, 0.004), p.ivory, 0, -0.10, 0.12));
    for (const side of [-1, 1]) head.add(mesh(relief([[0, 0.025], [0.03 * side, 0.035], [0.045 * side, -0.015], [0, -0.035]], 0.004, 0.001), p.shadow, 0.10 * side, -0.055, 0.135));
    for (let i = -3; i <= 3; i++) head.add(mesh(new THREE.BoxGeometry(0.012, 0.019, 0.008), p.ivory, i * 0.016, -0.107, 0.179));
  }
  if (look.tusks) for (const side of [-1, 1]) {
    const points = troll ? [[0.075 * side, -0.13, 0.17], [0.12 * side, -0.08, 0.29], [0.16 * side, 0.055, 0.36], [0.14 * side, 0.17, 0.35]] : [[0.102 * side, -0.147, 0.19], [0.117 * side, -0.09, 0.235], [0.105 * side, -0.018, 0.24]];
    head.add(mesh(taper(points, troll ? [0.032, 0.03, 0.015, 0.001] : [0.027, 0.02, 0.001], 8, 10), p.ivory));
  }
  ears(head, look, p);
  addHair(head, look, hair, p);
  addBeard(head, look, hair, p);
  if (look.horns) for (const side of [-1, 1]) head.add(mesh(taper([[0.16 * side, 0.14, -0.025], [0.27 * side, 0.25, -0.05], [0.26 * side, 0.41, -0.08], [0.16 * side, 0.49, -0.095]], [0.055, 0.047, 0.025, 0.001], 9), p.ivory));
  return batchStatic(head);
}
