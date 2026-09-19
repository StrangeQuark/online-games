import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { random } from "./city";
export function surface(
  kind: "asphalt" | "paving" | "brick" | "glass" | "stone",
  seed = 1,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!,
    rng = random(seed);
  ctx.fillStyle = {
    asphalt: "#545859",
    paving: "#b6b2a7",
    brick: "#b58a72",
    glass: "#5b7e89",
    stone: "#c9bfad",
  }[kind];
  ctx.fillRect(0, 0, 256, 256);
  if (kind === "asphalt" || kind === "paving") {
    for (let i = 0; i < 8500; i++) {
      const n = rng() > 0.5 ? 255 : 0;
      ctx.fillStyle = `rgba(${n},${n},${n},${rng() * 0.15})`;
      ctx.fillRect(rng() * 256, rng() * 256, 1 + rng(), 1 + rng());
    }
    if (kind === "paving") {
      ctx.strokeStyle = "#706e643b";
      ctx.lineWidth = 2;
      for (let p = 0; p < 256; p += 64) {
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, 256);
        ctx.moveTo(0, p);
        ctx.lineTo(256, p);
        ctx.stroke();
      }
    }
  } else {
    const glass = kind === "glass";
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        const x = col * 64,
          y = row * 64;
        ctx.fillStyle = "#202b3530";
        ctx.fillRect(x, y + 60, 64, 4);
        if (kind === "brick") {
          ctx.strokeStyle = "#67463c33";
          for (let j = 0; j < 64; j += 8) {
            ctx.beginPath();
            ctx.moveTo(x, y + j);
            ctx.lineTo(x + 64, y + j);
            ctx.stroke();
          }
        }
        ctx.fillStyle = "#263d47";
        ctx.fillRect(x + (glass ? 3 : 12), y + 5, glass ? 58 : 40, 46);
        const grad = ctx.createLinearGradient(x, y, x + 50, y + 50);
        grad.addColorStop(0, rng() > 0.7 ? "#c6c7af" : "#87a9ad");
        grad.addColorStop(1, "#324b60");
        ctx.fillStyle = grad;
        ctx.fillRect(x + (glass ? 5 : 15), y + 8, glass ? 54 : 34, 39);
        ctx.fillStyle = "#dbddd345";
        ctx.fillRect(x + 20, y + 8, 2, 39);
        if (!glass) {
          ctx.fillStyle = "#e0cab5";
          ctx.fillRect(x + 9, y + 51, 46, 4);
        }
      }
  }
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}
export function signTexture(
  text: string,
  background = "#254747",
  color = "#eee1c4",
) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${text.length > 18 ? 26 : 34}px sans-serif`;
  ctx.fillText(text, 256, 66);
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}
export type CarModel = {
  group: T.Group;
  body: T.MeshStandardMaterial;
  wheels: T.Group[];
  front: T.Group[];
  brakes: T.MeshStandardMaterial;
};
export function makeCar(color: string, detailed = true): CarModel {
  const group = new T.Group();
  const body = new T.MeshStandardMaterial({
    color,
    roughness: 0.28,
    metalness: 0.52,
  });
  const glass = new T.MeshStandardMaterial({
    color: "#284653",
    roughness: 0.12,
    metalness: 0.68,
  });
  const rubber = new T.MeshStandardMaterial({
    color: "#171d21",
    roughness: 0.85,
  });
  const chrome = new T.MeshStandardMaterial({
    color: "#c8d0cb",
    roughness: 0.25,
    metalness: 0.85,
  });
  const dark = new T.MeshStandardMaterial({
    color: "#202a30",
    roughness: 0.5,
    metalness: 0.4,
  });
  const headlights = new T.MeshStandardMaterial({
    color: "#fcf0c6",
    emissive: "#fff0c0",
    emissiveIntensity: 1.8,
  });
  const brakes = new T.MeshStandardMaterial({
    color: "#a42a23",
    emissive: "#ff2918",
    emissiveIntensity: 0.5,
  });
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: T.Material,
    round = 0,
  ) {
    const m = new T.Mesh(
      round && detailed
        ? new RoundedBoxGeometry(w, h, d, 2, round)
        : new T.BoxGeometry(w, h, d),
      mat,
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  }
  box(1.88, 0.5, 4.35, 0, 0.65, 0, body, 0.12);
  box(1.8, 0.24, 1.32, 0, 0.93, -1.34, body, 0.09);
  box(1.8, 0.18, 0.93, 0, 0.93, 1.6, body, 0.08);
  // A tapered cabin gives the coupe real sloping glass, rather than a stack of cubes.
  const vertices = new Float32Array([
    -0.83, 0.87, -0.77, 0.83, 0.87, -0.77, 0.66, 1.49, -0.36, -0.66, 1.49,
    -0.36, -0.83, 0.87, 1.17, 0.83, 0.87, 1.17, 0.66, 1.49, 0.71, -0.66, 1.49,
    0.71,
  ]);
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(vertices, 3));
  geo.setIndex([
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5, 3,
    7, 6, 3, 6, 2,
  ]);
  geo.computeVertexNormals();
  const cabin = new T.Mesh(geo, glass);
  cabin.castShadow = true;
  group.add(cabin);
  box(1.36, 0.075, 1.1, 0, 1.51, 0.18, body, 0.035);
  for (const side of [-1, 1]) {
    box(0.045, 0.55, 0.055, side * 0.775, 1.15, 0.27, body);
    box(0.22, 0.14, 0.33, side * 1.01, 1.02, -0.51, body, 0.04);
    box(0.37, 0.14, 0.07, side * 0.61, 0.78, -2.18, headlights, 0.025);
    box(0.58, 0.13, 0.07, side * 0.56, 0.79, 2.18, brakes, 0.02);
    box(0.025, 0.045, 0.22, side * 0.947, 0.91, 0.55, chrome);
    box(0.025, 0.035, 3.6, side * 0.947, 0.54, 0, dark);
  }
  box(1.18, 0.18, 0.05, 0, 0.55, -2.2, dark);
  box(1.66, 0.08, 0.065, 0, 0.41, 2.2, chrome);
  box(
    0.43,
    0.15,
    0.04,
    0,
    0.61,
    2.23,
    new T.MeshStandardMaterial({
      map: signTexture("BELLWETHER", "#ede4ce", "#283940"),
    }),
  );
  if (detailed) {
    for (let i = 0; i < 5; i++)
      box(0.95, 0.012, 0.025, 0, 0.51 + i * 0.028, -2.235, chrome);
    box(0.035, 0.02, 1.1, -0.5, 1.057, -1.33, chrome);
    box(0.035, 0.02, 1.1, 0.5, 1.057, -1.33, chrome);
    box(0.16, 0.1, 0.12, -0.62, 0.33, 2.2, dark);
    box(0.16, 0.1, 0.12, 0.62, 0.33, 2.2, dark);
  }
  const wheels: T.Group[] = [],
    front: T.Group[] = [];
  for (const x of [-0.93, 0.93])
    for (const z of [-1.32, 1.36]) {
      const pivot = new T.Group();
      pivot.position.set(x, 0.38, z);
      group.add(pivot);
      const wheel = new T.Group();
      pivot.add(wheel);
      wheels.push(wheel);
      if (z < 0) front.push(pivot);
      const tyre = new T.Mesh(
        new T.CylinderGeometry(0.365, 0.365, 0.24, detailed ? 24 : 12),
        rubber,
      );
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;
      wheel.add(tyre);
      const rim = new T.Mesh(
        new T.CylinderGeometry(0.245, 0.245, 0.255, 12),
        chrome,
      );
      rim.rotation.z = Math.PI / 2;
      wheel.add(rim);
      const hub = new T.Mesh(
        new T.CylinderGeometry(0.09, 0.09, 0.27, 12),
        dark,
      );
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);
      if (detailed)
        for (let i = 0; i < 5; i++) {
          const spoke = new T.Mesh(new T.BoxGeometry(0.27, 0.035, 0.42), dark);
          spoke.rotation.x = (i * Math.PI) / 5;
          wheel.add(spoke);
        }
    }
  mergeStaticMeshes(group);
  return { group, body, wheels, front, brakes };
}

/** Batch fixed model parts by material. Wheels remain independent for animation. */
export function mergeStaticMeshes(group: T.Object3D) {
  const buckets = new Map<string, T.Mesh[]>();
  for (const child of group.children) {
    if (
      !(child instanceof T.Mesh) ||
      child instanceof T.InstancedMesh ||
      Array.isArray(child.material)
    )
      continue;
    const key =
      child.material.uuid +
      child.castShadow +
      child.receiveShadow +
      Object.keys(child.geometry.attributes).sort().join(",");
    const bucket = buckets.get(key) ?? [];
    bucket.push(child);
    buckets.set(key, bucket);
  }
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((m) => {
      m.updateMatrix();
      const geo = m.geometry.index
        ? m.geometry.toNonIndexed()
        : m.geometry.clone();
      return geo.applyMatrix4(m.matrix);
    });
    const merged = mergeGeometries(geometries);
    geometries.forEach((g) => g.dispose());
    if (!merged) continue;
    const result = new T.Mesh(merged, meshes[0].material);
    result.castShadow = meshes[0].castShadow;
    result.receiveShadow = meshes[0].receiveShadow;
    for (const m of meshes) {
      group.remove(m);
      m.geometry.dispose();
    }
    group.add(result);
  }
}
