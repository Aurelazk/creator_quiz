/**
 * quiz.ts — Logique métier du jeu Guess Their Answer
 * Génération de la foule, scoring, sélection de questions.
 */

export interface Question {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly string[];
  /** 0 = option A majoritaire, 1 = option B majoritaire */
  readonly bias: number;
}

export interface CrowdResult {
  readonly shares: [number, number]; // pourcentage A / B (somme = 100)
  readonly votes: [number, number];  // nb de votes A / B
  readonly voters: number;
  readonly majority: 0 | 1;
}

/** Nombre de manches par partie */
export const ROUNDS = 10;
/** Durée d'une manche en secondes */
export const ROUND_SECONDS = 9;

/** Générateur de nombres pseudo-aléatoires déterministe (seedable) */
export function createRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
}

/** Sélectionne `count` questions uniques depuis la banque */
export function pickQuestions(random: () => number, count: number): Question[] {
  const bank = QUESTIONS.slice();
  for (let i = bank.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bank[i], bank[j]] = [bank[j], bank[i]];
  }
  return bank.slice(0, Math.min(count, bank.length));
}

/** Résout la réponse de la foule pour une question (simulée) */
export function resolveCrowd(question: Question, random: () => number): CrowdResult {
  const voters = 1000;
  const bias = question.bias;
  const votesA = Math.round(voters * (0.5 + (bias - 0.5) * 0.8 + (random() - 0.5) * 0.2));
  const votesB = voters - votesA;
  const shareA = Math.round((votesA / voters) * 100);
  const shareB = 100 - shareA;
  const majority: 0 | 1 = shareA >= shareB ? 0 : 1;
  return { shares: [shareA, shareB], votes: [votesA, votesB], voters, majority };
}

/** Résout la foule pour une manche donnée (appelé par simulate) */
export function crowdForRound(seed: number, round: number): CrowdResult {
  const random = createRandom(seed * 1000 + round);
  const question = QUESTIONS[round % QUESTIONS.length];
  return resolveCrowd(question, random);
}

/** Calcule le score pour une réponse */
export function scoreFor(params: {
  correct: boolean;
  secondsLeft: number;
  roundSeconds: number;
  streak: number;
}): number {
  if (!params.correct) return 0;
  const timeRatio = params.secondsLeft / params.roundSeconds;
  const base = 100 + Math.round(timeRatio * 100);
  const streakBonus = Math.min(params.streak - 1, 5) * 20;
  return Math.min(base + streakBonus, 320);
}

/** Banque de questions (échantillon) */
export const QUESTIONS: Question[] = [
  { id: 'q1', prompt: 'Quel langage est enseigné en premier à Epitech ?', options: ['C', 'Python'], bias: 0.62 },
  { id: 'q2', prompt: 'Où se situe le campus Epitech du Bénin ?', options: ['Cotonou', 'Porto-Novo'], bias: 0.7 },
  { id: 'q3', prompt: 'Quelle monnaie utilise-t-on au Bénin ?', options: ['Franc CFA', 'Euro'], bias: 0.8 },
  { id: 'q4', prompt: 'Quel réseau social utilises-tu le plus ?', options: ['Instagram', 'TikTok'], bias: 0.55 },
  { id: 'q5', prompt: 'Quelle est la spécialité culinaire béninoise la plus connue ?', options: ['Pâte d\'arachide', 'Amiwo'], bias: 0.6 },
  { id: 'q6', prompt: 'Quelle boisson bois-tu pour réviser tard le soir ?', options: ['Café', 'Thé'], bias: 0.65 },
  { id: 'q7', prompt: 'Combien d\'années dure le cursus Epitech ?', options: ['5', '3'], bias: 0.75 },
  { id: 'q8', prompt: 'Quel éditeur de code utilises-tu le plus ?', options: ['VS Code', 'IntelliJ'], bias: 0.8 },
  { id: 'q9', prompt: 'Quel est le plus grand marché en plein air du Bénin ?', options: ['Dantokpa', 'Azêlèkè'], bias: 0.7 },
  { id: 'q10', prompt: 'Quel artisanat béninois est le plus connu ?', options: ['Pagne', 'Sculpture'], bias: 0.55 },
];
