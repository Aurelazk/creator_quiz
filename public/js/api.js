export async function fetchLeaderboard() {
  const r = await fetch('/api/leaderboard');
  if (!r.ok) throw new Error('leaderboard indisponible');
  return r.json();
}

export async function postScore(pseudo, score, time) {
  const r = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pseudo, score, time }),
  });
  if (!r.ok) throw new Error('score refusé');
  return r.json();
}

export function subscribeLive(cb) {
  const es = new EventSource('/api/stream');
  es.onmessage = (e) => {
    try {
      cb(JSON.parse(e.data));
    } catch {
      /* ignore */
    }
  };
  return () => es.close();
}
