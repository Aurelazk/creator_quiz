# MANIFEST — Extraction d'assets "Guess Their Answer - IQ Games"

## Cible
- Jeu : Guess Their Answer - IQ Games (TapNation)
- Package : com.qoni.guesstheiranswer
- Version : 5.2.3 (versionCode 315), publiée 28/09/2026
- Moteur : Unity, IL2CPP, minSdk 24 / targetSdk 35, ABIs arm64-v8a + armeabi-v7a, nodpi

## Provenance
- Page de release APKMirror : bloquée par Cloudflare ("Just a moment", anti-adblock) → clé APKMirror expirée, HTML renvoyé au lieu du binaire.
- FALLBACK A appliqué : téléchargement via APKPure (`m.apkpure.com` → `d.apkpure.com/b/XAPK/com.qoni.guesstheiranswer?versionCode=315&nc=arm64-v8a&sv=24`).
- Fichier : XAPK 194.8 Mo (zip valide), contient `com.qoni.guesstheiranswer.apk` (base, ~170 Mo) + `config.arm64_v8a.apk` (splits lib/, ~33 Mo).
- Les assets sont dans `base.apk` ; le split ne contient que des `lib/`.

## Reconnaissance (work/extract/base)
- `assets/bin/Data/` présent (fichiers de level par PathID).
- `assets/bin/Data/Managed/Metadata/global-metadata.dat` présent (12,5 Mo) → noms d'asset résolus.
- `lib/arm64-v8a/libil2cpp.so` présent (66,5 Mo) dans le split APK.
- Pas de fallback B nécessaire (métadonnées il2cpp intactes).

## Extraction
- Outil : AssetRipper 2.0.0 (portable, `AssetRipper.GUI.Free`, headless sur http://127.0.0.1:9876).
- Workspace de rip : `./work/rip/` (assets/, lib/, res/ copiés, APK non passée en entrée).
- Export : `./work/export/` via `Export/PrimaryContent`.
- Configuration : images PNG, meshes glb, sprites (json), TextAssets, AudioClip activés.
- Contrôle d'exploitabilité : `Texture2D/`, `Sprite/`, `Mesh/`, `Font/`, `Resources/` présents et nommés (pas que des `PathID_*`).

## Tri et livraison (`./assets_out/`)

| Catégorie | Contenu | Fichiers | Taille |
|-----------|---------|----------|--------|
| `textures/` | Textures2D + ressources images (PNG) | 598 | ~25,8 Mo |
| `sprites_ui/` | Métadonnées sprite (JSON) | 320 | ~3,1 Mo |
| `modeles_3d/` | Modèles glb (Mesh + Resources) | 231 | ~29,1 Mo |
| `audio/` | Clips audio (OGG) | 1 | ~34 ko |
| `textes_json/` | Configs UI, banners, audio (JSON) | 12 | ~405 ko |
| `polices/` | Polices (TTF) | 14 | ~20,0 Mo |
| `icones/` | Icônes (PNG) | 1 | ~14 ko |
| **TOTAL** | | **1177** | **~78,4 Mo** |

### Règles appliquées
- Nom d'asset d'origine conservé quand lisible ; index ajouté en cas de collision de nom entre dossiers sources.
- Toutes les images sont déjà au format PNG standard (aucune conversion `.ktx`/`.dds` requise ; aucun format exotique détecté).
- Bruit exclu : shaders (`Resources/shaders/`), scripts C# (`./work/export/Scripts/`), matériaux, `.meta`, `UnityBuiltinExtra`, assemblages (`./work/export/Assemblies/`).
- Les fichiers `.bytes` (catalogue IAP, billing, line-breaking) présents dans l'export brute ne sont pas du texte lisible ; ils sont listés ci-dessous mais non inclus dans `textes_json/`.

### Éléments notables
- Personnages / mascottes : Anna, Batman, CaptainMarvel, Naruto, Homer, HarryPotter, Tiana, Policeman, PumpkinHead, Ninja, BoyB, GirlA, BasicCharacter_1..18, Reworks_*.
- Éléments UI : KeyboardIcon, Chest_*, Play, Stop, Settings_Icon, Video_Icon, Back Arrow, Arrow, Cup_Gold, EggIcon, logos (AnzuLogo, GTA_Logo_*, Country_*).
- Icône : EggIcon.png.
- Configs : Master.json, Snapshot.json, AudiomobMixer.json (audio), imageoutline.json, uishiny.json, uidissolve.json, uieffect.json, uihsvmodifier.json, uittransition.json, banners (medium-rectangle, mobile-leaderboard).

## Échecs / limites (nommés)
- **Questions et traductions du jeu** : absentes. Aucun `TextAsset` contenant les questions n'a été exporté (les `TextAsset` sont quasi vides / distants). Conformément au FALLBACK C, les questions et traductions sont très probablement servies par une API distante ; il faudrait monter mitmproxy + certificat pour documenter les endpoints. Non inclus dans `textes_json/`.
- **Audio du jeu** : quasi absent. Un seul fichier audio exploitable : `audio/audiomob-chime-soft.ogg` (réseau publicitaire Audiomob). La musique/SFX du jeu sont probablement distantes ou dans des assets non exportés.
- **Fichiers `.bytes`** : `IAPProductCatalog.bytes`, `BillingMode.bytes`, `am-resources.bytes`, `LineBreaking ...Characters.bytes`, `gadsmebridge.js.bytes` — binaires, non lisibles en tant que texte, exclus de `textes_json/`.
- APKMirror : indisponible (Cloudflare), contourné via APKPure.

## Contrôle final
- `find ./assets_out -type f | wc -l` = 1177 (≥ 50) ✓
- Catégories = 7 (≥ 4) ✓
- `./MANIFEST.md` présent ✓
- `./run.log` couvre toutes les étapes ✓
- Ouverture visuelle / validation de type : 10+ images PNG, glb, ttf, ogg, json vérifiés valides (`file`) ✓

## Répertoire de travail
- Intermédiaires : `./work/` (extract, rip, export, assetripper, logs).
- Livrable : `./assets_out/`.
