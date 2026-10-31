// The main menu's character (main-menu.js): your race, body type, class and spec gear and your looks, standing on a
// small lit stage. It turns slowly; drag it to turn it yourself, the mouse wheel zooms in on its face. One renderer
// for the menu's life: each time the menu draws again its canvas moves into the new stage (attach).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { animateCharacter, disposeCharacter, makeCharacter } from './characters.js';
import { buildDruidForm } from './druid-forms.js';
import { animateCompanion } from './companions.js';

export class CharPreview {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'mm-canvas';
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
    // Studio light: a warm key from the front left, a cool fill, a rim behind.
    this.scene.add(new THREE.HemisphereLight(0xdce9ff, 0x4f3726, 1.4));
    const key = new THREE.DirectionalLight(0xffe6c0, 3.1);
    key.position.set(-3, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -1, near: 0.5, far: 20 });
    key.shadow.normalBias = 0.025;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x93b9e5, 1.2);
    fill.position.set(5, 4, 2);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0x82b4e8, 2.4);
    rim.position.set(0, 5, -5);
    this.scene.add(rim);
    // The stage: a dark disc with a soft gold edge.
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshStandardMaterial({ color: 0x1c2029, roughness: 0.9 }));
    disc.rotation.x = -Math.PI / 2;
    disc.receiveShadow = true;
    this.scene.add(disc);
    const edge = new THREE.Mesh(new THREE.RingGeometry(1.36, 1.42, 64), new THREE.MeshBasicMaterial({ color: 0xc9a24a, transparent: true, opacity: 0.6 }));
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = 0.003;
    this.scene.add(edge);

    this.model = null;
    this.key = '';
    this.turn = 0.4;
    this.drag = null;
    this.last = performance.now();
    this.canvas.addEventListener('pointerdown', (e) => { this.drag = { x: e.clientX, turn: this.turn }; this.canvas.setPointerCapture(e.pointerId); });
    this.canvas.addEventListener('pointermove', (e) => { if (this.drag) this.turn = this.drag.turn + (e.clientX - this.drag.x) * 0.012; });
    for (const type of ['pointerup', 'pointercancel']) this.canvas.addEventListener(type, () => { this.drag = null; });
    this.zoom = 0;
    this.height = 2;
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Math.min(1, Math.max(0, this.zoom - Math.sign(e.deltaY) * 0.2));
      this.frame();
    }, { passive: false });
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!this.canvas.isConnected || !this.canvas.offsetParent || !this.model) return; // not shown: no work
      this.fit();
      if (!this.drag) this.turn += dt * 0.35;
      this.model.rotation.y = this.turn;
      if (this.model.userData.rig && this.model.userData.rig.legs) animateCompanion(this.model, { dt, speed: 0 });
      else animateCharacter(this.model, { dt, speed: 0, strafe: 0, air: false, combat: false });
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(loop);
  }

  // Puts the canvas into `stage` (the menu drew a new one).
  attach(stage) { if (stage && this.canvas.parentNode !== stage) stage.appendChild(this.canvas); }

  // Sizes the renderer to its stage.
  fit() {
    const w = this.canvas.parentNode.clientWidth;
    const h = this.canvas.parentNode.clientHeight;
    if (!w || !h || (w === this.w && h === this.h)) return;
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // The character to show: { race, classId, bodyType, customization, gear (a gear look, or null for the outfit),
  // form ('cat' / 'bear': that druid form of the race instead, in its chosen colour) }.
  show(look) {
    const key = JSON.stringify(look);
    if (key === this.key) return;
    this.key = key;
    if (this.model) { this.scene.remove(this.model); disposeCharacter(this.model); }
    const { form, ...character } = look;
    this.model = form ? buildDruidForm(form, look.race, look.customization) : makeCharacter({ role: 'player', ...character });
    this.model.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.scene.add(this.model);
    // Framed to its height: a gnome as large as a tauren.
    const box = new THREE.Box3().setFromObject(this.model);
    this.height = Math.max(1, box.max.y - box.min.y);
    this.frame();
  }

  // The camera: the whole character, or closer in on its head (zoom 0..1, the mouse wheel).
  frame() {
    const h = this.height;
    const z = this.zoom;
    this.camera.position.set(0, h * (0.6 + 0.3 * z), h * (2.05 - 1.35 * z) + 0.5 - 0.3 * z);
    this.camera.lookAt(0, h * (0.5 + 0.35 * z), 0);
  }
}
