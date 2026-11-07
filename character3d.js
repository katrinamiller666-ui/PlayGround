import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const hex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
const color = (value, fallback) => new THREE.Color(hex(value, fallback));
const presets = {
  wayfarer: { outfit:'#6e8462', accessory:'hood' }, groveguard: { outfit:'#55745b', accessory:'leaf crown' },
  starweaver: { outfit:'#625a83', accessory:'circlet' }, emberkin: { outfit:'#a85f49', accessory:'horns' },
  tidecaller: { outfit:'#4f7d88', accessory:'shell pin' }, moonranger: { outfit:'#64728d', accessory:'circlet' },
  sunward: { outfit:'#b58a48', accessory:'horns' }, wildflower: { outfit:'#9a6685', accessory:'flower crown' }
};
let renderer, scene, camera, root, activeCanvas, frame = 0, drag = null;

function material(hexValue, roughness = .78, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color: color(hexValue, '#6e8462'), roughness, metalness });
}
function part(parent, geometry, hexValue, position, scale, options = {}) {
  const mesh = new THREE.Mesh(geometry, material(hexValue, options.roughness, options.metalness));
  mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function makeCharacter(data = {}) {
  if (root) { scene.remove(root); root.traverse(o => { o.geometry?.dispose(); if (o.material) o.material.dispose(); }); }
  root = new THREE.Group(); scene.add(root);
  const outfit = hex(data.outfit, '#6e8462'), skin = hex(data.skin, '#d7ae8c'), hair = hex(data.hair, '#503b34');
  const boots = hex(data.boots, '#544437'), eye = hex(data.eyes, '#536d69');
  // Layered, rounded low-poly adventurer with a visible cloak silhouette.
  part(root, new THREE.ConeGeometry(.52, 1.15, 8), hex(data.cloak, '#405c4b'), [0, .86, -.15], [1, 1, .53]);
  part(root, new THREE.CapsuleGeometry(.29, .55, 4, 8), outfit, [0, 1.05, 0], [1, 1, .72]);
  part(root, new THREE.CylinderGeometry(.16, .19, .48, 8), boots, [-.15, .29, .02], [1, 1, 1]);
  part(root, new THREE.CylinderGeometry(.16, .19, .48, 8), boots, [.15, .29, .02], [1, 1, 1]);
  const armGeo = new THREE.CapsuleGeometry(.105, .52, 3, 6);
  const leftArm = part(root, armGeo, outfit, [-.37, 1.14, 0], [1, 1, 1]); leftArm.rotation.z = -.22;
  const rightArm = part(root, armGeo, outfit, [.37, 1.14, 0], [1, 1, 1]); rightArm.rotation.z = .22;
  part(root, new THREE.SphereGeometry(.11, 12, 10), skin, [-.38, .82, .02], [1, 1, 1]);
  part(root, new THREE.SphereGeometry(.11, 12, 10), skin, [.38, .82, .02], [1, 1, 1]);
  part(root, new THREE.CylinderGeometry(.09, .11, .23, 8), skin, [0, 1.48, 0], [1, 1, 1]);
  part(root, new THREE.SphereGeometry(.34, 16, 12), skin, [0, 1.78, .015], [1, 1.08, .9]);
  const hairStyle = data.hairStyle || 'Waves';
  part(root, new THREE.SphereGeometry(.35, 14, 10), hair, [0, 1.94, -.045], [1.04, hairStyle === 'Long braid' ? 1.2 : .66, 1]);
  if (hairStyle === 'Long braid') part(root, new THREE.CapsuleGeometry(.09, .45, 3, 6), hair, [.23, 1.55, -.13], [1, 1, 1]);
  if (hairStyle === 'Curly') for (let i=0;i<5;i++) part(root, new THREE.SphereGeometry(.13, 9, 8), hair, [-.25 + i*.125, 2.03 + (i%2)*.045, .12], [1, 1, 1]);
  for (const x of [-.13, .13]) part(root, new THREE.SphereGeometry(.035, 8, 8), eye, [x, 1.79, .315], [1, 1, .55]);
  part(root, new THREE.SphereGeometry(.036, 8, 6), hex(data.cheeks, '#c77873'), [-.23, 1.68, .27], [1, .65, .5]);
  part(root, new THREE.SphereGeometry(.036, 8, 6), hex(data.cheeks, '#c77873'), [.23, 1.68, .27], [1, .65, .5]);
  // Accessory choices alter actual geometry, not just a label.
  const accent = hex(data.accent, '#d6bd78'), accessory = data.accessory || presets[data.design]?.accessory || 'hood';
  if (accessory === 'circlet') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(.24, .035, 8, 24), material(accent, .3, .45)); band.position.set(0, 2.02, .02); band.rotation.x = Math.PI / 2.3; root.add(band);
    part(root, new THREE.OctahedronGeometry(.09), accent, [0, 2.12, .29], [1, 1, .6], {metalness:.35});
  } else if (accessory === 'horns') {
    for (const x of [-.23, .23]) { const horn=part(root, new THREE.ConeGeometry(.09, .3, 7), accent, [x, 2.06, -.01], [1, 1, 1]); horn.rotation.z=x<0?-.3:.3; }
  } else if (accessory === 'flower crown' || accessory === 'leaf crown') {
    for (let i=0;i<7;i++) { const a=(i/7)*Math.PI*2; part(root, new THREE.SphereGeometry(accessory==='leaf crown'?.075:.065, 8, 7), i%2?accent:hex(data.flower, '#d88c9d'), [Math.sin(a)*.28, 2.03, Math.cos(a)*.22], [1, 1.3, .7]); }
  } else if (accessory === 'shell pin') {
    part(root, new THREE.SphereGeometry(.12, 10, 8), accent, [.29, 1.28, .23], [1, 1, .45]);
  } else {
    const hood = part(root, new THREE.SphereGeometry(.37, 14, 10), hex(data.cloak, '#405c4b'), [0, 1.86, -.11], [1.12, .9, .92]);
    hood.material.side = THREE.DoubleSide;
  }
  if (data.glasses) {
    const frameMat = material(accent, .3, .3);
    for (const x of [-.13,.13]) { const lens = new THREE.Mesh(new THREE.TorusGeometry(.075,.012,6,16), frameMat); lens.position.set(x,1.79,.335); root.add(lens); }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(.09,.018,.018),frameMat);bridge.position.set(0,1.79,.34);root.add(bridge);
  }
  root.position.y = -.95;
}

function animate() {
  frame = requestAnimationFrame(animate);
  if (!renderer || !scene || !camera) return;
  if (!drag && root) root.rotation.y += .0035;
  if (root) root.position.y = -.95 + Math.sin(performance.now() * .0015) * .025;
  renderer.render(scene, camera);
}

window.mountCharacterPreview = (canvas, data) => {
  if (!canvas) return;
  if (activeCanvas !== canvas) {
    if (renderer) { renderer.dispose(); renderer = null; }
    activeCanvas = canvas;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(canvas.clientWidth || 320, canvas.clientHeight || 360, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(33, (canvas.clientWidth || 320)/(canvas.clientHeight || 360), .1, 30);
      camera.position.set(0, .55, 5.2);
      scene.add(new THREE.HemisphereLight('#fff4dc','#526858',2.2));
      const key = new THREE.DirectionalLight('#fff0ce',3.2); key.position.set(-3,5,5); scene.add(key);
      const rim = new THREE.DirectionalLight('#b9d5c2',1.8); rim.position.set(3,2,-3); scene.add(rim);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(1.7,40), new THREE.MeshStandardMaterial({color:'#879777', roughness:1})); floor.rotation.x=-Math.PI/2;floor.position.y=-.99;scene.add(floor);
      canvas.addEventListener('pointerdown', e => {drag={x:e.clientX,rotation:root?.rotation.y||0};canvas.setPointerCapture?.(e.pointerId)});
      canvas.addEventListener('pointermove', e => {if(drag&&root)root.rotation.y=drag.rotation+(e.clientX-drag.x)*.012});
      canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
      const resize = new ResizeObserver(() => { if (!renderer || !activeCanvas?.isConnected) return;const w=activeCanvas.clientWidth,h=activeCanvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix(); });
      resize.observe(canvas);
      if (!frame) animate();
    } catch (error) { console.warn('3D character preview is unavailable in this browser.', error); return; }
  }
  makeCharacter(data);
};
window.addEventListener('mythwyld-character-change', event => { if (activeCanvas?.isConnected) makeCharacter(event.detail || {}); });
