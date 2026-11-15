/* =====================================================================
   shared/upstash.js — helper Upstash Redis REST (isomorphe)
   Stockage du classement général. Utilise KV_REST_API_URL + KV_REST_API_TOKEN.
   Côté serveur (Node) : fetch natif, process.env disponible.
   ===================================================================== */
'use strict';

const LEADERBOARD_KEY = 'cq:leaderboard';
const TOP_N = 50;

function redisCommand(...args) {
  const REDIS_URL = process.env.KV_REST_API_URL;
  const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('Upstash non configure');
  const body = JSON.stringify({ command: args });
  return fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + REDIS_TOKEN,
    },
    redirect: 'manual',
  }).then((res) => {
    if (!res.ok) {
      return res.text().then((txt) => {
        throw new Error('Redis HTTP ' + res.status + (txt ? ' ' + txt.slice(0, 200) : ''));
      });
    }
    return res.json();
  });
}

async function getLeaderboard() {
  const data = await redisCommand('ZREVRANGE', LEADERBOARD_KEY, '0', String(TOP_N - 1), 'WITHSCORES');
  const raw = data.result || [];
  const scores = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    scores.push({ name: String(raw[i]), score: parseInt(String(raw[i + 1]), 10) || 0 });
  }
  return scores;
}

async function upsertScore(name, score) {
  const existing = await redisCommand('ZSCORE', LEADERBOARD_KEY, name);
  const cur = existing.result === null ? null : parseInt(String(existing.result), 10);
  if (cur !== null && score <= cur) return; // on garde le meilleur
  await redisCommand('ZADD', LEADERBOARD_KEY, String(score), name);
}

module.exports = {
  LEADERBOARD_KEY,
  TOP_N,
  redisCommand,
  getLeaderboard,
  upsertScore,
};
