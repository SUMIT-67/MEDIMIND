import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Sparkles,
  ThermometerSnowflake,
  ShieldCheck,
  RotateCcw,
  Maximize2,
  Layers,
  Activity,
  Zap,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const SupplyChain3DModel = () => {
  const mountRef = useRef(null);
  const { hospitals, transfers, transferSuggestions } = useInventory();

  const [active3DMode, setActive3DMode] = useState('MESH'); // 'MESH' | 'CAPSULE'
  const [hoveredNode, setHoveredNode] = useState(null);
  const [telemetryTemp, setTelemetryTemp] = useState(3.8);

  // Random micro-fluctuations for realistic live IoT cold-chain sensor reading
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryTemp((prev) => {
        const delta = (Math.random() - 0.5) * 0.2;
        return Number((Math.min(4.4, Math.max(3.2, prev + delta))).toFixed(1));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 280;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 3, 10);
    camera.lookAt(0, 0, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.replaceChildren(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x0284c7, 2.5);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x059669, 2.0);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x38bdf8, 3, 20);
    pointLight.position.set(0, 0, 2);
    scene.add(pointLight);

    // 4. Main 3D Objects Group
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Holographic Grid Floor
    const gridHelper = new THREE.GridHelper(10, 16, 0x0284c7, 0x1e293b);
    gridHelper.position.y = -2.2;
    mainGroup.add(gridHelper);

    // Central 3D Smart Medicine Capsule
    const capsuleGroup = new THREE.Group();
    mainGroup.add(capsuleGroup);

    // Top half of capsule (Sky Blue)
    const topCapGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.2, 32);
    const topCapMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.3,
      roughness: 0.2,
      emissive: 0x0369a1,
      emissiveIntensity: 0.2,
    });
    const topCap = new THREE.Mesh(topCapGeo, topCapMat);
    topCap.position.y = 0.6;
    capsuleGroup.add(topCap);

    const topSphereGeo = new THREE.SphereGeometry(0.7, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const topSphere = new THREE.Mesh(topSphereGeo, topCapMat);
    topSphere.position.y = 1.2;
    capsuleGroup.add(topSphere);

    // Bottom half of capsule (Emerald Green)
    const botCapMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      metalness: 0.3,
      roughness: 0.2,
      emissive: 0x047857,
      emissiveIntensity: 0.2,
    });
    const botCap = new THREE.Mesh(topCapGeo, botCapMat);
    botCap.position.y = -0.6;
    capsuleGroup.add(botCap);

    const botSphereGeo = new THREE.SphereGeometry(0.7, 32, 16, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
    const botSphere = new THREE.Mesh(botSphereGeo, botCapMat);
    botSphere.position.y = -1.2;
    capsuleGroup.add(botSphere);

    // Glowing Central Ring (Cold-Chain Smart Tag)
    const ringGeo = new THREE.TorusGeometry(0.74, 0.06, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    capsuleGroup.add(ring);

    // Orbital Hologram Ring
    const orbitRingGeo = new THREE.TorusGeometry(3.6, 0.02, 16, 100);
    const orbitRingMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.4 });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2.2;
    mainGroup.add(orbitRing);

    // Hospital 3D Nodes orbiting
    const hospitalNodes = [];
    const hospitalMeshGroup = new THREE.Group();
    mainGroup.add(hospitalMeshGroup);

    const radius = 3.6;
    const hospitalNames = ['AIIMS Delhi', 'LNJP Hospital', 'GTB Hospital', 'Safdarjung', 'Dr. RML'];
    const hospitalColors = [0x38bdf8, 0x10b981, 0xf59e0b, 0xa855f7, 0xf43f5e];

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(angle * 2) * 0.4;

      // Hospital Node Sphere
      const nodeGeo = new THREE.SphereGeometry(0.32, 24, 24);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: hospitalColors[i],
        metalness: 0.5,
        roughness: 0.2,
        emissive: hospitalColors[i],
        emissiveIntensity: 0.4,
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(x, y, z);
      nodeMesh.userData = { name: hospitalNames[i], id: i };
      hospitalMeshGroup.add(nodeMesh);
      hospitalNodes.push(nodeMesh);

      // Node Halo
      const haloGeo = new THREE.RingGeometry(0.38, 0.46, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: hospitalColors[i],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 2;
      halo.position.set(x, y, z);
      hospitalMeshGroup.add(halo);

      // Connecting Beam to Core
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, z)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: hospitalColors[i],
        transparent: true,
        opacity: 0.25,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      hospitalMeshGroup.add(line);
    }

    // Live Animated Particle Supply Stream (Simulating Drug Rebalancing Pulses)
    const particleCount = 40;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const t = Math.random();
      const angle = (Math.floor(Math.random() * 5) / 5) * Math.PI * 2;
      particlePositions[i] = Math.cos(angle) * radius * t;
      particlePositions[i + 1] = (Math.random() - 0.5) * 1.5;
      particlePositions[i + 2] = Math.sin(angle) * radius * t;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    mainGroup.add(particles);

    // 5. Interactive Mouse & Touch Drag Controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      mainGroup.rotation.y += deltaX * 0.008;
      mainGroup.rotation.x = Math.max(-0.6, Math.min(0.6, mainGroup.rotation.x + deltaY * 0.008));

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch Support for mobile / iPad
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;

      mainGroup.rotation.y += deltaX * 0.01;
      mainGroup.rotation.x = Math.max(-0.6, Math.min(0.6, mainGroup.rotation.x + deltaY * 0.01));

      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => {
      isDragging = false;
    };

    domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // 6. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Idle Rotation
      if (!isDragging) {
        mainGroup.rotation.y += 0.006;
      }

      // Capsule Bobbing & Spin
      capsuleGroup.rotation.y += 0.012;
      capsuleGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.15;
      capsuleGroup.rotation.z = Math.sin(elapsedTime * 0.8) * 0.1;

      // Pulse ring light
      ring.scale.setScalar(1 + Math.sin(elapsedTime * 3) * 0.05);

      // Rotate particle cloud
      particles.rotation.y -= 0.008;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
    };
  }, [active3DMode]);

  return (
    <div className="bg-gradient-to-b from-slate-900 via-delhi-navy to-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-gov flex flex-col justify-between relative overflow-hidden h-full min-h-[360px]">
      {/* Top Header & Telemetry Badge */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
              3D NCT Supply Surveillance
            </span>
          </div>
          <h3 className="text-sm sm:text-base font-bold font-display text-white mt-0.5">
            Live Inter-Hospital Supply Mesh
          </h3>
        </div>

        {/* Live IoT Cold-Chain Sensor Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-950/80 border border-sky-500/40 text-xs shadow-inner">
          <ThermometerSnowflake className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
          <div className="text-right">
            <span className="font-mono font-bold text-sky-300 text-xs">{telemetryTemp}°C</span>
            <span className="text-[9px] text-sky-400/80 block leading-none">Cold-Chain</span>
          </div>
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative w-full flex-1 my-2 min-h-[220px] cursor-grab active:cursor-grabbing flex items-center justify-center">
        <div ref={mountRef} className="w-full h-full absolute inset-0" />

        {/* Orbit Drag Prompt */}
        <div className="absolute bottom-1 right-2 pointer-events-none text-[9px] text-slate-400/80 bg-slate-950/60 px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
          <RotateCcw className="w-2.5 h-2.5 text-sky-400" />
          <span>Click & Drag to Rotate 3D</span>
        </div>
      </div>

      {/* Bottom Live Telemetry Cards */}
      <div className="relative z-10 grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
        <div className="p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <span className="text-[10px] text-slate-400 block font-medium">Active Nodes</span>
          <span className="text-xs font-bold font-display text-emerald-400">5 Delhi Hubs</span>
        </div>

        <div className="p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <span className="text-[10px] text-slate-400 block font-medium">Rebalancing</span>
          <span className="text-xs font-bold font-display text-sky-300">
            {transferSuggestions.length > 0 ? `${transferSuggestions.length} Queued` : '100% Balanced'}
          </span>
        </div>

        <div className="p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <span className="text-[10px] text-slate-400 block font-medium">Cold Storage</span>
          <span className="text-xs font-bold font-display text-emerald-300">2-8°C Verified</span>
        </div>
      </div>
    </div>
  );
};
