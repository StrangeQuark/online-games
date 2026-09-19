import * as THREE from "three";
import type { Match } from "./engine";
const PARTICLES = 480,
  TRACES = 96,
  PROJECTILES = 80;
export function createEffects(scene: THREE.Scene) {
  const positions = new Float32Array(PARTICLES * 3),
    colors = new Float32Array(PARTICLES * 3),
    sizes = new Float32Array(PARTICLES),
    alphas = new Float32Array(PARTICLES);
  const velocity = new Float32Array(PARTICLES * 3),
    life = new Float32Array(PARTICLES),
    total = new Float32Array(PARTICLES),
    gravity = new Float32Array(PARTICLES),
    baseSize = new Float32Array(PARTICLES);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexColors: true,
    uniforms: { viewport: { value: 600 } },
    vertexShader: `attribute float size;attribute float alpha;varying vec3 tint;varying float opacity;uniform float viewport;void main(){tint=color;opacity=alpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(size*viewport/-mv.z,0.,96.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec3 tint;varying float opacity;void main(){float r=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-r*r),2.)*opacity;if(a<.015)discard;gl_FragColor=vec4(tint,a);}`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  const linePositions = new Float32Array(TRACES * 6),
    lineColors = new Float32Array(TRACES * 6),
    traceLife = new Float32Array(TRACES),
    traceTotal = new Float32Array(TRACES),
    traceColor = new Float32Array(TRACES * 3);
  const linesGeometry = new THREE.BufferGeometry();
  linesGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(linePositions, 3),
  );
  linesGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
  const lines = new THREE.LineSegments(
    linesGeometry,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  lines.frustumCulled = false;
  scene.add(lines);
  const projectileGeometry = new THREE.SphereGeometry(1, 10, 7),
    projectileMaterials = [
      new THREE.MeshStandardMaterial({
        color: 0xb5976d,
        metalness: 0.7,
        roughness: 0.35,
      }),
      new THREE.MeshBasicMaterial({ color: 0x8ae9ff }),
      new THREE.MeshStandardMaterial({
        color: 0x524e35,
        metalness: 0.65,
        roughness: 0.45,
        emissive: 0xff5c18,
        emissiveIntensity: 0.12,
      }),
    ];
  const projectiles = projectileMaterials.map((mat) => {
    const object = new THREE.InstancedMesh(
      projectileGeometry,
      mat,
      PROJECTILES,
    );
    object.count = 0;
    object.frustumCulled = false;
    scene.add(object);
    return object;
  });
  const matrix = new THREE.Matrix4(),
    rotation = new THREE.Quaternion(),
    position = new THREE.Vector3(),
    scale = new THREE.Vector3(),
    forward = new THREE.Vector3(0, 0, -1),
    direction = new THREE.Vector3(),
    color = new THREE.Color();
  let cursor = 0,
    traceCursor = 0;
  const seen = new Set<number>();
  const poses = new Map<number, { x: number; y: number; z: number }>();
  function emit(
    x: number,
    y: number,
    z: number,
    hex: string | number,
    count: number,
    spread: number,
    seconds: number,
    size: number,
    weight = 1,
  ) {
    color.set(hex);
    for (let i = 0; i < count; i++) {
      const index = cursor++ % PARTICLES,
        p = index * 3;
      positions[p] = x;
      positions[p + 1] = y;
      positions[p + 2] = z;
      const theta = Math.random() * Math.PI * 2,
        vertical = Math.random() * 2 - 1,
        speed = spread * (0.3 + Math.random() * 0.7);
      velocity[p] = Math.cos(theta) * speed;
      velocity[p + 1] = vertical * speed + spread * 0.25;
      velocity[p + 2] = Math.sin(theta) * speed;
      life[index] = total[index] = seconds * (0.6 + Math.random() * 0.4);
      baseSize[index] = size * (0.65 + Math.random() * 0.7);
      gravity[index] = weight;
      colors[p] = color.r;
      colors[p + 1] = color.g;
      colors[p + 2] = color.b;
    }
  }
  function update(game: Match, dt: number, height: number) {
    material.uniforms.viewport.value = height;
    for (const effect of game.effects)
      if (!seen.has(effect.id)) {
        seen.add(effect.id);
        if (effect.kind === "shot" && effect.end) {
          const i = traceCursor++ % TRACES,
            p = i * 6;
          color.set(effect.color);
          linePositions.set(
            [
              effect.x,
              effect.y,
              effect.z,
              effect.end.x,
              effect.end.y,
              effect.end.z,
            ],
            p,
          );
          traceLife[i] = traceTotal[i] = effect.maxLife;
          traceColor.set([color.r, color.g, color.b], i * 3);
        } else if (effect.kind === "blast") {
          emit(
            effect.x,
            effect.y,
            effect.z,
            effect.color,
            30,
            6,
            0.65,
            0.15,
            3,
          );
          emit(effect.x, effect.y, effect.z, 0x85817a, 15, 2, 1.05, 0.85, -0.1);
          emit(effect.x, effect.y, effect.z, 0xffdf97, 8, 2, 0.22, 1.05, 0);
        } else
          emit(effect.x, effect.y, effect.z, effect.color, 7, 3, 0.3, 0.085, 2);
      }
    for (const id of seen)
      if (!game.effects.some((e) => e.id === id)) seen.delete(id);
    for (let i = 0; i < PARTICLES; i++) {
      life[i] = Math.max(0, life[i] - dt);
      const p = i * 3;
      if (life[i] > 0) {
        positions[p] += velocity[p] * dt;
        positions[p + 1] += velocity[p + 1] * dt;
        positions[p + 2] += velocity[p + 2] * dt;
        velocity[p + 1] -= gravity[i] * dt;
        const progress = life[i] / total[i];
        alphas[i] = progress * 0.85;
        sizes[i] = baseSize[i] * (1 + (1 - progress) * 0.7);
      } else {
        alphas[i] = 0;
        sizes[i] = 0;
      }
    }
    for (const name of ["position", "size", "alpha", "color"])
      geometry.getAttribute(name).needsUpdate = true;
    for (let i = 0; i < TRACES; i++) {
      traceLife[i] = Math.max(0, traceLife[i] - dt);
      const alpha = traceLife[i] / (traceTotal[i] || 1);
      for (let j = 0; j < 6; j++)
        lineColors[i * 6 + j] = traceColor[i * 3 + (j % 3)] * alpha;
    }
    linesGeometry.getAttribute("position").needsUpdate = true;
    linesGeometry.getAttribute("color").needsUpdate = true;
    const counts = [0, 0, 0];
    for (const p of game.projectiles) {
      const index = p.kind === "plasma" ? 1 : p.kind === "grenade" ? 2 : 0;
      if (counts[index] >= PROJECTILES) continue;
      let pose = poses.get(p.id);
      if (!pose) {
        pose = { x: p.x, y: p.y, z: p.z };
        poses.set(p.id, pose);
      }
      const blend =
        Math.hypot(p.x - pose.x, p.y - pose.y, p.z - pose.z) > 5
          ? 1
          : 1 - Math.exp(-dt * 24);
      pose.x += (p.x - pose.x) * blend;
      pose.y += (p.y - pose.y) * blend;
      pose.z += (p.z - pose.z) * blend;
      position.set(pose.x, pose.y, pose.z);
      direction.set(p.dx, p.dy, p.dz).normalize();
      rotation.setFromUnitVectors(forward, direction);
      scale.set(
        index === 0 ? 0.065 : index === 1 ? 0.105 : 0.092,
        index === 0 ? 0.065 : index === 1 ? 0.105 : 0.092,
        index === 0 ? 0.28 : index === 1 ? 0.22 : 0.092,
      );
      matrix.compose(position, rotation, scale);
      projectiles[index].setMatrixAt(counts[index]++, matrix);
      if (index === 0 && Math.random() < dt * 35)
        emit(p.x, p.y, p.z, 0xb4aaa0, 1, 0.24, 0.35, 0.17, -0.3);
      if (index === 1 && Math.random() < dt * 45)
        emit(p.x, p.y, p.z, 0x57c8ff, 1, 0.12, 0.15, 0.16, 0);
    }
    projectiles.forEach((object, i) => {
      object.count = counts[i];
      object.instanceMatrix.needsUpdate = true;
    });
    for (const id of poses.keys())
      if (!game.projectiles.some((p) => p.id === id)) poses.delete(id);
  }
  return {
    emit,
    update,
    reset() {
      life.fill(0);
      traceLife.fill(0);
      seen.clear();
      poses.clear();
    },
    dispose() {
      points.removeFromParent();
      lines.removeFromParent();
      projectiles.forEach((o) => o.removeFromParent());
      geometry.dispose();
      material.dispose();
      linesGeometry.dispose();
      (lines.material as THREE.Material).dispose();
      projectileGeometry.dispose();
      projectileMaterials.forEach((m) => m.dispose());
    },
  };
}
