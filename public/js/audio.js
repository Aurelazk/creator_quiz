let ctx;

function ac() {
  return ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)());
}

export function unlockAudio() {
  const a = ac();
  if (a.state === 'suspended') a.resume();
}

export function playTone(freq, dur = 0.12, type = 'sine', vol = 0.15) {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + dur);
}

export const sfx = {
  click: () => playTone(600, 0.08, 'square', 0.08),
  correct: () => {
    playTone(880, 0.1);
    setTimeout(() => playTone(1320, 0.15), 90);
  },
  wrong: () => playTone(180, 0.2, 'sawtooth', 0.12),
  spin: () => {
    for (let i = 0; i < 12; i++) {
      setTimeout(() => playTone(400 + i * 60, 0.05, 'square', 0.05), i * 90);
    }
  },
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, 0.25), i * 130));
  },
};
