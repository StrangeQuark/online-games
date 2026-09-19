# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rift.spec.ts >> Rift central stairs lead to armor, and mouse capture aims both axes
- Location: frontend/e2e/rift.spec.ts:98:1

# Error details

```
Error: expect(received).toBeNull()

Received: "ref: <Node>"

Call Log:
- Timeout 10000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e4]: A SMALL CORNER OF THE INTERNET. A BIG SOFT SPOT FOR GAMES.
    - generic [ref=e5]: NO DOWNLOADS. JUST PLAY.
  - banner [ref=e7]:
    - link "Afterhours home" [ref=e8] [cursor=pointer]:
      - /url: "#/"
      - generic [ref=e17]:
        - text: afterhours
        - generic [ref=e18]: THE INTERNET ARCADE
    - navigation "Main navigation" [ref=e19]:
      - link "The arcade" [ref=e20] [cursor=pointer]:
        - /url: "#/"
      - link "Hiscores" [ref=e21] [cursor=pointer]:
        - /url: "#/hiscores"
      - link "Our little story" [ref=e22] [cursor=pointer]:
        - /url: "#/about"
    - generic [ref=e23]:
      - button "Log in" [ref=e24] [cursor=pointer]
      - button "Join the club" [ref=e25] [cursor=pointer]
  - main [ref=e28]:
    - generic [ref=e29]:
      - link "Back to the arcade" [ref=e30] [cursor=pointer]:
        - /url: "#/"
      - generic [ref=e33]:
        - generic [ref=e34]:
          - generic [ref=e35]: AN AFTERHOURS ORIGINAL
          - heading "Rift Arena shooter" [level=1] [ref=e36]:
            - text: Rift
            - generic [ref=e37]: Arena shooter
        - generic [ref=e38]: 1–4 players
      - region "Multiplayer room" [ref=e44]:
        - generic [ref=e51]:
          - strong [ref=e52]: Good company. Great games.
          - generic [ref=e53]: Create a private room and invite a friend.
        - generic [ref=e54]:
          - button "Create room" [ref=e55] [cursor=pointer]
          - generic [ref=e56]: or
          - generic [ref=e57]:
            - textbox "Room code" [ref=e58]:
              - /placeholder: ROOM CODE
            - button "Join" [ref=e59] [cursor=pointer]
      - generic [ref=e62]:
        - generic [ref=e63]:
          - generic [ref=e64]:
            - generic [ref=e65]: An original 3D arena shooter
            - 'heading "Rift: Ion Foundry" [level=2] [ref=e66]'
          - button "♫ Sound off" [ref=e67] [cursor=pointer]
          - button "Fullscreen ⤢" [ref=e68] [cursor=pointer]
          - button "New match" [ref=e69] [cursor=pointer]
        - generic [ref=e70]:
          - generic "Rift 3D first-person arena. WASD move; mouse or arrows look; Space jump; click or F fire; R reload; 1 2 3 switch weapons." [active] [ref=e71]
          - generic "Arena status":
            - generic:
              - strong: 1:44
              - generic: ION FOUNDRY · FIRST TO 12
            - generic:
              - text: REACTOR SERVICE TUNNEL
              - generic: GROUND CONTACT
            - generic:
              - generic:
                - generic: HEALTH
                - strong: "100"
                - meter
              - generic:
                - generic: ARMOR
                - strong: "0"
                - meter
            - generic:
              - generic: ION CARBINE
              - strong:
                - text: "24"
                - generic: / 96
              - generic: R RELOAD · Q SWITCH
        - generic [ref=e72]:
          - generic [ref=e73]:
            - text: FRAGS
            - strong [ref=e74]: "0"
          - generic [ref=e75]:
            - text: DEATHS
            - strong [ref=e76]: "1"
          - generic [ref=e77]: Static fragmented You
          - generic [ref=e78]: Solo + 3 sentinels
        - generic "Weapon inventory" [ref=e79]:
          - button "1 Ion carbine 24 + 96" [ref=e80] [cursor=pointer]:
            - generic [ref=e81]: "1"
            - generic [ref=e82]:
              - text: Ion carbine
              - generic [ref=e83]: 24 + 96
          - button "2 Scattergun Foundry floor" [disabled] [ref=e84]:
            - generic [ref=e85]: "2"
            - generic [ref=e86]:
              - text: Scattergun
              - generic [ref=e87]: Foundry floor
          - button "3 Rocket launcher Upper galleries" [disabled] [ref=e88]:
            - generic [ref=e89]: "3"
            - generic [ref=e90]:
              - text: Rocket launcher
              - generic [ref=e91]: Upper galleries
        - paragraph [ref=e92]: W A S D move · Mouse / arrows look · Space jump · Click / F fire · R reload · 1–3 / Q / wheel weapons · Tab standings. Health, armor, ammo and weapons respawn. Rockets can hurt you. Reach the upper galleries via the side ramps or central stairs.
      - generic [ref=e93]:
        - generic [ref=e94]: Take your time. Enjoy the game.
        - button "Join to save your hiscores" [ref=e97] [cursor=pointer]
  - contentinfo [ref=e100]:
    - link "afterhours ✦" [ref=e101] [cursor=pointer]:
      - /url: "#/"
    - paragraph [ref=e102]: Good games. Late nights. Just one more round.
    - generic [ref=e103]: BUILT WITH A LITTLE NOSTALGIA
```

# Test source

```ts
  36  |   await page.keyboard.down("KeyW");
  37  |   await advance(page, 580);
  38  |   await page.keyboard.up("KeyW");
  39  |   await expect(page.locator("canvas")).toHaveAttribute(
  40  |     "data-weapon",
  41  |     "shotgun",
  42  |   );
  43  |   await expect(page.locator(".rift-notice")).toContainText(
  44  |     "SCATTERGUN ACQUIRED",
  45  |   );
  46  |   await page.keyboard.down("KeyF");
  47  |   await advance(page, 500);
  48  |   await page.keyboard.up("KeyF");
  49  |   expect(await value(page, "shots")).toBeGreaterThan(0);
  50  |   await page.keyboard.press("KeyR");
  51  |   await advance(page, 100);
  52  |   await expect(page.locator(".rift-reload")).toContainText("RELOADING");
  53  |   await advance(page, 1900);
  54  |   await expect(page.locator(".rift-reload")).not.toBeVisible();
  55  |   await page.screenshot({
  56  |     path: "test-results/rift-foundry-floor.png",
  57  |     fullPage: true,
  58  |   });
  59  |   expect(errors).toEqual([]);
  60  | });
  61  | 
  62  | test("Rift climbs a side ramp, collects upper-floor rockets, and drops back down", async ({
  63  |   page,
  64  | }) => {
  65  |   await page.clock.install();
  66  |   await page.goto("/#/play/rift");
  67  |   await page.getByRole("button", { name: "Enter the arena" }).click();
  68  |   // Start in the south court, take the west ramp, then the upper rocket cache.
  69  |   await page.keyboard.down("KeyS");
  70  |   await advance(page, 500);
  71  |   await page.keyboard.up("KeyS");
  72  |   await page.keyboard.down("KeyA");
  73  |   await advance(page, 970);
  74  |   await page.keyboard.up("KeyA");
  75  |   await page.keyboard.down("KeyW");
  76  |   await advance(page, 3300);
  77  |   await page.keyboard.up("KeyW");
  78  |   expect(await value(page, "y")).toBeCloseTo(4.5, 1);
  79  |   await expect(page.locator("canvas")).toHaveAttribute("data-weapon", "rocket");
  80  |   await expect(page.locator(".rift-location")).toContainText("UPPER GALLERIES");
  81  |   await page.keyboard.down("ArrowRight");
  82  |   await advance(page, 500);
  83  |   await page.keyboard.up("ArrowRight");
  84  |   await page.screenshot({
  85  |     path: "test-results/rift-upper-gallery.png",
  86  |     fullPage: true,
  87  |   });
  88  |   await page.keyboard.down("ArrowLeft");
  89  |   await advance(page, 500);
  90  |   await page.keyboard.up("ArrowLeft");
  91  |   await page.keyboard.down("KeyD");
  92  |   await advance(page, 950);
  93  |   await page.keyboard.up("KeyD");
  94  |   await advance(page, 1000);
  95  |   expect(await value(page, "y")).toBeLessThan(0.1);
  96  | });
  97  | 
  98  | test("Rift central stairs lead to armor, and mouse capture aims both axes", async ({
  99  |   page,
  100 | }) => {
  101 |   await page.clock.install();
  102 |   await page.goto("/#/play/rift");
  103 |   await page.getByRole("button", { name: "Enter the arena" }).click();
  104 |   await page.keyboard.down("KeyS");
  105 |   await advance(page, 800);
  106 |   await page.keyboard.up("KeyS");
  107 |   await page.keyboard.down("KeyD");
  108 |   await advance(page, 1780);
  109 |   await page.keyboard.up("KeyD");
  110 |   await page.keyboard.down("KeyW");
  111 |   await advance(page, 2650);
  112 |   await page.keyboard.up("KeyW");
  113 |   expect(await value(page, "y")).toBeCloseTo(4.5, 1);
  114 |   await expect(page.locator(".rift-vitals")).toContainText("60");
  115 |   const canvas = page.locator(".rift-stage canvas"),
  116 |     bounds = (await canvas.boundingBox())!;
  117 |   await page.mouse.click(
  118 |     bounds.x + bounds.width / 2,
  119 |     bounds.y + bounds.height / 2,
  120 |   );
  121 |   await expect
  122 |     .poll(() => page.evaluate(() => document.pointerLockElement?.tagName))
  123 |     .toBe("CANVAS");
  124 |   const before = await value(page, "pitch");
  125 |   await page.mouse.move(
  126 |     bounds.x + bounds.width / 2 + 50,
  127 |     bounds.y + bounds.height / 2 - 45,
  128 |     { steps: 5 },
  129 |   );
  130 |   await advance(page, 100);
  131 |   expect(Math.abs((await value(page, "pitch")) - before)).toBeGreaterThan(0.04);
  132 |   expect(Math.abs(await value(page, "yaw"))).toBeGreaterThan(0.04);
  133 |   await page.keyboard.press("Escape");
  134 |   await expect
  135 |     .poll(() => page.evaluate(() => document.pointerLockElement))
> 136 |     .toBeNull();
      |      ^ Error: expect(received).toBeNull()
  137 | });
  138 | 
  139 | test("Rift touch movement, jump, look pad and firing work on a small screen", async ({
  140 |   browser,
  141 |   baseURL,
  142 | }) => {
  143 |   test.setTimeout(90_000);
  144 |   const context = await browser.newContext({
  145 |     baseURL,
  146 |     viewport: { width: 390, height: 844 },
  147 |     isMobile: true,
  148 |     hasTouch: true,
  149 |   });
  150 |   const page = await context.newPage();
  151 |   try {
  152 |     const touch = await context.newCDPSession(page);
  153 |     const press = async (locator: import("@playwright/test").Locator) => {
  154 |       await locator.scrollIntoViewIfNeeded();
  155 |       const box = (await locator.boundingBox())!;
  156 |       const point = {
  157 |         x: box.x + box.width / 2,
  158 |         y: box.y + box.height / 2,
  159 |         id: 1,
  160 |       };
  161 |       await touch.send("Input.dispatchTouchEvent", {
  162 |         type: "touchStart",
  163 |         touchPoints: [point],
  164 |       });
  165 |       return point;
  166 |     };
  167 |     const release = () =>
  168 |       touch.send("Input.dispatchTouchEvent", {
  169 |         type: "touchEnd",
  170 |         touchPoints: [],
  171 |       });
  172 |     await page.clock.install();
  173 |     await page.goto("/#/play/rift");
  174 |     await page.getByRole("button", { name: "Enter the arena" }).click();
  175 |     await expect(page.locator(".rift-touch-controls")).toBeVisible();
  176 |     await press(page.getByRole("button", { name: "JUMP", exact: true }));
  177 |     await advance(page, 250);
  178 |     expect(await value(page, "y")).toBeGreaterThan(0.9);
  179 |     await release();
  180 |     await advance(page, 600);
  181 |     expect(await value(page, "y")).toBe(0);
  182 |     const point = await press(
  183 |       page.getByRole("application", { name: "Drag to look around" }),
  184 |     );
  185 |     await touch.send("Input.dispatchTouchEvent", {
  186 |       type: "touchMove",
  187 |       touchPoints: [{ ...point, x: point.x + 35, y: point.y - 35 }],
  188 |     });
  189 |     await release();
  190 |     await advance(page, 100);
  191 |     expect(await value(page, "pitch")).toBeGreaterThan(0.25);
  192 |     expect(await value(page, "yaw")).toBeLessThan(-0.2);
  193 |     await press(page.getByRole("button", { name: "FIRE", exact: true }));
  194 |     await advance(page, 300);
  195 |     await release();
  196 |     expect(await value(page, "shots")).toBeGreaterThan(0);
  197 |     expect(
  198 |       await page.evaluate(
  199 |         () => document.documentElement.scrollWidth <= innerWidth,
  200 |       ),
  201 |     ).toBe(true);
  202 |     await page.screenshot({
  203 |       path: "test-results/rift-mobile.png",
  204 |       fullPage: true,
  205 |     });
  206 |   } finally {
  207 |     await context.close();
  208 |   }
  209 | });
  210 | 
```