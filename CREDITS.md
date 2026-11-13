# CREDITS — Actifs du projet CREATOR (Guess Their Answer · Epitech Bénin)

## Provenance des actifs

Tous les actifs proviennent de l'extraction du jeu mobile **Guess Their Answer - IQ Games** (TapNation, package `com.qoni.guesstheiranswer`, version 5.2.3, versionCode 315) et du projet source Unity associé.

### Extraction
- Outil : AssetRipper 2.0.0 (portable, headless)
- Source : XAPK récupéré via APKPure (APKMirror bloqué par Cloudflare — FALLBACK A)
- Dossier de travail des intermédiaires : `./work/` (non déployé)
- Dossier des actifs triés : `./assets_out/` (non déployé)
- Inventaire : `ASSET_INDEX.txt` (non déployé)

### Actifs 3D (modèles glb, Draco) — écran hôte (projection 3D)
| Fichier | Provenance | Usage |
|---------|------------|-------|
| `assets/models/scene.glb` | Reassemblé depuis `Guess-Their-Answer/Assets/Guess Their Answer Level 2/` (Backdrop.fbx, Floor.fbx, Podium.fbx, Platform for charachters.fbx) via FBX2glTF + gltf-transform + Draco | Plateau : parquet, fond, gradins, 2 pupitres |
| `assets/models/char1.glb` … `char6.glb` | `Guess-Their-Answer/Assets/Charatcers/Char_*.fbx` + animations `Idle.fbx`, `Running.fbx`, `Win.fbx`, `Lose.fbx` | Personnages joueurs (6 max/camp), solo, public (clones) |
| `assets/models/crowd.glb` | Mesh allégé de char6 | 50 spectateurs sur les gradins |

### Actifs 2D / UI (WebP, ≤1024 px) — écrans téléphone + HUD hôte
Convertis depuis `Guess-Their-Answer/Assets/` via `tools/images.js` (sharp).

| Fichier | Provenance Unity | Usage écran |
|---------|------------------|-------------|
| `assets/ui/menu-bg.webp` | `GAME UI guess the words/MAIN MENU BG-03.png` | Fond d'accueil |
| `assets/ui/panel-win.webp` | `GAME UI guess the words/WIN PANEL-02.png` | Panneau victoire |
| `assets/ui/panel-fail.webp` | `GAME UI guess the words/FAILED PANEL-02.png` | Panneau défaite |
| `assets/ui/panel-pause.webp` | `GAME UI guess the words/pause panel-02.png` | Fond pause |
| `assets/ui/hourglass.webp` | `Resources/GuessTheirAnswerUI/Hourglass.png` | Sablier chrono |
| `assets/ui/input-field.webp` | `Resources/GuessTheirAnswerUI/InputFieldBackground.png` | Champ saisie téléphone |
| `assets/ui/balance-bar.webp` | `Resources/GuessTheirAnswerUI/BalanceBar.png` | Jauge d'avance Bleu/Vert |
| `assets/ui/turf-blue.webp`, `turf-green.webp` | `Gameplay UI/ASSETS/Asset 6.png`, `Asset 7.png` | Tapis d'équipe plateau |
| `assets/ui/sky.webp`, `projector.webp`, `stand.webp`, `podium.webp`, `pink-bar.webp` | `Gameplay UI/ASSETS/Asset 14,12,11,5,8.png` | Décor plateau |
| `assets/ui/key-go.webp`, `key-space.webp`, `key-123.webp`, `key-back.webp`, `key-shift.webp` | `keyboard ui/1x/Asset 27..31.png` | Clavier AZERTY téléphone |
| `assets/ui/btn-*.webp` | `GAME UI guess the words/BUTTONS/Asset 15..26.png` | Boutons UI |

### Polices (TTF/OTF, auto-hébergées @font-face)
| Fichier | Provenance | Usage |
|---------|------------|-------|
| `assets/fonts/famous-college.ttf` | `Guess-Their-Answer/Assets/Fonts/Famous College.ttf` | Titre CREATOR, réactions |
| `assets/fonts/granika.otf` | `Guess-Their-Answer/Assets/Fonts/Granika.otf` | UI (questions, chrono, labels) |
| `assets/fonts/janda-manatee-solid.ttf` | `Guess-Their-Answer/Assets/Fonts/JandaManateeSolid.ttf` | UI générale |
| `assets/fonts/ds-digi.ttf` | `Guess-Their-Answer/Assets/Fonts/DS-DIGI.TTF` | Chrono, scores, codes |

### Vendor (bibliothèques JS, sous leurs licences respectives)
`assets/vendor/` : three.min.js (r128, MIT), mqtt.min.js, GLTFLoader.js, DRACOLoader.js + wasm (three.js examples, MIT), SkeletonUtils.js (MIT).

### Banque de questions
`js/survey-questions.js` : 200 questions de sondage en français, écrites pour ce projet (thèmes : informatique, Epitech, Bénin, vie étudiante, culture générale). 5 à 6 réponses classées, points décroissants, somme ≈ 100. Validée par `tools/validate-bank.js` (0 erreurs). Chargée UNIQUEMENT côté hôte.

### Actifs du rip APK non utilisés à l'écran
`assets_out/textures/`, `sprites_ui/`, `modeles_3d/`, `audio/`, `textes_json/`, `polices/`, `icones/` contiennent le rip complet de l'APK (textures TapNation, métadonnées sprite, modèles du jeu original, 1 clip audio pub Audiomob, configs JSON, polices). Conservés à titre d'archive dans `assets_out/` (non déployé). Non utilisés dans le build CREATOR car non adaptés au layout/hôte (résolution TapNation, squelette différent, formats propriétaires).

### Licence — À CONFIRMER
Les actifs visuels et sonores proviennent d'un jeu commercial (Guess Their Answer, TapNation). Leur réutilisation dans ce projet dérivé est soumise aux conditions d'origine de TapNation et aux licences des outils tiers (Unity, three.js, etc.). Aucun acte de cession de licence n'a été vérifié. À confirmer avant toute diffusion publique.

## Scripts côté hôte (règles du jeu)
La logique de jeu (normalisation, matching alias/pluriel/Levenshtein borné, scoring, bonus rapidité, ×2, public, IA, chrono blink 15s, timings pause/win/lose) est reprise des scripts C# de `Guess-Their-Answer/Assets/Scripts/` :
`AnswerMatcher.cs`, `QuizController.cs`, `UIManager.cs`, `AiController.cs`, `AudienceManager.cs`, `LevelData.cs`, `GameManager.cs`, `GameOverScreen.js`.

## Déployé sur Vercel
Seuls `index.html`, `css/`, `js/`, `assets/` (3D+UI+fonts+vendor), `api/` et `sw.js` sont déployés. `work/`, `assets_out/`, `Guess-Their-Answer/`, `tools/`, `ASSET_INDEX.txt`, `ASSET_MAP.md`, `run.log`, `*.blend*` sont exclus (`.vercelignore`). Taille déployée < 12 Mo.
