# ⚽ Kente Kickers

An original, free football game for your phone. Build your own club, manage the squad and play real-time matches in **3D**.

**Play:** https://reghson.github.io/kente-kickers/ (install it from the browser menu with "Add to Home screen". It works offline after the first load.)

## Features
- **3D matches:** a Three.js stadium with a marked pitch, goals with nets, stands with a crowd, floodlights, lighting and shadows. A broadcast-style camera follows the ball in portrait and landscape.
  - Animated low-poly players wear their team's shirt, shorts and shirt numbers. Animations: idle, run, sprint, pass/kick, shoot, slide tackle, goalkeeper dive and goal celebrations.
  - The ball spins and casts a shadow. A ring and arrow mark the player you control.
- **Graphics settings:**
  - Choose 3D or Classic 2D, quality Low or High, and a Wide or Close camera.
  - The game picks a quality level for your device and caps the pixel ratio to keep phones smooth.
  - If WebGL is not available, it switches to Classic 2D automatically.
- **Build your club:** name, short name, crest (colours, pattern, badge) and home kit, plus 16 made-up players.
- **Career modes:**
  - **Ghana Road to Glory:** start in Division 6 and climb six divisions.
  - **Europe:** 55 countries and 86 invented leagues (2–3 tiers for big countries, 1–2 for smaller ones), with procedurally generated clubs whose names fit each country. Flags are drawn as simple colour stripes.
- **Continental cups (invented):**
  - **Continental Crown Cup** for the top finishers.
  - **Continental Shield** for the next places.
  - Both have a group stage and then knockouts. Qualification comes from the final league tables. You earn prize coins (the Crown pays more) and trophies for your cabinet.
- **Friendly mode:** any club against any club, played or simulated.
- **Manage:** 5 formations, pick your XI, train players, and buy and sell on the transfer market. Matches last 2, 3 or 5 minutes, or use quick sim.
- **Club hub (dark-blue look):** a big PLAY card with your next fixture and match length, plus 8 tiles: Team, Training, Transfers, League, Cups, Club, Kit & Crest and Stadium.
- **Two currencies, earned only by playing:** coins and **Gold Kente**. You earn them from matches, objectives, achievements and level-ups. There are no real-money purchases and no ads.
- **Player cards:** OVR, position, star rating, a nationality colour stripe, a six-stat radar (PAC/SHO/PAS/DRI/DEF/PHY) and stamina. Cards come in bronze, silver and gold.
- **Kit & Crest editor:** home and away kits (shirt, shorts and socks colours) with patterns: plain, stripes, hoops, sash, halves, pinstripe and an unlockable Kente weave. You can also edit the crest's colours, shape and emblem. The away kit is used automatically when the colours clash.
- **Club levels and stadium:** earn XP to level up your club, and spend coins to upgrade your stadium. It grows visibly from a small ground into a big arena.
- **Matchday screens:**
  - a pre-match screen with line-ups, team OVR, fitness and weather;
  - half-time stats with substitutions;
  - full-time stats (possession, shots, passes, tackles, saves);
  - man of the match, with player ratings;
  - rewards.
- **Objectives and achievements:** season objectives plus 13 achievements, each with coin and Gold Kente rewards.
- **Formation screen:** drag and drop shirts or substitutes to swap them, with stamina bars. You can also tap one player and then another.
- **Commentary pop-ups** during matches (they can be turned off in Settings), plus an optional short manager story at the start.
- **Match look:**
  - mowing patterns and rain or snow;
  - LED boards, stewards and camera operators;
  - name labels and a marker over your player;
  - a scorebar and timer;
  - a minimap with a mentality tab (Balanced, Attacking or Defending) that changes how the AI plays.
- Progress saves on your device. Older saves are upgraded automatically.

## Controls
| Action | Touch | Keyboard |
|---|---|---|
| Move | Joystick (bottom left) | Arrows / WASD |
| **A:** shoot (hold for power) / slide tackle | A | K or Enter |
| **B:** pass / pressure | B | J or Space |
| **C:** lofted kick / switch player | C | U or I |
| Sprint | SPRINT | L or Shift |
| Change mentality | Tab under the minimap | M |
| Pause, subs, sim | ⏸ | P or Esc |

The game is best played in landscape. A rotate prompt appears in portrait, and you can skip it.

## Notes
- All leagues, cups, clubs, players, crests and names are invented. There are no real clubs, competitions, badges or brands.
- No ads, no payments, no tracking.
- This is a plain HTML, CSS and JavaScript PWA with no build step.
- 3D graphics use [three.js](https://threejs.org) r180 (MIT licence, see `js/vendor/THREE-LICENSE.txt`), stored in the repo so the game works offline.
