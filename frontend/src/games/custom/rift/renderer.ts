import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  BODY,
  WEAPONS,
  WEAPON_ORDER,
  normalize,
  type Actor,
  type Match,
  type Pickup,
  type WeaponId,
} from "./engine";
import { type MapId } from "./map";
import {
  animateWeapon,
  box,
  capsule,
  characterModel,
  cylinder,
  disposeObject,
  ellipsoid,
  material,
  mesh,
  poseCharacter,
  viewHands,
  weaponModel,
  type CharacterRig,
  type WeaponModel,
} from "./models";
import { createEffects } from "./fx";
import { createWorld, THEMES, type World } from "./world";
function environmentTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#adc9d7");
  gradient.addColorStop(0.35, "#81999f");
  gradient.addColorStop(0.52, "#dbd3b6");
  gradient.addColorStop(1, "#33474f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "#e5f1e2";
  ctx.fillRect(75, 70, 60, 65);
  ctx.fillStyle = "#b4d0da";
  ctx.fillRect(310, 40, 120, 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function colorBatch(group: THREE.Object3D, recursive = false) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert(),
    meshes: THREE.Mesh[] = [],
    geometries: THREE.BufferGeometry[] = [];
  const collect = (object: THREE.Object3D) => {
    if (object instanceof THREE.Mesh && !Array.isArray(object.material))
      meshes.push(object);
  };
  if (recursive) group.traverse(collect);
  else group.children.forEach(collect);
  for (const object of meshes) {
    const g = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry.clone();
    g.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    const n = g.getAttribute("position").count,
      colors = new Float32Array(n * 3),
      tint = (object.material as THREE.MeshStandardMaterial).color;
    for (let i = 0; i < n; i++) colors.set([tint.r, tint.g, tint.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometries.push(g);
  }
  if (!geometries.length) return;
  const geometry = mergeGeometries(geometries)!;
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.5,
    roughness: 0.43,
  });
  group.add(new THREE.Mesh(geometry, mat));
  for (const object of meshes) {
    object.removeFromParent();
    object.geometry.dispose();
    (object.material as THREE.Material).dispose();
  }
  geometries.forEach((g) => g.dispose());
}
function softwareMaterials(object: THREE.Object3D) {
  const materials = new Map<
    THREE.MeshStandardMaterial,
    THREE.MeshPhongMaterial
  >();
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && !(child instanceof THREE.SkinnedMesh)) {
      const original = Array.isArray(child.material)
        ? child.material
        : [child.material];
      const adapted = original.map((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;
        let cheap = materials.get(mat);
        if (!cheap) {
          cheap = new THREE.MeshPhongMaterial({
            color: mat.color,
            map: mat.map,
            vertexColors: mat.vertexColors,
            emissive: mat.emissive,
            emissiveIntensity: mat.emissiveIntensity,
            transparent: mat.transparent,
            opacity: mat.opacity,
            side: mat.side,
            depthWrite: mat.depthWrite,
            shininess: Math.max(8, (1 - mat.roughness) * 65),
            specular: new THREE.Color().setScalar(0.08 + mat.metalness * 0.3),
          });
          materials.set(mat, cheap);
        }
        return cheap;
      });
      child.material = Array.isArray(child.material) ? adapted : adapted[0];
    }
  });
  for (const old of materials.keys()) old.dispose();
}
function pickupModel(p: Pickup) {
  const group = new THREE.Group();
  group.position.set(p.x, p.y, p.z);
  const dark = material(0x1f3039, 0.65, 0.42),
    silver = material(0xabbfbc, 0.75, 0.3),
    brass = material(0xb8a27b, 0.7, 0.36);
  const color =
    p.kind === "health"
      ? 0xff8b82
      : p.kind === "armor"
        ? 0x84d4ed
        : p.kind === "speed"
          ? 0xa3ef8c
          : p.kind === "invisibility"
            ? 0xc6acff
            : p.kind === "jetpack"
              ? 0x76cafa
              : p.kind in WEAPONS
                ? new THREE.Color(WEAPONS[p.kind as WeaponId].color).getHex()
                : 0xe9c991;
  const accent = material(color, 0.4, 0.32, color, 0.65);
  cylinder(group, 0, 0.045, 0, 0.49, 0.09, dark, 24);
  cylinder(group, 0, 0.096, 0, 0.34, 0.021, silver, 24);
  const ring = mesh(
    group,
    new THREE.TorusGeometry(0.465, 0.018, 6, 32),
    accent,
    0,
    0.109,
    0,
  );
  ring.rotation.x = Math.PI / 2;
  ring.name = "ring";
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5])
    box(
      group,
      Math.sin(angle) * 0.4,
      0.117,
      Math.cos(angle) * 0.4,
      0.09,
      0.018,
      0.05,
      accent,
    ).rotation.y = angle;
  const item = new THREE.Group();
  item.name = "item";
  group.add(item);
  if (p.kind in WEAPONS) {
    const gun = weaponModel(p.kind as WeaponId);
    gun.root.rotation.set(0, Math.PI / 2, -0.21);
    gun.root.scale.setScalar(0.9);
    item.add(gun.root);
  } else if (p.kind === "health") {
    box(item, 0, 0, 0, 0.39, 0.31, 0.21, silver);
    box(item, 0, 0.185, 0, 0.17, 0.067, 0.068, dark);
    box(item, 0, 0, -0.112, 0.071, 0.215, 0.014, accent);
    box(item, 0, 0, -0.113, 0.217, 0.073, 0.016, accent);
    for (const side of [-1, 1])
      box(item, side * 0.148, 0, -0.12, 0.038, 0.237, 0.021, dark);
  } else if (p.kind === "armor") {
    ellipsoid(item, 0, 0.035, 0, 0.44, 0.51, 0.17, accent);
    for (const side of [-1, 1]) {
      ellipsoid(item, side * 0.18, 0.151, 0, 0.173, 0.19, 0.177, silver);
      box(item, side * 0.12, 0.01, -0.09, 0.027, 0.31, 0.026, dark);
    }
    box(item, 0, 0.093, -0.1, 0.12, 0.035, 0.02, silver);
  } else if (p.kind === "speed") {
    for (const side of [-1, 1]) {
      ellipsoid(item, side * 0.14, -0.07, -0.045, 0.21, 0.18, 0.4, dark);
      ellipsoid(item, side * 0.14, -0.033, -0.13, 0.2, 0.12, 0.22, silver);
      capsule(item, side * 0.14, 0.1, 0.06, 0.077, 0.31, accent);
      for (let i = 0; i < 3; i++)
        box(
          item,
          side * 0.14,
          0.1 - i * 0.045,
          -0.025,
          0.12,
          0.023,
          0.028,
          silver,
        );
    }
  } else if (p.kind === "invisibility") {
    const core = mesh(
      item,
      new THREE.OctahedronGeometry(0.24, 1),
      material(color, 0.8, 0.12, color, 0.48),
    );
    core.scale.y = 1.35;
    for (const angle of [0, Math.PI / 3, -Math.PI / 3]) {
      const hoop = mesh(
        item,
        new THREE.TorusGeometry(0.3, 0.023, 7, 32),
        silver,
      );
      hoop.rotation.y = angle;
      hoop.rotation.x = 0.35;
    }
    cylinder(item, 0, -0.28, 0, 0.1, 0.065, accent);
  } else if (p.kind === "jetpack") {
    box(item, 0, 0, 0.035, 0.3, 0.37, 0.18, dark);
    box(item, 0, 0.035, -0.073, 0.23, 0.22, 0.061, silver);
    for (const side of [-1, 1]) {
      cylinder(item, side * 0.205, 0, 0, 0.074, 0.39, silver, 14);
      cylinder(item, side * 0.205, -0.205, 0, 0.081, 0.085, accent, 14);
      box(item, side * 0.205, 0.043, -0.077, 0.067, 0.15, 0.025, accent);
    }
    box(item, 0, 0.08, -0.11, 0.12, 0.03, 0.017, accent);
  } else {
    box(item, 0, -0.04, 0, 0.34, 0.25, 0.23, dark);
    for (const x of [-0.1, 0, 0.1]) {
      cylinder(item, x, 0.08, 0, 0.036, 0.25, brass, 10);
      cylinder(item, x, 0.206, 0, 0.035, 0.062, silver, 10, 0.012);
    }
    box(item, 0, -0.045, -0.124, 0.18, 0.074, 0.014, accent);
  }
  colorBatch(item, true);
  colorBatch(group);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const timer = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  timer.name = "timer";
  timer.position.y = 1.11;
  timer.scale.set(1.9, 0.475, 1);
  timer.userData.remaining = -1;
  group.add(timer);
  return group;
}
export function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  const gl = renderer.getContext(),
    debug = gl.getExtension("WEBGL_debug_renderer_info");
  const device = debug
    ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
    : "";
  const software = /SwiftShader|llvmpipe|softpipe|Software/i.test(device),
    maxRenderWidth = software ? 640 : 1800;
  renderer.info.autoReset = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = software
    ? THREE.PCFShadowMap
    : THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(82, 16 / 9, 0.06, 220);
  camera.rotation.order = "YXZ";
  const environment = environmentTexture();
  scene.environment = environment;
  scene.environmentIntensity = 0.62;
  const hemisphere = new THREE.HemisphereLight(0xccdfeb, 0x84786b, 1.7);
  scene.add(hemisphere);
  const ambient = new THREE.AmbientLight(0xb7c6cc, 0.3);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xe3e8dc, 3.6);
  sun.position.set(-22, 42, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(software ? 1024 : 2048, software ? 1024 : 2048);
  sun.shadow.camera.left = -47;
  sun.shadow.camera.right = 47;
  sun.shadow.camera.top = 47;
  sun.shadow.camera.bottom = -47;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.normalBias = 0.045;
  sun.shadow.bias = -0.0003;
  scene.add(sun);
  const accentLight = new THREE.PointLight(0x9ee8d0, 55, 35, 2);
  accentLight.position.set(0, 8, -3);
  scene.add(accentLight);
  const actors = new Map<string, CharacterRig>(),
    pickups = new Map<number, THREE.Group>();
  let world: World | null = null,
    mapId: MapId | null = null;
  const effects = createEffects(scene);
  const viewScene = new THREE.Scene();
  viewScene.environment = environment;
  viewScene.environmentIntensity = 0.75;
  viewScene.add(new THREE.HemisphereLight(0xe4e7db, 0x435763, 2.2));
  const gunLight = new THREE.DirectionalLight(0xffebce, 2.9);
  gunLight.position.set(-1.5, 3, 2);
  viewScene.add(gunLight);
  const viewCamera = new THREE.PerspectiveCamera(63, 16 / 9, 0.02, 10),
    viewGun = new THREE.Group();
  viewScene.add(viewGun);
  const guns = new Map<WeaponId, WeaponModel>();
  for (const id of WEAPON_ORDER) {
    const model = weaponModel(id);
    viewGun.add(model.root);
    guns.set(id, model);
  }
  const hands = viewHands();
  viewGun.add(hands.root);
  if (software) softwareMaterials(viewGun);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffedba,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const flash = mesh(viewGun, new THREE.ConeGeometry(0.072, 0.3, 7), flashMat);
  flash.rotation.x = -Math.PI / 2;
  const flashCore = mesh(
    flash,
    new THREE.SphereGeometry(0.057, 10, 7),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  flashCore.scale.set(0.45, 1.2, 0.45);
  let width = 0,
    height = 0,
    currentEye = BODY.eye,
    lastSpawn = -1,
    lastGrounded = true,
    lastVy = 0,
    landing = 0,
    recoil = 0,
    recoilVelocity = 0,
    lastShots = 0,
    lastWeapon: WeaponId = "carbine",
    switchTime = 1,
    lastYaw = 0,
    lastPitch = 0,
    swayX = 0,
    swayY = 0,
    cloak = false;
  let frames = 0,
    frameTime = 0,
    lastTag = "",
    softwareWidth = 640,
    previousFrame = 0,
    qualityTime = 0;
  function changeWorld(id: MapId) {
    if (world) disposeObject(world.root);
    for (const rig of actors.values()) disposeObject(rig.root);
    actors.clear();
    for (const item of pickups.values()) disposeObject(item);
    pickups.clear();
    effects.reset();
    world = createWorld(id);
    if (software) softwareMaterials(world.root);
    mapId = id;
    scene.add(world.root);
    const theme = THEMES[id];
    scene.background = new THREE.Color(theme.sky);
    scene.fog = new THREE.FogExp2(
      theme.fog,
      id === "orbital" ? 0.003 : id === "aqueduct" ? 0.008 : 0.011,
    );
    hemisphere.color.setHex(
      id === "citadel" ? 0xffd4b1 : id === "aqueduct" ? 0xc1dcdb : 0xc7dfef,
    );
    hemisphere.groundColor.setHex(id === "orbital" ? 0x4c657a : theme.ground);
    sun.color.setHex(theme.sun);
    accentLight.color.setHex(theme.light);
    accentLight.intensity = id === "orbital" ? 70 : id === "citadel" ? 35 : 55;
    scene.environmentIntensity = id === "citadel" ? 0.45 : 0.62;
    renderer.shadowMap.needsUpdate = true;
    canvas.dataset.map = id;
  }
  function render(
    game: Match,
    me: Actor,
    dt: number,
    now: number,
    moving: boolean,
    settings = { fov: 82, reducedMotion: false },
  ) {
    dt = Math.min(0.1, Math.max(0.001, dt));
    if (mapId !== game.mapId) changeWorld(game.mapId);
    if (lastTag !== game.tag) {
      lastTag = game.tag;
      effects.reset();
      lastShots = me.shots;
      lastSpawn = -1;
    }
    const bounds = canvas.getBoundingClientRect(),
      w = Math.max(1, Math.round(bounds.width)),
      h = Math.max(1, Math.round(bounds.height));
    if (w !== width || h !== height) {
      width = w;
      height = h;
      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio || 1,
          1.65,
          (software ? softwareWidth : maxRenderWidth) / w,
        ),
      );
      renderer.setSize(w, h, false);
      camera.aspect = viewCamera.aspect = w / h;
      camera.updateProjectionMatrix();
      viewCamera.updateProjectionMatrix();
    }
    if (lastSpawn !== me.spawnCount) {
      lastSpawn = me.spawnCount;
      currentEye = me.y + BODY.eye;
      lastShots = me.shots;
      recoil = 0;
      recoilVelocity = 0;
      landing = 0;
    }
    if (me.grounded && !lastGrounded)
      landing = Math.min(0.14, Math.abs(lastVy) * 0.009);
    lastGrounded = me.grounded;
    lastVy = me.vy;
    landing *= Math.exp(-dt * 12);
    const wantedEye = me.y + (me.hp > 0 ? BODY.eye : 0.42);
    currentEye +=
      (wantedEye - currentEye) * (1 - Math.exp(-dt * (me.grounded ? 24 : 44)));
    if (Math.abs(wantedEye - currentEye) > 2) currentEye = wantedEye;
    const stride =
      !settings.reducedMotion && moving && me.grounded && me.hp > 0
        ? Math.sin(me.walk * 3.7) * (me.sprinting ? 0.035 : 0.018)
        : 0;
    camera.position.set(
      me.x,
      currentEye + stride - (settings.reducedMotion ? 0 : landing),
      me.z,
    );
    camera.rotation.set(me.pitch, me.yaw, 0, "YXZ");
    const fov =
      settings.fov +
      (settings.reducedMotion
        ? 0
        : (me.sprinting ? 6 : 0) + (me.perks.speed > 0 ? 2 : 0));
    camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 7));
    camera.updateProjectionMatrix();
    for (const a of game.actors) {
      let rig = actors.get(a.id);
      if (!rig) {
        rig = characterModel(!a.bot, software);
        actors.set(a.id, rig);
        scene.add(rig.root);
        if (software) softwareMaterials(rig.weapon.root);
        rig.root.position.set(a.x, a.y, a.z);
      }
      const distance = Math.hypot(a.x - me.x, a.y - me.y, a.z - me.z),
        snap =
          rig.spawn !== a.spawnCount ||
          rig.root.position.distanceTo(new THREE.Vector3(a.x, a.y, a.z)) > 3;
      const blend = snap ? 1 : 1 - Math.exp(-dt * 22);
      rig.root.position.x += (a.x - rig.root.position.x) * blend;
      rig.root.position.y += (a.y - rig.root.position.y) * blend;
      rig.root.position.z += (a.z - rig.root.position.z) * blend;
      rig.root.rotation.y +=
        normalize(a.yaw - rig.root.rotation.y) * Math.min(1, dt * 24);
      poseCharacter(rig, a, dt, now, distance);
      if (a.id === me.id) rig.root.visible = false;
      if (a.thrusting && Math.random() < dt * 40 && a.id !== me.id)
        effects.emit(a.x, a.y + 0.82, a.z, 0x7ed7ff, 2, 0.45, 0.27, 0.1, -0.1);
      if (
        a.perks.speed > 0 &&
        a.sprinting &&
        a.id !== me.id &&
        Math.random() < dt * 14
      )
        effects.emit(a.x, a.y + 0.1, a.z, 0xb0e995, 1, 0.2, 0.22, 0.11, 0);
    }
    for (const [id, rig] of actors)
      if (!game.actors.some((a) => a.id === id)) {
        disposeObject(rig.root);
        actors.delete(id);
      }
    for (const p of game.pickups) {
      let item = pickups.get(p.id);
      if (!item) {
        item = pickupModel(p);
        if (software) softwareMaterials(item);
        pickups.set(p.id, item);
        scene.add(item);
      }
      const model = item.getObjectByName("item")!,
        ring = item.getObjectByName("ring");
      model.visible = p.remaining <= 0;
      model.position.y = 0.79 + Math.sin(now * 0.0019 + p.id) * 0.06;
      model.rotation.y = now * 0.00065 + p.id;
      if (ring) {
        ring.scale.setScalar(p.remaining > 0 ? 0.7 : 1);
        (ring as THREE.Mesh).visible = true;
      }
      const timer = item.getObjectByName("timer") as THREE.Sprite,
        distance = Math.hypot(p.x - me.x, p.y - me.y, p.z - me.z);
      timer.visible = p.remaining > 0 && distance > 2.7 && distance < 15;
      if (
        timer.visible &&
        timer.userData.remaining !== Math.ceil(p.remaining)
      ) {
        timer.userData.remaining = Math.ceil(p.remaining);
        const texture = (timer.material as THREE.SpriteMaterial).map!,
          c = texture.image as HTMLCanvasElement,
          ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, 256, 64);
        ctx.fillStyle = "#11232dd9";
        ctx.fillRect(0, 6, 256, 52);
        ctx.fillStyle = "#d9e3d6";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `${p.kind === "invisibility" ? "CLOAK" : p.kind.toUpperCase()} ${Math.ceil(p.remaining)}s`,
          128,
          40,
        );
        texture.needsUpdate = true;
      }
    }
    if (me.shots !== lastShots) {
      lastShots = me.shots;
      const kick =
        me.weapon === "shotgun"
          ? 2.2
          : me.weapon === "rocket"
            ? 2.1
            : me.weapon === "rail"
              ? 1.8
              : me.weapon === "grenade"
                ? 1.6
                : me.weapon === "plasma"
                  ? 0.7
                  : 1.0;
      recoilVelocity += kick;
      if (me.weapon !== "plasma" && me.weapon !== "rail") {
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
          camera.quaternion,
        );
        effects.emit(
          me.x + right.x * 0.23,
          me.y + BODY.eye - 0.12,
          me.z + right.z * 0.23,
          0xd8b779,
          1,
          0.8,
          0.4,
          0.045,
          4,
        );
      }
    }
    recoilVelocity += (-recoil * 100 - recoilVelocity * 17) * dt;
    recoil += recoilVelocity * dt;
    recoil = Math.max(0, recoil);
    if (me.weapon !== lastWeapon) {
      lastWeapon = me.weapon;
      switchTime = 0;
    }
    switchTime = Math.min(1, switchTime + dt * 5.5);
    const switchDip = Math.sin(((1 - switchTime) * Math.PI) / 2) * 0.19;
    swayX +=
      (normalize(me.yaw - lastYaw) * 1.7 - swayX) * (1 - Math.exp(-dt * 10));
    swayY += ((me.pitch - lastPitch) * 1.5 - swayY) * (1 - Math.exp(-dt * 10));
    lastYaw = me.yaw;
    lastPitch = me.pitch;
    const reload =
      me.reloading > 0
        ? Math.sin(Math.PI * (1 - me.reloading / WEAPONS[me.weapon].reload))
        : 0;
    viewGun.position.set(
      0.244 + (moving ? Math.sin(me.walk * 1.85) * 0.01 : 0) - swayX * 0.17,
      -0.254 -
        reload * 0.1 -
        switchDip +
        Math.cos(me.walk * 3.7) * 0.008 * (moving ? 1 : 0) -
        landing * 0.3 +
        Math.sin(now * 0.0018) * 0.0025,
      -0.89 + recoil * 0.32 + (me.sprinting ? 0.025 : 0),
    );
    viewGun.rotation.set(
      recoil * 0.47 - reload * 0.17 + swayY * 0.1,
      Math.max(-0.1, Math.min(0.1, swayX * 0.35)),
      -0.035 - reload * 0.25 + (me.sprinting ? -0.16 : 0),
    );
    if (settings.reducedMotion) {
      viewGun.position.set(
        0.244,
        -0.254 - reload * 0.1 - switchDip,
        -0.89 + recoil * 0.1,
      );
      viewGun.rotation.set(
        recoil * 0.15 - reload * 0.17,
        0,
        -0.035 - reload * 0.25,
      );
    }
    for (const [id, gun] of guns) {
      gun.root.visible = id === me.weapon;
      if (id === me.weapon)
        animateWeapon(gun, id, me.reloading, me.flash, now / 1000);
    }
    hands.left.position.set(
      -0.053 - reload * 0.085,
      -0.119 - reload * 0.19,
      me.weapon === "rocket" ? -0.22 : me.weapon === "rail" ? -0.38 : -0.3,
    );
    hands.left.rotation.z = -0.56 - reload * 0.6;
    hands.right.rotation.x = -0.1 + reload * 0.15;
    const gun = guns.get(me.weapon)!;
    flash.position.copy(gun.muzzle);
    flash.position.z -= 0.055;
    flash.visible = me.flash > 0 && me.reloading <= 0;
    flash.rotation.y = now * 0.013;
    flash.scale.setScalar(
      me.weapon === "shotgun" ? 1.6 : me.weapon === "plasma" ? 0.8 : 1,
    );
    flashMat.color.set(
      me.weapon === "plasma" || me.weapon === "rail"
        ? WEAPONS[me.weapon].color
        : 0xffe9b0,
    );
    const nowCloak = me.perks.invisibility > 0 && me.revealed <= 0;
    if (nowCloak !== cloak) {
      cloak = nowCloak;
      viewGun.traverse((object) => {
        if (object instanceof THREE.Mesh)
          for (const mat of Array.isArray(object.material)
            ? object.material
            : [object.material])
            if (
              mat instanceof THREE.MeshStandardMaterial ||
              mat instanceof THREE.MeshPhongMaterial
            ) {
              mat.transparent = cloak;
              mat.opacity = cloak ? 0.28 : 1;
              mat.depthWrite = !cloak;
            }
      });
    }
    viewGun.visible = me.hp > 0 && !game.ended;
    if (world) {
      world.dust.rotation.y = Math.sin(now * 0.000025) * 0.012;
      for (const water of world.water)
        (water.material as THREE.MeshStandardMaterial).roughness =
          0.18 + Math.sin(now * 0.0005) * 0.025;
    }
    effects.update(game, dt, canvas.height);
    renderer.info.reset();
    renderer.autoClear = true;
    renderer.render(scene, camera);
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(viewScene, viewCamera);
    canvas.dataset.renderWidth = String(canvas.width);
    canvas.dataset.renderer = software ? "software" : "hardware";
    canvas.dataset.drawCalls = String(renderer.info.render.calls);
    canvas.dataset.triangles = String(renderer.info.render.triangles);
    const realDelta = previousFrame
      ? Math.min(0.5, (now - previousFrame) / 1000)
      : dt;
    previousFrame = now;
    frames++;
    frameTime += realDelta;
    qualityTime += realDelta;
    if (frameTime >= 1) {
      const fps = frames / frameTime;
      canvas.dataset.fps = fps.toFixed(1);
      if (software && qualityTime > 3 && fps < 25 && softwareWidth > 480) {
        softwareWidth = Math.max(480, Math.round(softwareWidth * 0.88));
        width = 0;
        qualityTime = 0;
      } else if (
        software &&
        qualityTime > 6 &&
        fps > 42 &&
        softwareWidth < 640
      ) {
        softwareWidth = Math.min(640, Math.round(softwareWidth * 1.1));
        width = 0;
        qualityTime = 0;
      }
      frames = 0;
      frameTime = 0;
    }
  }
  return {
    render,
    dispose() {
      effects.dispose();
      disposeObject(scene);
      disposeObject(viewScene);
      environment.dispose();
      renderer.dispose();
    },
  };
}
