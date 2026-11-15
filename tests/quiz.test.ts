import { describe, it, expect } from 'vitest';
import {
  resolveCrowd,
  scoreFor,
  pickQuestions,
  createRandom,
  ROUNDS,
  QUESTIONS,
  type Question,
} from '../src/quiz.js';

const sample: Question = { id: 'x', prompt: 'Test ?', options: ['A', 'B'], bias: 0.62 };

describe('crowd shares', () => {
  it('always sum to 100', () => {
    const random = createRandom(7);
    for (let i = 0; i < 200; i += 1) {
      const result = resolveCrowd(sample, random);
      expect(result.shares[0] + result.shares[1]).toBe(100);
      expect(result.votes[0] + result.votes[1]).toBe(result.voters);
    }
  });

  it('the crowd majority respects the authored bias most of the time', () => {
    const random = createRandom(99);
    let inversions = 0;
    for (const question of QUESTIONS) {
      for (let i = 0; i < 40; i += 1) {
        const result = resolveCrowd(question, random);
        if (result.majority !== (question.bias >= 0.5 ? 0 : 1)) {
          inversions += 1;
        }
      }
    }
    // Le bruit aléatoire peut provoquer quelques inversions, mais ce doit être rare
    expect(inversions).toBeLessThan(QUESTIONS.length * 40 * 0.3);
  });
});

describe('scoring', () => {
  it('rewards a correct, fast, streaked answer only', () => {
    expect(scoreFor({ correct: false, secondsLeft: 9, roundSeconds: 9, streak: 3 })).toBe(0);
    expect(scoreFor({ correct: true, secondsLeft: 0, roundSeconds: 9, streak: 1 })).toBe(100);
    expect(scoreFor({ correct: true, secondsLeft: 9, roundSeconds: 9, streak: 1 })).toBe(200);
    expect(scoreFor({ correct: true, secondsLeft: 9, roundSeconds: 9, streak: 3 })).toBe(240);
    const capped = scoreFor({ correct: true, secondsLeft: 9, roundSeconds: 9, streak: 20 });
    expect(capped).toBe(300);
  });
});

describe('question picking', () => {
  it('picks unique questions and honours the requested count', () => {
    const picked = pickQuestions(createRandom(2026), ROUNDS);
    expect(picked.length).toBe(ROUNDS);
    expect(new Set(picked.map((q) => q.id)).size).toBe(ROUNDS);
    expect(pickQuestions(createRandom(1), 999).length).toBe(QUESTIONS.length);
  });
});
