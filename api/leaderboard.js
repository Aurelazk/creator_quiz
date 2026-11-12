/* =====================================================================
   api/leaderboard.js — fonction serverless Vercel (classement général)
   Stockage : Upstash Redis REST (KV_REST_API_URL + KV_REST_API_TOKEN).
   Aucun secret dans ce fichier : les variables d'environnement sont lues
   au runtime et doivent etre declarees dans le tableau de bord Vercel.
   ===================================================================== */
'use strict';

/* Domaine autorise pour le CORS (defini via ALLOWED_ORIGIN dans Vercel).
   En local/developpement, on accepte toute origine. */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
const LEADERBOARD_KEY = 'cq:leaderboard';
const TOP_N = 50;
const SCORE_MAX = 5000;
const NAME_MAX = 20;
const RATE_MAX = 60;          // requetes POST par IP et par fenetre
const RATE_WINDOW_MS = 60 * 1000;

/* Limite de debit simple par IP (memoire vive, reinitialise a chaque cold start). */
const rateMap = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  if (entry.count > RATE_MAX) return true;
  return false;
}

function cleanName(raw) {
  if (typeof raw !== 'string') return '';
  // supprime toute balise HTML et entites, espace compresse
  let s = String(raw).replace(/<[^>]*>/g, '');
  s = s.replace(/&[a-z]+;/gi, ' ');
  s = s.replace(/[^\w\s\u00C0-\u024F-]/gi, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s.slice(0, NAME_MAX);
}

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGIN === '*' ? '*' : (origin === ALLOWED_ORIGIN ? origin : '');
  const h = {
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    'cache-control': 'no-store',
  };
  if (allow) h['access-control-allow-origin'] = allow;
  return h;
}

async function redisCommand(...args) {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('Upstash non configure');
  const body = JSON.stringify({ command: args });
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + REDIS_TOKEN,
    },
    body,
    redirect: 'manual',
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error('Redis HTTP ' + res.status + (txt ? ' ' + txt.slice(0, 200) : ''));
  }
  return res.json();
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

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  const h = corsHeaders(origin);
  res.setHeader('content-type', 'application/json');
  Object.entries(h).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method === 'GET') {
    try {
      const scores = await getLeaderboard();
      res.statusCode = 200;
      return res.end(JSON.stringify({ scores, count: scores.length }));
    } catch (e) {
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'indisponible', detail: e.message }));
    }
  }

  if (req.method === 'POST') {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim() || 'unknown';
    if (rateLimited(ip)) {
      res.statusCode = 429;
      return res.end(JSON.stringify({ error: 'trop de requetes' }));
    }
    let body = '';
    try {
      await new Promise((resolve, reject) => {
        req.on('data', (c) => { body += c; });
        req.on('end', resolve);
        req.on('error', reject);
      });
    } catch (e) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'corps invalide' }));
    }
    let parsed;
    try { parsed = JSON.parse(body || '{}'); } catch (e) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'json invalide' }));
    }
    const name = cleanName(parsed.name);
    const score = Number.isInteger(parsed.score) ? parsed.score : parseInt(parsed.score, 10);
    if (!name) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'nom invalide' }));
    }
    if (!Number.isFinite(score) || score < 0 || score > SCORE_MAX || String(parsed.score) === '' || Number(parsed.score) !== score) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'score invalide (0 a ' + SCORE_MAX + ')' }));
    }
    try {
      await upsertScore(name, score);
      res.statusCode = 200;
      return res.end(JSON.stringify({ ok: true, name, score }));
    } catch (e) {
      res.statusCode = 502;
      return res.end(JSON.stringify({ error: 'indisponible', detail: e.message }));
    }
  }

  res.statusCode = 405;
  return res.end(JSON.stringify({ error: 'methode non autorisee' }));
};
