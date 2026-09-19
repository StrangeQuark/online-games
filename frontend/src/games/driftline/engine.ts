export type DriveMode = "trial" | "scenic";
export type CourseId = "coast" | "alpine" | "night";
export type Course = {
  id: CourseId;
  name: string;
  subtitle: string;
  length: number;
  time: number;
  traffic: number;
  curve: number;
  hill: number;
  sky: [string, string];
  ground: [string, string];
  road: [string, string];
  accent: string;
};
export const COURSES: Course[] = [
  {
    id: "coast",
    name: "The golden coast",
    subtitle: "Ocean air. Open road.",
    length: 180000,
    time: 48,
    traffic: 32,
    curve: 1.8,
    hill: 380,
    sky: ["#5b929a", "#efd1a0"],
    ground: ["#9c906a", "#a89a73"],
    road: ["#62696b", "#677073"],
    accent: "#e8ba7f",
  },
  {
    id: "alpine",
    name: "Above the clouds",
    subtitle: "Higher roads. Sharper turns.",
    length: 240000,
    time: 59,
    traffic: 46,
    curve: 2.8,
    hill: 680,
    sky: ["#577b91", "#bacbc9"],
    ground: ["#486753", "#50745c"],
    road: ["#536164", "#586769"],
    accent: "#b4d5be",
  },
  {
    id: "night",
    name: "Midnight radio",
    subtitle: "City lights. One last drive.",
    length: 280000,
    time: 64,
    traffic: 58,
    curve: 2.3,
    hill: 230,
    sky: ["#111c37", "#70536c"],
    ground: ["#213f43", "#28494c"],
    road: ["#394653", "#3e4d5b"],
    accent: "#e6a6b1",
  },
];
export type DriverInput = {
  steer: number;
  brake: boolean;
  boost: boolean;
  drift: boolean;
};
export type Traffic = {
  id: number;
  z: number;
  x: number;
  speed: number;
  color: string;
  passed: boolean;
};
export type Trace = { t: number; z: number; x: number };
export type Drive = {
  id: string;
  course: CourseId;
  mode: DriveMode;
  phase: "ready" | "racing" | "paused" | "finished" | "timeout";
  z: number;
  x: number;
  speed: number;
  elapsed: number;
  remaining: number;
  score: number;
  boost: number;
  drift: number;
  driftChain: number;
  driftPoints: number;
  nearMisses: number;
  collisions: number;
  checkpoint: number;
  traffic: Traffic[];
  invincible: number;
  shake: number;
  flash: number;
  message: string;
  messageTime: number;
  boosting: boolean;
  offroad: boolean;
  steer: number;
  trace: Trace[];
  traceAt: number;
  events: ("hit" | "near" | "checkpoint" | "drift" | "finish")[];
};
export const MAX_SPEED = 7000,
  ROAD_WIDTH = 2000,
  SEGMENT = 200;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export function courseOf(game: Drive) {
  return COURSES.find((c) => c.id === game.course)!;
}
export function curveAt(z: number, course: Course) {
  const warm = clamp((z - 4000) / 12000, 0, 1);
  return (
    warm *
    course.curve *
    (Math.sin(z / 12600) * 0.75 + Math.sin(z / 5100) * 0.25)
  );
}
export function hillAt(z: number, course: Course) {
  return course.hill * (Math.sin(z / 10500) + Math.sin(z / 26000) * 0.6);
}
export function newDrive(
  course: CourseId = "coast",
  mode: DriveMode = "trial",
): Drive {
  const c = COURSES.find((c) => c.id === course)!;
  let rng = 13571 + COURSES.indexOf(c) * 991;
  const rand = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  const colors = [
    "#d9c3a0",
    "#d97968",
    "#88b8ad",
    "#b9a6c1",
    "#dfa857",
    "#7ca1ba",
  ];
  const trafficCount =
    mode === "scenic" ? Math.ceil(c.traffic * 0.55) : c.traffic;
  const traffic = Array.from({ length: trafficCount }, (_, i) => ({
    id: i,
    z: 7500 + (i * (c.length - 9000)) / trafficCount,
    x: [-0.63, 0, 0.63][Math.floor(rand() * 3)] + (rand() - 0.5) * 0.07,
    speed: 1900 + rand() * 1600,
    color: colors[Math.floor(rand() * colors.length)],
    passed: false,
  }));
  return {
    id: crypto.randomUUID(),
    course,
    mode,
    phase: "ready",
    z: 0,
    x: 0,
    speed: 0,
    elapsed: 0,
    remaining: c.time,
    score: 0,
    boost: 100,
    drift: 0,
    driftChain: 0,
    driftPoints: 0,
    nearMisses: 0,
    collisions: 0,
    checkpoint: 0,
    traffic,
    invincible: 0,
    shake: 0,
    flash: 0,
    message: "THE ROAD IS YOURS",
    messageTime: 2,
    boosting: false,
    offroad: false,
    steer: 0,
    trace: [],
    traceAt: 0,
    events: [],
  };
}
export function startDrive(g: Drive) {
  if (g.phase === "ready") g.phase = "racing";
}
export function pauseDrive(g: Drive) {
  if (g.phase === "racing") g.phase = "paused";
  else if (g.phase === "paused") g.phase = "racing";
}
export function updateDrive(g: Drive, input: DriverInput, delta: number) {
  g.events = [];
  if (g.phase !== "racing") return;
  const dt = clamp(delta, 0, 0.05),
    c = courseOf(g),
    oldZ = g.z;
  g.elapsed += dt;
  if (g.mode === "trial") g.remaining = Math.max(0, g.remaining - dt);
  g.invincible = Math.max(0, g.invincible - dt);
  g.shake = Math.max(0, g.shake - dt * 3);
  g.flash = Math.max(0, g.flash - dt * 2);
  g.messageTime = Math.max(0, g.messageTime - dt);
  const speedRatio = g.speed / MAX_SPEED,
    curve = curveAt(g.z, c);
  g.steer += (clamp(input.steer, -1, 1) - g.steer) * Math.min(1, dt * 8);
  g.offroad = Math.abs(g.x) > 1.04;
  g.boosting =
    input.boost &&
    g.boost > (g.boosting ? 0 : 12) &&
    !input.brake &&
    !g.offroad;
  const drifting =
    input.drift && Math.abs(input.steer) > 0.2 && g.speed > 2600 && !g.offroad;
  g.drift += (Number(drifting) - g.drift) * Math.min(1, dt * 7);
  const max = g.boosting
    ? 9700
    : g.offroad
      ? 2800
      : g.mode === "scenic"
        ? 6000
        : MAX_SPEED;
  const acceleration = input.brake
    ? -6300
    : g.offroad
      ? g.speed > max
        ? -4800
        : 900
      : g.boosting
        ? 4200
        : 2100;
  g.speed = clamp(
    g.speed + acceleration * dt,
    0,
    g.speed > max ? Math.max(max, g.speed - 1800 * dt) : max,
  );
  if (drifting) g.speed = Math.max(2600, g.speed - 450 * dt);
  g.x +=
    input.steer *
      (0.45 + Math.min(speedRatio, 1.2) * 1.65) *
      (drifting ? 1.3 : 1) *
      dt -
    curve * speedRatio * speedRatio * 0.52 * dt;
  g.x = clamp(g.x, -2, 2);
  g.z += g.speed * dt;
  g.score += (g.z - oldZ) * 0.017;
  g.boost = clamp(
    g.boost + (g.boosting ? -29 : drifting ? 15 : 6) * dt,
    0,
    100,
  );
  if (drifting && Math.abs(curve) > 0.35) {
    g.driftChain += dt;
    g.driftPoints += dt * 70 * (1 + Math.min(2, g.driftChain / 3));
  } else if (g.driftChain > 0) {
    if (g.driftChain > 0.6) {
      const points = Math.floor(g.driftPoints);
      g.score += points;
      g.message = `SMOOTH DRIFT +${points}`;
      g.messageTime = 1.5;
      g.events.push("drift");
    }
    g.driftChain = 0;
    g.driftPoints = 0;
  }
  for (const car of g.traffic) {
    const before = car.z - oldZ;
    car.z += car.speed * dt;
    const distance = car.z - g.z,
      apart = Math.abs(car.x - g.x);
    if (
      Math.abs(distance) < 410 &&
      apart < 0.245 &&
      g.invincible <= 0 &&
      g.speed > car.speed * 0.7
    ) {
      g.speed *= 0.37;
      g.invincible = 1.25;
      g.shake = 1;
      g.collisions++;
      g.driftChain = 0;
      g.driftPoints = 0;
      g.message = "EASY NOW · FIND YOUR LINE";
      g.messageTime = 1.8;
      g.events.push("hit");
    }
    if (before > 0 && distance <= 0 && !car.passed) {
      car.passed = true;
      if (apart >= 0.245 && apart < 0.48 && !g.offroad && g.invincible <= 0) {
        g.nearMisses++;
        g.score += 200;
        g.boost = clamp(g.boost + 12, 0, 100);
        g.flash = 0.45;
        g.message = "CLOSE CALL +200";
        g.messageTime = 1.3;
        g.events.push("near");
      }
    }
  }
  const checkpoint = Math.min(2, Math.floor(g.z / (c.length / 3)));
  if (checkpoint > g.checkpoint) {
    g.checkpoint = checkpoint;
    if (g.mode === "trial") g.remaining += 10;
    g.score += 500;
    g.flash = 0.6;
    g.message =
      g.mode === "scenic"
        ? "A LOVELY STRETCH OF ROAD · +500"
        : "CHECKPOINT · +10 SECONDS";
    g.messageTime = 2;
    g.events.push("checkpoint");
  }
  if (g.mode === "trial" && g.elapsed >= g.traceAt) {
    g.trace.push({ t: g.elapsed, z: g.z, x: g.x });
    g.traceAt = g.elapsed + 0.1;
  }
  if (g.z >= c.length) {
    g.z = c.length;
    g.phase = "finished";
    g.score +=
      (g.mode === "trial" ? Math.floor(g.remaining * 60) : 0) +
      Math.max(0, 1500 - g.collisions * 200);
    g.message = "WHAT A DRIVE.";
    g.events.push("finish");
  } else if (g.mode === "trial" && g.remaining <= 0) {
    g.phase = "timeout";
    g.message = "THE SUN CAN WAIT.";
  }
  g.score = Math.max(0, g.score);
}
export function ghostAt(trace: Trace[], time: number): Trace | null {
  if (!trace.length || time > trace[trace.length - 1].t) return null;
  let low = 0,
    high = trace.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (trace[mid].t < time) low = mid + 1;
    else high = mid;
  }
  const a = trace[Math.max(0, low - 1)],
    b = trace[low],
    f = b.t === a.t ? 0 : clamp((time - a.t) / (b.t - a.t), 0, 1);
  return { t: time, z: a.z + (b.z - a.z) * f, x: a.x + (b.x - a.x) * f };
}
export function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60),
    secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}.${Math.floor((seconds % 1) * 10)}`;
}
