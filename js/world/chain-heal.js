// A completed heal's exact target order; anchors are resolved again as the models move.
import * as THREE from 'three';

export function chainHealEffect(scene, camera, anchors) {
  const group = new THREE.Group();
  group.name = 'chain-heal';
  const material = (color, opacity) => new THREE.MeshBasicMaterial({color, opacity, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide});
  const links = anchors.slice(1).map((_, i) => {
    const layers = [.11, .025].map((width, k) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(19 * 2 * 3), 3));
      const indices=[];
      for(let n=0;n<18;n++){const a=n*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      geometry.setIndex(indices);
      const mesh=new THREE.Mesh(geometry,material(k?0xf5fff0:0x62e8ce,k?.95:.38));
      mesh.frustumCulled=false;group.add(mesh);return {mesh,width};
    });
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.42,.018,6,40),material(0x8affc5,.8));
    ring.rotation.x=Math.PI/2;group.add(ring);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),material(0xffffcf,.6));
    group.add(glow);
    return {i,layers,ring,glow};
  });
  scene.add(group);
  let elapsed=0;
  const side=new THREE.Vector3(),direction=new THREE.Vector3(),view=new THREE.Vector3(),point=new THREE.Vector3();
  return {
    kind:'chain-heal', group,
    update(dt) {
      elapsed+=dt;
      if(elapsed>.85+links.length*.07)return false;
      for(const link of links){
        const age=elapsed-link.i*.07, a=anchors[link.i](),b=anchors[link.i+1]();
        const visible=!!a&&!!b&&age>=0&&age<.85;
        for(const layer of link.layers)layer.mesh.visible=visible;
        link.ring.visible=link.glow.visible=visible;
        if(!visible)continue;
        const fade=Math.min(1,age/.045)*Math.max(0,1-age/.85);
        direction.subVectors(b,a).normalize();
        view.subVectors(camera.position,b).normalize();
        side.crossVectors(direction,view);
        if(side.lengthSq()<.00001)side.set(1,0,0);else side.normalize();
        for(const {mesh,width}of link.layers){
          const p=mesh.geometry.attributes.position;
          for(let n=0;n<=18;n++){
            const t=n/18,wave=Math.sin(t*Math.PI)*Math.sin(t*27-elapsed*23)*.065;
            point.copy(a).lerp(b,t).addScaledVector(side,wave);
            point.y+=Math.sin(t*Math.PI)*Math.sin(t*17+elapsed*19)*.035;
            for(let s=0;s<2;s++)p.setXYZ(n*2+s,point.x+side.x*width*(s?1:-1),point.y+side.y*width*(s?1:-1),point.z+side.z*width*(s?1:-1));
          }
          p.needsUpdate=true;mesh.material.opacity=fade*(width>.05?.4:.95);
        }
        link.ring.position.copy(b);link.ring.position.y=b.groundY==null?b.y-.5:b.groundY+.06;
        link.ring.scale.setScalar(.65+age*1.25);link.ring.material.opacity=fade*.8;
        link.glow.position.copy(b);link.glow.scale.setScalar(1+Math.sin(age*32)*.15);link.glow.material.opacity=fade*.6;
      }
      return true;
    },
    dispose(){scene.remove(group);group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
  };
}

export function healingAnchor(model, hands=false){
  if(!model?.parent)return null;
  model.updateWorldMatrix(true,true);
  const rig=model.userData.rig;
  if(hands&&rig?.wristR&&rig?.wristL)return rig.wristR.getWorldPosition(new THREE.Vector3()).lerp(rig.wristL.getWorldPosition(new THREE.Vector3()),.5);
  const origin=model.getWorldPosition(new THREE.Vector3());
  const point=rig?.spine?rig.spine.localToWorld(new THREE.Vector3(0,.28,.04)):origin.clone().add(new THREE.Vector3(0,(model.userData.height||2)*.55,0));
  point.groundY=origin.y;
  return point;
}
