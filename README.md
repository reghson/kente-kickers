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
- Progress saves on your device. Older saves are upgraded automatically.

## Controls
| Action | Touch | Keyboard |
|---|---|---|
| Move | Drag on left half of screen | Arrows / WASD |
| Pass / switch player | PASS | J or Space |
| Shoot (hold = power) | SHOOT | K or Enter |
| Tackle (near opponent) / Sprint (hold) | TACKLE | L or Shift |
| Pause, subs, sim | ⏸ | P or Esc |

## Notes
- All leagues, cups, clubs, players, crests and names are invented. There are no real clubs, competitions, badges or brands.
- No ads, no payments, no tracking.
- This is a plain HTML, CSS and JavaScript PWA with no build step.
- 3D graphics use [three.js](https://threejs.org) r180 (MIT licence, see `js/vendor/THREE-LICENSE.txt`), stored in the repo so the game works offline.
