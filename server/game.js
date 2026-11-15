/* =====================================================================
   server/game.js — wrapper vers le moteur de règles partagé (shared/rules.js)
   Le code des règles vit désormais dans shared/rules.js (isomorphe : serveur + navigateur).
   Ce fichier garde le même objet exporté pour ne pas casser les tests ni les imports existants.
   ===================================================================== */
'use strict';

module.exports = require('../shared/rules.js');
