# Original visual assets

Rift’s current arenas use original seamless procedural metal, stone, hull and floor materials authored in `world.ts`. The original generated `frontend/public/assets/rift-wall.webp` remains available as an industrial material study.

All fifteen cover illustrations were generated with the built-in image generation tool. The original five full-resolution cover sources are saved in `docs/artwork-source/`; later source paths are recorded below. The application loads optimized WebP copies from `frontend/public/assets/`. They are original generated illustrations, not photographs of hand-painted work. The in-game chess pieces are original SVG drawings; board, card, spacecraft, and arena graphics are drawn from project source.

## Final prompts

The site uses locally hosted DM Sans and Manrope font files from Google Fonts. Their SIL Open Font License notices are preserved alongside the files in `frontend/public/assets/fonts/`. UI symbols use the Lucide React package; all game artwork is original to this project.

### rift-wall.png

Use case: stylized-concept.
Asset type: original 1024x1024 square tileable wall texture for a retro first-person shooter, UV texture viewed EXACTLY flat straight-on orthographic with NO perspective.
Primary request: a richly detailed old industrial orbital fortress wall. Dark desaturated blue-grey metal and weathered stone blocks in large rectangular courses, aged copper mechanical trim strips, rusted bolts, inset vertical ribbed vents, subtle carved angular original geometric shapes. Small old-fashioned maintenance panels, scratches, soot, oxidation, patina. Moody and richly tactile, hand-painted 1990s video game texture style. Mid-dark diffuse even flat illumination with enough contrast to see all material details, no dramatic light sources, no glow, no shadow casting. Seamlessly repeating texture left/right/top/bottom. Main geometry simple and readable at 128x128 as well as detailed at full size. No words, text, lettering, emblems, signs, logos, watermarks. No floor, no ceiling, no characters, no weapons. Covers the entire square edge to edge.

### starfall.png

Use case: stylized-concept
Asset type: original browser arcade website panoramic featured game cover, landscape 1536x1024
Primary request: beautiful lovingly hand-painted science fiction key art for an original asteroid mining and base defense game called Starfall, but NO WORDS OR LETTERING.
Scene: vast deep midnight blue space, smoky teal nebula, a warm cream distant ringed planet partially visible at upper right. In the foreground, rugged ochre and umber asteroids hold intricate small industrial mining facilities, copper solar panels, antenna arrays, cool cyan lit power conduits connecting to an angular orbital command station, tiny thruster trails and blue laser defenses against distant hostile orange lights.
Style: 1990s science fiction strategy game box illustration, rich hand-painted gouache brush texture, very detailed and atmospheric, elegant cinematic depth and strong painterly silhouettes, premium editorial illustration, not pixel art.
Composition: broad orbital mining outpost concentrated in center-right and lower right, left third mostly atmospheric dark blue/teal space for website HTML text overlay. Organic painted shapes, warm cream/coral accents, restrained luminous highlights.
Constraints: entirely original designs, no text no logo no watermark, no copying any existing game artwork.

### rift.png

Use case: stylized-concept
Asset type: landscape 1536x1024 original cover illustration for retro browser first-person arena shooter RIFT (NO text).
Primary request: beautifully hand-painted 1990s science fiction PC game box cover: an imposing original armored space ranger in ochre and burnt orange armor stands in a monumental dark industrial gothic orbital fortress corridor, a luminous teal dimensional portal behind, brutalist stone pillars and conduits, flickering copper lamps, smoky shafts of light, sparks. An original heavy retro energy weapon held across chest, helmet opaque with cream horizontal visor, strong confident silhouette.
Style: high quality gouache and oil painted illustration, crisp detail on ranger and loose atmospheric edges, tactile vintage printed game magazine quality, deep navy/teal shadows, terracotta copper and pale ivory highlights, understated film grain.
Composition: ranger centered-right, low angle cinematic wide environment, highly designed dramatic lighting. Not pixel art, not glossy 3D.
Constraints: no letters text logos watermarks; entirely original character and environment.

### chess.png

Use case: stylized-concept. Asset type: original landscape 1536x1024 illustrated game cover for a timeless chess game. Beautiful hand-painted gouache still life of a sculptural carved ivory knight in center foreground, an elegant crowned king and several dark walnut chess pieces behind, on an olive green and ivory chessboard. Thoughtfully drawn precise recognizable classic Staunton piece silhouettes, matte hand-crafted wood and ivory textures. Background deep forest green with hazy autumn light, beautiful warm parchment highlights. High quality vintage book cover / 1990s illustrated magazine, sophisticated painterly brush marks, intimate cinematic low angle. Balanced landscape composition, no lettering no text no logos no watermarks. Clear negative space across upper quarter.

### solitaire.png

Use case: stylized-concept. Asset type: original landscape 1536x1024 browser Solitaire game cover. Beautiful hand-painted gouache illustration of several elegant ivory vintage playing cards fanning gently over a rich emerald green velvet table: ace of hearts and ace of spades prominent with recognizable suit pips, an intricately illustrated queen with warm ochre hair and tiny botanical details. Small golden star ornaments and stylized leaf shadows, pale coral warm highlights. Classic library reading-room warmth, vintage illustrated book cover with fine hand-painted paper texture and precise crafted edges, inviting tactile quality. Carefully designed harmonious landscape composition, no words no extra letters no logo no watermark. Not a photo, no human hands.

### checkers.png

Use case: stylized-concept. Asset type: original landscape 1536x1024 browser Checkers game cover. Beautiful hand-painted gouache still life of rounded terracotta red and pale cream wooden checkers discs on a warmly lit russet and cream checkerboard, low cinematic diagonal perspective. One foreground terracotta checker has a tiny hand-carved crown and is stacked on another disc, a few ivory pieces recede into background. Lovely tactile woodgrain concentric circles and warm delicate rim highlights, muted burnt-sienna backdrop, a soft late-afternoon sunbeam. Sophisticated vintage illustrated game book aesthetic, quality painterly shapes and rich color, strongly readable composition. No chess pieces, no text, no letters, no logos, no watermark.

## September gameplay iteration

Chess and Checkers now use shaded SVG artwork with independent paint identifiers and explicit layers for selection and captured pieces. Solitaire has animated deal, flip, cross-pile movement, and automatic foundation moves.

Rift uses original modeled weapons and articulated armored operators. Rounded helmets and visors, layered chest armor, undersuits, straps, gloves, fingers, knee/elbow joints and boots replace the earlier block figures. Six distinct mechanical weapon models have moving magazines, slides/chambers, first-person hands, recoil, reload motion and weapon switching. Operators walk, sprint, aim, fall, reconstruct, cloak and use visible jet exhaust. Four environments share their visible geometry with collision: industrial foundry, mossy stone aqueduct, sandstone fortress and orbital docks. Original procedural surfaces, architectural lighting, material reflections, floating equipment pickups, muzzle effects, moving projectile trails and pooled impact particles complete the presentation. Static architecture and pickup geometry are batched; rigid bone weights keep the operator skin to five material draws. Detected software WebGL uses cheaper lighting and lower render resolution; hardware retains detailed PBR materials. All models and animations are authored directly in TypeScript/Three.js; no imported character or weapon asset packs were used.

Starfall uses a new Canvas renderer with nine distinct station silhouettes, seven enemy designs, cached faceted mineral asteroids, animated power links and mining beams, construction rings, missile trails, four traveling repair drones per repair station, shield markings, and a clickable sector map. Gameplay and decorative movement respect pause and motion settings. The cover images and both original soundtracks remain part of the finished presentation.

## Neon Break (September 19 iteration)

- Asset: `frontend/public/assets/neonbreak.webp`
- Generated with the built-in imagegen tool, then resized/encoded to WebP for the site with FFmpeg.
- Final prompt: Wide landscape illustrated cover for Neon Break. No typography. An ivory energy ball with a curved cyan trail smashing into suspended coral, turquoise, amber and violet glass bricks; a brass-and-ivory paddle below. Dark midnight retrofuturistic chamber, painterly grain and gouache texture, vintage science-fiction paperback mood, cinematic light, flying glass fragments. Dynamic diagonal composition, premium hand-painted look, 3:2 framing, no people/UI/letters/numbers/watermarks.

## Lumen (September 19 iteration)

- Asset: `frontend/public/assets/lumen.webp`
- Built-in imagegen; WebP encoding with FFmpeg.
- Final prompt: Wide illustrated cover for a relaxing circuit puzzle. Antique brass puzzle board on midnight navy velvet in a conservatory; ivory ceramic tiles with interconnected copper paths and a luminous crystal source, mint and gold light traveling to glass bulbs. Ferns, botanical shadows, stars beyond a window, fireflies. Painterly vintage science-fiction storybook illustration, aged brass and glowing glass, oblique overhead view showing the grid. Midnight teal, ochre, ivory and mint. Landscape 3:2, no text, UI, people or watermark.

### Petal cover (2026-09-19)
- Project asset: `frontend/public/assets/petal.webp` (1200 px WebP).
- Original: `/home/strangequark/.codex/generated_images/01a0b7ac-b86c-76c0-bc43-89355984de3c/exec-e8f00931-3d7d-442f-b0ec-786d318a6b56.png`.
- Prompt: “Landscape illustrated cover for an original cozy match-three garden puzzle, Petal. No lettering, no words. An enchanted small tabletop garden filled with luminous hand-carved jewel-like flower tokens, arranged in a loose inviting mosaic. Coral camellias, violet bellflowers, golden sunflower stars, mint clover leaves and pale blue dew drops, tactile glazed ceramic and gently glowing glass. Three matching coral flowers release a swirl of tiny petals and warm firefly sparkles. Midnight conservatory, navy and forest teal, warm lamplight, painterly vintage botanical storybook illustration. Wide 3:2 composition, readable central flower forms, no people, interface, text, or watermark.”

### Driftline cover (2026-09-19)
- Project asset: `frontend/public/assets/driftline.webp` (1200 px WebP).
- Original: `/home/strangequark/.codex/generated_images/01a0b7ac-b86c-76c0-bc43-89355984de3c/exec-76c26713-9b07-429d-bab0-a16a07f4da0c.png`.
- Prompt: “A premium illustrated landscape cover for a retro coastal driving game called Driftline, no lettering. A cream-white vintage sports coupe viewed from rear three-quarter speeds along a winding cliffside road beside a turquoise ocean at sunset. Terracotta cliffs, umbrella pines, distant lighthouse, cream road markings catching amber light, teal shadows, sweeping hairpin road. Painterly vintage travel poster, fine grain, muted mint, ochre, peach and petrol blue. Car lower middle, road curves through center, scenic sky above. Inviting, nostalgic motion, no interface, text, branding, watermark.”

### Pocket Putt cover (2026-09-19)
- Project asset: `frontend/public/assets/pocketputt.webp` (1200 px WebP).
- Original: `/home/strangequark/.codex/generated_images/01a0b7ac-b86c-76c0-bc43-89355984de3c/exec-a7849070-c9dc-4ff3-bcf4-01857197bb8f.png`.
- Prompt: “Premium landscape cover for a cozy miniature golf game, Pocket Putt. No text. A handcrafted miniature putting garden from an elevated three-quarter angle: moss green curved putting lane, warm sandstone borders, ivory golf ball, brass cup, coral pennant. Topiary, lavender, arched wooden bridge over a teal pond, pebbles, ferns, brass garden lights. Evening golden sun and long shadows. Painterly storybook editorial illustration, paper grain, tactile miniature architecture, sage, emerald, ochre, cream and coral. Wide 3:2, no people, logos, UI or watermark.”

### Fourfold cover (2026-09-19)
- Project asset: `frontend/public/assets/fourfold.webp` (1200 px WebP).
- Original: `/home/strangequark/.codex/generated_images/01a0b7ac-b86c-76c0-bc43-89355984de3c/exec-1850f31a-1dd5-4b25-b676-18bb3210485c.png`.
- Prompt: “Premium cozy four-in-a-row tabletop game cover, no text. Crafted upright walnut frame, seven columns and six rows of circular openings, jade-green and honey-gold wooden discs, a softly glowing diagonal four. Loose polished discs on moss felt. Evening library or conservatory, brass reading lamp, blurred books and ferns, amber light and petrol blue shadows. Tactile wood, beveled holes, painterly editorial illustration, nostalgic table club mood. Wide 3:2, no people, hands, logos, UI or watermark.”

### Wispwood forest (2026-09-19)
- Project asset: `frontend/public/assets/wispwood.webp` (1536 px WebP), used as the cover and parallax game background.
- Original: `/home/strangequark/.codex/generated_images/01a0b7ac-b86c-76c0-bc43-89355984de3c/exec-9ff0dfab-099d-42cf-9a2b-20bfabcd38b5.png`.
- Prompt: “Atmospheric secret forest at blue hour. Huge graceful trees frame left and right, ferns, distant mist, warm brass lanterns and fireflies. A small ancient mossy arch in the middle-right. Open middle and lower areas for game platforms. Gouache, colored pencil, paper grain; petrol teal, moss, midnight and gold. Wide 3:2 composition. No characters, text, UI or watermark.”

### Parcel courtyard (2026-09-19)
- Project asset: `frontend/public/assets/parcel.webp` (1200 px WebP).
- Original: `/home/strangequark/.codex/generated_images/01a0b7ac-b86c-76c0-bc43-89355984de3c/exec-230ab789-d334-42b7-a55f-faa62169d284.png`.
- Prompt: “An original wide cover for a cozy parcel-delivery puzzle. A forest village post-office courtyard from a gentle elevated angle: warm sandstone paving, kraft-paper parcels with cream twine, brass circular delivery pads with envelope motifs, moss-green post boxes, a mail trolley, ivy, terracotta pots and a porch lantern. Coral doorway, distant rooftops, amber afternoon sun. Painterly gouache storybook illustration with colored-pencil detail and paper grain, petrol teal shadows, cream, terracotta and moss. Readable central parcels, wide 3:2. No people, text, letters, logos, UI or watermark.”
- In-game courtyard, courier, packages, greenery and delivery-pad artwork are original SVG drawings in `ParcelBoard.tsx`.

### Keepsake jigsaw (2026-09-19)
- Project asset: `frontend/public/assets/keepsake.webp` (1200 px WebP).
- Original: `/home/strangequark/.codex/generated_images/01a0b7ac-b86c-76c0-bc43-89355984de3c/exec-b3babf1c-65a5-4aae-9809-83537f226154.png`.
- Prompt: “An original cozy cooperative-jigsaw cover with no text. An inviting walnut table by an evening window; a partially assembled jigsaw of a cream lighthouse above turquoise ocean and terracotta cliffs. Large tactile scattered pieces, brass desk lamp, ceramic tea, a pressed fern and a kraft paper puzzle box. Painterly gouache and colored pencil, paper texture, cream, sage, coral, ochre and petrol teal shadows. Elevated three-quarter view, readable interlocking shapes, warm lamplight, nostalgic and thoughtful. Wide 3:2, no people, hands, UI, letters, logos or watermark.”
- The game reuses five of this project's original illustrated scenes. Complementary piece outlines and clipping paths are generated from original code, with SVG rendering and draggable pieces.

### Mosaic ceramic studio (2026-09-19)
- Project asset: `frontend/public/assets/mosaic.webp` (1200 × 800 WebP).
- Original: `/home/strangequark/.codex/generated_images/01a0b7ac-b86c-76c0-bc43-89355984de3c/exec-6523f49a-8a26-4bba-a583-7dce4487d327.png`.
- Generated with the built-in imagegen tool; resized and encoded with Pillow.
- Final prompt: “Create a premium illustrated game cover for an original browser puzzle called Mosaic. Landscape 3:2 composition, NO WORDS, NO LETTERING, NO LOGOS. A small handmade ceramic tile puzzle on a warm walnut desk in a Mediterranean artist's studio at golden hour. The square 4 by 4 wooden tray contains some glossy colorful square ceramic tiles, in seafoam green, deep teal, terracotta, butter yellow and warm ivory, each with a very simple embossed botanical rosette or geometric floral motif, some empty tray spaces. A few loose ceramic tiles, artisan brush, little bowl and olive sprig beside it. Windows cast beautiful warm diagonal light. Editorial hand-painted gouache illustration with soft tactile texture, lovingly detailed, sophisticated muted palette, beautiful lush teal shadows and luminous cream light. A gentle cozy tabletop game, intriguing puzzle composition. Strong clear silhouette and generous framing suitable for a small web game card. Entire scene illustrated, no photography, no user interface, no human hands.”
- In-game tiles, embossed motifs, spaces and movement effects are CSS and text primitives, so the board stays sharp at every size.
