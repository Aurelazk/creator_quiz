#!/usr/bin/env python3
"""
Extraction d'assets depuis l'APK de Guess Their Answer (com.qoni.guesstheiranswer)
Utilise UnityPy pour parser les fichiers .assets et exporter par catégorie.
"""

import os
import sys
import json
import shutil
from datetime import datetime

sys.path.insert(0, '/home/aurel/gtai/work/venv/lib/python3.14/site-packages')
import UnityPy

SRC_DIR = '/home/aurel/gtai/work/extract/assets/bin/Data'
OUT_DIR = '/home/aurel/gtai/out'
REJECT_DIR = os.path.join(OUT_DIR, '_rejets')
LOG_FILE = '/home/aurel/gtai/run.log'

# Dossiers de sortie par catégorie
CATEGORIES = {
    'Texture2D': 'ui',
    'Sprite': 'ui',
    'Mesh': 'personnages',
    'AnimationClip': 'personnages',
    'TextAsset': 'textes',
    'AudioClip': 'objets',
    'Font': 'polices',
    'Material': 'objets',
}

def log(msg):
    ts = datetime.now().strftime('%Y-%m-%dT%H:%M:%S%z')
    line = f'[{ts}] {msg}'
    print(line)
    with open(LOG_FILE, 'a') as f:
        f.write(line + '\n')

def safe_name(name):
    """Nettoie un nom de fichier."""
    return ''.join(c if c.isalnum() or c in '.-_' else '_' for c in name)

def extract_assets():
    os.makedirs(REJECT_DIR, exist_ok=True)
    
    # Créer les dossiers de sortie
    for cat_dir in ['personnages', 'decor', 'objets', 'ui', 'polices', 'textes', 'icones']:
        os.makedirs(os.path.join(OUT_DIR, cat_dir), exist_ok=True)
    
    stats = {}
    total_files = 0
    processed = 0
    
    # Lister tous les fichiers dans le dossier Data
    files = []
    for root, dirs, filenames in os.walk(SRC_DIR):
        for fn in filenames:
            files.append(os.path.join(root, fn))
    
    total_files = len(files)
    log(f"Début de l'extraction : {total_files} fichiers à traiter")
    
    for filepath in files:
        processed += 1
        if processed % 50 == 0:
            log(f"Progression : {processed}/{total_files} ({100*processed//total_files}%)")
        
        try:
            env = UnityPy.load(filepath)
        except Exception as e:
            log(f"ERREUR chargement {filepath}: {e}")
            continue
        
        for obj in env.objects:
            try:
                if obj.type.name not in CATEGORIES:
                    continue
                
                data = obj.read()
                cat_dir = CATEGORIES[obj.type.name]
                name = safe_name(obj.name or obj.path_id)
                
                if not name or name == '0':
                    name = f"asset_{obj.path_id}"
                
                # Sauvegarder selon le type
                if obj.type.name == 'Texture2D':
                    img = data.image
                    if img is not None:
                        out_path = os.path.join(OUT_DIR, cat_dir, f"{name}.png")
                        img.save(out_path)
                        stats['Texture2D'] = stats.get('Texture2D', 0) + 1
                
                elif obj.type.name == 'Sprite':
                    # Les sprites ont une texture associée
                    try:
                        img = data.image
                        if img is not None:
                            out_path = os.path.join(OUT_DIR, cat_dir, f"{name}.png")
                            img.save(out_path)
                            stats['Sprite'] = stats.get('Sprite', 0) + 1
                    except:
                        pass
                
                elif obj.type.name == 'Mesh':
                    try:
                        # Export en format simple
                        out_path = os.path.join(OUT_DIR, cat_dir, f"{name}.mesh")
                        with open(out_path, 'w') as f:
                            f.write(f"Mesh: {name}\n")
                            f.write(f"Vertices: {len(data.m_Vertices) if hasattr(data, 'm_Vertices') else 0}\n")
                            f.write(f"Triangles: {len(data.m_Triangles) if hasattr(data, 'm_Triangles') else 0}\n")
                        stats['Mesh'] = stats.get('Mesh', 0) + 1
                    except:
                        pass
                
                elif obj.type.name == 'AnimationClip':
                    out_path = os.path.join(OUT_DIR, cat_dir, f"{name}.anim")
                    with open(out_path, 'w') as f:
                        f.write(f"AnimationClip: {name}\n")
                        f.write(f"Length: {data.m_Length if hasattr(data, 'm_Length') else 0}\n")
                    stats['AnimationClip'] = stats.get('AnimationClip', 0) + 1
                
                elif obj.type.name == 'TextAsset':
                    try:
                        text = data.m_Script.decode('utf-8', errors='replace') if isinstance(data.m_Script, bytes) else str(data.m_Script)
                        out_path = os.path.join(OUT_DIR, 'textes', f"{name}.txt")
                        with open(out_path, 'w', encoding='utf-8') as f:
                            f.write(text)
                        stats['TextAsset'] = stats.get('TextAsset', 0) + 1
                    except:
                        pass
                
                elif obj.type.name == 'AudioClip':
                    out_path = os.path.join(OUT_DIR, 'objets', f"{name}.audio")
                    with open(out_path, 'wb') as f:
                        f.write(data.m_AudioData if hasattr(data, 'm_AudioData') else b'')
                    stats['AudioClip'] = stats.get('AudioClip', 0) + 1
                
                elif obj.type.name == 'Font':
                    out_path = os.path.join(OUT_DIR, 'polices', f"{name}.fontdata")
                    with open(out_path, 'wb') as f:
                        f.write(data.m_FontData if hasattr(data, 'm_FontData') else b'')
                    stats['Font'] = stats.get('Font', 0) + 1
                
                elif obj.type.name == 'Material':
                    out_path = os.path.join(OUT_DIR, 'objets', f"{name}.mat")
                    with open(out_path, 'w') as f:
                        f.write(f"Material: {name}\n")
                    stats['Material'] = stats.get('Material', 0) + 1
                    
            except Exception as e:
                log(f"ERREUR extraction objet dans {filepath}: {e}")
                continue
    
    log(f"Extraction terminée : {processed}/{total_files} fichiers")
    log(f"Statistiques : {json.dumps(stats, ensure_ascii=False)}")
    
    # Générer le manifeste
    manifest = {
        'source': 'APK com.qoni.guesstheiranswer (TapNation)',
        'extraction_date': datetime.now().isoformat(),
        'method': 'UnityPy direct extraction',
        'categories': stats,
        'total_files_processed': processed,
    }
    
    manifest_path = os.path.join(OUT_DIR, 'EXTRACTION_MANIFEST.json')
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    
    log(f"Manifeste écrit : {manifest_path}")
    return stats

if __name__ == '__main__':
    extract_assets()