/**
 * src/ui/hud.ts — HUD de salle et de match (adapté du code Wanaka collé)
 * Interface DOM pour créer/rejoindre une salle, afficher le QR et le roster.
 */

export function styleHudButton(button: HTMLButtonElement, selected = false): void {
  Object.assign(button.style, {
    appearance: 'none',
    border: selected ? '1px solid #f4f6f8' : '1px solid rgba(244, 246, 248, 0.35)',
    background: selected ? '#f4f6f8' : 'transparent',
    color: selected ? '#0b0d10' : '#f4f6f8',
    borderRadius: '8px',
    padding: '8px 12px',
    cursor: button.disabled ? 'default' : 'pointer',
    font: 'inherit',
    opacity: button.disabled ? '0.45' : '1',
  });
}

export function hudElement(tag: string, opts: { parent?: HTMLElement; text?: string } = {}): HTMLElement {
  const el = document.createElement(tag);
  if (opts.parent) opts.parent.appendChild(el);
  if (opts.text !== undefined) el.textContent = opts.text;
  return el;
}

export interface RoomSessionPort {
  getSnapshot(): any;
  setNickname(nickname: string): Promise<void>;
  create(opts: any): Promise<void>;
  join(opts: any): Promise<void>;
  requestLogin(): void;
  setReady(ready: boolean): Promise<void>;
  start(): Promise<void>;
  leave(): Promise<void>;
  returnToLobby(): void;
  subscribe(cb: () => void): () => void;
}

export interface MatchRoomHudPlatform {
  roomSession: RoomSessionPort | null;
  roomDiagnostics(): any;
}

export function mountRoomSession(
  parent: HTMLElement,
  port: RoomSessionPort,
  mayStart: () => boolean = () => true,
): { update(): void; dispose(): void } {
  const root = hudElement('div', { parent });
  Object.assign(root.style, {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '24px',
    boxSizing: 'border-box',
    overflowY: 'auto',
    background: 'radial-gradient(circle at 50% 26%, rgba(24, 12, 52, 0.55), rgba(6, 3, 16, 0.82))',
    backdropFilter: 'blur(2px)',
    color: '#f4f6f8',
    pointerEvents: 'auto',
    zIndex: '20',
  });

  const status = hudElement('p', { parent: root, text: 'Ouvrir une salle' });
  Object.assign(status.style, { margin: '0', fontWeight: '600', fontSize: '18px' });

  const endedPanel = hudElement('div', { parent: root });
  Object.assign(endedPanel.style, {
    display: 'none',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'center',
  });
  const endedText = hudElement('p', { parent: endedPanel, text: '' });
  Object.assign(endedText.style, { margin: '0', fontWeight: '600', fontSize: '18px' });
  const backToLobby = hudElement('button', { parent: endedPanel, text: 'Retour au lobby' }) as HTMLButtonElement;
  backToLobby.type = 'button';
  styleHudButton(backToLobby, true);

  const createPanel = hudElement('div', { parent: root });
  Object.assign(createPanel.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: 'min(420px, 100%)',
    alignItems: 'stretch',
    margin: 'auto',
  });

  const playingAs = hudElement('p', { parent: createPanel, text: 'Choisissez votre mode de jeu' });
  Object.assign(playingAs.style, { margin: '0', opacity: '0.8', fontSize: '12px' });
  const identityHint = hudElement('p', { parent: createPanel, text: 'Vérification du compte…' });
  Object.assign(identityHint.style, { margin: '0', fontSize: '13px', lineHeight: '1.35' });
  const nickname = hudElement('input', { parent: createPanel }) as HTMLInputElement;
  nickname.type = 'text';
  nickname.setAttribute('aria-label', 'Nom d\'affichage de la salle');
  Object.assign(nickname.style, {
    margin: '0',
    fontWeight: '600',
    font: 'inherit',
    color: 'inherit',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(244,246,248,0.35)',
    borderRadius: '8px',
    padding: '8px 12px',
  });
  const login = hudElement('button', { parent: createPanel, text: 'Continuer avec Wanaka' }) as HTMLButtonElement;
  login.type = 'button';

  const regionLabel = hudElement('p', { parent: createPanel, text: 'Région' });
  Object.assign(regionLabel.style, { margin: '0', opacity: '0.8', fontSize: '12px' });
  const regionRow = hudElement('div', { parent: createPanel });
  Object.assign(regionRow.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
  });

  const seatsLabel = hudElement('p', { parent: createPanel, text: 'Joueurs' });
  Object.assign(seatsLabel.style, { margin: '0', opacity: '0.8', fontSize: '12px' });
  const seatsRow = hudElement('div', { parent: createPanel });
  Object.assign(seatsRow.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    justifyContent: 'center',
    alignItems: 'center',
  });

  const minGroup = hudElement('div', { parent: seatsRow });
  Object.assign(minGroup.style, { display: 'flex', gap: '8px', alignItems: 'center' });
  hudElement('span', { parent: minGroup, text: 'Min' });
  const minMinus = hudElement('button', { parent: minGroup, text: '−' }) as HTMLButtonElement;
  minMinus.type = 'button';
  const minValue = hudElement('span', { parent: minGroup, text: '—' });
  Object.assign(minValue.style, { minWidth: '1.5em', textAlign: 'center', fontWeight: '600' });
  const minPlus = hudElement('button', { parent: minGroup, text: '+' }) as HTMLButtonElement;
  minPlus.type = 'button';

  const maxGroup = hudElement('div', { parent: seatsRow });
  Object.assign(maxGroup.style, { display: 'flex', gap: '8px', alignItems: 'center' });
  hudElement('span', { parent: maxGroup, text: 'Max' });
  const maxMinus = hudElement('button', { parent: maxGroup, text: '−' }) as HTMLButtonElement;
  maxMinus.type = 'button';
  const maxValue = hudElement('span', { parent: maxGroup, text: '—' });
  Object.assign(maxValue.style, { minWidth: '1.5em', textAlign: 'center', fontWeight: '600' });
  const maxPlus = hudElement('button', { parent: maxGroup, text: '+' }) as HTMLButtonElement;
  maxPlus.type = 'button';

  const create = hudElement('button', { parent: createPanel, text: 'Créer une nouvelle partie' }) as HTMLButtonElement;
  create.type = 'button';
  const loadSave = hudElement('button', { parent: createPanel, text: 'Charger une sauvegarde' }) as HTMLButtonElement;
  loadSave.type = 'button';

  const joinLabel = hudElement('p', { parent: createPanel, text: 'Ou rejoindre avec un code de salle' });
  Object.assign(joinLabel.style, {
    margin: '4px 0 0',
    opacity: '0.8',
    fontSize: '12px',
    textAlign: 'center',
  });
  const joinRow = hudElement('div', { parent: createPanel });
  Object.assign(joinRow.style, { display: 'flex', gap: '8px', alignItems: 'stretch' });
  const roomCode = hudElement('input', { parent: joinRow }) as HTMLInputElement;
  roomCode.type = 'text';
  roomCode.placeholder = 'Code de salle';
  roomCode.setAttribute('aria-label', 'Code de salle');
  roomCode.autocomplete = 'off';
  roomCode.autocapitalize = 'characters';
  roomCode.spellcheck = false;
  Object.assign(roomCode.style, {
    flex: '1 1 auto',
    minWidth: '0',
    font: 'inherit',
    color: 'inherit',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(244,246,248,0.35)',
    borderRadius: '8px',
    padding: '8px 12px',
    textTransform: 'uppercase',
  });
  const join = hudElement('button', { parent: joinRow, text: 'Rejoindre la salle' }) as HTMLButtonElement;
  join.type = 'button';

  const waitingNickname = hudElement('input', { parent: root }) as HTMLInputElement;
  waitingNickname.type = 'text';
  waitingNickname.placeholder = 'Nom d\'affichage';
  Object.assign(waitingNickname.style, { display: 'none', padding: '8px 12px', borderRadius: '8px', font: 'inherit' });
  const roster = hudElement('ul', { parent: root });
  Object.assign(roster.style, {
    listStyle: 'none',
    margin: '0',
    padding: '0',
    textAlign: 'center',
  });
  const qrBox = hudElement('div', { parent: root });
  Object.assign(qrBox.style, {
    display: 'none',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '10px',
    borderRadius: '12px',
    background: '#f8f5ee',
    color: '#141018',
  });
  const qrCanvas = hudElement('canvas', { parent: qrBox }) as HTMLCanvasElement;
  Object.assign(qrCanvas.style, { display: 'block', borderRadius: '6px' });
  const qrHint = hudElement('span', { parent: qrBox, text: 'Scannez pour rejoindre' });
  Object.assign(qrHint.style, { fontSize: '12px', fontWeight: '700', letterSpacing: '0.04em' });
  let lastQrUrl: string | null = null;
  const renderQr = (url: string): void => {
    try {
      // Le QR sera dessiné ici quand le canvas sera prêt
      qrCanvas.width = 190;
      qrCanvas.height = 190;
    } catch {
      qrBox.style.display = 'none';
    }
  };

  const invite = hudElement('p', { parent: root });
  Object.assign(invite.style, {
    maxWidth: 'min(420px, 100%)',
    wordBreak: 'break-all',
    textAlign: 'center',
    opacity: '0.9',
    fontSize: '12px',
  });
  const error = hudElement('p', { parent: root });
  Object.assign(error.style, { color: '#ffb4b4', minHeight: '1.2em', margin: '0' });
  const actions = hudElement('div', { parent: root });
  Object.assign(actions.style, {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  });
  const share = hudElement('button', { parent: actions, text: 'Copier le lien d\'invitation' }) as HTMLButtonElement;
  share.type = 'button';
  const ready = hudElement('button', { parent: actions, text: 'Prêt' }) as HTMLButtonElement;
  ready.type = 'button';
  const start = hudElement('button', { parent: actions, text: 'Démarrer' }) as HTMLButtonElement;
  start.type = 'button';
  const leave = hudElement('button', { parent: actions, text: 'Quitter' }) as HTMLButtonElement;
  leave.type = 'button';
  const waitingLogin = hudElement('button', { parent: actions, text: 'Continuer avec Wanaka' }) as HTMLButtonElement;
  waitingLogin.type = 'button';

  let selectedRegionId = '';
  let regionPreferenceSeeded = false;
  let capacityMinPlayers: number | null = null;
  let capacityMaxPlayers: number | null = null;
  let regionKey = '';
  let joinError: string | null = null;
  let nicknameSave: Promise<boolean> | null = null;
  let nicknameError: string | null = null;

  const saveWaitingNickname = (): Promise<boolean> => {
    const view = port.getSnapshot();
    const next = waitingNickname.value.trim();
    if (next === '' || next === (view.confirmedNickname ?? '')) return Promise.resolve(true);
    if (nicknameSave !== null) return nicknameSave;
    nicknameError = null;
    nicknameSave = port
      .setNickname(next)
      .then(() => true)
      .catch(() => {
        nicknameError = 'Le nom n\'a pas pu être enregistré. Réessayez.';
        return false;
      })
      .finally(() => {
        nicknameSave = null;
        update();
      });
    update();
    return nicknameSave;
  };

  const paintRegionButtons = (): void => {
    const view = port.getSnapshot();
    if (!regionPreferenceSeeded) {
      selectedRegionId = view.preferredRegion ?? '';
      regionPreferenceSeeded = true;
    } else if (
      selectedRegionId !== '' &&
      !view.regions.some((entry: any) => entry.id === selectedRegionId)
    ) {
      selectedRegionId = view.preferredRegion ?? '';
    }
    const nextKey = view.regions.map((entry: any) => `${entry.id}:${entry.label}`).join('|');
    if (nextKey === regionKey && regionRow.childElementCount > 0) {
      for (const child of regionRow.querySelectorAll('button')) {
        const button = child as HTMLButtonElement;
        styleHudButton(button, button.dataset.regionId === selectedRegionId);
      }
      return;
    }
    regionKey = nextKey;
    regionRow.replaceChildren();
    if (view.regions.length === 0) {
      regionLabel.style.display = 'none';
      regionRow.style.display = 'none';
      return;
    }
    regionLabel.style.display = '';
    regionRow.style.display = 'flex';
    const choices: Array<{ id: string; label: string }> = [
      { id: '', label: 'Région la plus proche' },
      ...view.regions.map((entry: any) => ({ id: entry.id, label: entry.label })),
    ];
    for (const choice of choices) {
      const button = hudElement('button', { parent: regionRow, text: choice.label }) as HTMLButtonElement;
      button.type = 'button';
      button.dataset.regionId = choice.id;
      styleHudButton(button, choice.id === selectedRegionId);
      button.onclick = () => {
        selectedRegionId = choice.id;
        update();
      };
    }
  };

  const update = (): void => {
    const view = port.getSnapshot();
    const savingNickname = nicknameSave !== null;
    if (view.supported === null || view.lifecycle === 'playing') {
      root.style.display = 'none';
      return;
    }
    const ended = view.lifecycle === 'ended';
    root.style.display = 'flex';
    endedPanel.style.display = ended ? 'flex' : 'none';
    if (ended) {
      createPanel.style.display = 'none';
      actions.style.display = 'none';
      roster.style.display = 'none';
      invite.style.display = 'none';
      qrBox.style.display = 'none';
      status.style.display = 'none';
      endedText.textContent = roomEndedMessage(view.endReason);
      backToLobby.disabled = !view.canReturnToLobby;
      styleHudButton(backToLobby, true);
      return;
    }
    status.style.display = '';
    const unjoined = view.roomCode === null;
    createPanel.style.display = unjoined ? 'flex' : 'none';
    actions.style.display = unjoined ? 'none' : 'flex';
    roster.style.display = unjoined ? 'none' : 'block';
    invite.style.display = unjoined ? 'none' : 'block';
    const inviteUrl = view.inviteUrl;
    if (inviteUrl === null) {
      qrBox.style.display = 'none';
      lastQrUrl = null;
    } else {
      qrBox.style.display = unjoined ? 'none' : 'flex';
      if (inviteUrl !== lastQrUrl) {
        lastQrUrl = inviteUrl;
        renderQr(inviteUrl);
      }
    }

    const supported = view.supported;
    if (supported !== null) {
      if (capacityMaxPlayers === null) capacityMaxPlayers = supported.maxPlayers;
      if (capacityMinPlayers === null) capacityMinPlayers = supported.minPlayers;
      capacityMaxPlayers = Math.min(supported.maxPlayers, Math.max(supported.minPlayers, capacityMaxPlayers));
      capacityMinPlayers = Math.min(capacityMaxPlayers, Math.max(supported.minPlayers, capacityMinPlayers));
      minValue.textContent = String(capacityMinPlayers);
      maxValue.textContent = String(capacityMaxPlayers);
      minGroup.style.display = supported.maxPlayers <= supported.minPlayers ? 'none' : 'flex';
      minMinus.disabled = capacityMinPlayers <= supported.minPlayers;
      minPlus.disabled = capacityMinPlayers >= capacityMaxPlayers;
      maxMinus.disabled = capacityMaxPlayers <= capacityMinPlayers;
      maxPlus.disabled = capacityMaxPlayers >= supported.maxPlayers;
      styleHudButton(minMinus);
      styleHudButton(minPlus);
      styleHudButton(maxMinus);
      styleHudButton(maxPlus);
    }

    paintRegionButtons();

    const capacity = view.capacity;
    const seats = capacity === null
      ? `${view.members.length} joueurs`
      : `${view.members.length} / ${capacity.maxPlayers} joueurs`;
    status.textContent = unjoined
      ? supported === null
        ? 'Préparation de la salle…'
        : `Multijoueur — ${supported.minPlayers} à ${supported.maxPlayers} joueurs`
      : `Salle ${view.roomCode} · ${seats}`;
    invite.textContent = view.inviteUrl ?? '';
    roster.replaceChildren(
      ...view.members.map((member: any) => {
        const row = document.createElement('li');
        const readiness = member.ready
          ? ' · Prêt'
          : member.gameReady
            ? ''
            : ' · Préparation…';
        row.textContent = `${member.nickname}${member.role === 'host' ? ' (Hôte)' : ''}${readiness}`;
        return row;
      }),
    );
    error.textContent = joinError ?? nicknameError ?? view.errorCode ?? '';
    const nextName = view.confirmedNickname ?? view.suggestedNickname ?? '';
    if (document.activeElement !== nickname && (view.roomCode !== null || nickname.value === '')) {
      nickname.value = nextName;
    }
    nickname.style.display = view.signedIn ? 'none' : '';
    nickname.disabled = !view.canSetNickname;
    waitingNickname.style.display = !unjoined && view.canSetNickname ? '' : 'none';
    if (document.activeElement !== waitingNickname) waitingNickname.value = nextName;
    waitingNickname.disabled = !view.canSetNickname || savingNickname;
    identityHint.textContent = view.signedIn
      ? `Connecté en tant que ${view.confirmedNickname ?? view.suggestedNickname ?? 'Joueur Wanaka'}.`
      : 'Jouez en tant qu\'invité avec ce surnom, ou connectez-vous pour utiliser votre profil Wanaka.';
    login.style.display = view.canRequestLogin ? '' : 'none';
    login.disabled = !view.canRequestLogin;
    waitingLogin.hidden = unjoined || !view.canRequestLogin;
    waitingLogin.disabled = !view.canRequestLogin;
    create.textContent = view.persistenceMode === 'none' ? 'Créer la salle' : 'Créer une nouvelle partie';
    create.disabled = !view.canCreate || view.pending !== null;
    loadSave.textContent = view.persistenceMode === 'room' ? 'Charger une partie sauvegardée' : 'Charger une sauvegarde';
    loadSave.hidden = view.persistenceMode === 'none';
    loadSave.disabled = !view.canCreate || view.pending !== null;
    roomCode.disabled = !view.canCreate || view.pending !== null;
    join.textContent = view.pending === 'join' ? 'Connexion…' : 'Rejoindre la salle';
    join.disabled =
      !view.canCreate || view.pending !== null || roomCode.value.trim() === '';
    share.disabled = view.inviteUrl === null;
    if (!view.selfGameReady && !view.selfReady) {
      ready.textContent = 'Préparation…';
      ready.disabled = true;
      ready.setAttribute('aria-busy', 'true');
      ready.style.opacity = '0.72';
    } else {
      ready.textContent = view.selfReady ? 'Ne plus être prêt' : 'Prêt';
      ready.disabled = !view.canSetReady;
      ready.removeAttribute('aria-busy');
      ready.style.opacity = '';
    }
    start.disabled = !view.canStart || !mayStart();
    start.hidden = view.selfRole !== 'host';
    styleHudButton(login);
    styleHudButton(create, true);
    styleHudButton(loadSave);
    styleHudButton(join);
    styleHudButton(share);
    styleHudButton(ready);
    styleHudButton(start);
    styleHudButton(leave);
    styleHudButton(waitingLogin);
  };

  minMinus.onclick = () => {
    const min = capacityMinPlayers;
    if (min === null) return;
    capacityMinPlayers = min - 1;
    update();
  };
  minPlus.onclick = () => {
    const min = capacityMinPlayers;
    if (min === null) return;
    capacityMinPlayers = min + 1;
    update();
  };
  maxMinus.onclick = () => {
    const max = capacityMaxPlayers;
    if (max === null) return;
    capacityMaxPlayers = max - 1;
    update();
  };
  maxPlus.onclick = () => {
    const max = capacityMaxPlayers;
    if (max === null) return;
    capacityMaxPlayers = max + 1;
    update();
  };
  const createRoom = (saveSelection?: 'new' | 'load'): void => {
    const view = port.getSnapshot();
    const supported = view.supported;
    if (supported === null || !view.canCreate) return;
    const maxPlayers = capacityMaxPlayers ?? supported.maxPlayers;
    const minPlayers = capacityMinPlayers ?? supported.minPlayers;
    void port.create({
      nickname: view.signedIn
        ? (view.confirmedNickname ?? view.suggestedNickname ?? '')
        : nickname.value.trim(),
      ...(selectedRegionId === '' ? {} : { region: selectedRegionId }),
      capacityMaxPlayers: maxPlayers,
      ...(minPlayers !== supported.minPlayers ? { capacityMinPlayers: minPlayers } : {}),
      ...(saveSelection === undefined ? {} : { saveSelection }),
    });
  };
  create.onclick = () => {
    const mode = port.getSnapshot().persistenceMode;
    createRoom(mode === 'none' ? undefined : 'new');
  };
  loadSave.onclick = () => {
    if (port.getSnapshot().persistenceMode === 'none') return;
    createRoom('load');
  };
  const joinRoom = (): void => {
    const view = port.getSnapshot();
    if (!view.canCreate || view.pending !== null) return;
    const nextRoomCode = roomCode.value.trim().toUpperCase();
    const nextNickname = view.signedIn
      ? (view.confirmedNickname ?? view.suggestedNickname ?? '')
      : nickname.value.trim();
    if (nextRoomCode === '') {
      joinError = 'Entrez un code de salle.';
      update();
      return;
    }
    joinError = null;
    update();
    void port
      .join({
        roomCode: nextRoomCode,
        nickname: nextNickname,
      })
      .catch((cause: unknown) => {
        joinError = cause instanceof Error ? cause.message : 'Impossible de rejoindre la salle.';
        update();
      });
  };
  roomCode.oninput = () => {
    joinError = null;
    update();
  };
  roomCode.onkeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    joinRoom();
  };
  join.onclick = joinRoom;
  login.onclick = () => {
    void port.requestLogin();
  };
  waitingLogin.onclick = () => { void port.requestLogin(); };
  waitingNickname.onchange = () => {
    void saveWaitingNickname();
  };
  nickname.onchange = () => {
    if (port.getSnapshot().signedIn) return;
    const next = nickname.value.trim();
    if (next === '') return;
    void port.setNickname(next);
  };
  share.onclick = () => {
    const url = port.getSnapshot().inviteUrl;
    if (url === null) return;
    void navigator.clipboard?.writeText(url);
  };
  ready.onclick = () => {
    void (async () => {
      if (!(await saveWaitingNickname())) return;
      await port.setReady(!port.getSnapshot().selfReady);
    })();
  };
  start.onclick = () => {
    void (async () => {
      if (!(await saveWaitingNickname()) || !mayStart()) return;
      await port.start();
    })();
  };
  leave.onclick = () => {
    void port.leave();
  };
  backToLobby.onclick = () => {
    if (!port.getSnapshot().canReturnToLobby) return;
    void port.returnToLobby();
  };

  const unsubscribe = port.subscribe(update);
  update();
  return {
    update,
    dispose: () => {
      unsubscribe();
      root.remove();
    },
  };
}

function roomEndedMessage(reason: string | null): string {
  switch (reason) {
    case 'host_left':
      return 'L\'hôte est parti, cette salle est terminée.';
    case 'host_ended':
      return 'L\'hôte a terminé cette salle.';
    case 'authority_lost':
      return 'Le jeu n\'a pas pu continuer sans son hôte, ce match est terminé.';
    case 'authority_recovery_failed':
      return 'Le jeu n\'a pas pu être restauré après la déconnexion de l\'hôte, ce match est terminé.';
    case 'authority_election_failed':
      return 'Aucun joueur n\'a pu reprendre le jeu après la déconnexion de l\'hôte, ce match est terminé.';
    default:
      return 'Cette salle est terminée.';
  }
}

/** Contrôles HUD de la manche. Chaque joueur peut quitter ; seul l'Hôte peut terminer. */
export function mountMatchRoomHud(
  parent: HTMLElement,
  platform: MatchRoomHudPlatform,
): { update(): void; dispose(): void } {
  const panel = hudElement('section', { parent });
  const connection = hudElement('strong', { parent: panel, text: '' });
  const count = hudElement('span', { parent: panel, text: '' });
  const toggle = hudElement('button', { parent: panel, text: 'Afficher les joueurs' }) as HTMLButtonElement;
  const roster = hudElement('ul', { parent: panel });
  const leave = hudElement('button', { parent: panel, text: 'Quitter la salle' }) as HTMLButtonElement;
  const end = hudElement('button', { parent: panel, text: 'Terminer la salle' }) as HTMLButtonElement;
  const actionStatus = hudElement('span', { parent: panel, text: '' });
  let rosterVisible = false;
  let actionError: string | null = null;

  Object.assign(panel.style, {
    position: 'absolute',
    top: '18px',
    left: '18px',
    zIndex: '20',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px 14px',
    borderRadius: '9px',
    background: '#081426dd',
    color: '#eef6ff',
    fontFamily: 'system-ui',
    pointerEvents: 'auto',
  });
  Object.assign(roster.style, { display: 'none', margin: '0', paddingLeft: '18px' });
  for (const button of [toggle, leave, end]) {
    Object.assign(button.style, {
      padding: '7px 10px',
      borderRadius: '6px',
      border: '1px solid #8abcf0',
      cursor: 'pointer',
    });
  }
  toggle.onclick = () => {
    rosterVisible = !rosterVisible;
    roster.style.display = rosterVisible ? 'block' : 'none';
    toggle.textContent = rosterVisible ? 'Cacher les joueurs' : 'Afficher les joueurs';
  };
  leave.onclick = () => {
    const port = platform.roomSession;
    if (port === null) return;
    actionError = null;
    void port.leave().catch((error: unknown) => {
      actionError = error instanceof Error ? error.message : 'Échec de la sortie de la salle.';
    });
  };
  end.onclick = () => {
    const port = platform.roomSession;
    if (port === null) return;
    actionError = null;
    void port.end().catch((error: unknown) => {
      actionError = error instanceof Error ? error.message : 'Échec de la fin de salle.';
    });
  };

  const update = (): void => {
    const view = platform.roomSession?.getSnapshot();
    panel.style.display = view?.lifecycle === 'playing' && view.supported !== null ? 'flex' : 'none';
    if (view?.lifecycle !== 'playing' || view.supported === null) return;
    const diagnostics = platform.roomDiagnostics();
    const status = view.connectionState === 'host_reconnecting'
      ? 'L\'hôte se reconnecte'
      : view.connectionState === 'reconnecting'
        ? 'Reconnexion…'
        : view.connectionState === 'connected'
          ? 'Connecté'
          : 'Connexion…';
    const ping = diagnostics?.networkRttMs === null || diagnostics === null
      ? '—'
      : `${Math.round(diagnostics.networkRttMs)} ms`;
    connection.textContent = `${status} · ${ping}${view.roomRegion ? ` · ${view.roomRegion}` : ''}`;
    const members = view.members;
    count.textContent = `${members.filter((member: any) => member.connected).length}/${members.length} joueurs`;
    roster.replaceChildren(
      ...members.map((member: any) => {
        const item = document.createElement('li');
        item.textContent = `${member.nickname}${member.role === 'host' ? ' (Hôte)' : ''}${member.connected ? '' : ' · Reconnexion…'}`;
        return item;
      }),
    );
    const canAct = view.pending === null && view.connectionState === 'connected';
    leave.disabled = !canAct;
    leave.textContent = view.pending === 'leave' ? 'Sortie de la salle…' : 'Quitter la salle';
    const canEnd = view.selfRole === 'host' && canAct;
    end.hidden = view.selfRole !== 'host';
    end.disabled = !canEnd;
    end.textContent = view.pending === 'end' ? 'Fin de salle…' : 'Terminer la salle';
    actionStatus.textContent = actionError ?? '';
    actionStatus.hidden = actionError === null;
  };

  update();
  return { update, dispose: () => panel.remove() };
}
