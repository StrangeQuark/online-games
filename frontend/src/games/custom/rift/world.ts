import * as THREE from "three";
import { getMap, railParts, type ArenaMap, type MapId } from "./map";
import { batch, box, cylinder, material, mesh } from "./models";
export const THEMES = {
  foundry: {
    sky: 0x24373c,
    fog: 0x35464b,
    stone: 0x80918e,
    metal: 0x52696e,
    dark: 0x22363d,
    trim: 0xb59a70,
    light: 0x9de9cd,
    warm: 0xffb570,
    sun: 0xdce7d1,
    ground: 0x738180,
  },
  aqueduct: {
    sky: 0x9dbdc0,
    fog: 0xa6c3bb,
    stone: 0x96988a,
    metal: 0x647971,
    dark: 0x424f4e,
    trim: 0xa5ac94,
    light: 0x9bddd5,
    warm: 0xdce6ad,
    sun: 0xf3e9c8,
    ground: 0x84958e,
  },
  citadel: {
    sky: 0xa77665,
    fog: 0x936d61,
    stone: 0xba9774,
    metal: 0x7e776f,
    dark: 0x514741,
    trim: 0xdbb77b,
    light: 0xf8ba68,
    warm: 0xffd591,
    sun: 0xffd3a0,
    ground: 0xb09c84,
  },
  orbital: {
    sky: 0x091525,
    fog: 0x192d42,
    stone: 0xc8d4d4,
    metal: 0x819aa6,
    dark: 0x27394a,
    trim: 0x91bac8,
    light: 0x8aceff,
    warm: 0xffb68a,
    sun: 0xdbedff,
    ground: 0x90a4ac,
  },
};
function surface(kind: "metal" | "floor" | "stone", theme: MapId) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const stone =
    kind === "stone" && (theme === "aqueduct" || theme === "citadel");
  ctx.fillStyle = stone
    ? theme === "aqueduct"
      ? "#a3a399"
      : "#c7b197"
    : kind === "floor"
      ? theme === "orbital"
        ? "#ced9de"
        : "#acb7b3"
      : "#b5beb9";
  ctx.fillRect(0, 0, 512, 512);
  let seed = 31;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  if (stone) {
    for (let row = 0; row < 4; row++)
      for (let col = -1; col < 4; col++) {
        const x = col * 172 + (row % 2) * 86,
          y = row * 128;
        ctx.fillStyle = `rgba(29,40,36,${0.08 + random() * 0.1})`;
        ctx.fillRect(x + 3, y + 3, 166, 121);
        ctx.fillStyle = `rgba(230,222,195,${0.3 + random() * 0.2})`;
        ctx.fillRect(x + 6, y + 5, 159, 116);
        ctx.strokeStyle = "#333b342e";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 10, y + 9, 151, 109);
      }
  } else {
    ctx.strokeStyle = kind === "floor" ? "#1b303a" : "#465b65";
    ctx.lineWidth = 7;
    ctx.strokeRect(3, 3, 506, 506);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#edf3e080";
    ctx.strokeRect(13, 13, 486, 486);
    ctx.strokeStyle = "#3349515b";
    ctx.strokeRect(18, 18, 476, 476);
    if (kind === "floor") {
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = "#2b414a2e";
        ctx.fillRect(68, 100 + i * 27, 376, 5);
      }
      for (const x of [32, 480])
        for (const y of [32, 480]) {
          ctx.fillStyle = "#374950";
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#d5dfd3";
          ctx.fillRect(x - 2, y - 1, 4, 1);
        }
    } else
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = "#253c431c";
        ctx.fillRect(52, 89 + i * 42, 408, 13);
      }
  }
  for (let i = 0; i < 12500; i++) {
    const x = random() * 512,
      y = random() * 512;
    ctx.fillStyle = i % 2 ? "#ffffff0b" : "#07182113";
    ctx.fillRect(x, y, 1 + random() * 4, stone ? random() * 3 : 1);
  }
  if (theme === "aqueduct") {
    for (let i = 0; i < 350; i++) {
      const x = random() * 512,
        y = random() * 512;
      ctx.fillStyle = "#394f2730";
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        random() * 10,
        random() * 4,
        random() * 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}
function worldUV(object: THREE.Mesh, scale = 3) {
  const geometry = object.geometry,
    positions = geometry.getAttribute("position"),
    normals = geometry.getAttribute("normal"),
    uv = geometry.getAttribute("uv");
  if (!uv) return;
  for (let i = 0; i < positions.count; i++) {
    const nx = Math.abs(normals.getX(i)),
      ny = Math.abs(normals.getY(i)),
      nz = Math.abs(normals.getZ(i));
    uv.setXY(
      i,
      (nx > ny && nx > nz ? positions.getZ(i) : positions.getX(i)) / scale,
      (ny > nx && ny > nz ? positions.getZ(i) : positions.getY(i)) / scale,
    );
  }
  uv.needsUpdate = true;
}
function sign(text: string, sub: string, color: string) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#101f28";
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = color;
  ctx.fillRect(20, 20, 10, 216);
  ctx.font = "bold 66px sans-serif";
  ctx.fillText(text, 62, 120);
  ctx.fillStyle = "#bac6c4";
  ctx.font = "23px monospace";
  ctx.fillText(sub, 65, 186);
  ctx.strokeStyle = color;
  ctx.strokeRect(45, 30, 948, 199);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function addRamp(
  world: THREE.Group,
  ramp: ArenaMap["ramps"][number],
  main: THREE.Material,
  trim: THREE.Material,
  dark: THREE.Material,
) {
  const group = new THREE.Group();
  group.position.set(ramp.x, ramp.bottom ?? 0, ramp.z);
  // Local +Z is the low end. Rotate the entire shared physical wedge to its rise axis.
  const axis = ramp.axis ?? "z",
    direction = ramp.direction ?? -1;
  group.rotation.y =
    axis === "x"
      ? direction === 1
        ? -Math.PI / 2
        : Math.PI / 2
      : direction === 1
        ? Math.PI
        : 0;
  const width = axis === "x" ? ramp.d : ramp.w,
    depth = axis === "x" ? ramp.w : ramp.d,
    top = ramp.top - (ramp.bottom ?? 0);
  world.add(group);
  if ((ramp.bottom ?? 0) > 0)
    box(
      world,
      ramp.x,
      (ramp.bottom ?? 0) / 2,
      ramp.z,
      ramp.w,
      ramp.bottom!,
      ramp.d,
      main,
      0,
    );
  if (ramp.steps) {
    for (let i = 0; i < ramp.steps; i++) {
      const h = (top * (i + 1)) / ramp.steps,
        z = depth / 2 - (depth * (i + 0.5)) / ramp.steps;
      box(group, 0, h / 2, z, width, h, depth / ramp.steps, main, 0.012);
      box(
        group,
        0,
        h + 0.013,
        z + depth / ramp.steps / 2 - 0.04,
        width,
        0.025,
        0.07,
        trim,
        0,
      );
    }
  } else {
    const w = width / 2,
      d = depth / 2,
      h = top;
    const positions = [
      -w,
      0,
      d,
      w,
      0,
      d,
      -w,
      h,
      -d,
      w,
      0,
      d,
      w,
      h,
      -d,
      -w,
      h,
      -d,
      -w,
      0,
      d,
      -w,
      h,
      -d,
      -w,
      0,
      -d,
      w,
      0,
      d,
      w,
      0,
      -d,
      w,
      h,
      -d,
      -w,
      0,
      -d,
      -w,
      h,
      -d,
      w,
      h,
      -d,
      -w,
      0,
      -d,
      w,
      h,
      -d,
      w,
      0,
      -d,
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const uv = [];
    for (let i = 0; i < positions.length; i += 3)
      uv.push((positions[i] + w) / width, (positions[i + 2] + d) / depth);
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    mesh(group, g, main);
    const length = Math.hypot(depth, h),
      angle = Math.atan2(h, depth);
    for (const side of [-1, 1])
      box(
        group,
        side * (w - 0.16),
        h / 2 + 0.025,
        0,
        0.1,
        0.035,
        length,
        trim,
      ).rotation.x = angle;
    for (let i = 1; i < Math.ceil(depth / 0.9); i++) {
      const t = i / Math.ceil(depth / 0.9);
      box(
        group,
        0,
        h * t + 0.025,
        d - depth * t,
        width - 0.5,
        0.035,
        0.045,
        dark,
        0,
      ).rotation.x = angle;
    }
  }
  batch(group);
}
export type World = {
  root: THREE.Group;
  map: ArenaMap;
  water: THREE.Mesh[];
  dust: THREE.Points;
};
export function createWorld(id: MapId): World {
  const map = getMap(id),
    theme = THEMES[id],
    root = new THREE.Group();
  root.name = `arena-${id}`;
  const steel = material(
      theme.metal,
      id === "citadel" || id === "aqueduct" ? 0.22 : 0.64,
      0.55,
    ),
    dark = material(theme.dark, 0.4, 0.68),
    trim = material(theme.trim, 0.55, 0.42),
    stone = material(theme.stone, id === "orbital" ? 0.4 : 0.03, 0.85),
    glow = material(theme.light, 0.2, 0.3, theme.light, 2);
  steel.map = surface("metal", id);
  stone.map = surface("stone", id);
  const floorMap = surface(
    id === "aqueduct" || id === "citadel" ? "stone" : "floor",
    id,
  );
  floorMap.repeat.set(map.width / 3, map.depth / 3);
  const floor = material(
    theme.ground,
    id === "orbital" ? 0.52 : id === "foundry" ? 0.36 : 0.05,
    0.78,
  );
  floor.map = floorMap;
  const deck = material(theme.ground, id === "orbital" ? 0.5 : 0.15, 0.73);
  deck.map = surface(
    id === "aqueduct" || id === "citadel" ? "stone" : "floor",
    id,
  );
  deck.map.repeat.set(1, 1);
  box(root, 0, -0.18, 0, map.width, 0.36, map.depth, floor, 0);
  for (const s of map.solids) {
    if (s.kind === "rail") {
      railParts(s).forEach((part, i) =>
        box(
          root,
          part.x,
          (part.bottom + part.top) / 2,
          part.z,
          part.w,
          part.top - part.bottom,
          part.d,
          i ? dark : trim,
          0.012,
        ),
      );
      continue;
    }
    const m =
      s.kind === "wall"
        ? stone
        : s.kind === "deck"
          ? deck
          : s.kind === "reactor"
            ? dark
            : steel;
    worldUV(
      box(
        root,
        s.x,
        (s.bottom + s.top) / 2,
        s.z,
        s.w,
        s.top - s.bottom,
        s.d,
        m,
        s.kind === "wall" ? 0 : 0.035,
      ),
    );
    if (s.kind === "deck") {
      for (const side of [-1, 1]) {
        box(
          root,
          s.x,
          s.top - 0.04,
          s.z + side * (s.d / 2 - 0.04),
          s.w,
          0.1,
          0.085,
          trim,
        );
        box(
          root,
          s.x + side * (s.w / 2 - 0.04),
          s.top - 0.04,
          s.z,
          0.085,
          0.1,
          s.d,
          trim,
        );
      }
      if (id === "orbital" || id === "foundry")
        for (const side of [-1, 1])
          box(
            root,
            s.x,
            s.bottom + 0.045,
            s.z + side * (s.d / 2 + 0.012),
            Math.max(0.1, s.w - 0.5),
            0.045,
            0.026,
            glow,
          );
    }
    if (s.kind === "cover") {
      const stoneCover = id === "citadel" || id === "aqueduct";
      box(root, s.x, s.top - 0.1, s.z, s.w + 0.025, 0.11, s.d + 0.025, trim);
      box(
        root,
        s.x,
        s.bottom + 0.09,
        s.z,
        s.w + 0.025,
        0.12,
        s.d + 0.025,
        dark,
      );
      for (const side of [-1, 1]) {
        box(
          root,
          s.x + side * (s.w / 2 + 0.012),
          (s.bottom + s.top) / 2,
          s.z,
          0.025,
          (s.top - s.bottom) * 0.62,
          s.d * 0.72,
          stoneCover ? stone : dark,
        );
        if (!stoneCover) {
          box(
            root,
            s.x + side * (s.w / 2 + 0.027),
            s.top - 0.35,
            s.z,
            0.025,
            0.055,
            s.d * 0.55,
            glow,
          );
          for (let i = 0; i < 4; i++)
            box(
              root,
              s.x + side * (s.w / 2 + 0.03),
              s.bottom + 0.4 + i * 0.15,
              s.z,
              0.016,
              0.025,
              s.d * 0.5,
              steel,
            );
        }
      }
      if (id === "citadel")
        for (const side of [-1, 1])
          box(
            root,
            s.x,
            s.top - 0.42,
            s.z + side * (s.d / 2 + 0.02),
            s.w * 0.48,
            0.16,
            0.045,
            trim,
          );
    }
    if (s.kind === "reactor") {
      for (const side of [-1, 1]) {
        box(
          root,
          s.x + side * (s.w / 2 + 0.025),
          (s.top + s.bottom) / 2,
          s.z,
          0.05,
          (s.top - s.bottom) * 0.6,
          s.d * 0.76,
          trim,
        );
        box(
          root,
          s.x + side * (s.w / 2 + 0.056),
          (s.top + s.bottom) / 2,
          s.z,
          0.027,
          (s.top - s.bottom) * 0.36,
          s.d * 0.67,
          glow,
        );
        for (let i = 0; i < 7; i++)
          box(
            root,
            s.x + side * (s.w / 2 + 0.08),
            (s.top + s.bottom) / 2,
            s.z - s.d * 0.32 + i * s.d * 0.106,
            0.05,
            (s.top - s.bottom) * 0.43,
            0.06,
            dark,
          );
      }
    }
  }
  for (const ramp of map.ramps)
    addRamp(
      root,
      ramp,
      id === "citadel" || id === "aqueduct" ? stone : steel,
      trim,
      dark,
    );
  const bannerMat = material(0x833e30, 0.03, 0.88),
    mountainMat = material(0x765a53, 0.02, 1);
  const halfW = map.width / 2,
    halfD = map.depth / 2,
    wallTop = Math.max(
      ...map.solids.filter((s) => s.kind === "wall").map((s) => s.top),
    );
  // Facade relief hugs existing walls. Every traversable gap remains truly open.
  for (const side of [-1, 1])
    for (let z = -halfD + 3; z < halfD; z += 6) {
      const x = side * (halfW - 0.43);
      box(root, x, wallTop * 0.5, z, 0.14, wallTop - 0.2, 0.58, dark);
      if (id === "aqueduct") {
        box(root, x - side * 0.035, wallTop - 0.85, z, 0.08, 0.11, 3.9, trim);
        for (let i = 0; i < 7; i++) {
          const a = (i * Math.PI) / 6;
          const stoneBlock = box(
            root,
            x - side * 0.06,
            3.7 + Math.sin(a) * 1.75,
            z + Math.cos(a) * 1.8,
            0.085,
            0.48,
            0.75,
            stone,
          );
          stoneBlock.rotation.x = a - Math.PI / 2;
        }
        box(root, x - side * 0.04, 1.8, z, 0.035, 2.8, 2.9, dark);
      } else if (id === "citadel") {
        box(
          root,
          x - side * 0.04,
          wallTop * 0.57,
          z,
          0.065,
          wallTop * 0.66,
          0.24,
          trim,
        );
        box(root, x, wallTop - 0.1, z, 0.4, 0.65, 1.2, stone);
        const banner = box(
          root,
          x - side * 0.1,
          wallTop * 0.66,
          z,
          0.025,
          2.6,
          1.0,
          bannerMat,
        );
        box(root, x - side * 0.12, wallTop * 0.67, z, 0.015, 1.7, 0.07, trim);
        banner.castShadow = false;
      } else {
        box(root, x - side * 0.04, wallTop * 0.62, z, 0.05, 1.7, 0.16, glow);
        box(root, x - side * 0.06, 0.28, z, 0.3, 0.45, 0.85, steel);
        for (const offset of [-1.75, 1.75])
          box(
            root,
            x - side * 0.025,
            wallTop * 0.46,
            z + offset,
            0.04,
            2.2,
            1.8,
            id === "orbital" ? dark : steel,
          );
      }
    }
  const title = mesh(
    root,
    new THREE.PlaneGeometry(9, 2.25),
    new THREE.MeshBasicMaterial({
      map: sign(
        map.name.toUpperCase(),
        map.subtitle.toUpperCase(),
        new THREE.Color(theme.light).getStyle(),
      ),
    }),
    0,
    wallTop - 1.7,
    -halfD + 0.53,
  );
  title.castShadow = false;
  for (const side of [-1, 1]) {
    const guide = mesh(
      root,
      new THREE.PlaneGeometry(4.8, 1.2),
      new THREE.MeshBasicMaterial({
        map: sign(
          side < 0 ? "WEST ACCESS" : "EAST ACCESS",
          id === "aqueduct"
            ? "CHANNEL WALK  /  UPPER BRIDGE"
            : id === "citadel"
              ? "RAMPART  /  COURTYARD"
              : id === "orbital"
                ? "DOCKING RING  /  OBSERVATORY"
                : "GALLERY  /  MAINTENANCE",
          new THREE.Color(theme.warm).getStyle(),
        ),
      }),
      side * (halfW - 0.52),
      3.3,
      halfD - 8,
    );
    guide.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    guide.castShadow = false;
  }
  const water: THREE.Mesh[] = [];
  if (id === "aqueduct") {
    const rippleMat = material(0x94bcb3, 0.2, 0.4),
      hillMat = material(0x4b726e, 0.02, 1);
    const waterMat = material(0x467b79, 0.6, 0.19, 0x203e38, 0.18);
    waterMat.transparent = true;
    waterMat.opacity = 0.8;
    for (const x of [-4.8, 4.8]) {
      const ribbon = mesh(
        root,
        new THREE.PlaneGeometry(3.8, map.depth - 1.3),
        waterMat,
        x,
        0.009,
        0,
      );
      ribbon.rotation.x = -Math.PI / 2;
      water.push(ribbon);
      for (let z = -halfD + 2; z < halfD; z += 1.3) {
        const ripple = box(root, x, 0.015, z, 2.2, 0.004, 0.015, rippleMat);
        ripple.rotation.y = Math.sin(z) * 0.08;
      }
    }
    for (let i = 0; i < 15; i++) {
      const x = Math.sin(i * 7.4) * (halfW + 12),
        z = -halfD - 12 - Math.abs(Math.cos(i * 2.5)) * 20;
      const hill = mesh(
        root,
        new THREE.ConeGeometry(7 + (i % 3) * 3, 12 + (i % 4) * 4, 7),
        hillMat,
        x,
        5,
        z,
      );
      hill.rotation.y = i;
    }
  }
  if (id === "foundry") {
    // The induction crown floats above the physical reactor without new cover.
    for (const y of [10.5, 11.1]) {
      const crown = mesh(
        root,
        new THREE.TorusGeometry(2.5, 0.14, 8, 48),
        trim,
        0,
        y,
        -3,
      );
      crown.rotation.x = Math.PI / 2;
      const halo = mesh(
        root,
        new THREE.TorusGeometry(2.2, 0.035, 6, 48),
        glow,
        0,
        y - 0.04,
        -3,
      );
      halo.rotation.x = Math.PI / 2;
    }
    for (const side of [-1, 1])
      for (const z of [-16, -4, 8, 20]) {
        const conduit = cylinder(
          root,
          side * (halfW - 0.38),
          wallTop - 0.65,
          z,
          0.09,
          8,
          trim,
        );
        conduit.rotation.x = Math.PI / 2;
      }
    for (let i = 0; i < 9; i++) {
      const x = -halfW - 7 - i * 2.5,
        z = -halfD + Math.sin(i * 7) * 20;
      cylinder(root, x, 9, z, 1.1, 18 + (i % 3) * 3, dark, 12);
      cylinder(root, x, 18 + (i % 3) * 1.5, z, 1.3, 0.45, trim, 12);
    }
  }
  if (id === "citadel") {
    for (const side of [-1, 1])
      for (const zSide of [-1, 1]) {
        const x = side * (halfW + 2.1),
          z = zSide * (halfD + 2.1);
        cylinder(root, x, 6, z, 3.0, 12, stone, 12);
        cylinder(root, x, 11.6, z, 3.28, 0.55, trim, 12);
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5;
          box(
            root,
            x + Math.cos(a) * 2.7,
            12.5,
            z + Math.sin(a) * 2.7,
            0.8,
            1.4,
            0.8,
            stone,
          );
        }
      }
    for (let i = 0; i < 13; i++) {
      const x = -42 + i * 7,
        z = -halfD - 22;
      mesh(
        root,
        new THREE.ConeGeometry(7 + (i % 3) * 3, 12 + (i % 4) * 5, 6),
        mountainMat,
        x,
        4,
        z,
      );
    }
  }
  if (id === "orbital") {
    // Distant orbital hulls and a planet provide scale outside the sealed arena.
    const planet = mesh(
      root,
      new THREE.SphereGeometry(28, 48, 24),
      material(0x7195bb, 0.02, 0.9, 0x142c44, 0.2),
      -55,
      42,
      -83,
    );
    planet.rotation.z = 0.3;
    const atmosphere = mesh(
      root,
      new THREE.SphereGeometry(28.7, 48, 24),
      new THREE.MeshBasicMaterial({
        color: 0x9abcf3,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      }),
      -55,
      42,
      -83,
    );
    atmosphere.castShadow = false;
    for (const side of [-1, 1]) {
      box(root, side * (halfW + 6), 4, 0, 5, 3, map.depth + 12, dark);
      for (let i = 0; i < 8; i++) {
        box(root, side * (halfW + 6), 5.7, -28 + i * 8, 4, 0.07, 3.8, steel);
        box(
          root,
          side * (halfW + 6),
          5.76,
          -28 + i * 8,
          3.5,
          0.03,
          0.055,
          glow,
        );
      }
    }
  }
  const dustPositions: number[] = [];
  for (let i = 0; i < (id === "orbital" ? 260 : 95); i++)
    dustPositions.push(
      Math.sin(i * 78.21) * (id === "orbital" ? 95 : halfW),
      id === "orbital" ? 18 + (i % 31) * 2 : 2 + (i % 17) * 0.55,
      Math.cos(i * 12.71) * (id === "orbital" ? 95 : halfD),
    );
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(dustPositions, 3),
  );
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: theme.light,
      size: id === "orbital" ? 0.15 : 0.026,
      transparent: true,
      opacity: id === "orbital" ? 0.7 : 0.32,
      depthWrite: false,
    }),
  );
  root.add(dust);
  // Material batches cover the complete immutable world while ramps retain their transform.
  batch(root);
  return { root, map, water, dust };
}
