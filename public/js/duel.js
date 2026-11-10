export class DuelClient {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.ws = null;
    this.pseudo = '';
    this.pending = [];
  }

  connect(pseudo) {
    this.pseudo = pseudo;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${proto}//${location.host}/ws`);

    this.ws.onopen = () => {
      this.handlers.onOpen?.();
      const queued = this.pending.splice(0);
      for (const msg of queued) this.send(msg);
    };
    this.ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      this.dispatch(msg);
    };
    this.ws.onclose = () => this.handlers.onClose?.();
    this.ws.onerror = () => this.handlers.onError?.();
  }

  dispatch(msg) {
    switch (msg.type) {
      case 'room-created':
        return this.handlers.onRoomCreated?.(msg);
      case 'room-joined':
        return this.handlers.onRoomJoined?.(msg);
      case 'room-state':
        return this.handlers.onRoomState?.(msg);
      case 'room-left':
        return this.handlers.onRoomLeft?.(msg);
      case 'room-error':
        return this.handlers.onRoomError?.(msg);
      case 'match-start':
        return this.handlers.onStart?.(msg);
      case 'question':
        return this.handlers.onQuestion?.(msg);
      case 'answer-result':
        return this.handlers.onAnswerResult?.(msg);
      case 'match-state':
        return this.handlers.onState?.(msg);
      case 'prompt-start':
        return this.handlers.onPromptStart?.(msg);
      case 'prompt-submitted':
        return this.handlers.onPromptSubmitted?.(msg);
      case 'prompt-state':
        return this.handlers.onPromptState?.(msg);
      case 'prompt-result':
        return this.handlers.onPromptResult?.(msg);
      case 'match-end':
        return this.handlers.onEnd?.(msg);
      case 'opponent-left':
        return this.handlers.onOpponentLeft?.(msg);
      case 'error':
        return this.handlers.onError?.(msg);
      default:
        return undefined;
    }
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return;
    }
    if (this.pending.length < 10) this.pending.push(msg);
  }

  createRoom(level) {
    this.send({ type: 'create-room', pseudo: this.pseudo, level });
  }

  joinRoom(code) {
    this.send({ type: 'join-room', pseudo: this.pseudo, code });
  }

  answer(matchId, index, choice) {
    this.send({ type: 'answer', matchId, index, choice });
  }

  submitPrompt(matchId, text) {
    this.send({ type: 'submit-prompt', matchId, text });
  }

  leave() {
    this.send({ type: 'leave-room' });
    this.close();
  }

  close() {
    if (!this.ws) return;
    this.ws.onclose = null;
    this.ws.close();
    this.ws = null;
    this.pending = [];
  }
}
