import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  BLOCK,
  BUILDINGS,
  STREETS,
  LANDMARKS,
  isPark,
  TREES,
  onRoad,
  landmarkSign,
  signalGreen,
  type CityDrive,
} from "./city";
import { makeCar, mergeStaticMeshes, signTexture, surface } from "./models";
export type CameraMode = "chase" | "hood" | "orbit";
export type LightMode = "golden" | "day" | "blue";
export type SceneOptions = {
  paint: string;
  camera: CameraMode;
  light: LightMode;
  traffic: boolean;
  quality: "high" | "low";
  gentle: boolean;
};
export function createCityScene(canvas: HTMLCanvasElement) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color("#aec4cc");
  scene.fog = new T.Fog("#aec4cc", 180, 1000);
  const camera = new T.PerspectiveCamera(58, 1, 0.15, 1800);
  const skyMaterial = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new T.Color("#6d9caf") },
      bottom: { value: new T.Color("#e5d4b5") },
    },
    vertexShader:
      "varying vec3 direction; void main(){direction=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:
      "uniform vec3 top; uniform vec3 bottom; varying vec3 direction; void main(){float h=pow(max(normalize(direction).y,0.0),0.55);gl_FragColor=vec4(mix(bottom,top,h),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
  });
  const skyDome = new T.Mesh(new T.SphereGeometry(1550, 24, 16), skyMaterial);
  scene.add(skyDome);

  const pmrem = new T.PMREMGenerator(renderer),
    room = new RoomEnvironment(),
    env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.38;
  room.dispose();
  pmrem.dispose();
  const sun = new T.DirectionalLight("#ffe3b0", 3.2);
  sun.position.set(-150, 210, 90);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -95;
  sun.shadow.camera.right = 95;
  sun.shadow.camera.top = 95;
  sun.shadow.camera.bottom = -95;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 650;
  sun.shadow.normalBias = 0.12;
  sun.shadow.bias = -0.00008;
  scene.add(sun, sun.target);
  const ambient = new T.HemisphereLight("#cae4f0", "#796957", 2);
  scene.add(ambient);
  const mats: T.Material[] = [],
    textures: T.Texture[] = [];
  const material = (
    color: string,
    opts: Partial<T.MeshStandardMaterialParameters> = {},
  ) => {
    const m = new T.MeshStandardMaterial({ color, roughness: 0.85, ...opts });
    mats.push(m);
    return m;
  };
  const texture = (t: T.Texture) => {
    textures.push(t);
    return t;
  };
  const asphalt = texture(surface("asphalt"));
  asphalt.repeat.set(120, 120);
  const pavement = texture(surface("paving"));
  pavement.repeat.set(5, 5);
  const roadMat = material("#aeb6bd", { map: asphalt });
  const sidewalk = material("#ddd8c7", { map: pavement });
  const grass = material("#6d8660"),
    bark = material("#736050"),
    foliage = material("#628669"),
    leaves = material("#88a176");
  const dark = material("#3e5355"),
    white = material("#e8e1c9"),
    yellow = material("#d8b36e"),
    roof = material("#71817c");
  const water = material("#42858f", { roughness: 0.25, metalness: 0.35 });
  const batchData = new Map<
    string,
    {
      geo: T.BufferGeometry;
      mat: T.Material;
      matrices: T.Matrix4[];
      shadow: boolean;
    }
  >();
  const cube = new T.BoxGeometry(1, 1, 1),
    cylinder = new T.CylinderGeometry(0.5, 0.5, 1, 8),
    sphere = new T.IcosahedronGeometry(1, 1);
  const dummy = new T.Object3D();
  function batch(
    mat: T.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    geo: T.BufferGeometry = cube,
    rotation = 0,
    shadow = true,
  ) {
    const key = mat.uuid + geo.uuid + shadow;
    if (!batchData.has(key))
      batchData.set(key, { geo, mat, matrices: [], shadow });
    dummy.position.set(x, y, z);
    dummy.scale.set(w, h, d);
    dummy.rotation.set(0, rotation, 0);
    dummy.updateMatrix();
    batchData.get(key)!.matrices.push(dummy.matrix.clone());
  }
  function mesh(
    geo: T.BufferGeometry,
    mat: T.Material,
    x: number,
    y: number,
    z: number,
  ) {
    const m = new T.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  mesh(new T.BoxGeometry(1490, 0.6, 1490), roadMat, 0, -0.35, 0);
  mesh(new T.BoxGeometry(900, 0.3, 2200), water, 1180, -0.55, 0);
  // Raised city blocks, then fixed world-space markings. No camera-relative scenery recycling.
  for (let ix = 0; ix < 8; ix++)
    for (let iz = 0; iz < 8; iz++) {
      const x = STREETS[ix],
        z = STREETS[iz];
      batch(sidewalk, x + 80, 0.11, z + 80, 136, 0.32, 136, cube, 0, false);
      if (isPark(x, z)) {
        batch(grass, x + 80, 0.31, z + 80, 117, 0.13, 117, cube, 0, false);
        batch(sidewalk, x + 80, 0.4, z + 80, 8, 0.1, 118, cube, 0, false);
        batch(sidewalk, x + 80, 0.4, z + 80, 118, 0.1, 8, cube, 0, false);
        batch(sidewalk, x + 80, 0.52, z + 80, 29, 0.5, 29, cylinder, 0, false);
        batch(water, x + 80, 0.85, z + 80, 23, 0.3, 23, cylinder, 0, false);
        batch(white, x + 80, 1.7, z + 80, 4, 2.6, 4, cylinder);
        batch(water, x + 80, 3, z + 80, 9, 0.3, 9, cylinder);
      }
    }
  for (const s of STREETS) {
    for (let t = -700; t <= 700; t += 10) {
      if (Math.abs(t - Math.round(t / BLOCK) * BLOCK) < 17) continue;
      batch(yellow, s - 0.16, 0.015, t, 0.12, 0.025, 5, cube, 0, false);
      batch(yellow, s + 0.16, 0.015, t, 0.12, 0.025, 5, cube, 0, false);
      batch(yellow, t, 0.016, s - 0.16, 5, 0.025, 0.12, cube, 0, false);
      batch(yellow, t, 0.016, s + 0.16, 5, 0.025, 0.12, cube, 0, false);
      if (t % 20 === 0)
        for (const offset of [-9, 9]) {
          batch(white, s + offset, 0.02, t, 0.1, 0.025, 7, cube, 0, false);
          batch(white, t, 0.021, s + offset, 7, 0.025, 0.1, cube, 0, false);
        }
    }
    // Zebra crossings are physically separated from the road surface to avoid depth flicker.
    for (const cross of STREETS)
      for (const side of [-1, 1])
        for (let k = -8; k <= 8; k += 3) {
          batch(
            white,
            s + k,
            0.025,
            cross + side * 14,
            1.6,
            0.03,
            3,
            cube,
            0,
            false,
          );
          batch(
            white,
            s + side * 14,
            0.026,
            cross + k,
            3,
            0.03,
            1.6,
            cube,
            0,
            false,
          );
        }
  }
  // Waterfront promenade, quay wall and an unbroken boundary.
  batch(sidewalk, 709, 0.18, 0, 46, 0.5, 1450, cube, 0, false);
  batch(white, 734, 1, 0, 1, 2, 1460);
  for (let z = -690; z <= 690; z += 18) {
    batch(dark, 735, 1.6, z, 0.16, 1.6, 0.16);
    batch(dark, 735, 2.35, z, 0.14, 0.12, 18);
  }
  for (const x of [-723, 723]) batch(dark, x, 0.75, 0, 1, 1.4, 1450);
  for (const z of [-723, 723]) batch(dark, 0, 0.75, z, 1450, 1.4, 1);
  const facades = Array.from({ length: 5 }, (_, i) => {
    const tex = texture(
      surface(
        i === 0 ? "brick" : i === 1 ? "stone" : i < 4 ? "glass" : "brick",
        i + 1,
      ),
    );
    return material(
      ["#e5c4a8", "#ede2c8", "#aac2cb", "#7898aa", "#c49f86"][i],
      {
        map: tex,
        metalness: i === 2 || i === 3 ? 0.35 : 0,
        roughness: i < 2 ? 0.8 : 0.45,
      },
    );
  });
  // Window UVs use metre scale, so small shops and towers retain convincing proportions.
  for (const b of BUILDINGS) {
    const geo = new T.BoxGeometry(b.w, b.h, b.d),
      uv = geo.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) {
      const side = Math.floor(i / 4);
      uv.setXY(
        i,
        (uv.getX(i) * (side < 2 ? b.d : b.w)) / 20,
        (uv.getY(i) * (side === 2 || side === 3 ? b.d : b.h)) / 16,
      );
    }
    const building = mesh(geo, facades[b.style], b.x, b.h / 2 + 0.3, b.z);
    building.castShadow = true;
    batch(roof, b.x, b.h + 0.5, b.z, b.w + 1, 0.65, b.d + 1);
    batch(dark, b.x + 5, b.h + 1.5, b.z - 4, 5, 2, 7);
    if (b.h > 55) {
      batch(facades[b.style], b.x, b.h + 5, b.z, b.w * 0.67, 10, b.d * 0.7);
      batch(roof, b.x, b.h + 10.2, b.z, b.w * 0.68, 0.6, b.d * 0.71);
      batch(dark, b.x, b.h + 17, b.z, 0.3, 14, 0.3);
    }
    // Plinth, awnings and illuminated shopfronts on the old-town buildings.
    if (b.style < 2 || b.style === 4) {
      batch(dark, b.x, 1.5, b.z + b.d / 2 + 0.06, b.w * 0.9, 2.6, 0.14);
      for (let a = -1; a <= 1; a++) {
        batch(
          b.seed % 2 ? yellow : grass,
          b.x + a * b.w * 0.3,
          3.2,
          b.z + b.d / 2 + 1,
          b.w * 0.26,
          0.2,
          2.3,
        );
        batch(
          white,
          b.x + a * b.w * 0.3,
          1.5,
          b.z + b.d / 2 + 0.17,
          0.12,
          2.6,
          0.16,
        );
      }
      if (b.seed % 4 === 0) {
        const names = [
          "JUNIPER COFFEE",
          "RECORDS & CO.",
          "BELLWETHER BOOKS",
          "CORNER MARKET",
          "STUDIO 08",
          "THE LATE SHIFT",
        ];
        const m = material("#ffffff", {
          map: texture(signTexture(names[b.seed % names.length])),
          roughness: 0.7,
        });
        mesh(new T.BoxGeometry(14, 2, 0.2), m, b.x, 4.6, b.z + b.d / 2 + 0.22);
      }
    }
  }
  function tree(x: number, z: number, size = 1) {
    batch(
      bark,
      x,
      2.1 * size,
      z,
      0.45 * size,
      4.2 * size,
      0.45 * size,
      cylinder,
    );
    batch(foliage, x, 5.3 * size, z, 2.6 * size, 3 * size, 2.5 * size, sphere);
    batch(
      leaves,
      x - 0.8 * size,
      6 * size,
      z + 0.3 * size,
      2 * size,
      2.3 * size,
      2 * size,
      sphere,
    );
    // Tree pits and bench-like edging keep the streets visually grounded.
    batch(dark, x, 0.33, z, 2, 0.16, 2, cube, 0, false);
  }
  for (const t of TREES) tree(t.x, t.z, t.size);
  for (let z = -670; z < 690; z += 38) {
    batch(roof, 719, 0.8, z + 7, 1.4, 0.2, 4);
    batch(dark, 719, 0.4, z + 5.5, 0.3, 0.8, 0.3);
    batch(dark, 719, 0.4, z + 8.5, 0.3, 0.8, 0.3);
  }
  const lampMat = material("#fff0c5", {
    emissive: "#ffdda0",
    emissiveIntensity: 1,
  });
  for (const x of STREETS)
    for (let z = -610; z < 640; z += 80) {
      batch(dark, x - 15, 4, z, 0.18, 8, 0.18, cylinder);
      batch(dark, x - 13.7, 8, z, 2.8, 0.14, 0.15);
      batch(lampMat, x - 12.5, 7.9, z, 0.85, 0.15, 0.5);
    }
  // Traffic signals share two emissive materials per direction, avoiding hundreds of lights.
  const redNS = material("#61221c", { emissive: "#ed3923" }),
    greenNS = material("#183f33", { emissive: "#72ee9c" });
  const redEW = material("#61221c", { emissive: "#ed3923" }),
    greenEW = material("#183f33", { emissive: "#72ee9c" });
  for (const x of STREETS)
    for (const z of STREETS)
      for (const side of [-1, 1]) {
        batch(dark, x + side * 12, 2.5, z + side * 12, 0.18, 5, 0.18, cylinder);
        batch(dark, x + side * 12, 5, z + side * 12, 0.55, 1.4, 0.5);
        batch(
          redNS,
          x + side * 12,
          5.3,
          z + side * 12 + side * 0.27,
          0.3,
          0.3,
          0.06,
        );
        batch(
          greenNS,
          x + side * 12,
          4.8,
          z + side * 12 + side * 0.27,
          0.3,
          0.3,
          0.06,
        );
        batch(
          redEW,
          x + side * 12 + side * 0.3,
          5.3,
          z + side * 12,
          0.06,
          0.3,
          0.3,
        );
        batch(
          greenEW,
          x + side * 12 + side * 0.3,
          4.8,
          z + side * 12,
          0.06,
          0.3,
          0.3,
        );
      }
  // Legible district signs along the boulevards and at each optional destination.
  for (const place of LANDMARKS) {
    const { x: sx, z: sz } = landmarkSign(place);
    batch(dark, sx, 2, sz, 0.2, 4, 0.2, cylinder);
    const signMat = material("#ffffff", {
      map: texture(signTexture(place.name.toUpperCase())),
    });
    mesh(new T.BoxGeometry(9, 2.3, 0.18), signMat, sx, 4.1, sz);
    const markerMat = material(place.color, {
      emissive: place.color,
      emissiveIntensity: 0.2,
    });
    const ring = mesh(
      new T.TorusGeometry(5, 0.12, 6, 40),
      markerMat,
      place.x,
      0.08,
      place.z,
    );
    ring.rotation.x = -Math.PI / 2;
  }
  // Small sailboats sit beyond the quay; the water remains outside the drivable boundary.
  for (let i = 0; i < 9; i++) {
    const z = -530 + i * 130,
      x = 773 + (i % 3) * 29;
    batch(white, x, 0.25, z, 4, 1.5, 12, sphere);
    batch(dark, x, 6, z, 0.12, 12, 0.12, cylinder);
    const sailGeo = new T.BufferGeometry();
    sailGeo.setAttribute(
      "position",
      new T.Float32BufferAttribute([0, 0, 0, 0, 10, 0, 0, 0, 5], 3),
    );
    sailGeo.computeVertexNormals();
    mesh(sailGeo, material("#f4e8cd", { side: T.DoubleSide }), x, 1.3, z);
  }
  // Distant hills make the edge of the city feel situated in a larger landscape.
  const mountain = material("#789191");
  for (let i = 0; i < 20; i++)
    batch(
      mountain,
      -1400 + i * 150,
      40,
      -1100 - (i % 3) * 100,
      190,
      90 + (i % 5) * 50,
      160,
      sphere,
      0,
      false,
    );
  for (const { geo, mat, matrices, shadow } of batchData.values()) {
    const instances = new T.InstancedMesh(geo, mat, matrices.length);
    matrices.forEach((m, i) => instances.setMatrixAt(i, m));
    instances.castShadow = shadow;
    instances.receiveShadow = true;
    instances.computeBoundingSphere();
    scene.add(instances);
  }
  batchData.clear();
  mergeStaticMeshes(scene);
  const player = makeCar("#e4d9b8");
  scene.add(player.group);
  const trafficCars = Array.from({ length: 24 }, (_, i) =>
    makeCar(
      ["#d5bfa1", "#59868b", "#b96b50", "#7b8495", "#e6daca"][i % 5],
      false,
    ),
  );
  trafficCars.forEach((c) => scene.add(c.group));
  const headlight = new T.SpotLight("#fff0cb", 0, 70, 0.42, 0.6, 1.3);
  headlight.position.set(0, 0.9, -1.8);
  headlight.target.position.set(0, 0, -35);
  player.group.add(headlight, headlight.target);
  const cameraTarget = new T.Vector3(),
    lookAt = new T.Vector3(),
    desired = new T.Vector3();
  let initialized = false,
    lastCamera = "",
    lastLight = "",
    lastQuality = "",
    lastStaticFrame = "",
    slowFrames = 0,
    adaptive = false;
  function resize() {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (w && h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  function render(g: CityDrive, options: SceneOptions, dt: number) {
    const signature = [
      g.phase,
      g.x,
      g.z,
      g.heading,
      g.steering,
      g.elapsed,
      options.paint,
      options.camera,
      options.light,
      options.quality,
      options.traffic,
      options.gentle,
      canvas.clientWidth,
      canvas.clientHeight,
    ].join("|");
    if (
      g.phase !== "racing" &&
      signature === lastStaticFrame &&
      camera.position.distanceTo(desired) < 0.002 &&
      cameraTarget.distanceTo(lookAt) < 0.002
    )
      return;
    lastStaticFrame = signature;
    if (g.phase === "racing" && dt > 0.055) slowFrames++;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (!adaptive && slowFrames > 24) {
      adaptive = true;
      renderer.shadowMap.enabled = false;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 0.85));
      resize();
    }
    if (lastQuality !== options.quality) {
      renderer.setPixelRatio(
        Math.min(devicePixelRatio, options.quality === "high" ? 1.5 : 1),
      );
      renderer.shadowMap.enabled = options.quality === "high";
      resize();
      adaptive = false;
      slowFrames = 0;
      lastQuality = options.quality;
    }
    if (lastLight !== options.light) {
      const blue = options.light === "blue",
        day = options.light === "day";
      const sky = blue ? "#52667e" : day ? "#b2d7e6" : "#c7c7ba";
      (scene.background as T.Color).set(sky);
      (scene.fog as T.Fog).color.set(sky);
      sun.color.set(blue ? "#93b8e3" : day ? "#fff5df" : "#ffdc9d");
      sun.intensity = blue ? 0.7 : day ? 3 : 3.3;
      ambient.intensity = blue ? 0.9 : day ? 2.1 : 1.65;
      renderer.toneMappingExposure = blue ? 1.15 : 1.05;
      headlight.intensity = blue ? 65 : 0;
      lampMat.emissiveIntensity = blue ? 3 : 0.6;
      skyMaterial.uniforms.top.value.set(
        blue ? "#223954" : day ? "#72accc" : "#709fb4",
      );
      skyMaterial.uniforms.bottom.value.set(
        blue ? "#bd9b9c" : day ? "#d4e3e4" : "#ebd4b2",
      );
      lastLight = options.light;
    }
    player.body.color.set(options.paint);
    const groundHeight = onRoad(g.x, g.z) ? 0 : 0.27;
    player.group.position.set(g.x, groundHeight, g.z);
    player.group.rotation.y = -g.heading;
    player.group.rotation.z = options.gentle
      ? 0
      : -g.steering * Math.min(Math.abs(g.speed) / 500, 0.035);
    player.wheels.forEach((w) => (w.rotation.x = -g.wheelRotation));
    player.front.forEach((w) => (w.rotation.y = -g.steering * 0.35));
    player.brakes.emissiveIntensity = g.braking ? 3 : 0.45;
    player.group.visible = true;
    trafficCars.forEach((c, i) => {
      const t = g.traffic[i];
      c.group.visible =
        options.traffic && Math.hypot(t.x - g.x, t.z - g.z) < 520;
      if (!c.group.visible) return;
      c.group.position.set(t.x, 0, t.z);
      c.group.rotation.y = -t.heading;
      c.brakes.emissiveIntensity = t.stopped ? 2 : 0.4;
      c.wheels.forEach((w) => (w.rotation.x = -t.progress / 0.36));
    });
    const green = signalGreen(g.elapsed, true);
    redNS.emissiveIntensity = green ? 0 : 2;
    greenNS.emissiveIntensity = green ? 2 : 0;
    redEW.emissiveIntensity = green ? 2 : 0;
    greenEW.emissiveIntensity = green ? 0 : 2;
    const forwardX = Math.sin(g.heading),
      forwardZ = -Math.cos(g.heading);
    const mode = options.camera,
      back =
        mode === "orbit"
          ? 25
          : mode === "hood"
            ? -1
            : camera.aspect < 0.8
              ? 14
              : 10;
    desired.set(
      g.x - forwardX * back + (mode === "orbit" ? Math.cos(g.heading) * 13 : 0),
      groundHeight +
        (mode === "orbit"
          ? 18
          : mode === "hood"
            ? 1.38
            : camera.aspect < 0.8
              ? 5.4
              : 4.6),
      g.z - forwardZ * back + (mode === "orbit" ? Math.sin(g.heading) * 13 : 0),
    );
    // Pull the camera above the roof before its sightline enters a building.
    let cameraBlocked = false;
    if (mode !== "hood") {
      for (let sample = 1; sample <= 8 && !cameraBlocked; sample++) {
        const t = sample / 8,
          x = g.x + (desired.x - g.x) * t,
          z = g.z + (desired.z - g.z) * t;
        cameraBlocked = BUILDINGS.some(
          (b) =>
            Math.abs(x - b.x) < b.w / 2 + 0.3 &&
            Math.abs(z - b.z) < b.d / 2 + 0.3,
        );
      }
      if (cameraBlocked)
        desired.set(
          g.x - forwardX * 0.8,
          groundHeight + 3.5,
          g.z - forwardZ * 0.8,
        );
    }
    lookAt.set(
      g.x + forwardX * (mode === "hood" ? 35 : 8),
      groundHeight + (mode === "hood" ? 1.4 : 1.1),
      g.z + forwardZ * (mode === "hood" ? 35 : 8),
    );
    if (
      !initialized ||
      lastCamera !== mode ||
      camera.position.distanceTo(desired) > 80
    ) {
      camera.position.copy(desired);
      cameraTarget.copy(lookAt);
      initialized = true;
    }
    const smooth =
      mode === "hood" || options.gentle ? 1 : 1 - Math.exp(-dt * 7);
    if (cameraBlocked) camera.position.copy(desired);
    else camera.position.lerp(desired, smooth);
    cameraTarget.lerp(lookAt, smooth);
    camera.lookAt(cameraTarget);
    lastCamera = mode;
    const sx = Math.round(g.x / 2) * 2,
      sz = Math.round(g.z / 2) * 2;
    sun.position.set(sx - 130, 190, sz + 110);
    sun.target.position.set(sx, 0, sz);
    skyDome.position.copy(camera.position);
    renderer.render(scene, camera);
    canvas.dataset.adaptive = String(adaptive);
    canvas.dataset.drawCalls = String(renderer.info.render.calls);
    canvas.dataset.triangles = String(renderer.info.render.triangles);
  }
  function dispose() {
    observer.disconnect();
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>(),
      maps = new Set<T.Texture>();
    scene.traverse((o) => {
      if (o instanceof T.InstancedMesh) o.dispose();
      if (o instanceof T.Mesh) {
        geometries.add(o.geometry);
        const list = Array.isArray(o.material) ? o.material : [o.material];
        list.forEach((m) => materials.add(m));
      }
    });
    materials.forEach((m) => {
      for (const value of Object.values(m))
        if (value instanceof T.Texture) maps.add(value);
      m.dispose();
    });
    geometries.forEach((g) => g.dispose());
    textures.forEach((t) => maps.add(t));
    maps.forEach((t) => t.dispose());
    env.dispose();
    sun.shadow.map?.dispose();
    renderer.dispose();
    // Strict Mode reuses a connected canvas; real unmounts can release its context.
    if (!canvas.isConnected) renderer.forceContextLoss();
  }
  return { render, dispose };
}
