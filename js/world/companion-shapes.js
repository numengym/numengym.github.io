// Original companion geometry. Every model owns its geometry and materials.
import * as THREE from 'three';

export const material = (color, glow=0) => new THREE.MeshStandardMaterial({color,roughness:.86,emissive:glow,emissiveIntensity:glow?.65:0});
export function mesh(parent,geometry,mat,pos=[0,0,0],scale=[1,1,1]) {
  const o=new THREE.Mesh(geometry,mat);o.position.set(...pos);o.scale.set(...scale);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
}
export const ellipsoid=(p,m,pos,scale)=>mesh(p,new THREE.SphereGeometry(1,12,9),m,pos,scale);
export const block=(p,m,pos,scale)=>mesh(p,new THREE.BoxGeometry(1,1,1),m,pos,scale);
export function joint(parent,pos=[0,0,0]) {const g=new THREE.Group();g.position.set(...pos);parent.add(g);return g;}
export function bone(parent,mat,a,b,r1=.06,r2=r1) {
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);
  const o=mesh(parent,new THREE.CylinderGeometry(r2,r1,d.length(),8),mat,start.add(end).multiplyScalar(.5).toArray());
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;
}
export function curve(parent,mat,points,r=.035) {
  return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),16,r,6,false),mat);
}
export function horn(parent,mat,a,b,r=.07) {return bone(parent,mat,a,b,r,.002);}
export function eyes(parent,mat,x=.12,y=.08,z=.20,size=.027) {
  for(const s of [-1,1])ellipsoid(parent,mat,[s*x,y,z],[size,size*.72,size*.55]);
}
export function wing(parent,mat,side,{bat=false,size=1}={}) {
  const g=joint(parent);g.scale.set(side*size,size,size);
  const coords=bat?[[0,0,0],[.40,.27,-.08],[.95,.12,-.17],[.65,-.14,-.25],[.50,-.02,-.30],[.30,-.23,-.32],[0,-.17,-.22]]:[[0,0,0],[.38,.12,-.03],[1,.05,-.26],[.80,-.04,-.42],[.57,-.08,-.40],[.27,-.15,-.30],[0,-.15,-.2]];
  const geometry=new THREE.BufferGeometry(),vertices=[];
  for(let i=1;i<coords.length-1;i++)vertices.push(...coords[0],...coords[i],...coords[i+1]);
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  const membrane=mat.clone();membrane.side=THREE.DoubleSide;mesh(g,geometry,membrane);
  if(bat)for(const i of [2,4,5])bone(g,mat,[0,0,0],coords[i],.018,.008);
  else for(let i=0;i<6;i++)ellipsoid(g,mat,[.28+i*.11,-.035,-.18-i*.035],[.075,.027,.23-i*.014]).rotation.y=-.3;
  return g;
}
export function setup(kind,category) {
  const root=new THREE.Group(),body=joint(root);
  root.name=kind;root.userData={kind,category,body,rig:{legs:[],wings:[],tails:[]},anim:{time:0,attack:0,cast:0,hit:0,dead:false,death:0},radius:.5,height:1};
  return root;
}
export function finish(root) {
  const d=root.userData;d.body.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
  d.height=size.y;d.radius=Math.max(size.x,size.z)*.5;
  d.body.traverse(o=>{o.userData.restPosition=o.position.clone();o.userData.restRotation=o.rotation.clone();o.userData.restScale=o.scale.clone();});
  return root;
}
