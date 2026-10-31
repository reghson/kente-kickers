# Dream League Soccer — Complete Game Overhaul

Transform the entire football experience into an authentic **Dream League Soccer (DLS)** career and live 3D match simulation — featuring the signature DLS electric cyan, broadcast navy, and neon lime aesthetic, Star Captain selection, the 8-tier Academy-to-Legendary Division pyramid, Global Challenge Cup & Diamond Cup, Live Transfer Market with Common/Rare/Legendary cards, Scouts & Agents, Technical/Fitness/GK Coaches, an 8-facility My Club complex, and an enhanced 3D broadcast match engine running 100% offline.

## User Review & Critical Decisions

> [!IMPORTANT]
> All core product, gameplay, and architecture choices have been confirmed during Phase 1 clarification:

- **Full Rebrand to Dream League Soccer Style & Theme**: Complete visual, structural, and naming transformation to **Dream League Soccer** (Coins + Gems dual currency, DLS card tiers, Academy Division through Legendary Division, Global Challenge Cup, Diamond Cup, International All-Star Cup, and custom DLS adaptive launcher icon).
- **Complete DLS Career & Club Management Systems**:
  - **Captain Selection & Manager Onboarding**: Choose a custom Manager Avatar, name your Dream FC club, and pick a marquee **Legendary/Rare Team Captain** (80–84 OVR across FW, MF, DF, GK) to lead your starting squad in the Academy Division.
  - **Full Club Facilities Complex**: Interactive **Stadium** (with stand-by-stand upgrades and capacity goals required for division promotion), **Commercial** (matchday bonus multiplier), **Medical** (injury prevention & physio cost reduction), **Training** (unlocking formations & reducing coach costs), **Accommodation** (expanding max squad size), and **Recruitment** (discounting Scouts and Transfers).
  - **Live Transfer Market, Scouts & Secret Agents**: Real-time rotating Transfer Market with **Common (55–69 OVR, Bronze/Silver)**, **Rare (70–79 OVR, Blue/Silver)**, and **Legendary (80–95+ OVR, Gold Foil)** DLS 8-stat player cards (`SPE`, `ACC`, `STA`, `CON`, `STR`, `TAC`, `PAS`, `SHO`), plus **Common/Rare/Legendary Scouts** and **Secret Agents**.
  - **Coaches System**: Convert released players or spend Gems/Coins on **Technical**, **Fitness**, and **Goalkeeping Coaches** (Common, Rare, Legendary tiers) for targeted player stat upgrades and breakthrough bonuses.
- **Broadcast 3D Match Engine & Classic DLS Controls**:
  - **DLS Broadcast HUD & 3D Presentation**: Dynamic TV broadcast camera angle, 3D stadium with animated LED boards ("DREAM LEAGUE SOCCER", "FIRST TOUCH", "LIVE MATCHDAY"), floating active player nameplates & stamina rings, directional pass/shot indicator arrows, and bottom-center live radar.
  - **Classic B / A / C Controls with Shot Power Bar**: Contextual **B** (Low Pass / Pressure), **A** (Hard Kick / Slide Tackle), and **C** (Lofted Kick / Switch Player) controls with a visual **kick power & elevation gauge** under the active player and button ring, plus **Kick Assist**, **Auto-Switch**, and **Tactical Mentality** (Defensive / Balanced / Attacking).
  - **Set Pieces, Substitutions, & Instant Replays**: Interactive corners, free kicks, penalties, in-match tactical pause menu with drag-and-drop **Substitutions** (up to 5 subs) and **Set-Piece Taker Roles** (Captain, Free Kick, Corner, Penalty), plus multi-angle slow-motion **Instant Replays** (`R+`).
- **100% Pure Offline Local Storage (Zero Firebase / External SDKs)**: All external cloud, Firebase, AdMob, and billing SDK dependencies are stripped so the game operates completely offline on local device storage with optional local JSON save export/import.

---

## 1. Overview & Core Concept

- **What It Does**: Delivers a complete Dream League Soccer experience where players build their Dream Team from the ground up — selecting a star Captain, climbing from the Academy Division to the Legendary Division, upgrading their 3D stadium and club facilities, scouting and signing Common, Rare, and Legendary superstars, training them with specialized Coaches, and playing fluid 60fps 3D matches.
- **Target Audience / Persona**: Mobile football fans who love the signature Dream League Soccer blend of accessible 3-button (`B` / `A` / `C`) 3D pitch action and deep squad/stadium progression.
- **Key Value**: Combines instant offline playability with every hallmark DLS loop — shiny Gold/Blue/Bronze 8-attribute player cards, Secret Agents, Scouts, Facility upgrades, and broadcast-grade 3D match presentation.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Manager & Captain Onboarding (New Career)**:
   - Enter Club Name, 3-letter Abbreviation, and Manager Name/Look.
   - **Select Your Captain**: Choose 1 of 9 marquee **Captain Cards** (80–83 OVR stars across Striker, Winger, Playmaker, Center-Back, and Goalkeeper) rendered in full DLS Gold/Rare card foil, paired with a balanced Academy squad.
2. **DLS Career Hub (Main Menu)**:
   - Top status bar displaying Club Crest, Club Name, Division Badge, **Coins** (`🪙`), **Gems** (`💎`), and Settings/Audio quick toggles.
   - Split-panel DLS glassmorphic dashboard featuring **Next Fixture Matchday Banner** (with Kit preview, Stadium preview, Weather, and **PLAY** button), **Season Division & Global Challenge Cup Tracker**, **Season Objectives**, and quick-access tiles for **Team Management**, **Transfers**, **My Club ( Stadium & Facilities )**, **Coaches**, and **Exhibition**.
3. **Team Management & Tactical Board**:
   - Interactive pitch view with drag-and-drop Starting XI, Substitutes bench, **Auto-Sort / Best XI**, **Heal Squad (Physio)**, **Formation Selector** (unlocked via Training Facility), **Tactical Mentality** (Defensive, Balanced, Attacking), and **Roles Assignment** (Captain, Penalty, Free Kick, Left/Right Corner takers).
4. **Live Transfer Market, Scouts & Agents**:
   - **Live Transfer Window**: Refreshing roster of Common, Rare, and Legendary players with full 8-stat DLS cards (`SPE`, `ACC`, `STA`, `CON`, `STR`, `TAC`, `PAS`, `SHO` or GK `GKH`/`GKR`), Lock Player option, and Release Player for Coach tokens.
   - **Scouts**: Send **Common**, **Rare**, or **Legendary Scouts** to discover discounted talent with countdown timers or instant reveal.
   - **Agents**: Open **Rare** or **Legendary Agents** with a dramatic card-walkout reveal animation.
5. **My Club — Stadium & Facilities Complex**:
   - Visual campus overview of **Stadium** (North, South, East, West Stands + Corner Stands + Roof, driving capacity up to 85,000 seats for Legendary Division eligibility), **Training Facility**, **Commercial Facility**, **Medical Facility**, **Accommodation Facility**, and **Recruitment Facility**.
6. **Live 3D Matchday Experience**:
   - Pre-match broadcast tunnel/lineup overlay with kit clash auto-detection and home/away kit selector.
   - Full-screen 3D broadcast view with top-left **DLS TV Scorebug** (Crests, Abbreviations, Score, Match Clock, Added Time), floating player name & stamina indicator, **Power Charge Bar** on `A` / `C` kicks, bottom-center **2D Pitch Radar** with Mentality toggle, and halftime/fulltime broadcast stats, Man of the Match ceremony, and Coin/Gem payout breakdown.

### Visual Identity & Theme

- **Aesthetic Direction**: **Dream League Soccer Modern Broadcast Glassmorphism** — sleek angled geometric panels, metallic borders, diagonal light sweeps, high-contrast uppercase sports typography, and glowing neon accents over a deep floodlit stadium backdrop.
- **Color Palette & Mood**:
  - `--background`: `#050D1E` (Deep Floodlit Stadium Navy)
  - `--surface-primary`: `#0D1E3F` to `#142D5E` (Angled Broadcast Glass Panels)
  - `--primary`: `#00E5FF` (DLS Electric Cyan accent & highlights)
  - `--accent`: `#00E676` (DLS Pitch Neon Lime for primary Play CTAs and stat boosts)
  - `--gold`: `#FFD54F` / `#F5B800` (Legendary Card Foil & Coins)
  - `--gem`: `#00F5D4` / `#2AF598` (DLS Emerald Gems currency)
  - `--rare`: `#2979FF` (Rare Player Card Sapphire Blue)
  - `--common`: `#90A4AE` / `#CD7F32` (Common Player Card Metallic Silver/Bronze)
- **Typography & Hierarchy**: Bold condensed athletic headers (`italic 900` uppercase display titles with subtle drop-shadows) paired with crisp tabular numerals (`tabular-nums`) for ratings, clocks, league tables, and 8-stat player grids.
- **Interactive Feedback & Motion**: Foil shimmer sweeps across Legendary/Rare player cards, animated pack/agent walkout reveals, tactile button press states, and smooth power-gauge charging on pitch controls.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Authentic DLS 8-Tier Division Pyramid & Multi-Cup Calendar**
  - *Chosen Approach*: Replace the regional setup with the iconic **8-Tier DLS Career Pyramid** (**Academy Division**, **Amateur Division**, **Division 4**, **Division 3**, **Division 2**, **Division 1**, **Elite Division**, and **Legendary Division**) alongside the **Global Challenge Cup**, **Diamond Cup**, and **International All-Star Cup**, while retaining an Exhibition mode with international/European clubs.
  - *Why*: Directly matches the core progression feel of Dream League Soccer where every division promotion requires both on-pitch points and Stadium capacity milestones.
- **Decision 2: DLS 8-Attribute Player Cards & Specialized Coaches**
  - *Chosen Approach*: Upgrade all player cards and simulation formulas to use the signature 8 DLS attributes (**SPE** Speed, **ACC** Acceleration, **STA** Stamina, **CON** Ball Control, **STR** Strength, **TAC** Tackling, **PAS** Passing, **SHO** Shooting; plus **GKH** Handling / **GKR** Reflexes for goalkeepers), paired with **Technical**, **Fitness**, and **GK Coaches** earned by releasing players or spending Gems.
  - *Why*: Gives player cards, scouting, and squad training the authentic DLS depth and visual layout.
- **Decision 3: Zero External SDKs & 100% Offline Local Storage**
  - *Chosen Approach*: Strip all AdMob, billing, and external cloud/Firebase references from dependencies and runtime scripts, storing all career state deterministically in local device storage with a built-in Save Backup Export/Import utility in Settings.
  - *Why*: Honors your explicit requirement for a pure offline experience with zero Firebase or third-party network dependencies.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                    ANDROID WEBVIEW HOST (Jetpack Compose)                 │
│  • Immersive Edge-to-Edge Fullscreen & Sensor Landscape Lock Bridge       │
│  • Hardware-Accelerated WebGL2 Canvas & Offline Asset Loader              │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                   DREAM LEAGUE SOCCER CORE STATE & DATA                   │
│  • LocalStorage Career Store (Coins, Gems, XP, Division, Cups, Trophies)  │
│  • 8-Stat Player & Squad Engine (Common / Rare / Legendary Card Tiers)    │
│  • Club Complex State (Stadium Stands + 5 Club Facilities Levels 0..5)    │
│  • Live Transfer Market, Scout Timer Queue, Secret Agents & Coach Pool    │
└───────────┬───────────────────────────────────┬───────────────────────────┘
            │                                   │
            ▼                                   ▼
┌───────────────────────────────────┐ ┌─────────────────────────────────────┐
│     DLS BROADCAST UI SCREENS      │ │     3D / 2D LIVE MATCH ENGINE       │
│  • Captain Selection & Onboarding │ │  • Three.js 3D Stadium, Floodlights │
│  • Career Hub & Objectives        │ │    & Animated DLS LED Boards        │
│  • Team Management & Roles Pitch  │ │  • 60Hz Physics, Offsides, Fouls,   │
│  • Live Transfers, Scouts, Agents │ │    Cards, Set Pieces & Penalties    │
│  • Coaches & Player Upgrade Modal │ │  • Contextual B/A/C Controls +      │
│  • My Club (6 Facilities + Kits)  │ │    Kick Power Bar & Tactical Radar  │
│  • League, Cups & Exhibition      │ │  • In-Match Subs & Instant Replays  │
└───────────────────────────────────┘ └─────────────────────────────────────┘
```

### Data Model & State

- **Club & Career Save (`save`)**:
  - `coins` (match & objective currency) and `gems` (division, cup, objective, and achievement premium currency).
  - `captainId` and `roles`: `{ captain, pk, fk, ckL, ckR }`.
  - `facilities`: `{ stadium: 0..7, training: 0..5, commercial: 0..5, medical: 0..5, accommodation: 0..5, recruitment: 0..5 }`.
  - `coaches`: `{ tech: { c, r, l }, fit: { c, r, l }, gk: { c, r, l } }` representing available Common, Rare, and Legendary coaches.
  - `scouts`: Active scout slots and discovered discounted targets.
- **Player Entity (`player`)**:
  - `id`, `name`, `nat`, `pos` (`GK`, `DF`, `MF`, `FW`), `foot` (`L`, `R`, `B`), `height`, `age`, `rating` (OVR 50–99), `tier` (`common`, `rare`, `legendary`), `fit` (0–100% energy), `inj` (injury games remaining).
  - `stats`: `{ spe, acc, sta, con, str, tac, pas, sho }` (derived & persisted 8-stat model).

### Interactive Component & State Mapping

- **Captain Onboarding Flow**: Selecting a Captain card highlights the card with a cyan glow, previews the player's 8 attributes, and initializes the Academy Division roster with that Captain assigned the armband and set-piece duties.
- **Transfer Market, Scouts & Agents**:
  - Signing a player checks squad capacity (governed by `Accommodation Facility` level: 16 to 32 max players) and deducts Coins (discounted by `Recruitment Facility`).
  - Releasing a squad player awards a **Common**, **Rare**, or **Legendary Coach** (based on the released player's OVR tier) or Coins.
  - Using a **Coach** in the Coaches tab randomly boosts 1–3 target attributes (`Technical` → `SHO`/`PAS`/`CON`/`TAC`; `Fitness` → `SPE`/`ACC`/`STA`/`STR`; `GK` → `GKH`/`GKR`) with visual "+2 BREAKTHROUGH!" popups.
- **Match Engine & In-Match Tactical Pause**:
  - Holding **A (Hard Kick)** or **C (Lofted Kick)** fills a color-graded **Power Gauge** (`0% → 100%`) affecting shot velocity and trajectory height.
  - Tapping the **Tactics / Pause** button during a match opens the live **In-Match Substitution & Mentality Drawer**, allowing up to 5 live substitutions for tired players and instant formation/mentality switches.
