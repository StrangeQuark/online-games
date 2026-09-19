/** Metres, seconds, radians. The city is generated once, independent of the camera. */
export const BLOCK = 160;
export const STREETS = Array.from({ length: 9 }, (_, i) => (i - 4) * BLOCK);
export const ROAD = 24;
export const LIMIT = 718;
export type Point = { x: number; z: number };
export type Building = Point & {
  w: number;
  d: number;
  h: number;
  style: number;
  seed: number;
};
export type Landmark = Point & {
  id: string;
  name: string;
  label: string;
  color: string;
};
export const LANDMARKS: Landmark[] = [
  {
    id: "harbor",
    name: "Marina Promenade",
    label: "The water is always worth the detour.",
    x: 640,
    z: 480,
    color: "#88dcd5",
  },
  {
    id: "park",
    name: "Juniper Gardens",
    label: "A little green in the middle of everything.",
    x: 0,
    z: 80,
    color: "#c5dfa2",
  },
  {
    id: "downtown",
    name: "Meridian Square",
    label: "Look up. You made it downtown.",
    x: 320,
    z: -320,
    color: "#f7d799",
  },
  {
    id: "oldtown",
    name: "Old Town Market",
    label: "Brick streets, corner cafés, a slower pace.",
    x: -480,
    z: -160,
    color: "#edae8d",
  },
  {
    id: "observatory",
    name: "North Star Plaza",
    label: "One last stop at the edge of the city.",
    x: 0,
    z: -640,
    color: "#c5bcf0",
  },
  {
    id: "warehouse",
    name: "Foundry Quarter",
    label: "Big murals. Long shadows. Open roads.",
    x: -320,
    z: 480,
    color: "#e8bd81",
  },
];
export function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
export const isPark = (x: number, z: number) =>
  (x === 0 && z === 0) || (x === -160 && z === -480);
export function makeBuildings(): Building[] {
  const rng = random(4617),
    buildings: Building[] = [];
  for (let ix = 0; ix < 8; ix++)
    for (let iz = 0; iz < 8; iz++) {
      const x = STREETS[ix],
        z = STREETS[iz];
      if (isPark(x, z)) continue;
      const downtown = x >= 0 && z < 0,
        industrial = z >= 320;
      for (let a = 0; a < 2; a++)
        for (let b = 0; b < 2; b++) {
          const w = 38 + rng() * 14,
            d = 36 + rng() * 16;
          buildings.push({
            x: x + 46 + a * 68,
            z: z + 46 + b * 68,
            w,
            d,
            h: downtown
              ? 35 + rng() * 108
              : industrial
                ? 10 + rng() * 14
                : 14 + rng() * 30,
            style: downtown
              ? 2 + Math.floor(rng() * 2)
              : industrial
                ? 4
                : Math.floor(rng() * 2),
            seed: buildings.length,
          });
        }
    }
  return buildings;
}
export const BUILDINGS = makeBuildings();
export const TREES = (() => {
  const rng = random(97531),
    trees: (Point & { size: number })[] = [];
  for (let ix = 0; ix < 8; ix++)
    for (let iz = 0; iz < 8; iz++) {
      const x = STREETS[ix],
        z = STREETS[iz];
      for (const t of [28, 80, 132]) {
        trees.push({ x: x + 17, z: z + t, size: 0.85 + rng() * 0.4 });
        trees.push({ x: x + t, z: z + 143, size: 0.8 + rng() * 0.4 });
      }
      if (isPark(x, z))
        for (let a = 0; a < 18; a++) {
          const tx = x + 28 + rng() * 105,
            tz = z + 28 + rng() * 105;
          if (Math.abs(tx - x - 80) > 9 && Math.abs(tz - z - 80) > 9)
            trees.push({ x: tx, z: tz, size: 1 + rng() * 0.6 });
        }
    }
  for (let z = -670; z < 690; z += 38) trees.push({ x: 705, z, size: 1.2 });
  return trees;
})();
export function landmarkSign(p: Point): Point {
  return {
    x: p.x + 17,
    z: p.z + (Math.abs(p.z - nearestStreet(p.z)) < 18 ? 17 : 0),
  };
}
const PROPS = [
  ...LANDMARKS.map((p) => ({ ...landmarkSign(p), radius: 0.2 })),
  ...TREES.map((t) => ({ x: t.x, z: t.z, radius: 0.3 * t.size })),
  { x: 80, z: 80, radius: 14.5 },
  { x: -80, z: -400, radius: 14.5 },
  ...STREETS.flatMap((x) =>
    Array.from({ length: 16 }, (_, i) => ({
      x: x - 15,
      z: -610 + i * 80,
      radius: 0.15,
    })),
  ),
];
export function nearestStreet(n: number) {
  return Math.max(-640, Math.min(640, Math.round(n / BLOCK) * BLOCK));
}
export function onRoad(x: number, z: number) {
  return (
    Math.abs(x - nearestStreet(x)) <= 12 || Math.abs(z - nearestStreet(z)) <= 12
  );
}
export function district(x: number, z: number) {
  if (x > 560) return "Marina Promenade";
  if (x > -20 && x < 180 && z > -20 && z < 180) return "Juniper Gardens";
  if (z > 320) return "Foundry Quarter";
  if (z < -520) return "North Star";
  if (x >= 0 && z < 0) return "Meridian Downtown";
  return "Old Town";
}
export type Traffic = Point & {
  heading: number;
  speed: number;
  color: string;
  route: number;
  progress: number;
  stopped: boolean;
};
export type CityDrive = Point & {
  phase: "ready" | "racing" | "paused";
  heading: number;
  speed: number;
  steering: number;
  distance: number;
  elapsed: number;
  collisions: number;
  cooldown: number;
  visited: string[];
  message: string;
  messageTime: number;
  traffic: Traffic[];
  braking: boolean;
  wheelRotation: number;
};
export function newCityDrive(): CityDrive {
  const drive: CityDrive = {
    phase: "ready",
    x: -315,
    z: 410,
    heading: 0,
    speed: 0,
    steering: 0,
    distance: 0,
    elapsed: 0,
    collisions: 0,
    cooldown: 0,
    visited: [],
    message: "Welcome to Bellwether. Take the long way.",
    messageTime: 7,
    traffic: Array.from({ length: 24 }, (_, i) => ({
      x: 0,
      z: 0,
      heading: 0,
      speed: 9 + (i % 5),
      color: ["#d5bfa1", "#59868b", "#b96b50", "#7b8495", "#e6daca"][i % 5],
      route: i % 4,
      progress: i * 139 + 45,
      stopped: false,
    })),
    braking: false,
    wheelRotation: 0,
  };
  moveTraffic(drive, 0);
  return drive;
}
export type DriveInput = {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
};
export function signalGreen(elapsed: number, northSouth: boolean) {
  return (Math.floor(elapsed / 13) % 2 === 0) === northSouth;
}
export function trafficPose(route: number, progress: number) {
  const extent = 635 - route * 160,
    radius = 10;
  const straight = extent * 2 - radius * 2,
    arc = (Math.PI * radius) / 2;
  const segment = straight + arc,
    perimeter = segment * 4;
  const p = ((progress % perimeter) + perimeter) % perimeter;
  const edge = Math.floor(p / segment),
    t = p % segment;
  const turn = t > straight ? (t - straight) / radius : 0;
  const x =
    t <= straight ? -extent : -extent + radius - Math.cos(turn) * radius;
  const z =
    t <= straight
      ? extent - radius - t
      : -extent + radius - Math.sin(turn) * radius;
  const angle = (edge * Math.PI) / 2;
  return {
    x: x * Math.cos(angle) - z * Math.sin(angle),
    z: x * Math.sin(angle) + z * Math.cos(angle),
    heading: angle + turn,
    turning: t > straight,
  };
}
function moveTraffic(g: CityDrive, dt: number) {
  for (const car of g.traffic) {
    // Rounded corners keep vehicles moving continuously through junctions.
    const pose = trafficPose(car.route, car.progress);
    car.x = pose.x;
    car.z = pose.z;
    car.heading = pose.heading;
    const ns = Math.abs(Math.cos(car.heading)) > 0.7;
    const coordinate = ns ? car.z : car.x;
    const direction = ns ? -Math.cos(car.heading) : Math.sin(car.heading);
    const nextIntersection =
      direction < 0
        ? Math.floor((coordinate - 0.001) / BLOCK) * BLOCK
        : Math.ceil((coordinate + 0.001) / BLOCK) * BLOCK;
    const intersectionDistance = Math.abs(coordinate - nextIntersection);
    car.stopped =
      !pose.turning &&
      !signalGreen(g.elapsed, ns) &&
      intersectionDistance < 20 &&
      intersectionDistance > 13;
    const dx = g.x - car.x,
      dz = g.z - car.z;
    const forward = dx * Math.sin(car.heading) - dz * Math.cos(car.heading);
    const lateral = Math.abs(
      dx * Math.cos(car.heading) + dz * Math.sin(car.heading),
    );
    if (forward > 0 && forward < 14 && lateral < 2.8) car.stopped = true;
    for (const other of g.traffic) {
      if (other === car) continue;
      const ox = other.x - car.x,
        oz = other.z - car.z;
      const ahead = ox * Math.sin(car.heading) - oz * Math.cos(car.heading);
      if (
        ahead > 0 &&
        ahead < 9 &&
        Math.abs(ox * Math.cos(car.heading) + oz * Math.sin(car.heading)) < 2.8
      )
        car.stopped = true;
    }
    if (!car.stopped) car.progress += car.speed * dt;
  }
}
/** Fixed substeps prevent tunnelling even when a browser frame is late. */
export function updateCity(
  g: CityDrive,
  input: DriveInput,
  seconds: number,
  trafficEnabled = true,
) {
  if (g.phase !== "racing" || !Number.isFinite(seconds) || seconds <= 0) return;
  const dt = Math.min(seconds, 0.1),
    steps = Math.ceil(dt / (1 / 120)),
    h = dt / steps;
  for (let i = 0; i < steps; i++) step(g, input, h, trafficEnabled);
}
function step(
  g: CityDrive,
  input: DriveInput,
  dt: number,
  trafficEnabled: boolean,
) {
  g.elapsed += dt;
  g.cooldown = Math.max(0, g.cooldown - dt);
  g.messageTime = Math.max(0, g.messageTime - dt);
  const throttle = Math.max(0, Math.min(1, input.throttle)),
    brake = Math.max(0, Math.min(1, input.brake));
  g.braking = brake > 0.1 || input.handbrake;
  // Automatic transmission: S brakes to a stop and then selects reverse.
  const bothPedals = throttle > 0 && brake > 0;
  const acceleration = bothPedals
    ? -Math.sign(g.speed) * 13 * brake
    : throttle
      ? (g.speed < -0.5 ? 12 : 6.8 * (1 - Math.max(0, g.speed) / 48)) * throttle
      : brake
        ? (g.speed > 0.5 ? -13 : -3.8 * (1 - Math.abs(g.speed) / 10)) * brake
        : 0;
  const drag = 0.22 * Math.sign(g.speed) + g.speed * Math.abs(g.speed) * 0.002;
  const oldSpeed = g.speed;
  g.speed +=
    (acceleration - drag - (input.handbrake ? 16 * Math.sign(g.speed) : 0)) *
    dt;
  if (
    (!throttle && !brake && oldSpeed * g.speed < 0) ||
    (Math.abs(g.speed) < 0.02 && !throttle && !brake)
  )
    g.speed = 0;
  if ((input.handbrake || bothPedals) && oldSpeed * g.speed <= 0) g.speed = 0;
  g.speed = Math.max(-10, Math.min(48, g.speed));
  if (!onRoad(g.x, g.z)) g.speed *= Math.exp(-0.75 * dt);
  const target = Math.max(-1, Math.min(1, input.steer));
  g.steering += (target - g.steering) * Math.min(1, dt * 6);
  const wheelAngle = g.steering * (0.53 / (1 + Math.abs(g.speed) * 0.055));
  g.heading +=
    (g.speed / 2.7) * Math.tan(wheelAngle) * dt * (input.handbrake ? 1.28 : 1);
  const oldX = g.x,
    oldZ = g.z;
  g.x += Math.sin(g.heading) * g.speed * dt;
  g.z -= Math.cos(g.heading) * g.speed * dt;
  let collision = Math.abs(g.x) > LIMIT || Math.abs(g.z) > LIMIT;
  const radius = 1.7;
  for (const b of BUILDINGS) {
    if (
      Math.abs(g.x - b.x) < b.w / 2 + radius &&
      Math.abs(g.z - b.z) < b.d / 2 + radius
    ) {
      collision = true;
      break;
    }
  }
  if (!collision && !onRoad(g.x, g.z))
    for (const prop of PROPS) {
      const dx = g.x - prop.x,
        dz = g.z - prop.z;
      if (dx * dx + dz * dz < (radius + prop.radius) ** 2) {
        collision = true;
        break;
      }
    }
  if (trafficEnabled) {
    moveTraffic(g, dt);
    for (const car of g.traffic)
      if (Math.hypot(car.x - g.x, car.z - g.z) < 3.6) collision = true;
  }
  if (collision) {
    g.x = oldX;
    g.z = oldZ;
    if (g.cooldown === 0 && Math.abs(g.speed) > 2) {
      g.collisions++;
      g.cooldown = 1.5;
      g.message = "Easy does it. Brake, reverse, and try a wider turn.";
      g.messageTime = 3;
    }
    g.speed *= -0.15;
  }
  g.distance += Math.hypot(g.x - oldX, g.z - oldZ);
  g.wheelRotation += (g.speed * dt) / 0.36;
  for (const spot of LANDMARKS) {
    if (
      !g.visited.includes(spot.id) &&
      Math.hypot(g.x - spot.x, g.z - spot.z) < 35
    ) {
      g.visited.push(spot.id);
      g.message = `${spot.name} discovered. ${spot.label}`;
      g.messageTime = 6;
    }
  }
}
export function recoverCar(g: CityDrive) {
  const x = nearestStreet(g.x),
    z = nearestStreet(g.z);
  if (Math.abs(g.x - x) < Math.abs(g.z - z)) {
    g.x = x + 5;
    g.heading = 0;
  } else {
    g.z = z + 5;
    g.heading = Math.PI / 2;
  }
  g.speed = 0;
  g.steering = 0;
  g.cooldown = 2;
  // Never recover directly on top of traffic.
  for (
    let i = 0;
    i < 12 && g.traffic.some((c) => Math.hypot(c.x - g.x, c.z - g.z) < 7);
    i++
  ) {
    if (g.heading === 0) g.z = Math.max(-690, g.z - 10);
    else g.x = Math.min(690, g.x + 10);
  }
  g.message = "Back on the road.";
  g.messageTime = 3;
}
export function routeTo(from: Point, to: Point): Point[] {
  const x = nearestStreet(from.x),
    z = nearestStreet(from.z);
  const vertical = Math.abs(from.x - x) < Math.abs(from.z - z);
  const start = vertical ? { x, z: from.z } : { x: from.x, z };
  const targetX = nearestStreet(to.x),
    targetZ = nearestStreet(to.z);
  const endVertical = Math.abs(to.x - targetX) < Math.abs(to.z - targetZ);
  if (vertical && endVertical)
    return [from, start, { x, z: targetZ }, { x: targetX, z: targetZ }, to];
  if (vertical) return [from, start, { x, z: targetZ }, to];
  if (endVertical) return [from, start, { x: targetX, z }, to];
  return [from, start, { x: targetX, z }, { x: targetX, z: targetZ }, to];
}

/** Remove stick drift without a jump in steering at the edge of the dead zone. */
export function controllerSteering(axis: number) {
  if (!Number.isFinite(axis) || Math.abs(axis) <= 0.12) return 0;
  return Math.sign(axis) * Math.min(1, (Math.abs(axis) - 0.12) / 0.88);
}
