import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GEAR_N, GEAR_ROT } from '../lib/gear.js';
import { LogoMark } from './Logo.jsx';

const K = 2.1 / 41; // logo units -> scene units
const STEP = (Math.PI * 2) / GEAR_N;
const P = (rad, a) => [rad * Math.cos(a), -rad * Math.sin(a)];
const STOPS = [new THREE.Color('#110FFF'), new THREE.Color('#7A3CFF'), new THREE.Color('#12D6C8')];

function gearShape() {
  const R = 2.1; const r = 1.66; const s = new THREE.Shape();
  for (let i = 0; i < GEAR_N; i += 1) {
    const a0 = GEAR_ROT + i * STEP;
    if (i === 0) s.moveTo(...P(r, a0));
    s.lineTo(...P(R, a0 + STEP * 0.74)); s.lineTo(...P(r, a0 + STEP * 0.84));
    s.lineTo(...P(r, a0 + STEP * 0.92)); s.lineTo(...P(r, a0 + STEP));
  }
  const hole = new THREE.Path(); hole.absarc(0, 0, 1.2, 0, Math.PI * 2, true); s.holes.push(hole);
  return s;
}

function paint(geo) {
  const pos = geo.attributes.position; const col = new Float32Array(pos.count * 3); const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const t = Math.min(1, Math.max(0, (pos.getX(i) - pos.getY(i)) / 4.4 + 0.5));
    if (t < 0.55) c.copy(STOPS[0]).lerp(STOPS[1], t / 0.55); else c.copy(STOPS[1]).lerp(STOPS[2], (t - 0.55) / 0.45);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

function pawlShape() {
  const pts = [[1.2, -33.2], [5.8, -39.6], [30, -51], [36, -52], [38, -46.5], [38.6, -42.5], [34, -41], [9.5, -35.6], [4, -33.2]];
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? s.lineTo(x * K, -y * K) : s.moveTo(x * K, -y * K)));
  return s;
}

/** Interactive 3D ratchet wheel. `steps` = how many teeth it has advanced; `blockedKey` bumps when someone tries to loosen it. */
export default function Gear3D({ steps = 0, blockedKey = 0, className = '' }) {
  const host = useRef(null); const api = useRef({ steps, blocked: 0 });
  const [failed, setFailed] = useState(false);
  api.current.steps = steps;

  useEffect(() => { api.current.blockedPending = true; }, [blockedKey]);

  useEffect(() => {
    const el = host.current; if (!el) return undefined;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { setFailed(true); return undefined; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:pan-y';

    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50); camera.position.set(0, 0, 11.4);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 4, 6); scene.add(key);
    const cyan = new THREE.PointLight(0x12d6c8, 40, 14); cyan.position.set(-4, -2.5, 3.5); scene.add(cyan);
    const mag = new THREE.PointLight(0xb040ff, 34, 14); mag.position.set(4, 2.5, 3); scene.add(mag);

    const root = new THREE.Group(); scene.add(root);
    const gear = new THREE.Group(); root.add(gear);

    const gGeo = new THREE.ExtrudeGeometry(gearShape(), { depth: 0.6, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.09, bevelSegments: 4, curveSegments: 6 });
    gGeo.translate(0, 0, -0.3); paint(gGeo);
    const gMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 0.75 });
    gear.add(new THREE.Mesh(gGeo, gMat));

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.5, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, clearcoat: 0.6 }));
    disc.rotation.x = Math.PI / 2; gear.add(disc);
    const stairs = new THREE.Shape();
    [[-14, 15], [-14, 7], [-7, 7], [-7, 0], [0, 0], [0, -7], [7, -7], [7, -14], [14, -14], [14, 15]].forEach(([x, y], i) => (i ? stairs.lineTo(x * 0.05, -y * 0.05) : stairs.moveTo(x * 0.05, -y * 0.05)));
    const sGeo = new THREE.ExtrudeGeometry(stairs, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
    sGeo.translate(0, 0, 0.25); paint(sGeo);
    gear.add(new THREE.Mesh(sGeo, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, clearcoat: 1 })));

    const px = 33.5 * K; const py = 46.5 * K;
    const pawl = new THREE.Group(); pawl.position.set(px, py, 0); root.add(pawl);
    const pGeo = new THREE.ExtrudeGeometry(pawlShape(), { depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2 });
    pGeo.translate(-px, -py, -0.25);
    pawl.add(new THREE.Mesh(pGeo, new THREE.MeshPhysicalMaterial({ color: 0x15152c, metalness: 0.6, roughness: 0.3, clearcoat: 0.8 })));
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.62, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    pin.rotation.x = Math.PI / 2; pawl.add(pin);

    // five "validators" on an orbit
    const orbit = new THREE.Group(); root.add(orbit);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.35, 0.012, 8, 160), new THREE.MeshBasicMaterial({ color: 0x7a3cff, transparent: true, opacity: 0.35 }));
    orbit.add(ring);
    const vals = [];
    for (let i = 0; i < 5; i += 1) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x12d6c8 : 0x7a3cff }));
      orbit.add(m); vals.push(m);
    }
    orbit.rotation.x = 1.15;

    let w = 0; let h = 0;
    const size = () => { const r = el.getBoundingClientRect(); w = Math.max(1, r.width); h = Math.max(1, r.height); renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.85 ? 44 : 34; camera.updateProjectionMatrix(); };
    size();
    const ro = new ResizeObserver(size); ro.observe(el);

    const pointer = { x: 0, y: 0 };
    const onMove = (e) => { const r = el.getBoundingClientRect(); pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2; pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2; };
    window.addEventListener('pointermove', onMove, { passive: true });

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let angle = 0; let vel = 0; let kick = 0; let lastTooth = 0; let raf = 0; let last = performance.now(); let visible = true; let t0 = 0;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t0 += dt;
      const a = api.current;
      if (a.blockedPending) { a.blockedPending = false; vel += 3.2; kick = 1.4; }
      const target = -a.steps * STEP;
      vel += (70 * (target - angle) - 9.5 * vel) * dt; angle += vel * dt;
      gear.rotation.z = angle;
      const tooth = Math.floor(-angle / STEP + 0.2);
      if (tooth !== lastTooth) { lastTooth = tooth; kick = Math.max(kick, 1); }
      kick = Math.max(0, kick - dt * 4.5);
      pawl.rotation.z = Math.sin(kick * Math.PI * 0.5) * 0.22;
      if (!reduce) {
        root.rotation.y += ((pointer.x * 0.38) - root.rotation.y) * 0.06;
        root.rotation.x += ((pointer.y * 0.24) - root.rotation.x) * 0.06;
        root.position.y = Math.sin(t0 * 0.9) * 0.06;
        orbit.rotation.z += dt * 0.35;
      }
      vals.forEach((m, i) => { const aa = (i / 5) * Math.PI * 2 + t0 * 0.6; m.position.set(Math.cos(aa) * 3.35, Math.sin(aa) * 3.35, 0); });
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 }); io.observe(el);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => m.dispose?.()); });
      pm.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  if (failed) return <div className={`gear3d gear3d-fallback ${className}`}><LogoMark size={220} animate /></div>;
  return <div ref={host} className={`gear3d ${className}`} role="img" aria-label="A 3D ratchet wheel that only turns forward" />;
}
