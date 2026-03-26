import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 30);

    // Mouse parallax
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Particle field background
    const particleCount = 800;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const greenColors = [
      new THREE.Color(0x00e676),
      new THREE.Color(0x1de9b6),
      new THREE.Color(0x69f0ae),
      new THREE.Color(0x00bcd4),
    ];
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      const c = greenColors[Math.floor(Math.random() * greenColors.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = Math.random() * 1.5 + 0.3;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    const particleMat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // DNA Helix
    const helixGroup = new THREE.Group();
    const helixSpheres: THREE.Mesh[] = [];
    const totalPoints = 60;
    const helixRadius = 4;
    const helixHeight = 20;
    const turns = 3;
    for (let i = 0; i < totalPoints; i++) {
      const t = i / totalPoints;
      const angle = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * helixHeight;
      // Strand 1
      const x1 = Math.cos(angle) * helixRadius;
      const z1 = Math.sin(angle) * helixRadius;
      const geo1 = new THREE.SphereGeometry(0.18, 8, 8);
      const mat1 = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x00e676),
        transparent: true,
        opacity: 0.9,
      });
      const sphere1 = new THREE.Mesh(geo1, mat1);
      sphere1.position.set(x1, y, z1);
      helixGroup.add(sphere1);
      helixSpheres.push(sphere1);
      // Strand 2
      const x2 = Math.cos(angle + Math.PI) * helixRadius;
      const z2 = Math.sin(angle + Math.PI) * helixRadius;
      const geo2 = new THREE.SphereGeometry(0.18, 8, 8);
      const mat2 = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x1de9b6),
        transparent: true,
        opacity: 0.9,
      });
      const sphere2 = new THREE.Mesh(geo2, mat2);
      sphere2.position.set(x2, y, z2);
      helixGroup.add(sphere2);
      helixSpheres.push(sphere2);
      // Cross bridge every few points
      if (i % 4 === 0) {
        const bridgeGeo = new THREE.CylinderGeometry(0.05, 0.05, helixRadius * 2, 4);
        const bridgeMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(0x69f0ae),
          transparent: true,
          opacity: 0.3,
        });
        const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
        bridge.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
        bridge.rotation.z = Math.PI / 2;
        bridge.lookAt(new THREE.Vector3(x2, y, z2));
        helixGroup.add(bridge);
      }
    }
    helixGroup.position.set(-8, 0, 0);
    scene.add(helixGroup);

    // Orbiting rings
    const ringGroup = new THREE.Group();
    const ringCount = 3;
    const ringColors = [0x00e676, 0x1de9b6, 0x00bcd4];
    for (let r = 0; r < ringCount; r++) {
      const radius = 7 + r * 3;
      const ringGeo = new THREE.TorusGeometry(radius, 0.06, 8, 100);
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColors[r],
        transparent: true,
        opacity: 0.35 - r * 0.08,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = (Math.PI / 4) * (r + 1) * 0.6;
      ring.rotation.y = (Math.PI / 6) * r;
      ringGroup.add(ring);
    }
    ringGroup.position.set(8, 0, 0);
    scene.add(ringGroup);

    // Central glowing sphere
    const coreGroup = new THREE.Group();
    const coreGeo = new THREE.SphereGeometry(2.5, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00e676,
      transparent: true,
      opacity: 0.15,
      wireframe: true,
    });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    coreGroup.add(coreSphere);

    const innerGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x1de9b6,
      transparent: true,
      opacity: 0.4,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerSphere);

    const glowGeo = new THREE.SphereGeometry(3.5, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00e676,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    coreGroup.add(glowSphere);

    coreGroup.position.set(8, 0, 0);
    scene.add(coreGroup);

    // Orbiting particles around core
    const orbitGroup = new THREE.Group();
    const orbitCount = 20;
    const orbitParticles: Array<{ mesh: THREE.Mesh; angle: number; speed: number; radius: number; yOffset: number }> = [];
    for (let o = 0; o < orbitCount; o++) {
      const oGeo = new THREE.SphereGeometry(0.12, 6, 6);
      const oMat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0x00e676 : 0x1de9b6,
        transparent: true,
        opacity: 0.9,
      });
      const oMesh = new THREE.Mesh(oGeo, oMat);
      const oRadius = 4 + Math.random() * 4;
      const oAngle = (o / orbitCount) * Math.PI * 2;
      const oY = (Math.random() - 0.5) * 4;
      oMesh.position.set(Math.cos(oAngle) * oRadius, oY, Math.sin(oAngle) * oRadius);
      orbitGroup.add(oMesh);
      orbitParticles.push({ mesh: oMesh, angle: oAngle, speed: 0.003 + Math.random() * 0.005, radius: oRadius, yOffset: oY });
    }
    orbitGroup.position.set(8, 0, 0);
    scene.add(orbitGroup);

    // Resize handler
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation loop
    let frame = 0;
    const animate = () => {
      frame++;
      const t = frame * 0.005;

      // Camera parallax
      camera.position.x += (mouseX * 3 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 3 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      // Rotate particles
      particles.rotation.y += 0.0005;
      particles.rotation.x += 0.0002;

      // Rotate helix
      helixGroup.rotation.y += 0.006;

      // Animate helix spheres pulse
      helixSpheres.forEach((s, i) => {
        const scale = 1 + Math.sin(t * 2 + i * 0.2) * 0.15;
        s.scale.setScalar(scale);
      });

      // Rotate rings
      ringGroup.children.forEach((child, i) => {
        (child as THREE.Mesh).rotation.z += 0.003 * (i + 1) * 0.5;
        (child as THREE.Mesh).rotation.x += 0.002 * (i + 1) * 0.3;
      });

      // Pulse core
      const pulse = 1 + Math.sin(t * 1.5) * 0.08;
      coreSphere.scale.setScalar(pulse);
      const innerPulse = 1 + Math.sin(t * 2) * 0.12;
      innerSphere.scale.setScalar(innerPulse);
      glowSphere.scale.setScalar(1 + Math.sin(t) * 0.05);

      // Orbit particles
      orbitParticles.forEach((p) => {
        p.angle += p.speed;
        p.mesh.position.x = Math.cos(p.angle) * p.radius;
        p.mesh.position.z = Math.sin(p.angle) * p.radius;
        p.mesh.position.y = p.yOffset + Math.sin(p.angle * 2) * 0.5;
      });

      // Float helix
      helixGroup.position.y = Math.sin(t * 0.5) * 1.2;
      coreGroup.position.y = Math.cos(t * 0.4) * 0.8;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    let animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
}
