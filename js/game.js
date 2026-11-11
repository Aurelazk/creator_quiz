// Logique de jeu PURE (ni DOM ni réseau). Exécutée uniquement chez l'hôte (autorité).
// Les réponses restent secrètes jusqu'à la révélation (anti-triche).
import { QUESTIONS } from './questions.js';
import { MAX_PLAYERS, QUESTION_MS, POINTS } from './config.js';

export const cleanName = (v) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, 16) || 'Joueur';

export class QuizGame {
  constructor(hostId, hostName) {
    this.s = { v: 2, hostId, phase: 'lobby', qi: 0, total: QUESTIONS.length, players: [], answered: [],
      results: null, counts: null, correct: null, deadline: 0 };
    this.answers = new Map(); // id -> { a, left }
    this.addPlayer(hostId, hostName);
  }
  get phase() { return this.s.phase; }

  addPlayer(id, name) {
    const p = this.s.players.find((x) => x.id === id);
    if (p) { p.name = cleanName(name); return true; }
    if (this.s.players.length >= MAX_PLAYERS) return false;
    const used = new Set(this.s.players.map((x) => x.ci));
    let ci = 0; while (used.has(ci)) ci++;
    this.s.players.push({ id, name: cleanName(name), ci, score: 0 });
    return true;
  }
  removePlayer(id) {
    this.s.players = this.s.players.filter((p) => p.id !== id);
    this.answers.delete(id);
    this.s.answered = this.s.answered.filter((x) => x !== id);
  }
  start(now) {
    if (this.s.phase !== 'lobby') return false;
    this.s.players.forEach((p) => { p.score = 0; });
    this.s.qi = 0; this._open(now); return true;
  }
  _open(now) {
    Object.assign(this.s, { phase: 'question', answered: [], results: null, counts: null, correct: null, deadline: now + QUESTION_MS });
    this.answers.clear();
  }
  submit(id, qi, a, now) {
    const s = this.s;
    if (s.phase !== 'question' || qi !== s.qi || ![0, 1].includes(a)) return false;
    if (this.answers.has(id) || !s.players.some((p) => p.id === id) || now > s.deadline + 400) return false;
    this.answers.set(id, { a, left: Math.max(0, s.deadline - now) });
    s.answered.push(id); return true;
  }
  everyoneAnswered() { return this.s.players.length > 0 && this.s.players.every((p) => this.answers.has(p.id)); }
  expired(now) { return this.s.phase === 'question' && now >= this.s.deadline; }
  reveal() {
    const s = this.s;
    if (s.phase !== 'question') return false;
    const correct = QUESTIONS[s.qi].correct, counts = [0, 0], results = {};
    s.players.forEach((p) => {
      const r = this.answers.get(p.id);
      if (!r) { results[p.id] = { a: null, ok: false, pts: 0 }; return; }
      counts[r.a]++;
      const ok = r.a === correct;
      const pts = ok ? POINTS.base + Math.round(POINTS.speed * r.left / QUESTION_MS) : 0;
      p.score += pts; results[p.id] = { a: r.a, ok, pts };
    });
    Object.assign(s, { phase: 'reveal', results, counts, correct }); return true;
  }
  next(now) {
    if (this.s.phase !== 'reveal') return false;
    if (this.s.qi + 1 >= this.s.total) { this.s.phase = 'end'; return true; }
    this.s.qi++; this._open(now); return true;
  }
  reset() {
    Object.assign(this.s, { phase: 'lobby', qi: 0, answered: [], results: null, counts: null, correct: null });
    this.answers.clear();
  }
  snapshot(now) { // vue publique : sans l'échéance (horloge hôte), avec le temps restant
    const { deadline, ...pub } = this.s;
    return { ...pub, timeLeft: this.s.phase === 'question' ? Math.max(0, deadline - now) : 0 };
  }
}
