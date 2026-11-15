/**
 * simulate.ts — Logique de salle (declareRoom) pour Guess Their Answer
 * Gère les phases d'ouverture, de question, de révélation et de fin.
 * Le serveur reste l'unique source de vérité.
 */

import type { RoomPlatformBridge } from 'wanaka-studio-engine/play-host-room';
import type { SimulateSceneContext } from 'wanaka-studio-engine/game';
import * as THREE from 'three';
import {
  ROUNDS,
  ROUND_SECONDS,
  crowdForRound,
  scoreFor,
  type CrowdResult,
  type Question,
} from './quiz.js';

type PlayerId = string;

const OPENING_SECONDS = 3.4;
const REVEAL_SECONDS = 3.4;

export type MatchPhase = 'opening' | 'question' | 'reveal' | 'over';

/** Nombre d'apparences de candidat disponibles */
export const CONTESTANT_LOOKS = 8;

export interface ContestantFields {
  x: number;
  y: number;
  z: number;
  owner: PlayerId;
  /** Look unique par siège : quel personnage ce joueur porte */
  look: number;
}

/** Un banc de studio par candidat, en ligne derrière les animateurs. */
const Contestant = defineEntity({
  name: 'contestant',
  create: (scope) => {
    const root = new THREE.Group();
    root.name = 'ContestantBench';
    const frame = scope.own(
      new THREE.MeshStandardMaterial({ color: '#2b1b4d', roughness: 0.34, metalness: 0.55 }),
    );
    const trim = scope.own(
      new THREE.MeshStandardMaterial({
        color: '#2a1550',
        emissive: new THREE.Color('#ffc93c'),
        emissiveIntensity: 1.4,
        roughness: 0.4,
      }),
    );
    const base = new THREE.Mesh(
      scope.own(new THREE.CylinderGeometry(0.3, 0.34, 0.05, 16)),
      trim,
    );
    base.position.y = 0.03;
    const stem = new THREE.Mesh(
      scope.own(new THREE.CylinderGeometry(0.09, 0.11, 0.36, 12)),
      frame,
    );
    stem.position.y = 0.23;
    const seat = new THREE.Mesh(
      scope.own(new THREE.BoxGeometry(0.62, 0.1, 0.54)),
      frame,
    );
    seat.position.y = 0.46;
    const back = new THREE.Mesh(
      scope.own(new THREE.BoxGeometry(0.62, 0.5, 0.08)),
      frame,
    );
    back.position.set(0, 0.75, -0.24);
    root.add(base, stem, seat, back);
    return { root };
  },
});

const SEAT_Y = 0.02;
const SEAT_Z = -1.9;

export async function declareRoom(
  context: SimulateSceneContext,
  platform: RoomPlatformBridge,
) {
  void context;
  const room = platform.room;

  const state = room.state({
    contestants: room.entities(Contestant, {
      schema: room.sharedFields<ContestantFields>(),
    }),
    phase: 'opening' as MatchPhase,
    seed: 0,
    round: 0,
    openingUntilTick: 0,
    deadlineTick: 0,
    revealUntilTick: 0,
    shareA: 50,
    shareB: 50,
    votesA: 600,
    votesB: 600,
    majority: 0,
    /** peer id -> index d'option choisi cette manche */
    answers: {} as Record<string, number>,
    /** peer id -> tick de réponse */
    answerTicks: {} as Record<string, number>,
    /** peer id -> score de la manche */
    scores: {} as Record<string, number>,
    /** Bumpé à chaque nouvelle manche, pour relancer l'intro */
    matchId: 0,
  });

  const actions = room.actions({
    answer(by: PlayerId, choice: number): void {
      if (state.phase !== 'question') return;
      if (choice !== 0 && choice !== 1) return;
      if (state.answers[by] !== undefined) return;
      state.answers = { ...state.answers, [by]: choice };
      state.answerTicks = { ...state.answerTicks, [by]: room.tick };
    },
    restart(): void {
      if (state.phase !== 'over') return;
      state.phase = 'opening';
      state.seed = 0;
      state.round = 0;
      state.openingUntilTick = 0;
      state.answers = {};
      state.answerTicks = {};
      state.scores = {};
      state.majority = 0;
      state.shareA = 50;
      state.shareB = 50;
    },
  });

  const beginRound = (index: number): void => {
    state.round = index;
    state.phase = 'question';
    state.answers = {};
    state.answerTicks = {};
    state.deadlineTick = room.tick + Math.round(ROUND_SECONDS * room.tickRate);
  };

  const settleRound = (crowd: CrowdResult): void => {
    state.shareA = crowd.shares[0];
    state.shareB = crowd.shares[1];
    state.votesA = crowd.votes[0];
    state.votesB = crowd.votes[1];
    state.majority = crowd.majority;

    const scores = { ...state.scores };
    for (const player of room.players) {
      const choice = state.answers[player];
      const answeredAt = state.answerTicks[player] ?? state.deadlineTick;
      const secondsLeft = Math.max(0, (state.deadlineTick - answeredAt) / room.tickRate);
      const gained = scoreFor({
        correct: choice === crowd.majority,
        secondsLeft,
        roundSeconds: ROUND_SECONDS,
        streak: 1,
      });
      scores[player] = (scores[player] ?? 0) + gained;
    }
    state.scores = scores;
    state.phase = 'reveal';
    state.revealUntilTick = room.tick + Math.round(REVEAL_SECONDS * room.tickRate);
  };

  const seatOf = (player: PlayerId) =>
    state.contestants.all().find((entry) => entry.fields.owner === player);

  const syncContestants = (): void => {
    const players = room.players;
    for (const entry of state.contestants.all()) {
      if (!players.includes(entry.fields.owner)) {
        state.contestants.despawn(entry.key);
      }
    }
    for (const player of players) {
      if (seatOf(player) !== undefined) continue;
      const used = new Set(
        state.contestants.all().map((entry) => entry.fields.look),
      );
      const start = Math.floor(Math.random() * CONTESTANT_LOOKS);
      let look = start;
      for (let i = 0; i < CONTESTANT_LOOKS; i += 1) {
        const candidate = (start + i) % CONTESTANT_LOOKS;
        if (!used.has(candidate)) {
          look = candidate;
          break;
        }
      }
      state.contestants.spawn({
        fields: { x: 0, y: SEAT_Y, z: SEAT_Z, owner: player, look },
        pose: { x: 0, y: SEAT_Y, z: SEAT_Z },
      });
    }
    const count = players.length;
    players.forEach((player, index) => {
      const entry = seatOf(player);
      if (entry === undefined) return;
      const x = count <= 1 ? 0 : -4.6 + (9.2 * index) / (count - 1);
      if (Math.abs(entry.fields.x - x) < 0.001) return;
      state.contestants.setFields(entry.key, {
        x,
        y: SEAT_Y,
        z: SEAT_Z,
        owner: player,
        look: entry.fields.look,
      });
    });
  };

  room.onTick(() => {
    syncContestants();
    for (const player of room.players) {
      if (state.scores[player] === undefined) {
        state.scores = { ...state.scores, [player]: 0 };
      }
    }

    if (state.phase === 'opening') {
      if (state.seed === 0) {
        state.seed = 1 + Math.floor(Math.random() * 0x7ffffffe);
        state.matchId += 1;
        state.openingUntilTick =
          room.tick + Math.round(OPENING_SECONDS * room.tickRate);
        return;
      }
      if (state.seed !== 0 && room.tick >= state.openingUntilTick) {
        beginRound(0);
      }
      return;
    }

    if (state.phase === 'question') {
      if (room.tick >= state.deadlineTick) {
        settleRound(crowdForRound(state.seed, state.round));
      }
      return;
    }

    if (state.phase === 'reveal') {
      if (room.tick < state.revealUntilTick) return;
      const next = state.round + 1;
      if (next >= ROUNDS) {
        state.phase = 'over';
      } else {
        beginRound(next);
      }
    }
  });

  return { state, actions };
}

/** Déclare une entité (stub compatible wanaka-studio-engine/room) */
function defineEntity(opts: { name: string; create: (scope: any) => any }) {
  return { name: opts.name, create: opts.create };
}
