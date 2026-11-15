# CREATOR — système de design

Référence unique pour les écrans animateur (projection) et joueur (téléphone).
Aucun texte technique anglais dans l’interface : tout est en français.

## 1. Couleurs

| Rôle | Jeton | Valeur | Usage |
| --- | --- | --- | --- |
| Marque bleue | `--bleu` | `#0B35FE` | actions primaires, liens forts |
| Bleu clair | `--bleu2` | `#2E85FF` | focus, survol, spectateur |
| Orange | `--orange` | `#FF4E20` | erreurs, buzz, vol |
| Vert | `--vert` | `#00E472` | succès, points, code de salle |
| Nuit | `--nuit` | `#0C1A4B` | fonds de cartes |
| Nuit profonde | `--nuit-fonce` | `#081033` | fond d’écran |
| Clair | `--clair` | `#F4F6FC` | texte sur fond sombre |
| Or | `--gold` | `#FFCF5A` | vainqueur, podium |

Contraste : texte clair sur `--nuit-fonce` ≥ 7:1 ; texte nuit sur blanc ≥ 12:1.
Ne jamais poser du vert sur orange (contraste insuffisant).

## 2. Typographie

- `--font-display` (Famous College) : titres, chiffres, scores, phases.
- `--font-sans` (Janda Manatee Solid) : texte courant, boutons.
- `--font-question` (Granika) : intitulés de questions uniquement.

Échelle : `--text-xs` 12 px → `--text-sm` 14 px → `--text-base` 16 px →
`--text-lg` 18 px → `--text-xl` 20 px → `--text-2xl` 24 px → `--text-3xl` 30 px →
`--text-4xl` 36 px → `--text-5xl` 48 px → `--text-6xl` 64 px.

Projection : la question tient sur **2 lignes maximum** (`-webkit-line-clamp: 2`).
Téléphone : 3 niveaux de taille maximum par écran (titre, corps, détail).

## 3. Espacement et rayons

- Échelle 4/8 px : `--space-1` 4, `--space-2` 8, `--space-3` 12, `--space-4` 16,
  `--space-5` 20, `--space-6` 24, `--space-8` 32, `--space-10` 40, `--space-12` 48.
- Rayons : `--r-sm` 6, `--r-md` 10, `--r-lg` 16, `--r-xl` 24, `--r-full` 9999.
- Zone tactile : `--touch-min` 44 px minimum, `--touch-comfort` 48 px sur téléphone.

## 4. Ombres et profondeur

`--shadow-sm` … `--shadow-xl` réservent la profondeur aux cartes, modales et
notifications. Le plateau animateur reste plat : bordures et contraste, pas
d’ombre portée lourde.

## 5. États

| État | Traitement |
| --- | --- |
| survol | `translateY(-1px)` + éclaircissement 8 % |
| focus clavier | anneau 3 px `--bleu2`, décalage 3 px (`:focus-visible`) |
| actif | enfoncement 1 px, pas de changement de couleur seul |
| désactivé | opacité 0,55, curseur `not-allowed` |
| erreur | bordure/orange + texte explicite en français |
| succès | vert + coche, jamais la couleur seule |

## 6. Icônes

Un seul jeu d’icônes SVG linéaires (trait 2 px, coins arrondis, taille 20/24 px).
Pas d’emoji dans les libellés d’action. Les icônes décoratives sont
`aria-hidden="true"` ; les icônes seules portent un `aria-label` français.

## 7. Mouvement

- `--motion-fast` 120 ms : survol, focus, bascule d’état.
- `--motion-base` 240 ms : apparition de carte, notification.
- `--motion-slow` 400 ms : transitions d’écran.
- `--ease-out` pour entrer, `--ease-bounce` pour les scores et le buzzer.
- `prefers-reduced-motion: reduce` supprime animations et transitions.

## 8. Règles d’écran

### Animateur (projection)
- Un seul message à la fois, lisible à 3 m.
- Bandeau haut : phase + chrono. Plateau : 6 réponses maximum, 36 vh.
- Bas : classement et commandes sur une seule ligne, jamais superposés.
- Le public 3D ne doit jamais être masqué par le plateau HTML.

### Joueur (téléphone)
- Action principale toujours visible sans défilement (`100dvh`).
- Une notification à la fois, en bas, au-dessus de la zone sûre.
- Mini-classement : top 3 + le joueur courant si hors top 3.
- Spectateurs : « Devine aussi » en champ séparé, jamais à la place du buzzer.
- Clavier : le champ actif reste visible (`scrollIntoView`), pas de zoom iOS
  (police ≥ 16 px sur les champs).
