export const QUESTION_TIME = 15;

export async function loadLevels() {
  const res = await fetch('/js/questions.json');
  if (!res.ok) throw new Error('Impossible de charger les niveaux');
  const data = await res.json();
  return data.levels;
}

export class Quiz {
  constructor({ level, questions, onEnd, onCorrect, onWrong, onAnswer }) {
    this.level = level;
    this.questions = questions || level.questions;
    this.onEnd = onEnd;
    this.onCorrect = onCorrect;
    this.onWrong = onWrong;
    this.onAnswer = onAnswer;
    this.index = 0;
    this.score = 0;
    this.timeLeft = 0;
    this.timer = null;
    this.locked = true;
  }

  start() {
    this.index = 0;
    this.score = 0;
    this.endTimer = null;
    this.next();
  }

  next() {
    if (this.index >= this.questions.length) return this.end();
    const question = this.questions[this.index];
    this.locked = false;

    document.getElementById('q-progress').textContent = `${String(this.index + 1).padStart(2, '0')} / ${String(this.questions.length).padStart(2, '0')}`;
    document.getElementById('q-score').textContent = `${this.score} pts`;
    document.getElementById('q-level').textContent = this.level.name;
    document.getElementById('q-level').style.setProperty('--level-color', this.level.color);
    document.getElementById('q-kind').textContent = 'Question éclair';
    document.getElementById('question-text').textContent = question.q;

    const context = document.getElementById('q-context');
    context.textContent = question.context || '';
    context.classList.toggle('hidden', !question.context);

    const explain = document.getElementById('q-explain');
    explain.textContent = '';
    explain.classList.add('hidden');

    const box = document.getElementById('answers');
    box.innerHTML = '';

    question.a.forEach((label, index) => {
      const btn = document.createElement('button');
      btn.className = 'answer';
      btn.type = 'button';

      const key = document.createElement('span');
      key.className = 'answer-key';
      key.textContent = String.fromCharCode(65 + index);

      const text = document.createElement('span');
      text.className = 'answer-label';
      text.textContent = label;

      btn.append(key, text);
      btn.onclick = () => this.answer(index);
      box.appendChild(btn);
    });

    this.timeLeft = QUESTION_TIME;
    document.getElementById('q-timer').textContent = `${QUESTION_TIME}s`;
    document.getElementById('q-timer').classList.remove('is-low');
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeLeft--;
      const timer = document.getElementById('q-timer');
      timer.textContent = `${Math.max(0, this.timeLeft)}s`;
      timer.classList.toggle('is-low', this.timeLeft <= 5);
      if (this.timeLeft <= 0) this.answer(-1);
    }, 1000);
  }

  answer(choice) {
    if (this.locked) return;
    this.locked = true;
    clearInterval(this.timer);

    const question = this.questions[this.index];
    const correct = choice === question.c;
    const buttons = document.querySelectorAll('#answers .answer');

    buttons.forEach((btn, index) => {
      btn.disabled = true;
      if (index === question.c) btn.classList.add('correct');
      if (index === choice && choice !== question.c) btn.classList.add('wrong');
      if (index === choice) btn.classList.add('selected');
    });

    if (correct) {
      this.score += 100 + Math.max(0, this.timeLeft) * 10;
      this.onCorrect?.();
    } else {
      this.onWrong?.();
    }

    const explain = document.getElementById('q-explain');
    if (question.explain) {
      explain.textContent = question.explain;
      explain.classList.remove('hidden');
    }

    this.onAnswer?.({ correct, question, choice });
    document.getElementById('q-score').textContent = `${this.score} pts`;
    this.index++;
    this.endTimer = setTimeout(() => this.next(), correct ? 1250 : 1900);
  }

  end() {
    this.locked = true;
    clearInterval(this.timer);
    clearTimeout(this.endTimer);
    this.onEnd?.(this.score);
  }

  destroy() {
    this.locked = true;
    clearInterval(this.timer);
    clearTimeout(this.endTimer);
  }
}
