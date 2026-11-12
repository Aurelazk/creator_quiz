#!/usr/bin/env bash
# =============================================================================
#  Pipeline d'assets — CREATOR / Guess Their Answer
#  FBX Unity -> glTF binaire (FBX2glTF) -> fusion / décimation / Draco
#  PNG -> WebP. Aucun Blender requis.
#
#  Prérequis (hors dépôt, non versionnés) :
#    npm i fbx2gltf @gltf-transform/cli sharp
#  Usage :
#    tools/build-assets.sh [chemin/vers/Guess-Their-Answer/Assets]
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/Guess-Their-Answer/Assets}"
OUT="$ROOT/assets"
BUILD="${BUILD_DIR:-/tmp/cq-assets}"
FBX2GLTF="${FBX2GLTF:-$(command -v FBX2glTF || echo /tmp/fbx/node_modules/fbx2gltf/bin/Linux/FBX2glTF)}"
GLTF="${GLTF:-npx --prefix /tmp/fbx gltf-transform}"
NODE_PATH="${NODE_PATH:-/tmp/fbx/node_modules}"

[ -d "$SRC" ] || { echo "Assets Unity introuvables : $SRC"; exit 1; }
mkdir -p "$BUILD/fbx" "$OUT/models" "$OUT/ui" "$OUT/fonts"

conv() { # conv <fbx> <nom>
  "$FBX2GLTF" -b -o "$BUILD/fbx/$2" "$1" >/dev/null 2>&1 || true
  echo "  fbx  $(basename "$2").glb"
}

echo "== 1. Scène (gradins, pupitres, backdrop, parquet, podium) =="
L2="$SRC/Guess Their Answer Level 2/Guess Their Answer Level 2"
conv "$L2/Backdrop.fbx" "Backdrop"
conv "$L2/Floor.fbx" "Floor"
conv "$L2/Podium.fbx" "Podium"
conv "$L2/Platform for charachters.fbx" "Platform"

python3 "$ROOT/tools/build_models.py" merge \
  "$BUILD/fbx/Backdrop.glb=Backdrop,$BUILD/fbx/Floor.glb=Floor,$BUILD/fbx/Podium.glb=Podium,$BUILD/fbx/Platform.glb=Platform" \
  "$BUILD/scene-merged.glb"
$GLTF weld "$BUILD/scene-merged.glb" "$BUILD/scene-weld.glb" >/dev/null
$GLTF simplify "$BUILD/scene-weld.glb" "$BUILD/scene-simplify.glb" --ratio 0.35 --error 0.01 >/dev/null
$GLTF draco "$BUILD/scene-simplify.glb" "$OUT/models/scene.glb" >/dev/null
echo "  -> models/scene.glb ($(du -h "$OUT/models/scene.glb" | cut -f1))"

echo "== 2. Personnages + animations =="
ANIM_IDLE="$SRC/Animations/Player/Idle.fbx"
ANIM_WIN="$SRC/Animations/Player/Win.fbx"
ANIM_LOSE="$SRC/Animations/Player/Lose.fbx"
ANIM_RUN="$SRC/Animations/Char 2/Running.fbx"
conv "$ANIM_IDLE" "AnimIdle"; conv "$ANIM_RUN" "AnimRunning"
conv "$ANIM_WIN" "AnimWin"; conv "$ANIM_LOSE" "AnimLose"

declare -a CHARS=(
  "1:Char_1_Rigged"
  "2:Char_2_RIgged"
  "3:Char_3_Rigged"
  "4:Char_4_Rigged"
  "5:Char_5_Rigged"
  "6:Char_6_Rigged"
)
for entry in "${CHARS[@]}"; do
  n="${entry%%:*}"; file="${entry##*:}"
  conv "$SRC/Charatcers/Char_$n/$file.fbx" "char$n"
  python3 "$ROOT/tools/build_models.py" strip "$BUILD/fbx/char$n.glb" "$BUILD/fbx/char$n-clean.glb"
  python3 "$ROOT/tools/build_models.py" pack "$BUILD/fbx/char$n-clean.glb" \
    "Idle=$BUILD/fbx/AnimIdle.glb,Running=$BUILD/fbx/AnimRunning.glb,Win=$BUILD/fbx/AnimWin.glb,Lose=$BUILD/fbx/AnimLose.glb" \
    "$BUILD/fbx/char$n-full.glb" | grep -v '^  ->' || true
  $GLTF quantize "$BUILD/fbx/char$n-full.glb" "$BUILD/fbx/char$n-quant.glb" >/dev/null
  $GLTF draco "$BUILD/fbx/char$n-quant.glb" "$OUT/models/char$n.glb" >/dev/null
  echo "  -> models/char$n.glb ($(du -h "$OUT/models/char$n.glb" | cut -f1))"
done

# Public : même personnage, mesh seul (les clips sont réutilisés depuis char*.glb)
$GLTF draco "$BUILD/fbx/char6-clean.glb" "$OUT/models/crowd.glb" >/dev/null
echo "  -> models/crowd.glb ($(du -h "$OUT/models/crowd.glb" | cut -f1))"

echo "== 3. UI (WebP) =="
NODE_PATH="$NODE_PATH" node "$ROOT/tools/images.js" "$SRC" "$OUT"

echo "== 4. Polices =="
cp "$SRC/Fonts/Famous College.ttf" "$OUT/fonts/famous-college.ttf"
cp "$SRC/Fonts/Granika.otf" "$OUT/fonts/granika.otf"
cp "$SRC/Fonts/JandaManateeSolid.ttf" "$OUT/fonts/janda-manatee-solid.ttf"
cp "$SRC/Fonts/DS-DIGI.TTF" "$OUT/fonts/ds-digi.ttf"
ls -la "$OUT/fonts"

echo "== Total assets =="
du -sh "$OUT" "$OUT/models" "$OUT/ui" "$OUT/fonts"
