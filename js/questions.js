// Ajouter une question : { q: "texte", correct: 0 (Oui) ou 1 (Non), why: "explication" }
export const OPTIONS = ['Oui', 'Non'];
export const QUESTIONS = [
  { q: 'JavaScript est un langage de programmation ?', correct: 0, why: 'Créé en 1995 pour rendre les pages web interactives.' },
  { q: 'Python a été créé dans les années 1990 ?', correct: 0, why: 'Guido van Rossum l’a lancé en 1991.' },
  { q: 'Le HTML est un langage de programmation ?', correct: 1, why: 'C’est un langage de balisage : il structure, il ne calcule pas.' },
  { q: 'CSS sert à styliser une page web ?', correct: 0, why: 'Couleurs, mise en page, animations : c’est son rôle.' },
  { q: 'Un serveur peut tourner sans base de données ?', correct: 0, why: 'Beaucoup de sites simples n’en ont pas besoin.' },
  { q: 'Le Wi-Fi est plus rapide que le câble Ethernet ?', correct: 1, why: 'Le câble reste en général plus rapide et plus stable.' },
  { q: 'Un octet fait 8 bits ?', correct: 0, why: '1 octet = 8 bits, soit 256 valeurs possibles.' },
  { q: 'Linux est un système d’exploitation ?', correct: 0, why: 'Un noyau libre, utilisé via des distributions (Ubuntu, Debian…).' },
  { q: 'Une API sert à échanger des données entre logiciels ?', correct: 0, why: 'C’est une interface qui permet à deux programmes de se parler.' },
  { q: 'Le cloud stocke vos données sur votre disque local ?', correct: 1, why: 'Elles sont sur des serveurs distants, accessibles via Internet.' }
];
