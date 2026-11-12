#!/usr/bin/env python3
"""
Construction des modèles du jeu à partir du projet Unity "Guess Their Answer".

- scene.glb   : Backdrop + Floor + Podium x2 + Platform (gradins/pupitres) fusionnés,
                chaque morceau sous un noeud nommé pour être placé par le code.
- charN.glb   : personnage skinné + les AnimationClips Idle / Running / Win / Lose
                fusionnées dans le même fichier (retarget par nom d'os mixamorig:*).

Les FBX sont convertis en amont par FBX2glTF (voir tools/build-assets.sh) ; ce script
ne fait que réassembler les buffers glTF (aucune dépendance externe).
"""
import json
import os
import struct
import sys

GLB_MAGIC = 0x46546C67
CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942

COMP_SIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
NUM_COMP = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT2": 4, "MAT3": 9, "MAT4": 16}


# --------------------------------------------------------------------------- glb io
def read_glb(path):
    with open(path, "rb") as fh:
        data = fh.read()
    magic, _version, length = struct.unpack("<III", data[:12])
    if magic != GLB_MAGIC:
        raise ValueError("%s n'est pas un GLB" % path)
    off, js, binbuf = 12, None, b""
    while off < length:
        clen, ctype = struct.unpack("<II", data[off:off + 8])
        chunk = data[off + 8:off + 8 + clen]
        if ctype == CHUNK_JSON:
            js = json.loads(chunk.decode("utf-8"))
        elif ctype == CHUNK_BIN:
            binbuf = chunk
        off += 8 + clen
    return js, bytearray(binbuf)


def write_glb(path, js, binbuf):
    js = {k: v for k, v in js.items() if not (isinstance(v, list) and not v)}
    js.setdefault("buffers", [{"byteLength": len(binbuf)}])
    js["buffers"][0]["byteLength"] = len(binbuf)
    raw = json.dumps(js, separators=(",", ":")).encode("utf-8")
    raw += b" " * ((4 - len(raw) % 4) % 4)
    body = bytearray(b"")
    body += struct.pack("<II", len(raw), CHUNK_JSON) + raw
    if binbuf:
        pad = (4 - len(binbuf) % 4) % 4
        binbuf = bytes(binbuf) + b"\0" * pad
        body += struct.pack("<II", len(binbuf), CHUNK_BIN) + binbuf
    header = struct.pack("<III", GLB_MAGIC, 2, 12 + len(body))
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(header + body)
    print("  -> %s (%d Ko)" % (path, os.path.getsize(path) // 1024))


def align4(n):
    return (n + 3) & ~3


# ------------------------------------------------------------------------- merging
ARRAYS = ["accessors", "bufferViews", "materials", "meshes", "textures", "images",
          "samplers", "skins", "nodes", "cameras"]


def merge_glbs(parts, out_path, drop_extensions=("KHR_lights_punctual",)):
    """parts: liste de (chemin, préfixe). Chaque fichier devient un noeud racine <préfixe>."""
    out = {
        "asset": {"version": "2.0", "generator": "creator-quiz asset pipeline"},
        "scene": 0,
        "scenes": [{"nodes": []}],
        "nodes": [],
        "buffers": [{"byteLength": 0}],
    }
    for key in ARRAYS:
        out[key] = []
    out_bin = bytearray()

    for path, prefix in parts:
        src, src_bin = read_glb(path)
        off = {key: len(out.get(key, [])) for key in ARRAYS}

        # buffers : un seul buffer de sortie, on décale les bufferViews
        bin_shift = align4(len(out_bin))
        out_bin += b"\0" * (bin_shift - len(out_bin))
        out_bin += src_bin

        for bv in src.get("bufferViews", []):
            bv = dict(bv)
            bv["buffer"] = 0
            bv["byteOffset"] = bv.get("byteOffset", 0) + bin_shift
            out["bufferViews"].append(bv)
        for acc in src.get("accessors", []):
            acc = dict(acc)
            if "bufferView" in acc:
                acc["bufferView"] += off["bufferViews"]
            out["accessors"].append(acc)
        # Les textures des FBX Unity sont des PNG 1x1 blanches (placeholders) : la couleur
        # de chaque matériau est fixée côté JS, on ne transporte donc aucune texture.
        for mat in src.get("materials", []):
            mat = json.loads(json.dumps(mat))
            holders = [mat.get("pbrMetallicRoughness", {}), mat]
            for holder in holders:
                for key in ("baseColorTexture", "metallicRoughnessTexture", "normalTexture",
                            "occlusionTexture", "emissiveTexture"):
                    holder.pop(key, None)
            out["materials"].append(mat)

        for mesh in src.get("meshes", []):
            mesh = json.loads(json.dumps(mesh))
            for prim in mesh.get("primitives", []):
                prim["attributes"] = {k: v + off["accessors"] for k, v in prim["attributes"].items()}
                if "indices" in prim:
                    prim["indices"] += off["accessors"]
                for target in prim.get("targets", []):
                    for k in list(target):
                        target[k] += off["accessors"]
                if "material" in prim:
                    prim["material"] += off["materials"]
                ext = prim.get("extensions", {}).get("KHR_draco_mesh_compression")
                if ext:
                    ext["bufferView"] += off["bufferViews"]
                    if "KHR_draco_mesh_compression" not in out.setdefault("extensionsUsed", []):
                        out["extensionsUsed"].append("KHR_draco_mesh_compression")
            out["meshes"].append(mesh)
        for skin in src.get("skins", []):
            skin = dict(skin)
            skin["joints"] = [j + off["nodes"] for j in skin["joints"]]
            if "inverseBindMatrices" in skin:
                skin["inverseBindMatrices"] += off["accessors"]
            out["skins"].append(skin)

        # noeuds : on écarte caméras et lumières
        local_nodes = src.get("nodes", [])
        dropped = set()
        for i, node in enumerate(local_nodes):
            if "camera" in node:
                dropped.add(i)
            ext = node.get("extensions", {})
            if any(e in ext for e in drop_extensions):
                dropped.add(i)
        group = {"name": prefix, "children": []}
        remap = {}
        for i in range(len(local_nodes)):
            if i not in dropped:
                remap[i] = len(out["nodes"]) + len(remap)
        for i, node in enumerate(local_nodes):
            if i in dropped:
                continue
            node = json.loads(json.dumps(node))
            node.pop("extensions", None)
            if "mesh" in node:
                node["mesh"] += off["meshes"]
            if "skin" in node:
                node["skin"] += off["skins"]
            children = [remap[c] for c in node.get("children", []) if c in remap]
            if children:
                node["children"] = children
            else:
                node.pop("children", None)
            out["nodes"].append(node)
        out["nodes"].append(group)
        group_index = len(out["nodes"]) - 1

        roots = src.get("scenes", [{}])[0].get("nodes", [])
        group["children"] = [remap[r] for r in roots if r in remap]
        out["scenes"][0]["nodes"].append(group_index)

    # remap textures des matériaux (index locaux par fichier)
    write_glb(out_path, out, out_bin)


# ----------------------------------------------------------------- animations pack
def copy_accessor(src, src_bin, index, out, out_bin):
    acc = json.loads(json.dumps(src["accessors"][index]))
    if "sparse" in acc:
        raise SystemExit("accessor sparse non géré")
    if "bufferView" in acc:
        bv = src["bufferViews"][acc["bufferView"]]
        comp = COMP_SIZE[acc["componentType"]]
        elem = comp * NUM_COMP[acc["type"]]
        stride = bv.get("byteStride") or elem
        start = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
        length = stride * (acc["count"] - 1) + elem
        shift = align4(len(out_bin))
        out_bin += b"\0" * (shift - len(out_bin))
        out_bin += src_bin[start:start + length]
        out["bufferViews"].append({"buffer": 0, "byteOffset": shift, "byteLength": length})
        acc["bufferView"] = len(out["bufferViews"]) - 1
        acc["byteOffset"] = 0
    out["accessors"].append(acc)
    return len(out["accessors"]) - 1


def pack_animations(char_path, clips, out_path):
    """clips: liste de (nom, chemin glb) ; les canaux sont rattachés par nom d'os."""
    out, out_bin = read_glb(char_path)
    out["animations"] = []
    by_name = {}
    for i, node in enumerate(out.get("nodes", [])):
        name = node.get("name")
        if name and name not in by_name:
            by_name[name] = i

    for clip_name, path in clips:
        src, src_bin = read_glb(path)
        # on selectionne le clip par nom dans le fichier source (char*.glb en contient plusieurs)
        anim = None
        for cand in src.get("animations", []):
            if cand.get("name") == clip_name:
                anim = cand
                break
        if anim is None:
            print("    clip %-8s introuvable dans %s (ignore)" % (clip_name, path))
            continue
        samplers, channels, skipped = [], [], 0
        for ch in anim["channels"]:
            target = src["nodes"][ch["target"]["node"]].get("name")
            if target not in by_name:
                skipped += 1
                continue
            s = anim["samplers"][ch["sampler"]]
            samplers.append({
                "input": copy_accessor(src, src_bin, s["input"], out, out_bin),
                "output": copy_accessor(src, src_bin, s["output"], out, out_bin),
                **({"interpolation": s["interpolation"]} if "interpolation" in s else {}),
            })
            channels.append({"sampler": len(samplers) - 1,
                             "target": {"node": by_name[target], "path": ch["target"]["path"]}})
        out["animations"].append({"name": clip_name, "samplers": samplers, "channels": channels})
        print("    clip %-8s %d canaux (%d ignorés)" % (clip_name, len(channels), skipped))

    out.pop("asset_bak", None)
    out["asset"]["generator"] = "creator-quiz asset pipeline"
    write_glb(out_path, out, out_bin)


def strip_textures(path, out_path):
    """Retire textures/images : les persos sont retexturés en aplats CREATOR côté JS
    (les atlas d'origine contiennent des personnages sous licence)."""
    js, binbuf = read_glb(path)
    for mat in js.get("materials", []):
        pbr = mat.setdefault("pbrMetallicRoughness", {})
        pbr.pop("baseColorTexture", None)
        pbr.pop("metallicRoughnessTexture", None)
        pbr["baseColorFactor"] = [1, 1, 1, 1]
        mat.pop("normalTexture", None)
        mat.pop("occlusionTexture", None)
        mat.pop("emissiveTexture", None)
    for key in ("images", "textures", "samplers"):
        js.pop(key, None)
    # les bufferViews qui ne servaient qu'aux images sont laissés tels quels :
    # gltf-transform prune s'en occupe ensuite.
    write_glb(out_path, js, binbuf)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "strip":
        strip_textures(sys.argv[2], sys.argv[3])
    elif cmd == "pack":
        pack_animations(sys.argv[2], [tuple(a.split("=", 1)) for a in sys.argv[3].split(",")],
                        sys.argv[4])
    elif cmd == "merge":
        merge_glbs([tuple(a.split("=", 1)) for a in sys.argv[2].split(",")], sys.argv[3])
    else:
        raise SystemExit("usage: build_models.py strip|pack|merge ...")
