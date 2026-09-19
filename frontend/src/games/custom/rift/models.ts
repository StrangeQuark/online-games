import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { WEAPONS, type Actor, type WeaponId } from "./engine";

export function material(
  color: number,
  metalness = 0.55,
  roughness = 0.5,
  emissive = 0,
  intensity = 1,
) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    emissive,
    emissiveIntensity: intensity,
  });
}
export function mesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new THREE.Mesh(geometry, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function box(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  round = 0.035,
) {
  return mesh(
    parent,
    Math.min(w, h, d) > 0.07
      ? new RoundedBoxGeometry(
          w,
          h,
          d,
          1,
          Math.min(round, Math.min(w, h, d) * 0.22),
        )
      : new THREE.BoxGeometry(w, h, d),
    mat,
    x,
    y,
    z,
  );
}
export function cylinder(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  mat: THREE.Material,
  segments = 12,
  rTop = r,
) {
  return mesh(
    parent,
    new THREE.CylinderGeometry(rTop, r, h, segments),
    mat,
    x,
    y,
    z,
  );
}
export function ellipsoid(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  segments = 16,
) {
  const m = mesh(
    parent,
    new THREE.SphereGeometry(
      1,
      segments,
      Math.max(6, Math.round(segments * 0.625)),
    ),
    mat,
    x,
    y,
    z,
  );
  m.scale.set(w / 2, h / 2, d / 2);
  return m;
}
export function capsule(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  length: number,
  mat: THREE.Material,
) {
  return mesh(
    parent,
    new THREE.CapsuleGeometry(r, Math.max(0.001, length - r * 2), 4, 10),
    mat,
    x,
    y,
    z,
  );
}
/** Merge each rigid section once. Its child joints stay articulated. */
export function batch(group: THREE.Object3D) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const batches = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of [...group.children])
    if (child instanceof THREE.Mesh && !Array.isArray(child.material)) {
      const existing = batches.get(child.material) || [];
      existing.push(child);
      batches.set(child.material, existing);
    }
  for (const [mat, meshes] of batches)
    if (meshes.length > 1) {
      const geometries = meshes.map((m) => {
        const g = m.geometry.index
          ? m.geometry.toNonIndexed()
          : m.geometry.clone();
        g.applyMatrix4(inverse.clone().multiply(m.matrixWorld));
        return g;
      });
      const merged = mergeGeometries(geometries);
      if (merged) {
        const m = new THREE.Mesh(merged, mat);
        m.castShadow = meshes.some((o) => o.castShadow);
        m.receiveShadow = true;
        group.add(m);
        for (const old of meshes) {
          old.removeFromParent();
          old.geometry.dispose();
        }
      }
      geometries.forEach((g) => g.dispose());
    }
}
export function disposeObject(object: THREE.Object3D, materials = true) {
  const geos = new Set<THREE.BufferGeometry>(),
    mats = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  object.traverse((o) => {
    if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
    if (
      o instanceof THREE.Mesh ||
      o instanceof THREE.Points ||
      o instanceof THREE.Line ||
      o instanceof THREE.Sprite
    ) {
      if (o.geometry) geos.add(o.geometry);
      if (materials)
        for (const mat of Array.isArray(o.material)
          ? o.material
          : [o.material]) {
          mats.add(mat);
          for (const value of Object.values(mat))
            if (value instanceof THREE.Texture) textures.add(value);
        }
    }
  });
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
  object.removeFromParent();
}
function weaponSurface() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ccd0c9";
  context.fillRect(0, 0, 256, 256);
  let seed = 107;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 1900; i++) {
    context.fillStyle = i % 2 ? "#15242e20" : "#ffffff30";
    context.fillRect(random() * 256, random() * 256, 1 + random() * 6, 0.7);
  }
  context.strokeStyle = "#ffffff85";
  context.lineWidth = 2;
  context.strokeRect(3, 3, 250, 250);
  context.strokeStyle = "#36475060";
  context.lineWidth = 1;
  context.strokeRect(7, 7, 242, 242);
  for (const x of [18, 238])
    for (const y of [18, 238]) {
      context.fillStyle = "#35434b";
      context.beginPath();
      context.arc(x, y, 3, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#e0e6d7";
      context.fillRect(x - 1, y - 1, 2, 1);
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
export type WeaponModel = {
  root: THREE.Group;
  magazine: THREE.Group;
  slide: THREE.Group;
  chamber: THREE.Group;
  muzzle: THREE.Vector3;
};
export function weaponModel(id: WeaponId): WeaponModel {
  const root = new THREE.Group(),
    magazine = new THREE.Group(),
    slide = new THREE.Group(),
    chamber = new THREE.Group();
  root.add(magazine, slide, chamber);
  const steel = material(0x637278, 0.82, 0.31),
    dark = material(0x172029, 0.45, 0.46),
    rubber = material(0x1c252a, 0.08, 0.88),
    silver = material(0xb5beb6, 0.85, 0.24),
    brass = material(0xbe9561, 0.8, 0.34);
  steel.map = weaponSurface();
  const color = new THREE.Color(WEAPONS[id].color).getHex();
  const glow = material(color, 0.2, 0.24, color, 1.35);
  const barrel = (
    x: number,
    y: number,
    z: number,
    r: number,
    length: number,
    m: THREE.Material = steel,
  ) => {
    const b = cylinder(root, x, y, z, r, length, m, 16);
    b.rotation.x = Math.PI / 2;
    const end = cylinder(
      root,
      x,
      y,
      z - length / 2 - 0.005,
      r * 0.73,
      0.012,
      rubber,
      14,
    );
    end.rotation.x = Math.PI / 2;
    return b;
  };
  // A tapered receiver, ergonomic pistol grip, butt pad and lower trigger guard.
  box(root, 0, 0, 0.0, 0.145, 0.15, 0.38, dark);
  box(root, 0, 0.054, -0.035, 0.17, 0.07, 0.34, steel);
  const grip = box(root, 0, -0.135, 0.105, 0.083, 0.21, 0.115, rubber);
  grip.rotation.x = -0.22;
  for (let i = 0; i < 4; i++)
    box(root, 0, -0.08 - i * 0.03, 0.166, 0.088, 0.008, 0.012, steel);
  const guard = mesh(
    root,
    new THREE.TorusGeometry(0.065, 0.012, 5, 16, Math.PI * 1.48),
    steel,
    0,
    -0.12,
    -0.014,
  );
  guard.rotation.y = Math.PI / 2;
  guard.rotation.z = 0.4;
  box(root, 0, -0.061, -0.005, 0.018, 0.067, 0.018, silver).rotation.x = 0.4;
  box(root, 0, 0.012, 0.272, 0.12, 0.12, 0.24, dark);
  box(root, 0, -0.015, 0.388, 0.14, 0.19, 0.07, rubber);
  for (const side of [-1, 1]) {
    box(root, side * 0.087, 0.002, 0.035, 0.024, 0.085, 0.18, steel);
    for (const z of [-0.045, 0.085]) {
      const pin = cylinder(
        root,
        side * 0.104,
        0.01,
        z,
        0.009,
        0.008,
        silver,
        8,
      );
      pin.rotation.z = Math.PI / 2;
    }
  }
  box(slide, 0, 0.098, -0.038, 0.054, 0.022, 0.21, silver);
  if (id === "carbine") {
    barrel(0, 0.038, -0.47, 0.029, 0.52);
    barrel(0, 0.038, -0.728, 0.045, 0.065, dark);
    box(root, 0, 0.018, -0.276, 0.143, 0.12, 0.21, steel);
    for (let i = 0; i < 7; i++) {
      box(root, 0, 0.091, -0.35 + i * 0.048, 0.14, 0.017, 0.019, dark);
      for (const side of [-1, 1])
        box(
          root,
          side * 0.075,
          0.012,
          -0.35 + i * 0.031,
          0.012,
          0.046,
          0.014,
          rubber,
        );
    }
    box(magazine, 0, -0.147, -0.087, 0.088, 0.225, 0.107, steel).rotation.x =
      0.12;
    for (let i = 0; i < 3; i++)
      box(magazine, 0.047, -0.095 - i * 0.045, -0.082, 0.01, 0.012, 0.06, dark);
    box(root, 0, 0.14, -0.102, 0.064, 0.055, 0.074, dark);
    box(root, 0, 0.162, -0.11, 0.027, 0.023, 0.018, glow);
    box(root, 0.088, 0.051, 0.03, 0.012, 0.029, 0.096, glow);
  } else if (id === "shotgun") {
    barrel(-0.042, 0.03, -0.48, 0.034, 0.58);
    barrel(0.042, 0.03, -0.48, 0.034, 0.58);
    barrel(0, -0.044, -0.42, 0.024, 0.47, brass);
    box(slide, 0, -0.013, -0.365, 0.17, 0.116, 0.23, rubber);
    for (let i = 0; i < 7; i++)
      box(slide, 0, -0.021, -0.459 + i * 0.03, 0.175, 0.115, 0.009, brass);
    for (let i = 0; i < 4; i++) {
      const shell = cylinder(
        root,
        0.109,
        0.008,
        0.09 - i * 0.064,
        0.022,
        0.083,
        brass,
        10,
      );
      shell.rotation.z = Math.PI / 2;
      box(root, 0.119, 0.011, 0.09 - i * 0.064, 0.025, 0.073, 0.032, dark);
    }
    box(root, 0, 0.113, -0.04, 0.024, 0.018, 0.3, silver);
    box(root, 0, 0.113, -0.57, 0.013, 0.03, 0.025, glow);
    box(magazine, 0, -0.095, -0.063, 0.081, 0.125, 0.1, brass);
  } else if (id === "rocket") {
    barrel(0, 0.055, -0.268, 0.112, 0.77, steel);
    barrel(0, 0.055, -0.668, 0.124, 0.062, dark);
    for (const z of [-0.6, -0.46, -0.2, 0.08]) {
      const ring = mesh(
        root,
        new THREE.TorusGeometry(0.114, 0.013, 6, 20),
        brass,
        0,
        0.055,
        z,
      );
      ring.rotation.x = 0;
    }
    box(root, 0.103, 0.02, -0.21, 0.085, 0.1, 0.39, dark);
    box(root, 0, 0.205, -0.18, 0.086, 0.068, 0.18, steel);
    box(root, 0, 0.227, -0.191, 0.039, 0.017, 0.106, glow);
    for (let i = 0; i < 5; i++)
      box(root, 0.147, 0.035, -0.34 + i * 0.057, 0.01, 0.04, 0.027, brass);
    const rocket = cylinder(magazine, 0, 0.055, 0.115, 0.086, 0.28, brass, 12);
    rocket.rotation.x = Math.PI / 2;
    box(root, 0, 0.03, 0.35, 0.18, 0.19, 0.14, rubber);
  } else if (id === "plasma") {
    box(root, 0, 0.036, -0.28, 0.19, 0.17, 0.28, steel);
    barrel(0, 0.045, -0.49, 0.073, 0.27, dark);
    barrel(0, 0.045, -0.64, 0.088, 0.058, silver);
    for (const x of [-0.104, 0.104]) {
      box(root, x, 0.049, -0.333, 0.035, 0.12, 0.31, dark);
      for (let i = 0; i < 5; i++)
        box(root, x * 1.18, 0.049, -0.438 + i * 0.054, 0.02, 0.07, 0.028, glow);
    }
    cylinder(magazine, 0, -0.15, -0.03, 0.074, 0.22, steel, 16);
    for (const y of [-0.22, -0.15, -0.08])
      cylinder(magazine, 0, y, -0.03, 0.076, 0.024, glow, 16);
    for (let i = 0; i < 3; i++) {
      const ring = mesh(
        chamber,
        new THREE.TorusGeometry(0.077, 0.013, 6, 20),
        glow,
        0,
        0.045,
        -0.44 + i * 0.055,
      );
      ring.rotation.y = 0.15;
    }
    box(root, 0, 0.15, -0.1, 0.075, 0.055, 0.12, dark);
    box(root, 0, 0.178, -0.1, 0.045, 0.018, 0.075, glow);
  } else if (id === "rail") {
    barrel(0, 0.042, -0.63, 0.027, 0.92, dark);
    for (const side of [-1, 1]) {
      box(root, side * 0.052, 0.048, -0.599, 0.034, 0.082, 0.68, steel);
      box(root, side * 0.074, 0.053, -0.591, 0.009, 0.035, 0.57, glow);
    }
    for (const z of [-0.29, -0.48, -0.69, -0.9])
      box(root, 0, 0.047, z, 0.169, 0.11, 0.027, dark);
    const scope = barrel(0, 0.184, -0.166, 0.045, 0.28, dark);
    scope.position.y = 0.185;
    const lens = cylinder(root, 0, 0.185, -0.314, 0.036, 0.013, glow, 16);
    lens.rotation.x = Math.PI / 2;
    box(root, 0, 0.128, -0.119, 0.035, 0.08, 0.09, silver);
    box(magazine, 0, -0.112, -0.03, 0.107, 0.15, 0.105, brass);
    box(root, 0.099, 0.011, -0.037, 0.025, 0.054, 0.11, glow);
  } else {
    barrel(0, 0.059, -0.425, 0.077, 0.37, steel);
    barrel(0, 0.059, -0.63, 0.084, 0.071, dark);
    const drum = cylinder(chamber, 0, -0.018, -0.082, 0.142, 0.21, dark, 18);
    drum.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const theta = (i * Math.PI) / 3;
      const shell = cylinder(
        chamber,
        Math.sin(theta) * 0.106,
        Math.cos(theta) * 0.106 - 0.018,
        -0.084,
        0.032,
        0.223,
        brass,
        10,
      );
      shell.rotation.x = Math.PI / 2;
    }
    box(root, 0, 0.181, -0.125, 0.04, 0.04, 0.29, steel);
    box(root, 0, 0.208, -0.255, 0.02, 0.025, 0.038, glow);
    box(slide, 0, -0.045, -0.402, 0.152, 0.09, 0.15, rubber);
  }
  for (const part of [magazine, slide, chamber, root]) batch(part);
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = false;
  });
  return {
    root,
    magazine,
    slide,
    chamber,
    muzzle: new THREE.Vector3(
      0,
      0.04,
      id === "rail"
        ? -1.12
        : id === "carbine" || id === "shotgun"
          ? -0.79
          : -0.73,
    ),
  };
}
export function animateWeapon(
  model: WeaponModel,
  id: WeaponId,
  reload: number,
  flash: number,
  time: number,
) {
  const progress = reload > 0 ? 1 - reload / WEAPONS[id].reload : 0;
  const motion = Math.sin(Math.PI * progress),
    detach = Math.sin(
      Math.PI * Math.min(1, Math.max(0, (progress - 0.13) / 0.68)),
    );
  model.magazine.position.set(
    0,
    -detach * 0.28,
    id === "rocket" ? detach * 0.35 : detach * 0.08,
  );
  model.magazine.rotation.x = id === "rocket" ? detach * 0.5 : detach * 0.17;
  model.slide.position.z =
    id === "shotgun"
      ? Math.sin(Math.min(1, Math.max(0, flash / 0.08)) * Math.PI) * 0.085
      : flash * 0.22;
  model.chamber.rotation.z =
    id === "grenade" ? motion * 0.8 : id === "plasma" ? time * 0.7 : 0;
  model.chamber.position.x = id === "grenade" ? motion * 0.13 : 0;
}

type RigPart =
  | "hips"
  | "spine"
  | "neck"
  | "head"
  | "leftArm"
  | "rightArm"
  | "leftForearm"
  | "rightForearm"
  | "leftThigh"
  | "rightThigh"
  | "leftShin"
  | "rightShin"
  | "leftFoot"
  | "rightFoot";
export type CharacterRig = {
  root: THREE.Group;
  bones: Record<RigPart, THREE.Bone>;
  skin: THREE.SkinnedMesh;
  materials: THREE.MeshStandardMaterial[];
  weapon: WeaponModel;
  weaponId: WeaponId;
  weaponMount: THREE.Group;
  shield: THREE.Mesh;
  jet: THREE.Group;
  shadow: THREE.Mesh;
  lastWalk: number;
  locomotion: number;
  death: number;
  spawn: number;
};
/** Original 1.72 m armored operator. One skin with rigid bone weights keeps the
 * rounded anatomy, fingers and layered gear at only five character draw calls. */
export function characterModel(
  human: boolean,
  lowDetail = false,
): CharacterRig {
  const anatomy = (...args: Parameters<typeof ellipsoid>) => {
    args[8] = lowDetail ? 8 : (args[8] ?? 16);
    return ellipsoid(...args);
  };
  const root = new THREE.Group();
  const materials = [
    material(0x414c4f, 0.04, 0.89),
    material(human ? 0x607c83 : 0x716d60, 0.45, 0.56),
    material(0x141d25, 0.28, 0.62),
    material(0xb8b6a4, 0.68, 0.4),
    material(
      human ? 0x86cbd5 : 0xddae78,
      0.8,
      0.14,
      human ? 0x123e47 : 0x3a2010,
      0.4,
    ),
  ];
  for (const mat of materials) {
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <skinbase_vertex>",
          "#ifdef USE_SKINNING\nmat4 boneMatX=getBoneMatrix(skinIndex.x);\n#endif",
        )
        .replace(
          "#include <skinning_vertex>",
          "#ifdef USE_SKINNING\ntransformed=(bindMatrixInverse*boneMatX*bindMatrix*vec4(transformed,1.0)).xyz;\n#endif",
        )
        .replace(
          "#include <skinnormal_vertex>",
          "#ifdef USE_SKINNING\nmat4 skinMatrix=bindMatrixInverse*boneMatX*bindMatrix;objectNormal=(skinMatrix*vec4(objectNormal,0.0)).xyz;\n#ifdef USE_TANGENT\nobjectTangent=(skinMatrix*vec4(objectTangent,0.0)).xyz;\n#endif\n#endif",
        );
    };
    mat.customProgramCacheKey = () => "rift-rigid-skin-v1";
  }
  const [cloth, armor, dark, trim, visor] = materials;
  const bones = {} as Record<RigPart, THREE.Bone>;
  const createBone = (
    name: RigPart,
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
  ) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    parent.add(b);
    bones[name] = b;
    return b;
  };
  const hips = createBone("hips", root, 0, 0.81, 0),
    spine = createBone("spine", hips, 0, 0.18, 0),
    neck = createBone("neck", spine, 0, 0.385, 0),
    head = createBone("head", neck, 0, 0.075, 0);
  const sections: { part: THREE.Bone; group: THREE.Group }[] = [];
  const section = (part: THREE.Bone) => {
    const group = new THREE.Group();
    part.add(group);
    sections.push({ part, group });
    return group;
  };
  const pelvis = section(hips);
  anatomy(pelvis, 0, 0.008, 0, 0.355, 0.26, 0.265, cloth);
  box(pelvis, 0, 0.057, -0.107, 0.31, 0.065, 0.051, dark);
  box(pelvis, 0, 0.059, -0.142, 0.063, 0.05, 0.025, trim);
  for (const side of [-1, 1]) {
    box(
      pelvis,
      side * 0.154,
      0.019,
      -0.072,
      0.078,
      0.13,
      0.104,
      armor,
    ).rotation.z = side * 0.12;
    box(pelvis, side * 0.153, -0.021, 0.09, 0.08, 0.13, 0.075, dark);
  }
  const torso = section(spine);
  anatomy(torso, 0, 0.105, 0, 0.435, 0.505, 0.29, cloth);
  anatomy(torso, 0, 0.182, -0.09, 0.405, 0.32, 0.175, armor);
  anatomy(torso, 0, 0.18, 0.1, 0.35, 0.32, 0.125, armor);
  for (const side of [-1, 1]) {
    const strap = box(
      torso,
      side * 0.147,
      0.213,
      -0.144,
      0.043,
      0.285,
      0.025,
      dark,
    );
    strap.rotation.z = side * -0.18;
    anatomy(torso, side * 0.099, 0.194, -0.173, 0.148, 0.175, 0.035, armor);
    box(torso, side * 0.112, 0.047, -0.148, 0.091, 0.111, 0.07, dark);
    box(torso, side * 0.112, 0.07, -0.189, 0.065, 0.021, 0.011, trim);
  }
  for (let i = 0; i < 3; i++)
    anatomy(
      torso,
      0,
      -0.025 + i * 0.053,
      -0.11,
      0.26 - i * 0.015,
      0.047,
      0.058,
      dark,
    );
  box(torso, 0, 0.294, -0.159, 0.075, 0.025, 0.012, trim);
  box(torso, 0, 0.252, -0.183, 0.037, 0.014, 0.009, visor);
  // Backpack is a compact life-support unit, with real two-nozzle jet hardware.
  box(torso, 0, 0.193, 0.185, 0.231, 0.265, 0.132, dark);
  box(torso, 0, 0.222, 0.261, 0.175, 0.16, 0.032, armor);
  for (const side of [-1, 1]) {
    const tank = cylinder(torso, side * 0.136, 0.18, 0.194, 0.051, 0.225, trim);
    tank.rotation.x = 0.13;
    cylinder(torso, side * 0.136, 0.045, 0.215, 0.042, 0.055, dark, 12);
  }
  const collar = section(neck);
  cylinder(collar, 0, 0.019, 0, 0.091, 0.142, cloth, 14);
  anatomy(collar, 0, -0.017, 0.002, 0.26, 0.073, 0.225, dark);
  const helmet = section(head);
  anatomy(helmet, 0, 0.092, 0.007, 0.245, 0.285, 0.255, armor, 20);
  anatomy(helmet, 0, 0.098, -0.107, 0.217, 0.108, 0.066, visor, 20);
  anatomy(helmet, 0, 0.021, -0.104, 0.131, 0.07, 0.072, dark);
  for (const side of [-1, 1]) {
    anatomy(helmet, side * 0.108, 0.087, 0, 0.055, 0.11, 0.104, dark);
    box(helmet, side * 0.12, 0.11, -0.02, 0.026, 0.025, 0.065, trim);
  }
  anatomy(helmet, 0, 0.205, 0.008, 0.097, 0.025, 0.166, dark);
  for (let i = -1; i <= 1; i++)
    box(helmet, i * 0.028, 0.021, -0.151, 0.012, 0.03, 0.01, trim);
  for (const [side, prefix] of [
    [-1, "left"],
    [1, "right"],
  ] as const) {
    const upper = createBone(`${prefix}Arm`, spine, side * 0.234, 0.31, 0),
      fore = createBone(`${prefix}Forearm`, upper, 0, -0.265, 0);
    const arm = section(upper);
    capsule(arm, 0, -0.111, 0, 0.079, 0.28, cloth);
    anatomy(arm, side * 0.017, -0.018, 0, 0.182, 0.18, 0.185, armor);
    anatomy(arm, 0, -0.139, -0.031, 0.128, 0.156, 0.113, armor);
    anatomy(arm, 0, -0.251, 0, 0.132, 0.105, 0.119, dark);
    const lower = section(fore);
    capsule(lower, 0, -0.12, 0, 0.062, 0.27, cloth);
    anatomy(lower, 0, -0.121, -0.025, 0.119, 0.179, 0.115, armor);
    box(lower, 0, -0.229, 0, 0.108, 0.046, 0.102, dark);
    anatomy(lower, 0, -0.281, -0.018, 0.1, 0.103, 0.069, dark);
    for (let i = 0; i < 4; i++) {
      const finger = capsule(
        lower,
        -0.032 + i * 0.021,
        -0.324,
        -0.026,
        0.012,
        0.066,
        dark,
      );
      finger.rotation.x = 0.42;
    }
    capsule(
      lower,
      side * -0.048,
      -0.281,
      -0.038,
      0.016,
      0.069,
      dark,
    ).rotation.z = side * 0.4;
    const thigh = createBone(`${prefix}Thigh`, hips, side * 0.106, -0.062, 0),
      shin = createBone(`${prefix}Shin`, thigh, 0, -0.351, 0),
      foot = createBone(`${prefix}Foot`, shin, 0, -0.319, 0);
    const thighMesh = section(thigh);
    capsule(thighMesh, 0, -0.151, 0, 0.095, 0.37, cloth);
    anatomy(thighMesh, side * 0.014, -0.132, -0.053, 0.155, 0.23, 0.106, armor);
    box(thighMesh, side * 0.076, -0.183, 0.003, 0.064, 0.14, 0.13, dark);
    const shinMesh = section(shin);
    anatomy(shinMesh, 0, 0.002, -0.049, 0.14, 0.12, 0.093, armor);
    capsule(shinMesh, 0, -0.141, 0.01, 0.073, 0.34, cloth);
    anatomy(shinMesh, 0, -0.142, -0.035, 0.121, 0.213, 0.095, armor);
    box(shinMesh, 0, -0.258, -0.013, 0.137, 0.043, 0.133, dark);
    const boot = section(foot);
    anatomy(boot, 0, -0.019, -0.041, 0.164, 0.135, 0.252, dark);
    box(boot, 0, -0.07, -0.048, 0.16, 0.042, 0.247, cloth);
    anatomy(boot, 0, -0.016, -0.116, 0.152, 0.069, 0.107, armor);
    for (let i = 0; i < 3; i++)
      box(
        boot,
        0,
        0.008 + i * 0.022,
        -0.055 + i * 0.018,
        0.108,
        0.014,
        0.026,
        trim,
      );
  }
  root.updateMatrixWorld(true);
  const boneList = Object.values(bones),
    geometries: THREE.BufferGeometry[] = [];
  // Bind each sculpted rigid segment to its parent bone; soft capsule joints hide seams.
  for (let materialIndex = 0; materialIndex < materials.length; materialIndex++)
    for (const { part, group } of sections) {
      for (const object of group.children)
        if (
          object instanceof THREE.Mesh &&
          object.material === materials[materialIndex]
        ) {
          const g = object.geometry.index
            ? object.geometry.toNonIndexed()
            : object.geometry.clone();
          g.applyMatrix4(object.matrixWorld);
          const count = g.getAttribute("position").count;
          const indices = new Uint16Array(count * 4),
            weights = new Float32Array(count * 4);
          for (let i = 0; i < count; i++) {
            indices[i * 4] = boneList.indexOf(part);
            weights[i * 4] = 1;
          }
          g.setAttribute(
            "skinIndex",
            new THREE.Uint16BufferAttribute(indices, 4),
          );
          g.setAttribute(
            "skinWeight",
            new THREE.Float32BufferAttribute(weights, 4),
          );
          g.userData.materialIndex = materialIndex;
          geometries.push(g);
        }
    }
  const geometry = mergeGeometries(geometries)!;
  geometry.clearGroups();
  let offset = 0;
  for (const g of geometries) {
    const count = g.getAttribute("position").count;
    geometry.addGroup(offset, count, g.userData.materialIndex);
    offset += count;
    g.dispose();
  }
  // Consecutive material groups become a single draw call per material.
  const mergedGroups: {
    start: number;
    count: number;
    materialIndex: number;
  }[] = [];
  for (const g of geometry.groups) {
    const last = mergedGroups.at(-1);
    if (last && last.materialIndex === g.materialIndex) last.count += g.count;
    else mergedGroups.push({ ...g, materialIndex: g.materialIndex! });
  }
  geometry.groups = mergedGroups;
  for (const { group } of sections) {
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    group.removeFromParent();
  }
  const skin = new THREE.SkinnedMesh(geometry, materials);
  skin.frustumCulled = false;
  skin.castShadow = false;
  skin.receiveShadow = true;
  root.add(skin);
  skin.bind(new THREE.Skeleton(boneList));
  const weaponMount = new THREE.Group();
  spine.add(weaponMount);
  weaponMount.position.set(0.14, 0.061, -0.335);
  weaponMount.scale.setScalar(0.66);
  const weapon = weaponModel("carbine");
  weaponMount.add(weapon.root);
  const shield = mesh(
    root,
    new THREE.TorusGeometry(0.47, 0.016, 5, 28),
    new THREE.MeshBasicMaterial({
      color: 0x83dbce,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
    0,
    0.034,
    0,
  );
  shield.rotation.x = Math.PI / 2;
  const shadow = mesh(
    root,
    new THREE.CircleGeometry(0.36, 20),
    new THREE.MeshBasicMaterial({
      color: 0x07121c,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    0,
    0.012,
    0,
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.castShadow = false;
  const jet = new THREE.Group();
  jet.position.set(0, 1.02, 0.22);
  root.add(jet);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x8adfff,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  for (const side of [-1, 1]) {
    const flame = mesh(
      jet,
      new THREE.ConeGeometry(0.07, 0.43, 8),
      flameMat,
      side * 0.136,
      -0.13,
      0,
    );
    flame.rotation.z = Math.PI;
  }
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = false;
  });
  return {
    root,
    bones,
    skin,
    materials,
    weapon,
    weaponId: "carbine",
    weaponMount,
    shield,
    shadow,
    jet,
    lastWalk: 0,
    locomotion: 0,
    death: 0,
    spawn: -1,
  };
}
export function poseCharacter(
  rig: CharacterRig,
  a: Actor,
  dt: number,
  now: number,
  distance: number,
) {
  const b = rig.bones,
    alive = a.hp > 0,
    sprint = a.sprinting,
    airborne = !a.grounded;
  const speed = Math.abs(a.walk - rig.lastWalk) / Math.max(0.001, dt);
  rig.lastWalk = a.walk;
  rig.locomotion +=
    ((alive && speed > 0.03 ? 1 : 0) - rig.locomotion) *
    (1 - Math.exp(-dt * 12));
  if (rig.spawn !== a.spawnCount) {
    rig.spawn = a.spawnCount;
    rig.death = 0;
  }
  rig.death += alive ? 0 : dt;
  const gait = a.walk * 3.7,
    amplitude = rig.locomotion * (sprint ? 0.71 : 0.44),
    stride = Math.sin(gait) * amplitude;
  b.hips.position.y = 0.81 + Math.cos(gait * 2) * 0.018 * rig.locomotion;
  b.hips.rotation.set(
    0,
    Math.sin(gait) * 0.035 * rig.locomotion,
    Math.sin(gait) * 0.021 * rig.locomotion,
  );
  b.spine.rotation.set(
    sprint ? -0.11 : 0,
    -b.hips.rotation.y * 0.6,
    Math.sin(gait) * 0.012 * rig.locomotion,
  );
  b.neck.rotation.x = a.pitch * 0.36;
  b.head.rotation.x = a.pitch * 0.26;
  b.leftThigh.rotation.x = airborne ? -0.32 : stride;
  b.rightThigh.rotation.x = airborne ? 0.23 : -stride;
  b.leftShin.rotation.x = airborne
    ? -0.66
    : -Math.max(0, -Math.sin(gait)) * 0.85 * rig.locomotion;
  b.rightShin.rotation.x = airborne
    ? -0.41
    : -Math.max(0, Math.sin(gait)) * 0.85 * rig.locomotion;
  b.leftFoot.rotation.x = -b.leftShin.rotation.x * 0.42;
  b.rightFoot.rotation.x = -b.rightShin.rotation.x * 0.42;
  b.leftArm.rotation.set(0.66 + a.pitch * 0.55, 0, -0.32);
  b.rightArm.rotation.set(0.53 + a.pitch * 0.55, 0, 0.15);
  b.leftForearm.rotation.set(1.02, 0, 0.28);
  b.rightForearm.rotation.set(1.11, 0, -0.1);
  const reload =
    a.reloading > 0
      ? Math.sin(Math.PI * (1 - a.reloading / WEAPONS[a.weapon].reload))
      : 0;
  b.leftArm.rotation.x -= reload * 0.65;
  b.leftForearm.rotation.x -= reload * 0.45;
  b.rightArm.rotation.z += reload * 0.12;
  rig.weaponMount.rotation.set(
    a.pitch * 0.85 + a.flash * 0.7,
    0,
    -reload * 0.15,
  );
  rig.weaponMount.position.y = 0.061 - reload * 0.065;
  if (rig.weaponId !== a.weapon) {
    disposeObject(rig.weapon.root);
    rig.weapon = weaponModel(a.weapon);
    rig.weaponId = a.weapon;
    rig.weaponMount.add(rig.weapon.root);
  }
  animateWeapon(rig.weapon, a.weapon, a.reloading, a.flash, now / 1000);
  // The cloak has counterplay: close targets distort faintly and shooting reveals them.
  const cloaked = a.perks.invisibility > 0 && a.revealed <= 0;
  rig.root.visible = alive || rig.death < 1.8;
  if (cloaked && distance > 7) rig.root.visible = false;
  const opacity = cloaked
    ? Math.max(0.09, 0.31 - distance * 0.029)
    : alive
      ? 1
      : Math.max(0, 1 - (rig.death - 0.7) / 1.1);
  for (const mat of rig.materials) {
    mat.transparent = opacity < 1;
    mat.opacity = opacity;
    mat.depthWrite = opacity > 0.85;
    mat.emissive.setHex(a.hit > 0 ? 0x641d0a : cloaked ? 0x1b708c : 0);
    mat.emissiveIntensity = cloaked ? 0.7 : 0.4;
  }
  rig.weapon.root.visible = !cloaked;
  rig.shadow.visible = alive && !cloaked && a.grounded;
  rig.shield.visible = a.protected > 0 && !cloaked;
  rig.jet.visible = a.thrusting && !cloaked;
  rig.jet.scale.y = 0.8 + Math.sin(now * 0.065) * 0.18;
  if (!alive) {
    const fall = Math.min(1, rig.death * 2.7);
    b.hips.position.y = 0.81 - fall * 0.59;
    b.hips.rotation.x = -fall * 1.36;
    b.leftThigh.rotation.x = 0.12;
    b.rightThigh.rotation.x = -0.19;
    b.leftShin.rotation.x = 0.65;
    b.rightShin.rotation.x = 0.4;
    b.leftArm.rotation.z = -0.5 - fall * 0.4;
    b.rightArm.rotation.z = 0.45 + fall * 0.32;
    rig.weapon.root.visible = rig.death < 0.8;
  }
}
export type ViewHands = {
  root: THREE.Group;
  left: THREE.Group;
  right: THREE.Group;
};
export function viewHands(): ViewHands {
  const root = new THREE.Group(),
    left = new THREE.Group(),
    right = new THREE.Group();
  root.add(left, right);
  const fabric = material(0x34474d, 0.05, 0.83),
    armor = material(0x718387, 0.6, 0.42),
    glove = material(0x263038, 0.05, 0.8),
    trim = material(0xb6b5a4, 0.65, 0.44);
  for (const [side, group] of [
    [-1, left],
    [1, right],
  ] as const) {
    const forearm = capsule(group, 0, -0.31, 0.085, 0.061, 0.56, fabric);
    forearm.rotation.x = -0.53;
    const plate = ellipsoid(
      group,
      side * 0.014,
      -0.196,
      0.027,
      0.135,
      0.23,
      0.118,
      armor,
    );
    plate.rotation.x = -0.53;
    const wrist = box(group, 0, -0.069, 0.0, 0.12, 0.054, 0.108, glove);
    wrist.rotation.x = -0.3;
    ellipsoid(group, 0, -0.006, -0.023, 0.114, 0.139, 0.077, glove);
    for (let i = 0; i < 4; i++) {
      const finger = capsule(
        group,
        -0.037 + i * 0.024,
        0.035,
        -0.052,
        0.014,
        0.082,
        glove,
      );
      finger.rotation.x = -0.85;
      ellipsoid(
        group,
        -0.037 + i * 0.024,
        0.032,
        -0.035,
        0.019,
        0.027,
        0.016,
        trim,
      );
    }
    capsule(
      group,
      side * -0.057,
      -0.002,
      -0.056,
      0.019,
      0.086,
      glove,
    ).rotation.z = side * 0.55;
    for (let i = 0; i < 3; i++)
      box(group, 0, -0.166 - i * 0.038, -0.033, 0.101, 0.009, 0.016, glove);
    batch(group);
  }
  right.position.set(0.047, -0.105, 0.108);
  right.rotation.set(-0.1, 0, -0.12);
  left.position.set(-0.053, -0.119, -0.3);
  left.rotation.set(-0.55, 0, -0.56);
  return { root, left, right };
}
