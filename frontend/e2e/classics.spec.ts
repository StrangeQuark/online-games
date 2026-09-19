import { expect, test, type Page } from "@playwright/test";
import {
  canAutoFinish,
  drawStock,
  moveCards,
  newSolitaire,
  solitaireHint,
  sourceCards,
} from "../src/games/classics/solitaireRules";

async function boardMove(page: Page, from: string, to: string) {
  await page.getByRole("button", { name: new RegExp(`^${from},`) }).click();
  await page
    .getByRole("button", { name: new RegExp(`^${to},.*legal move`) })
    .click();
}

async function visibleArtworkPixels(
  page: Page,
  square: string,
): Promise<number> {
  const tile = page.getByRole("button", { name: new RegExp(`^${square},`) });
  const rendered = (await tile.screenshot({ animations: "disabled" })).toString(
    "base64",
  );
  const hide = await page.addStyleTag({
    content: ".board-pieces { visibility: hidden !important; }",
  });
  const empty = (await tile.screenshot({ animations: "disabled" })).toString(
    "base64",
  );
  await hide.evaluate((element) => element.remove());
  return page.evaluate(
    async ({ rendered, empty }) => {
      const pixels = async (data: string) => {
        const img = new Image();
        img.src = `data:image/png;base64,${data}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return {
          bytes: ctx.getImageData(0, 0, img.width, img.height).data,
          width: img.width,
          height: img.height,
        };
      };
      const [art, blank] = await Promise.all([pixels(rendered), pixels(empty)]);
      let different = 0,
        count = 0;
      for (let y = Math.ceil(art.height * 0.15); y < art.height * 0.85; y++)
        for (let x = Math.ceil(art.width * 0.15); x < art.width * 0.85; x++) {
          const i = (y * art.width + x) * 4;
          if (
            Math.abs(art.bytes[i] - blank.bytes[i]) +
              Math.abs(art.bytes[i + 1] - blank.bytes[i + 1]) +
              Math.abs(art.bytes[i + 2] - blank.bytes[i + 2]) >
            60
          )
            different++;
          count++;
        }
      return different / count;
    },
    { rendered, empty },
  );
}

test("piece artwork stays visibly painted under hover, selection, and keyboard focus", async ({
  page,
}, testInfo) => {
  for (const game of ["chess", "checkers"]) {
    await page.goto(`/#/play/${game}`);
    await page
      .getByRole("button", { name: "Pass & play", exact: true })
      .click();
    const squares =
      game === "chess"
        ? ["e2", "b1", "d1", "e1", "a8", "c8", "d8", "g7"]
        : ["c3", "b6"];
    for (const square of squares) {
      const tile = page.getByRole("button", {
        name: new RegExp(`^${square},`),
      });
      await tile.hover();
      expect(
        await visibleArtworkPixels(page, square),
        `${game} ${square} artwork on hover`,
      ).toBeGreaterThan(0.12);
      await tile.click();
      expect(
        await visibleArtworkPixels(page, square),
        `${game} ${square} artwork on click`,
      ).toBeGreaterThan(0.12);
      await page.keyboard.press("Tab");
      await tile.focus();
      expect(
        await visibleArtworkPixels(page, square),
        `${game} ${square} artwork on keyboard focus`,
      ).toBeGreaterThan(0.12);
    }
    await page
      .locator(".classic-board")
      .screenshot({ path: testInfo.outputPath(`${game}-artwork.png`) });
  }
});

test("Chess supports keyboard selection, capture feedback, takeback, and keyboard promotion", async ({
  page,
}, testInfo) => {
  await page.goto("/#/play/chess");
  await page.getByRole("button", { name: "Pass & play", exact: true }).click();
  const pawn = page.getByRole("button", {
    name: "e2, white pawn",
    exact: true,
  });
  await pawn.focus();
  await page.keyboard.press("Enter");
  await expect(pawn).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(pawn).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "e4, white pawn", exact: true }),
  ).toBeVisible();
  await boardMove(page, "d7", "d5");
  await boardMove(page, "e4", "d5");
  await expect(
    page.locator('.captured-tray[aria-label="Ivory captured 1 pieces"] svg'),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Take back", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "e4, white pawn", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "d5, black pawn", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".captured-tray svg")).toHaveCount(0);
  await page.getByRole("button", { name: "New game", exact: true }).click();
  for (const [from, to] of [
    ["a2", "a4"],
    ["h7", "h5"],
    ["a4", "a5"],
    ["h5", "h4"],
    ["a5", "a6"],
    ["h4", "h3"],
    ["a6", "b7"],
    ["h3", "g2"],
    ["b7", "a8"],
  ])
    await boardMove(page, from, to);
  const dialog = page.getByRole("dialog", { name: "Choose promotion piece" });
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Promote to queen", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "a8, white knight", exact: true }),
  ).toBeVisible();
  await page
    .locator(".classics-game")
    .screenshot({ path: testInfo.outputPath("chess-promotion.png") });
});

test("Solitaire can be solved from a real deal and Auto-finish plays every remaining card", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    Math.random = () => 2 / 0x7fffffff;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#/play/solitaire");
  let position = newSolitaire(2);
  for (let i = 0; i < 200 && !canAutoFinish(position); i++) {
    const hint = solitaireHint(position);
    if (hint) {
      const card = sourceCards(position, hint.source)[0];
      // A sequence is selected by its exposed upper strip, just as a person
      // clicks a fanned card; the card's center belongs to the card below it.
      await page
        .locator(`[data-card-id="${card.id}"]`)
        .click({ position: { x: 12, y: 10 } });
      await page
        .locator(
          `[data-target-zone="${hint.target.zone}"][data-target-pile="${hint.target.pile}"] button`,
        )
        .last()
        .click();
      position = moveCards(position, hint.source, hint.target)!;
    } else {
      await page.locator(".stock-card").click();
      position = drawStock(position)!;
    }
    await expect(page.locator(".solitaire-metrics strong").nth(2)).toHaveText(
      String(position.moves),
    );
  }
  expect(canAutoFinish(position)).toBe(true);
  expect(position.foundations.flat()).toHaveLength(47);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Auto-finish", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "Pause auto-home", exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A perfect little order.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".solitaire-result")).toContainText("1,625 points");
  await expect(page.locator(".solitaire-deal-label")).toContainText(
    "52 / 52 HOME",
  );
  await expect(page.locator(".score-notice")).toContainText("Round complete");
  await page
    .locator(".classics-game")
    .screenshot({ path: testInfo.outputPath("solitaire-solved.png") });
});

test("Solitaire supports touch dragging onto a legal column", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => {
      Math.random = () => 2009 / 0x7fffffff;
    });
    await page.goto("/#/play/solitaire");
    const queen = page.getByRole("button", {
        name: "Queen of clubs, column 7",
        exact: true,
      }),
      king = page.getByRole("button", {
        name: "King of diamonds, column 6",
        exact: true,
      });
    await queen.scrollIntoViewIfNeeded();
    await expect(page.locator(".solitaire-flight")).toHaveCount(0);
    const from = (await queen.boundingBox())!,
      to = (await king.boundingBox())!;
    const client = await context.newCDPSession(page);
    const x = from.x + from.width / 2,
      y = from.y + from.height / 2;
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x - 15, y }],
    });
    await expect(page.locator(".solitaire-touch-drag")).toBeVisible();
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: to.x + to.width / 2, y: to.y + to.height / 2 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(
      page.getByRole("button", {
        name: "Queen of clubs, column 6",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".solitaire-touch-drag")).toHaveCount(0);
    await expect(page.locator(".solitaire-metrics strong").first()).toHaveText(
      "5",
    );
  } finally {
    await context.close();
  }
});

test("Checkers shows and completes a mandatory chain, then takes back the entire turn", async ({
  page,
}, testInfo) => {
  await page.goto("/#/play/checkers");
  await page.getByRole("button", { name: "Pass & play", exact: true }).click();
  for (const [from, to] of [
    ["e3", "f4"],
    ["b6", "a5"],
    ["c3", "d4"],
    ["d6", "e5"],
    ["f4", "d6"],
    ["e7", "c5"],
  ])
    await boardMove(page, from, to);
  await expect(
    page.getByRole("button", { name: "c5, jade checker", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".capture-required")).toHaveCount(1);
  await expect(page.locator(".classic-selection-note")).toContainText(
    "Continue from c5",
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Keep jumping!" }),
  ).toBeVisible();
  await page
    .locator(".classics-game")
    .screenshot({ path: testInfo.outputPath("checkers-forced-chain.png") });
  await page
    .getByRole("button", { name: "e3, empty, legal move", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Copper to move", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "d4, empty", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Take back", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "e7, jade checker", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "d6, copper checker", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "d4, copper checker", exact: true }),
  ).toBeVisible();
});

test("Solitaire Auto-home moves several safe cards and undo restores the last card and score", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 52 / 0x7fffffff;
  });
  await page.goto("/#/play/solitaire");
  await page.getByRole("button", { name: "Auto-home", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "Pause auto-home", exact: false }),
  ).toBeVisible();
  await expect(page.locator(".solitaire-deal-label")).toContainText(
    "3 / 52 HOME",
  );
  await expect(page.locator(".solitaire-metrics strong").first()).toHaveText(
    "40",
  );
  await expect(
    page.getByRole("button", { name: "Auto-home", exact: false }),
  ).toHaveText("↑ Auto-home");
  await page.getByRole("button", { name: "Undo", exact: false }).click();
  await expect(page.locator(".solitaire-deal-label")).toContainText(
    "2 / 52 HOME",
  );
  await expect(page.locator(".solitaire-metrics strong").first()).toHaveText(
    "25",
  );
  await expect(page.locator(".solitaire-metrics strong").nth(2)).toHaveText(
    "2",
  );
});

test("finished Chess rooms do not award scores to late arrivals or on reload", async ({
  browser,
  baseURL,
}) => {
  const hostContext = await browser.newContext({ baseURL }),
    guestContext = await browser.newContext({ baseURL });
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  try {
    await host.goto("/#/play/chess");
    await host
      .getByRole("button", { name: "Pass & play", exact: true })
      .click();
    for (const [from, to] of [
      ["f2", "f3"],
      ["e7", "e5"],
      ["g2", "g4"],
      ["d8", "h4"],
    ])
      await boardMove(host, from, to);
    await expect(
      host.getByRole("heading", { name: "Obsidian wins by checkmate" }),
    ).toBeVisible();
    await expect(host.locator(".score-notice")).toContainText("Round complete");
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    await expect(host.locator(".room-connected")).toContainText(
      "You’re hosting",
    );
    const code = (
      await host.locator(".room-connected strong").innerText()
    ).replace("ROOM ", "");
    await guest.goto(`/#/play/chess?room=${code}`);
    await expect(
      guest.getByRole("heading", { name: "Obsidian wins by checkmate" }),
    ).toBeVisible();
    await expect(guest.locator(".score-notice")).toHaveCount(0);
    await guest.reload();
    await expect(
      guest.getByRole("heading", { name: "Obsidian wins by checkmate" }),
    ).toBeVisible();
    await expect(guest.locator(".score-notice")).toHaveCount(0);

    // Observing and playing the next active round still earns the guest its result.
    await host.getByRole("button", { name: "New game", exact: true }).click();
    await expect(
      guest.getByRole("heading", { name: "Ivory to move", exact: true }),
    ).toBeVisible();
    await boardMove(host, "f2", "f3");
    await expect(
      guest.getByRole("heading", { name: "Obsidian to move", exact: true }),
    ).toBeVisible();
    await boardMove(guest, "e7", "e5");
    await expect(
      host.getByRole("heading", { name: "Ivory to move", exact: true }),
    ).toBeVisible();
    await boardMove(host, "g2", "g4");
    await expect(
      guest.getByRole("heading", { name: "Obsidian to move", exact: true }),
    ).toBeVisible();
    await boardMove(guest, "d8", "h4");
    await expect(
      guest.getByRole("heading", { name: "Obsidian wins by checkmate" }),
    ).toBeVisible();
    await expect(guest.locator(".score-notice")).toContainText(
      "Round complete",
    );
    await guest.reload();
    await expect(
      guest.getByRole("heading", { name: "Obsidian wins by checkmate" }),
    ).toBeVisible();
    await expect(guest.locator(".score-notice")).toHaveCount(0);
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});

test("Checkers enforces an available jump and removes the captured piece", async ({
  page,
}) => {
  await page.goto("/#/play/checkers");
  await page.getByRole("button", { name: "Pass & play", exact: true }).click();
  await boardMove(page, "c3", "d4");
  await boardMove(page, "b6", "c5");
  await expect(
    page.getByRole("status").filter({ hasText: "A capture is available" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "g3, copper checker", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "g3, copper checker", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await boardMove(page, "d4", "b6");
  await expect(
    page.getByRole("button", { name: "b6, copper checker", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "c5, empty", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Jade to move", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".checker-scoreboard > div").nth(1).locator("strong"),
  ).toHaveText("11");
});

test("Solitaire draws, restores with undo, and ends a deal by banking the score", async ({
  page,
}) => {
  await page.goto("/#/play/solitaire");
  await expect(page.locator(".tableau-stack")).toHaveCount(7);
  await expect(page.locator(".tableau-stack .playing-card")).toHaveCount(28);
  await expect(page.locator(".tableau-stack .face-down")).toHaveCount(21);
  await page
    .getByRole("button", { name: "Draw a card, 24 cards left", exact: true })
    .click();
  const firstDraw = await page
    .locator(".waste-slot .playing-card")
    .getAttribute("aria-label");
  await expect(
    page.getByRole("button", {
      name: "Draw a card, 23 cards left",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: false }).click();
  await expect(
    page.getByRole("button", {
      name: "Draw a card, 24 cards left",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".waste-slot .playing-card")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Draw a card, 24 cards left", exact: true })
    .click();
  await expect(page.locator(".waste-slot .playing-card")).toHaveAttribute(
    "aria-label",
    firstDraw!,
  );
  await page.getByRole("button", { name: "Bank score", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A deal well played." }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({
      hasText: "Round complete. Saved to your guest scorebook on this device.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Shuffle another story", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Draw a card, 24 cards left",
      exact: true,
    }),
  ).toBeEnabled();
});

test("Solitaire moves to a foundation, restores the hidden card on undo, and drags a legal sequence", async ({
  page,
}) => {
  // Fix only the shuffle RNG; all cards are dealt and moved through the real UI.
  await page.addInitScript(() => {
    Math.random = () => 2009 / 0x7fffffff;
  });
  await page.goto("/#/play/solitaire");
  await page
    .getByRole("button", { name: "Ace of hearts, column 5", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Empty foundation 1, ace required",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Ace of hearts, foundation",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".solitaire-metrics strong").first()).toHaveText(
    "15",
  );
  await expect(
    page.locator(".tableau-stack").nth(4).locator(".face-down"),
  ).toHaveCount(3);
  await page.getByRole("button", { name: "Undo", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "Ace of hearts, column 5", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".tableau-stack").nth(4).locator(".face-down"),
  ).toHaveCount(4);
  await expect(page.locator(".solitaire-metrics strong").first()).toHaveText(
    "0",
  );
  await page
    .getByRole("button", { name: "Queen of clubs, column 7", exact: true })
    .dragTo(
      page.getByRole("button", {
        name: "King of diamonds, column 6",
        exact: true,
      }),
    );
  await expect(
    page.getByRole("button", { name: "Queen of clubs, column 6", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".solitaire-metrics strong").first()).toHaveText(
    "5",
  );
});

test("Checkers exchanges legal moves and a capture between two browsers", async ({
  browser,
  baseURL,
}) => {
  const hostContext = await browser.newContext({ baseURL }),
    guestContext = await browser.newContext({ baseURL });
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  try {
    await host.goto("/#/play/checkers");
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    const region = host.getByRole("region", { name: "Multiplayer room" });
    await expect(region).toContainText("You’re hosting");
    const code = (await region.locator("strong").innerText()).replace(
      "ROOM ",
      "",
    );
    await guest.goto("/#/play/checkers");
    await guest.getByLabel("Room code").fill(code);
    await guest.getByRole("button", { name: "Join", exact: true }).click();
    await expect(guest.getByText("Online match · playing Jade")).toBeVisible();
    await boardMove(host, "c3", "d4");
    await expect(
      guest.getByRole("button", { name: "d4, copper checker", exact: true }),
    ).toBeVisible();
    await boardMove(guest, "b6", "c5");
    await expect(
      host.getByRole("button", { name: "c5, jade checker", exact: true }),
    ).toBeVisible();
    await boardMove(host, "d4", "b6");
    await expect(
      guest.getByRole("button", { name: "c5, empty", exact: true }),
    ).toBeVisible();
    await expect(
      guest.getByRole("heading", { name: "Jade to move", exact: true }),
    ).toBeVisible();
    await expect(
      guest.locator(".checker-scoreboard > div").nth(1).locator("strong"),
    ).toHaveText("11");
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});

test("Solitaire room shares a shuffle while preserving each player’s independent board", async ({
  browser,
  baseURL,
}) => {
  const hostContext = await browser.newContext({ baseURL });
  const guestContext = await browser.newContext({ baseURL });
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  try {
    await host.goto("/#/play/solitaire");
    await host
      .getByRole("button", { name: "Create room", exact: true })
      .click();
    const region = host.getByRole("region", { name: "Multiplayer room" });
    await expect(region).toContainText("You’re hosting");
    const code = (await region.locator("strong").innerText()).replace(
      "ROOM ",
      "",
    );
    await guest.goto("/#/play/solitaire");
    await guest.getByLabel("Room code").fill(code);
    await guest.getByRole("button", { name: "Join", exact: true }).click();
    await expect(
      guest.getByRole("region", { name: "Multiplayer room" }),
    ).toContainText("You’re connected");
    const hostCards = await host
      .locator(".tableau-stack .playing-card:not(.face-down)")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("aria-label")),
      );
    await expect
      .poll(() =>
        guest
          .locator(".tableau-stack .playing-card:not(.face-down)")
          .evaluateAll((cards) =>
            cards.map((card) => card.getAttribute("aria-label")),
          ),
      )
      .toEqual(hostCards);
    await host
      .getByRole("button", { name: "Draw a card, 24 cards left", exact: true })
      .click();
    await expect(
      guest.getByRole("button", {
        name: "Draw a card, 24 cards left",
        exact: true,
      }),
    ).toBeVisible();
    await expect(guest.locator(".waste-slot .playing-card")).toHaveCount(0);
    await guest
      .getByRole("button", { name: "Draw a card, 24 cards left", exact: true })
      .click();
    await expect(guest.locator(".waste-slot .playing-card")).toHaveAttribute(
      "aria-label",
      (await host
        .locator(".waste-slot .playing-card")
        .getAttribute("aria-label"))!,
    );
    await host.getByRole("button", { name: "New deal", exact: false }).click();
    await expect(
      guest.getByRole("button", {
        name: "Draw a card, 24 cards left",
        exact: true,
      }),
    ).toBeVisible();
    const newHostCards = await host
      .locator(".tableau-stack .playing-card:not(.face-down)")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("aria-label")),
      );
    await expect
      .poll(() =>
        guest
          .locator(".tableau-stack .playing-card:not(.face-down)")
          .evaluateAll((cards) =>
            cards.map((card) => card.getAttribute("aria-label")),
          ),
      )
      .toEqual(newHostCards);
    await expect(
      guest.getByRole("button", { name: "New deal", exact: false }),
    ).toBeDisabled();
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});

test("classic boards remain usable without horizontal overflow on a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const game of ["chess", "checkers", "solitaire"]) {
    await page.goto(`/#/play/${game}`);
    await expect(page.locator(`.${game}-game`)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (game === "solitaire")
      await page
        .getByRole("button", {
          name: "Draw a card, 24 cards left",
          exact: true,
        })
        .click();
    else
      await page
        .getByRole("button", {
          name: game === "chess" ? "e2, white pawn" : "c3, copper checker",
          exact: true,
        })
        .click();
    await page.screenshot({
      path: `test-results/${game}-mobile.png`,
      fullPage: true,
    });
  }
});
