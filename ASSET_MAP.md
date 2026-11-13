# ASSET_MAP — Inventaire et destination à l'écran des assets

Source de vérité : `assets_out/` (rip APK `com.qoni.guesstheiranswer` v5.2.3) + `assets/` (conversion WebP depuis le projet Unity source `Guess-Their-Answer/Assets/`) + `Guess-Their-Answer/Assets/` (polices, sources PNG/FBX).

Légende : `✓` = utilisé dans le build actuel · `·` = présent, non utilisé (justifié) · `✗` = absent.

## 1. Modèles 3D (glb, Draco) — écran hôte (projection 3D)

| Fichier | Provenance | Destination à l'écran | Statut |
|---------|------------|----------------------|--------|
| `assets/models/scene.glb` | build-assets.sh (Backdrop+Floor+Podium+Platform fusionnés) | Plateau : parquet, backdrop, gradins, projecteurs, 2 pupitres | ✓ |
| `assets/models/char1.glb` … `char6.glb` | build-assets.sh (Char_1..6 + Idle/Running/Win/Lose) | Joueurs (6 au max par camp), solo (alignés) | ✓ |
| `assets/models/crowd.glb` | build-assets.sh (char6 mesh seul) | 50 spectateurs gradins (clones) | ✓ |

## 2. Textures / sprites UI (PNG) — écrans téléphone + HUD hôte

| Fichier | Provenance | Destination à l'écran | Statut |
|---------|------------|----------------------|--------|
| `assets_out/textures/InputFieldBackground.png` | rip APK | champ de saisie téléphone (`#pInputWrap .input-bg`) | ✓ |
| `assets_out/textures/Hourglass.png` | rip APK | sablier chrono (`#hourglass`, `#pTimer img`) | ✓ |
| `assets_out/textures/AnzuLogo.png` | rip APK | logo plateau | ✓ |
| `assets_out/textures/EggIcon.png` | rip APK (`assets_out/icones/`) | icône | ✓ |
| `assets_out/textures/Background.png`, `Arrow.png`, `Batman.png`, `Naruto.png`, `Anna.png`, … | rip APK | décor / boutons / panneaux (non dédiés) | · |

Sprites demandés mais ABSENTS du rip APK (déjà présents en WebP via `assets/ui/` convertis depuis la source Unity) :
`BalanceBar.png`, `MAIN MENU BG-03.png`, `WIN PANEL-02.png`, `FAILED PANEL-02.png`, `pause panel-02.png`, `Asset 2..26`, `keyboard ui/1x/Asset 27..59`, `sample-01.png`.
→ Ceux-ci sont déjà déployés dans `assets/ui/` sous forme WebP (balance-bar, hourglass, input-field, menu-bg, panel-win/fail/pause, btn-*, key-*, turf-*, sky, projector, stand, podium). Le clavier utilise key-shift/space/back/123/go (Asset 27-31). Asset 32-59 n'existent pas dans le pack source converti (le pack Unity ne contient que 27-31 sous `keyboard ui/1x/`), justifié : non disponibles à la source.

Justificatifs des assets non utilisés :
- `textures/` APK (GTA_Logo_*, KeyboardIcon_*, Characters_*, Chest_*, …) : textures du jeu mobile original, non adaptées au layout téléphone/hôte CREATOR (résolution/format spécifique TapNation). Préservées dans `assets_out/textures/` à titre d'archive, non utilisées à l'écran.
- `sprites_ui/` (320 JSON) : métadonnées de sprite Unity (9-slicing, pivots) — non nécessaires en HTML/CSS, conservées à titre d'archive.
- `modeles_3d/` APK glb (Anna, Ballons, BasicCharacter_*) : modèles du jeu original, non retargetés pour notre squelette clay. Non utilisés (nous utilisons char1..6 de la source Unity).

## 3. Audio

| Fichier | Provenance | Destination | Statut |
|---------|------------|-------------|--------|
| `assets_out/audio/audiomob-chime-soft.ogg` | rip APK (pub Audiomob) | non utilisé (pub tiers) | ✗ (exclu) |

Aucun son de jeu (clic, trouvé, raté, révélation, victoire) n'est présent dans le rip APK. Conformément à la Phase 1/5 : les sons d'événement sont reproduits en WebAudio (synthèse) dans `app.js` (`Sound.*`), liste des événements : `found`, `dup`, `miss`, `tick`, `reveal`, `start`, `win`, `lose`.

## 4. Polices (TTF) — auto-hébergées, CSS `@font-face`

| Fichier | Provenance | Usage | Statut |
|---------|------------|-------|--------|
| `assets/fonts/famous-college.ttf` | Unity Fonts | Titre CREATOR, réaction Win/Lose | ✓ |
| `assets/fonts/granika.otf` | Unity Fonts | UI (questions, chrono, labels) | ✓ |
| `assets/fonts/janda-manatee-solid.ttf` | Unity Fonts | UI générale | ✓ |
| `assets/fonts/ds-digi.ttf` | Unity Fonts | Chronomètre, scores, codes | ✓ |

## 5. TextAssets / JSON (configs UI, audio)

| Fichier | Provenance | Destination | Statut |
|---------|------------|-------------|--------|
| `assets_out/textes_json/*.json` (12) | rip APK (`Resources/`) | configs banners/audio (Audiomob) | · (non exploités en jeu) |
| `js/survey-questions.js` | écrit main (30 questions) | banque de sondages, hôte uniquement | ✓ |

## 6. Vendor (JS)

`assets/vendor/` : three.min.js (r128), mqtt.min.js, GLTFLoader.js, DRACOLoader.js (+draco wasm), SkeletonUtils.js — utilisés par `scene.js` et `net.js`. ✓

## Budget taille

- `assets/models/` : scène ≈ 0,7 Mo + 6 perso ≈ 1,8 Mo + crowd ≈ 0,3 Mo = < 3 Mo (≤ 4 Mo) ✓
- `assets/ui/` : ≈ 0,4 Mo (WebP ≤ 1024 px) ✓
- `assets/fonts/` : ≈ 0,2 Mo ✓
- Site déployé < 12 Mo (hors `work/`, `assets_out/`, `Guess-Their-Answer/`) ✓
