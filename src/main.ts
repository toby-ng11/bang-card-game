import { CARD_DEFS } from './definitions/cards';
import { CARD_POOL } from './definitions/deck';
import { ROLE_INFO } from './definitions/roles';
import './style.css';
import {
    CardKey,
    CardPick,
    CardPickSource,
    FlashMap,
    GameState,
    GridLayout,
    Player,
    Role,
} from './types';

function initGame(): GameState {
    const roles = shuffle<Role>([
        'sheriff',
        'deputy',
        'outlaw',
        'outlaw',
        'outlaw',
        'renegade',
    ]);

    const deck = shuffle<CardKey>([...CARD_POOL]);

    const names = ['You', 'Billy', 'Rosa', 'Duke', 'Jade', 'Matt'];

    const players: Player[] = roles.map((role, i) => ({
        id: i,
        name: names[i],
        role,
        hp: role === 'sheriff' ? 5 : 4,
        maxHp: role === 'sheriff' ? 5 : 4,
        hand: dealN(deck, role === 'sheriff' ? 5 : 4),
        alive: true,
        isHuman: i === 0,
        inPlay: [],
    }));

    const si = players.findIndex((p) => p.role === 'sheriff');

    return {
        players,
        deck,
        discardPile: [],
        turn: si,
        phase: 'draw',
        bangUsed: false,
        log: [
            'Game started! Your role is shown below. Enemy roles stay hidden until death.',
        ],
        over: false,
        winner: null,
        selectedCard: null,
        targeting: false,
        discardingToEndTurn: false,
        generalStoreCards: [],
        generalStorePicking: false,
        generalStorePlayerPicking: false,
        generalStoreResolve: null,
        cardPickerPicking: false,
        cardPickerTarget: null,
        cardPickerResolve: null,
        cardPickerLabel: '',
    };
}

let G: GameState,
    aiRunning = false;

const flashMap: FlashMap = {};

function shuffle<T>(a: T[]): T[] {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
}

function dealN(deck: CardKey[], n: number): CardKey[] {
    const cards: CardKey[] = [];
    for (let i = 0; i < n; i++) {
        if (deck.length < n) refillDeck();
        if (deck.length) {
            cards.push(deck.shift()!);
        }
    }
    return cards;
}

function getAliveOrder() {
    return G.players.filter((p) => p.alive).map((p) => p.id);
}

function distance(from: number, to: number): number {
    const alive = getAliveOrder();
    const fi = alive.indexOf(from),
        ti = alive.indexOf(to);
    if (fi < 0 || ti < 0) return 99;
    const n = alive.length,
        d = Math.abs(fi - ti);
    const base = Math.min(d, n - d);
    return (
        base +
        (G.players[to].inPlay.includes('mustang') ? 1 : 0) -
        (G.players[from].inPlay.includes('scope') ? 1 : 0)
    );
}

function inRange(from: number, to: number): boolean {
    return distance(from, to) <= 1;
}

function addLog(msg: string) {
    G.log.unshift(msg);
    if (G.log.length > 25) G.log.pop();
}

function addLogAnotherPlayACard(player: Player, cardname: string) {
    G.log.unshift(`${player.name} plays a ${cardname}.`);
    if (G.log.length > 25) G.log.pop();
}

function refillDeck() {
    if (G && G.deck.length === 0) {
        G.deck = shuffle([...G.discardPile]);
        G.discardPile = [];
        addLog('(Deck reshuffled from discard pile.)');
    }
}

function checkWin() {
    const sheriff = G.players.find((p) => p.role === 'sheriff');
    if (sheriff && !sheriff.alive) {
        const renegade = G.players.find((p) => p.role === 'renegade');
        const aliveOutlaws = G.players.filter(
            (p) => p.role === 'outlaw' && p.alive,
        );
        G.over = true;
        G.winner =
            aliveOutlaws.length === 0 && renegade && !renegade.alive
                ? 'renegade_solo'
                : 'outlaws';
        return;
    }
    if (
        G.players
            .filter((p) => p.role === 'outlaw' || p.role === 'renegade')
            .every((p) => !p.alive)
    ) {
        G.over = true;
        G.winner = 'sheriff';
    }
}

function applyDamage(targetId: number, amount: number, sourceId: number) {
    const t = G.players[targetId];
    if (!t.alive) return;
    t.hp = Math.max(0, t.hp - amount);
    flashMap[targetId] = 'flash-hit';
    addLog(`${t.name} takes ${amount} damage → ${t.hp}/${t.maxHp} HP.`);
    if (t.hp === 0) {
        t.alive = false;
        addLog(`☠ ${t.name} eliminated! Role: ${t.role.toUpperCase()}.`);

        G.discardPile.push(...t.hand);
        G.discardPile.push(...t.inPlay);
        debugCardCount();
        t.hand = [];
        t.inPlay = [];

        if (t.role === 'outlaw') {
            const killer = G.players[sourceId];
            if (killer) {
                killer.hand.push(...dealN(G.deck, 3));
                debugCardCount();
                addLog(`${killer.name} draws 3 bonus cards!`);
            }
        }
        if (t.role === 'deputy') {
            const si = G.players.findIndex((p) => p.role === 'sheriff');
            if (sourceId === si) {
                G.discardPile.push(...G.players[si].hand);
                debugCardCount();
                G.players[si].hand = [];
                addLog(`Sheriff shot a Deputy! Sheriff loses all cards.`);
            }
        }
        render();
        checkWin();
    }
}

function applyHeal(targetId: number, amount: number) {
    const t = G.players[targetId];
    t.hp = Math.min(t.maxHp, t.hp + amount);
    flashMap[targetId] = 'flash-heal';
    addLog(`${t.name} heals +${amount} HP → ${t.hp}/${t.maxHp}.`);
}

function drawCards(targetId: number, numberOfCard: number) {
    const t = G.players[targetId];
    t.hand.push(...dealN(G.deck, numberOfCard));
    debugCardCount();
}

function applyDodge(targetId: number) {
    flashMap[targetId] = 'flash-dodge';
}

function isEnemy(from: number, to: number) {
    const f = G.players[from],
        t = G.players[to];
    if (f.role === 'sheriff' || f.role === 'deputy')
        return t.role === 'outlaw' || t.role === 'renegade';
    if (f.role === 'outlaw') return t.role === 'sheriff' || t.role === 'deputy';
    return t.role !== 'renegade';
}

function nextTurn() {
    if (G.over) return;
    let next = (G.turn + 1) % G.players.length,
        att = 0;
    while (!G.players[next].alive && att < G.players.length) {
        next = (next + 1) % G.players.length;
        att++;
    }
    G.turn = next;
    G.phase = 'draw';
    G.bangUsed = false;
    G.selectedCard = null;
    G.targeting = false;
    G.discardingToEndTurn = false;
}

async function resolveDuel(challengerId: number, targetId: number) {
    // target responds first, then challenger, alternating
    let current = targetId;
    let other = challengerId;

    while (true) {
        const p = G.players[current];
        const bangIndex = p.hand.indexOf('bang');

        if (bangIndex >= 0) {
            // has a BANG! — must play it to stay in
            const bangCard = p.hand.splice(bangIndex, 1);
            G.discardPile.push(...bangCard);
            debugCardCount();
            await Promise.all([
                popupOnPlayer(p.id, 'bang', 'bang-pop'),
                showBanner(`${p.name} plays BANG! ⚔️`, 800),
                addLog(`${p.name} plays BANG! to stay in the duel.`),
            ]);
            render();
        } else {
            // can't respond — takes damage and duel ends
            addLog(`${p.name} has no BANG! and takes 1 damage.`);
            await showBanner(`${p.name} loses the duel! 💀`, 900);
            applyDamage(p.id, 1, other);
            break;
        }

        // swap who needs to respond
        [current, other] = [other, current];
        await wait(400);

        if (G.over) break;
    }
}

async function resolveGeneralStore() {
    const alivePlayers = G.players.filter((p) => p.alive);
    const flipped = dealN(G.deck, alivePlayers.length);
    addLog(`General Store: ${flipped.length} cards flipped face-up.`);
    await showBanner(`General Store! Pick a card. 🏪`, 900);

    // determine pick order starting from current turn
    const pickOrder = [];
    let idx = G.players.findIndex((p) => p.id === G.turn);
    for (let i = 0; i < alivePlayers.length; i++) {
        const p = G.players[(idx + i) % G.players.length];
        if (p.alive) pickOrder.push(p);
    }

    for (const p of pickOrder) {
        if (!flipped.length) break;

        G.generalStorePicking = true;
        G.generalStoreCards = flipped;
        render();

        if (p.isHuman) {
            // let human pick — store flipped in G and render a picker
            G.generalStorePlayerPicking = true;
            // wait until human picks
            await new Promise((res) => {
                G.generalStoreResolve = res;
            });
            G.generalStorePlayerPicking = false;
            render();
            await wait(400);
        } else {
            // AI picks: take the first BANG! if available, else first card
            const pick = flipped.includes('bang')
                ? flipped.splice(flipped.indexOf('bang'), 1)[0]
                : flipped.splice(0, 1)[0];
            p.hand.push(pick);
            debugCardCount();
            addLog(
                `${p.name} picks ${CARD_DEFS[pick]?.name || pick} from General Store.`,
            );
            await Promise.all([
                popupOnPlayer(p.id, pick, 'heal-pop'),
                showBanner(
                    `${p.name} picks ${CARD_DEFS[pick]?.name || pick}`,
                    700,
                ),
            ]);

            render();
            await wait(400);
        }
    }
    G.generalStorePicking = false;
    // any remaining cards go to discard (shouldn't happen but safety net)
    G.discardPile.push(...flipped);
    debugCardCount();
}

function waitForCardPick(targetId: number, label: string): Promise<CardPick> {
    G.cardPickerPicking = true;
    G.cardPickerTarget = targetId;
    G.cardPickerLabel = label;
    render();
    return new Promise((res) => {
        G.cardPickerResolve = res;
    });
}

function handleGeneralStorePick(cardKey: CardKey) {
    if (!G.generalStorePlayerPicking) return;
    const idx = G.generalStoreCards.indexOf(cardKey);
    if (idx < 0) return;
    G.generalStoreCards.splice(idx, 1);
    G.players[0].hand.push(...[cardKey]);
    debugCardCount();
    addLog(
        `You pick ${CARD_DEFS[cardKey]?.name || cardKey} from General Store.`,
    );
    G.generalStoreResolve?.(cardKey);
}

function handleCardPickerPick(picked: CardPick) {
    if (!G.cardPickerPicking) return;
    G.cardPickerPicking = false;
    G.cardPickerTarget = null;
    G.cardPickerLabel = '';
    G.cardPickerResolve?.(picked);
    G.cardPickerResolve = null;
}

async function checkMissed(target: Player, source: Player) {
    const missed = target.hand.indexOf('missed');
    if (missed >= 0) {
        const missedCard = target.hand.splice(missed, 1);
        await popupOnPlayer(target.id, 'missed', 'missed-pop');
        addLog(`${target.name} plays Missed! and dodges.`);
        G.discardPile.push(...missedCard);
        debugCardCount();
        applyDodge(target.id);
    } else {
        await popupOnPlayer(target.id, 'bang', 'bang-pop');
        applyDamage(target.id, 1, source.id);
    }
}

// ── Visual helpers ──────────────────────────────────────────────
function wait(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

function showBanner(text: string, duration = 1100) {
    const b = document.getElementById('action-banner');
    if (!b) return Promise.resolve();
    b.textContent = text;
    b.style.opacity = '1';
    return new Promise((res) =>
        setTimeout(() => {
            b.style.opacity = '0';
            setTimeout(res, 200);
        }, duration),
    );
}

// Show popup card on top of a player row (beer / missed / bang)
function popupOnPlayer(pid: number, cardKey: CardKey, variant: string) {
    const row = document.querySelector(`[data-pid="${pid}"]`) as HTMLDivElement;
    if (!row) return Promise.resolve();
    row.style.position = 'relative';
    const c = CARD_DEFS[cardKey];
    const el = document.createElement('div');
    el.className = `popup-card ${variant}`;
    el.innerHTML = `<span style="font-size:22px;">${c ? c.icon : '?'}</span><span style="font-size:9px;margin-top:2px;">${c ? c.name : ''}</span>`;
    row.appendChild(el);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.classList.add('show');
        });
    });
    return new Promise<void>((res) =>
        setTimeout(() => {
            el.remove();
            res();
        }, 1100),
    );
}

function floatCard(
    cardKey: CardKey,
    fromEl: HTMLDivElement,
    toEl: HTMLDivElement,
) {
    const fc = document.getElementById('float-card');
    const fiEl = fc?.querySelector('.fi'),
        fnEl = document.getElementById('fc-name');
    if (!fc || !fromEl || !toEl) return Promise.resolve();
    const c = CARD_DEFS[cardKey];
    if (fiEl) fiEl.textContent = c ? c.icon : '?';
    if (fnEl) fnEl.textContent = c ? c.name : '';
    const fr = fromEl.getBoundingClientRect(),
        tr = toEl.getBoundingClientRect();
    const sx = fr.left + fr.width / 2 - 26,
        sy = fr.top + fr.height / 2 - 36;
    const ex = tr.left + tr.width / 2 - 26,
        ey = tr.top + tr.height / 2 - 36;
    fc.style.transition = 'none';
    fc.style.left = sx + 'px';
    fc.style.top = sy + 'px';
    fc.style.opacity = '1';
    fc.style.transform = 'scale(1)';
    return new Promise((res) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                fc.style.transition =
                    'left 0.5s cubic-bezier(0.4,0,0.2,1),top 0.5s cubic-bezier(0.4,0,0.2,1),opacity 0.3s 0.3s,transform 0.5s';
                fc.style.left = ex + 'px';
                fc.style.top = ey + 'px';
                fc.style.opacity = '0';
                fc.style.transform = 'scale(0.7)';
                setTimeout(res, 650);
            });
        });
    });
}

function getPlayerEl(id: number) {
    return document.querySelector(`[data-pid="${id}"]`) as HTMLDivElement;
}

// ── Distance map renderer ───────────────────────────────────────
function renderDistanceMap() {
    //const alive = getAliveOrder();
    //const you = 0;
    //const others = G.players.filter((p) => p.id !== 0);

    // build circle layout string
    // show all players in alive order, mark distances from you
    let html = `<div class="dist-map">
    <div class="dist-map-title">Distance from you (range 1 = can BANG!)</div>
    <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">`;

    const aliveAll = G.players.filter((p) => p.alive);
    //const youIdx = aliveAll.findIndex((p) => p.id === 0);

    // render circle of alive players
    aliveAll.forEach((p, i) => {
        const dist = p.id <= 0 ? 0 : distance(0, p.id);
        const isYou = p.id === 0;
        html += `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div class="dist-node ${isYou ? 'you' : ''} ${!p.alive ? 'dead-node' : ''}" title="${p.name}">
        ${p.name.substring(0, 2)}
      </div>
      ${!isYou ? `<span style="font-size:10px;color:${dist === 1 ? '#3B6D11' : 'var(--color-text-secondary)'};">${dist === 1 ? '🎯 1' : 'dist ' + dist}</span>` : '<span style="font-size:10px;color:#185FA5;">YOU</span>'}
    </div>`;
        if (i < aliveAll.length - 1) {
            html += `<div style="flex:1;height:2px;background:var(--color-border-secondary);border-radius:1px;min-width:10px;"></div>`;
        }
    });

    // also show dead players grayed
    const dead = G.players.filter((p) => !p.alive && p.id !== 0);
    if (dead.length) {
        html += `<div style="margin-left:8px;display:flex;gap:4px;align-items:center;">`;
        dead.forEach((p) => {
            html += `<div class="dist-node dead-node" title="${p.name} (dead)">${p.name.substring(0, 2)}</div>`;
        });
        html += `</div>`;
    }

    html += `</div>
    <div style="font-size:11px;color:var(--color-text-secondary);margin-top:6px;">
      🎯 = distance 1 (in BANG! range) &nbsp;·&nbsp; Players wrap around — it's a circle
    </div>
  </div>`;
    return html;
}

// ── AI ──────────────────────────────────────────────────────────
function aiPickCardFrom(target: Player, perspective: Player) {
    // perspective = the AI player doing the action
    const allCards = [
        ...target.hand.map((c, i) => ({ source: 'hand', idx: i, key: c })),
        ...target.inPlay.map((c, i) => ({ source: 'inPlay', idx: i, key: c })),
    ];
    if (!allCards.length) return null;

    // priority: steal/discard mustang if it's blocking range, else scope, else random
    const mustang = allCards.find((c) => c.key === 'mustang');
    const scope = allCards.find((c) => c.key === 'scope');
    //const barrel = allCards.find((c) => c.key === "barrel");

    // if target has mustang and AI can't reach them, discard it
    if (mustang && !inRange(perspective.id, target.id)) return mustang;
    // if target has scope and is an enemy, discard it
    if (scope && isEnemy(perspective.id, target.id)) return scope;
    // if target has barrel, discard it so BANG! lands reliably
    //if (barrel && isEnemy(perspective.id, target.id)) return barrel;

    // otherwise pick a random hand card (don't peek at face-down hand)
    const handCards = allCards.filter((c) => c.source === 'hand');
    const inPlayCards = allCards.filter((c) => c.source === 'inPlay');

    // prefer stealing hand cards for panic, inPlay for catbalou
    return handCards.length
        ? handCards[Math.floor(Math.random() * handCards.length)]
        : inPlayCards[Math.floor(Math.random() * inPlayCards.length)];
}

async function aiPlay() {
    const p = G.players[G.turn];
    if (!p.alive || p.isHuman) return;
    await showBanner(`${p.name}'s turn begins…`, 800);
    p.hand.push(...dealN(G.deck, 2));
    debugCardCount();
    addLog(`--- ${p.name} draws 2 cards ---`);
    render();
    await wait(500);
    const alivePlayers = G.players.filter((p) => p.alive);

    if (p.hp <= 2 && alivePlayers.length > 2 && p.hand.includes('beer')) {
        const card = p.hand.splice(p.hand.indexOf('beer'), 1);
        await Promise.all([
            popupOnPlayer(p.id, 'beer', 'beer-pop'),
            showBanner(`${p.name} drinks a Beer! 🍺`, 900),
        ]);
        applyHeal(p.id, 1);
        addLogAnotherPlayACard(p, 'Beer');
        G.discardPile.push(...card);
        debugCardCount();
        render();
        await wait(300);
    }

    if (p.hp < p.maxHp && p.hand.includes('saloon')) {
        const card = p.hand.splice(p.hand.indexOf('saloon'), 1);
        await Promise.all([
            popupOnPlayer(p.id, 'saloon', 'saloon-pop'),
            showBanner(`${p.name} play a Saloon! 🍺🍺🍺`, 900),
        ]);
        for (const q of G.players) {
            if (!q.alive) continue;
            applyHeal(q.id, 1);
        }
        G.discardPile.push(...card);
        debugCardCount();
        addLogAnotherPlayACard(p, 'Saloon!');
        render();
        await wait(300);
    }

    if (!G.over && p.hand.includes('stagecoach')) {
        const card = p.hand.splice(p.hand.indexOf('stagecoach'), 1);
        await Promise.all([
            popupOnPlayer(p.id, 'stagecoach', 'stagecoach-pop'),
            showBanner(`${p.name} play a Stagecoach! 🃏🃏`, 900),
        ]);
        G.discardPile.push(...card);
        drawCards(p.id, 2);
        addLogAnotherPlayACard(p, 'Stagecoach');

        debugCardCount();
        render();
        await wait(300);
    }

    if (!G.over && p.hand.includes('wellsfargo')) {
        const card = p.hand.splice(p.hand.indexOf('wellsfargo'), 1);
        await Promise.all([
            popupOnPlayer(p.id, 'wellsfargo', 'wellsfargo-pop'),
            showBanner(`${p.name} play a Wells Fargo! 🃏🃏🃏`, 900),
        ]);
        G.discardPile.push(...card);
        drawCards(p.id, 3);
        addLogAnotherPlayACard(p, 'Wells Fargo');
        debugCardCount();
        render();
        await wait(300);
    }

    if (!G.over && p.hand.includes('generalstore')) {
        const card = p.hand.splice(p.hand.indexOf('generalstore'), 1);
        await Promise.all([
            popupOnPlayer(p.id, 'generalstore', 'generalstore-pop'),
            showBanner(`${p.name} play General Store! 🏪`, 900),
        ]);
        addLogAnotherPlayACard(p, 'General Store');
        G.discardPile.push(...card);
        debugCardCount();
        render();
        await resolveGeneralStore();
        await wait(300);
    }

    if (!G.over && p.hand.includes('mustang')) {
        const card = p.hand.splice(p.hand.indexOf('mustang'), 1);
        await popupOnPlayer(p.id, 'mustang', 'mustang-pop');
        await showBanner(
            `${p.name} play Mustang! Others see ${p.name} as 1 further away.`,
            900,
        );
        addLog(
            `${p.name} play Mustang! Others see ${p.name} as 1 further away.`,
        );
        p.inPlay.push(...card);
        debugCardCount();
        render();
        await wait(300);
    }

    if (!G.over && p.hand.includes('scope')) {
        const card = p.hand.splice(p.hand.indexOf('scope'), 1);
        await popupOnPlayer(p.id, 'scope', 'scope-pop');
        await showBanner(
            `${p.name} play Scope! ${p.name} views other at distance -1.`,
            900,
        );
        addLog(`${p.name} play Scope! ${p.name} views other at distance -1.`);
        p.inPlay.push(...card);
        debugCardCount();
        render();
        await wait(300);
    }

    if (!G.over && p.hand.includes('panic')) {
        // extend target search to include inPlay cards too
        const targets = G.players.filter(
            (q) =>
                q.alive &&
                q.id !== p.id &&
                inRange(p.id, q.id) &&
                (q.hand.length > 0 || q.inPlay.length > 0),
        );
        if (targets.length) {
            const enemies = targets.filter((q) => isEnemy(p.id, q.id));
            const pool = enemies.length ? enemies : targets;

            const inPlayTargets = pool.filter((q) => q.inPlay.length > 0);

            const t = inPlayTargets.length
                ? inPlayTargets[
                      Math.floor(Math.random() * inPlayTargets.length)
                  ]
                : pool[Math.floor(Math.random() * pool.length)];

            const card = p.hand.splice(p.hand.indexOf('panic'), 1);
            G.discardPile.push(...card);
            debugCardCount();
            await floatCard('panic', getPlayerEl(p.id), getPlayerEl(t.id));
            await showBanner(`${p.name} plays Panic! on ${t.name}.`, 900);
            addLog(`${p.name} plays Panic! on ${t.name}.`);

            const picked = aiPickCardFrom(t, p);
            if (picked) {
                if (picked.source === 'hand') {
                    t.hand.splice(picked.idx, 1);
                } else {
                    t.inPlay.splice(picked.idx, 1);
                }
                p.hand.push(...[picked.key]);
                debugCardCount();
                await floatCard(
                    picked.key,
                    getPlayerEl(t.id),
                    getPlayerEl(p.id),
                );
                await showBanner(
                    `${p.name} steals ${CARD_DEFS[picked.key]?.name || picked.key} from ${t.name}! 😱`,
                    900,
                );
                addLog(
                    `${p.name} steals ${CARD_DEFS[picked.key]?.name || picked.key} from ${t.name}.`,
                );
            }

            render();
            await wait(300);
        }
    }

    if (!G.over && p.hand.includes('catbalou')) {
        const targets = G.players.filter(
            (q) =>
                q.alive &&
                q.id !== p.id &&
                (q.hand.length > 0 || q.inPlay.length > 0),
        );
        if (targets.length) {
            const enemies = targets.filter((q) => isEnemy(p.id, q.id));
            const pool = enemies.length ? enemies : targets; // only fall back to allies if no enemies

            const mustangBlockers = pool.filter(
                (q) => q.inPlay.includes('mustang') && !inRange(p.id, q.id),
            );
            const inPlayTargets = pool.filter((q) => q.inPlay.length > 0);

            const t = mustangBlockers.length
                ? mustangBlockers[
                      Math.floor(Math.random() * mustangBlockers.length)
                  ]
                : inPlayTargets.length
                  ? inPlayTargets[
                        Math.floor(Math.random() * inPlayTargets.length)
                    ]
                  : pool[Math.floor(Math.random() * pool.length)];

            const card = p.hand.splice(p.hand.indexOf('catbalou'), 1);
            G.discardPile.push(...card);
            debugCardCount();
            await floatCard('catbalou', getPlayerEl(p.id), getPlayerEl(t.id));
            await showBanner(`${p.name} plays Cat Balou! on ${t.name}.`, 900);
            addLog(`${p.name} plays Cat Balou! on ${t.name}.`);

            const picked = aiPickCardFrom(t, p);
            if (picked) {
                if (picked.source === 'hand') {
                    t.hand.splice(picked.idx, 1);
                } else {
                    t.inPlay.splice(picked.idx, 1);
                }
                G.discardPile.push(...[picked.key]);
                debugCardCount();
                await popupOnPlayer(t.id, picked.key, `${picked.key}-pop`);
                addLog(
                    `${p.name} discards ${CARD_DEFS[picked.key]?.name || picked.key} from ${t.name}.`,
                );
            }

            render();
            await wait(300);
        }
    }

    if (!G.over && p.hand.includes('gatling')) {
        const card = p.hand.splice(p.hand.indexOf('gatling'), 1);
        addLog(`${p.name} plays Gatling!`);
        await popupOnPlayer(p.id, 'gatling', 'gatling-pop');
        await showBanner(`${p.name} fires the Gatling! 💥`, 900);
        G.discardPile.push(...card);
        debugCardCount();
        render();

        for (const q of G.players) {
            if (q.id === p.id || !q.alive) continue;
            await floatCard('gatling', getPlayerEl(p.id), getPlayerEl(q.id));
            await checkMissed(q, p);
            render();
            await wait(250);
            if (G.over) break;
        }
        await wait(300);
    }

    if (!G.over && p.hand.includes('indians')) {
        const card = p.hand.splice(p.hand.indexOf('indians'), 1);
        addLog(`${p.name} plays Indians!`);
        await popupOnPlayer(p.id, 'indians', 'indians-pop');
        await showBanner(`${p.name} plays Indians! 🏹`, 900);
        G.discardPile.push(...card);
        debugCardCount();
        render();

        for (const q of G.players) {
            if (q.id === p.id || !q.alive) continue;
            await floatCard('indians', getPlayerEl(p.id), getPlayerEl(q.id));

            const bi = q.hand.indexOf('bang');
            if (bi >= 0) {
                const bangCard = q.hand.splice(bi, 1);
                await popupOnPlayer(q.id, 'bang', 'bang-pop');
                addLog(`${q.name} plays BANG! to dodge Indians.`);
                G.discardPile.push(...bangCard);
                debugCardCount();
                applyDodge(q.id);
            } else {
                await popupOnPlayer(q.id, 'indians', 'bang-pop');
                applyDamage(q.id, 1, p.id);
            }
            render();
            await wait(250);
            if (G.over) break;
        }
        render();
        await wait(300);
    }

    if (!G.over && p.hand.includes('duel')) {
        const enemies = G.players.filter(
            (q) => q.alive && q.id !== p.id && isEnemy(p.id, q.id),
        );
        if (enemies.length) {
            const target = enemies.reduce((a, b) => (b.hp < a.hp ? b : a));
            const card = p.hand.splice(p.hand.indexOf('duel'), 1);
            G.discardPile.push(...card);
            await floatCard('duel', getPlayerEl(p.id), getPlayerEl(target.id));
            await showBanner(
                `${p.name} challenges ${target.name} to a Duel! ⚔️`,
                900,
            );
            addLog(`${p.name} challenges ${target.name} to a Duel!`);
            await resolveDuel(p.id, target.id);
            debugCardCount();
            render();
            await wait(300);
        }
    }

    if (!G.over && p.hand.includes('bang')) {
        const enemies = G.players.filter(
            (q) =>
                q.alive &&
                q.id !== p.id &&
                isEnemy(p.id, q.id) &&
                inRange(p.id, q.id),
        );
        if (enemies.length) {
            const target = enemies.reduce((a, b) => (b.hp < a.hp ? b : a));
            const card = p.hand.splice(p.hand.indexOf('bang'), 1);
            await floatCard('bang', getPlayerEl(p.id), getPlayerEl(target.id));
            await Promise.all([
                showBanner(`${p.name} shoots BANG! at ${target.name}! 🔫`, 900),
                addLog(`${p.name} shoots BANG! at ${target.name}!`),
            ]);

            G.discardPile.push(...card);
            debugCardCount();
            render();

            await checkMissed(target, p);
            render();
            await wait(400);
        }
    }

    const maxCards = p.hp;
    while (p.hand.length > maxCards) {
        G.discardPile.push(
            ...p.hand.splice(Math.floor(Math.random() * p.hand.length), 1),
        );
    }
    debugCardCount();
    await showBanner(`${p.name} ends turn.`, 600);
    if (!G.over) nextTurn();
    render();
}

async function runAI() {
    if (aiRunning) return;
    aiRunning = true;
    while (!G.over && !G.players[G.turn].isHuman) {
        await aiPlay();
        await wait(200);
    }
    aiRunning = false;
    if (G.over) showGameOver();
}

// ── Render ──────────────────────────────────────────────────────
function render() {
    const app = document.getElementById('app');
    if (!app) return;
    if (G.over) {
        showGameOver();
        return;
    }

    const human = G.players[0];
    const cur = G.players[G.turn];
    const isMyTurn = cur.isHuman;
    const ri = ROLE_INFO[human.role];

    let html = '';

    // Role banner
    html += `<div class="role-banner" style="background:${ri.bg};color:${ri.color};">
    <span style="font-size:22px;">🤠</span>
    <div>
      <div style="font-weight:500;font-size:14px;">You are the <strong>${ri.label}</strong></div>
      <div style="font-size:12px;opacity:0.85;">${ri.goal}</div>
    </div>
    <div style="margin-left:auto;text-align:right;font-size:12px;">
      HP: <strong>${human.hp}/${human.maxHp}</strong> · Hand: <strong>${human.hand.length}</strong>
    </div>
  </div>`;

    // Distance map
    html += renderDistanceMap();

    // Phase bar
    html += `<div class="phase-bar">
    <span style="font-size:15px;font-weight:500;">${isMyTurn ? 'Your Turn' : cur.name + "'s Turn"}</span>
    <span style="color:var(--color-text-secondary);">Phase: <strong>${isMyTurn ? G.phase : 'AI playing…'}</strong></span>
    <span style="color:var(--color-text-secondary);">Deck: ${G.deck.length}</span>
    <span style="color:var(--color-text-secondary);">Discard Pile: ${G.discardPile.length}</span>
    ${G.targeting ? '<span style="color:#E24B4A;font-weight:500;">🎯 Click a highlighted player</span>' : ''}
  </div>`;

    // Players
    html += renderTable();

    if (G.generalStorePicking) {
        html += `<div style="margin-bottom:12px;">
    <div style="font-size:12px;font-weight:500;color:#185FA5;margin-bottom:8px;">
      🏪 General Store — pick one card
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">`;
        G.generalStoreCards.forEach((cardKey) => {
            const c = CARD_DEFS[cardKey];
            html += `<div class="card tooltip" data-key="${cardKey}">
      <span class="card-icon">${c?.icon || '?'}</span>
      <span class="card-name">${c?.name || cardKey}</span>
      <div class="tip">${c?.desc || ''}</div>
    </div>`;
        });
        html += `</div></div>`;
    }

    if (G.cardPickerPicking && G.cardPickerTarget) {
        const target = G.players[G.cardPickerTarget];
        const allCards = [
            ...target.hand.map((c, i) => ({ source: 'hand', idx: i, key: c })),
            ...target.inPlay.map((c, i) => ({
                source: 'inPlay',
                idx: i,
                key: c,
            })),
        ];

        html += `<div style="margin-bottom:12px;">
    <div style="font-size:12px;font-weight:500;color:#E24B4A;margin-bottom:8px;">
      ${G.cardPickerLabel}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">`;

        allCards.forEach(({ source, idx, key }) => {
            const c = CARD_DEFS[key];
            const isInPlay = source === 'inPlay';

            html += `<div class="card tooltip"
    data-source="${source}" data-idx="${idx}" data-key="${key}"
    style="${isInPlay ? 'border-color:#185FA5;background:#E6F1FB;' : 'background:var(--color-background-secondary);'}">
    <span class="card-icon">${isInPlay ? c?.icon || '?' : '🂠'}</span>
    <span class="card-name">${isInPlay ? c?.name || key : 'Unknown'}</span>
    ${isInPlay ? '<span style="font-size:9px;color:#185FA5;">in play</span>' : ''}
    <div class="tip">${isInPlay ? c?.desc || '' : 'A face-down card'}</div>
  </div>`;
        });

        html += `</div></div>`;
    }

    // Hand
    html += `<div style="margin-bottom:12px;">
    <div style="font-size:12px;font-weight:500;color:var(--color-text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">Your Hand</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">`;
    human.hand.forEach((cardKey, i) => {
        const c = CARD_DEFS[cardKey];
        if (!c) return;
        const isSel = G.selectedCard === i;
        const discardStyle = G.discardingToEndTurn
            ? 'border-color:#E24B4A;cursor:pointer;'
            : '';
        html += `<div class="card tooltip ${isSel ? 'selected' : ''}" style="${discardStyle}" data-card-idx="${i}">
      <span class="card-icon">${c.icon}</span>
      <span class="card-name">${c.name}</span>
      <div class="tip">${c.desc}</div>
    </div>`;
    });

    if (!human.hand.length)
        html += `<span style="color:var(--color-text-secondary);font-size:13px;">No cards.</span>`;
    html += `</div></div>`;

    // Buttons
    html += `<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">`;
    if (isMyTurn && G.phase === 'draw')
        html += `<button class="btn btn-primary" id="start-turn-btn">Draw 2 Cards</button>`;
    if (isMyTurn && G.phase === 'play') {
        if (!G.discardingToEndTurn) {
            const ck =
                G.selectedCard !== null ? human.hand[G.selectedCard] : null;
            if (ck && ['bang', 'panic', 'catbalou', 'duel'].includes(ck))
                html += `<button class="btn btn-primary" id="target-player-btn"">Target Player</button>`;
            else
                html += `<button class="btn btn-primary" id="play-card-btn"">Play Card</button>`;

            if (G.targeting)
                html += `<button class="btn" id="cancel-target-btn"">Cancel</button>`;
            if (!G.targeting)
                html += `<button class="btn" id="end-turn-btn"">End Turn</button>`;
        }
    }
    if (!isMyTurn)
        html += `<button class="btn" disabled>Waiting for AI…</button>`;
    html += `</div>`;

    // Discard
    const discardCount = human.hand.length - human.hp;
    const handLabel = G.discardingToEndTurn
        ? `<span style="color:#E24B4A;font-weight:500;">Discard ${discardCount} card(s) to end your turn — click a card to discard it</span>`
        : `<span style="font-size:12px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.04em;">Your Hand</span>`;
    html += `<div style="margin-bottom:12px;"><div style="margin-bottom:8px;">${handLabel}</div><div style="display:flex;flex-wrap:wrap;gap:8px;">`;

    // Log
    html += `<div class="log-box">${G.log.map((l) => `<div>${l}</div>`).join('')}</div>`;

    app.innerHTML = html;

    const startTurnButton = document.getElementById(
        'start-turn-btn',
    ) as HTMLButtonElement;
    const targetPlayerBtn = document.getElementById(
        'target-player-btn',
    ) as HTMLButtonElement;
    const playCardBtn = document.getElementById(
        'play-card-btn',
    ) as HTMLButtonElement;
    const cancelTargetBtn = document.getElementById(
        'cancel-target-btn',
    ) as HTMLButtonElement;
    const endTurnBtn = document.getElementById(
        'end-turn-btn',
    ) as HTMLButtonElement;
    const playAgainBtn = document.getElementById(
        'play-again-btn',
    ) as HTMLButtonElement;

    startTurnButton?.addEventListener('click', () => handleDraw());
    targetPlayerBtn?.addEventListener('click', () => startTargeting());
    cancelTargetBtn?.addEventListener('click', () => cancelTargeting());
    playCardBtn?.addEventListener('click', () => playSelectedCard());
    endTurnBtn?.addEventListener('click', () => handleEndTurn());
    playAgainBtn?.addEventListener('click', () => restartGame());

    const handCards = document.querySelectorAll(
        '[data-card-idx]',
    ) as NodeListOf<HTMLDivElement>;

    handCards?.forEach((card) => {
        const idx = card.dataset.cardIdx;
        if (!idx) return;
        card.addEventListener('click', () => handleCardClick(Number(idx)));
    });

    const cards = document.querySelectorAll(
        '.card.tooltip',
    ) as NodeListOf<HTMLDivElement>;

    cards?.forEach((card) => {
        const source = card.dataset.source as CardPickSource;
        const idx = card.dataset.idx;
        const key = card.dataset.key as CardKey;

        if (!source || !idx || !key) return;

        card.addEventListener('click', () => {
            handleCardPickerPick({ source, idx: Number(idx), key });
            handleGeneralStorePick(key);
        });
    });

    const playerRows = document.querySelectorAll(
        '.player-row',
    ) as NodeListOf<HTMLDivElement>;

    playerRows.forEach((element) => {
        const targetId = element.dataset.pid;
        if (!targetId) return;
        element.addEventListener('click', () =>
            handlePlayerClick(Number(targetId)),
        );
    });

    Object.keys(flashMap).forEach((id) => {
        flashMap[Number(id)] = '';
    });
}

// ── Human actions ───────────────────────────────────────────────
function handleDraw() {
    if (!G.players[G.turn].isHuman || G.phase !== 'draw') return;
    const p = G.players[G.turn];
    p.hand.push(...dealN(G.deck, 2));
    debugCardCount();
    G.phase = 'play';
    G.bangUsed = false;
    addLog(`You draw 2 cards.`);
    render();
}

function handleCardClick(i: number) {
    if (!G.players[G.turn].isHuman || G.phase !== 'play' || G.targeting) return;

    if (G.discardingToEndTurn) {
        const player = G.players[0];
        const discarded = player.hand.splice(i, 1);
        G.discardPile.push(...discarded);
        debugCardCount();
        addLog(`You discard ${CARD_DEFS[discarded[0]]?.name || discarded[0]}.`);

        if (player.hand.length <= player.hp) {
            G.discardingToEndTurn = false;
            nextTurn();
            render();
            runAI();
        } else {
            render();
        }
        return;
    }

    if (G.phase !== 'play') return;
    G.selectedCard = G.selectedCard === i ? null : i;
    render();
}

function startTargeting() {
    G.targeting = true;
    render();
}

function cancelTargeting() {
    G.targeting = false;
    G.selectedCard = null;
    render();
}

async function handlePlayerClick(targetId: number) {
    if (!G.targeting || G.selectedCard === null) return;
    const p = G.players[0];
    const target = G.players[targetId];
    if (!target.alive || target.isHuman) return;

    const cardKey = p.hand[G.selectedCard];
    p.hand.splice(G.selectedCard, 1);
    G.discardPile.push(...[cardKey]);
    debugCardCount();
    G.selectedCard = null;
    G.targeting = false;

    if (cardKey === 'catbalou') {
        if (!target.hand.length) {
            addLog(`${target.name} has no cards.`);
            render();
            return;
        }
        await floatCard('catbalou', getPlayerEl(0), getPlayerEl(targetId));
        render();

        const picked = await waitForCardPick(
            targetId,
            `🃏 Cat Balou — choose a card to discard from ${target.name}`,
        );

        if (picked.source === 'hand') {
            target.hand.splice(picked.idx, 1);
        } else {
            target.inPlay.splice(picked.idx, 1);
        }

        await popupOnPlayer(targetId, picked.key, `${picked.key}-pop`);
        G.discardPile.push(...[picked.key]);
        debugCardCount();
        addLog(
            `You discard a ${CARD_DEFS[picked.key]?.name || picked.key} from ${target.name}!`,
        );
    } else if (cardKey === 'duel') {
        addLog(`You challenge ${target.name} to a Duel!`);
        await Promise.all([
            showBanner(`You challenge ${target.name} to a Duel! ⚔️`, 1000),
            floatCard('duel', getPlayerEl(0), getPlayerEl(targetId)),
        ]);
        await resolveDuel(0, targetId);
    }

    if (!inRange(p.id, targetId)) {
        addLog(
            `${target.name} is out of range! (distance ${distance(0, targetId)})`,
        );
        render();
        return;
    }

    if (cardKey === 'bang') {
        if (G.bangUsed) {
            addLog('Already used BANG! this turn!');
            p.hand.push(...[cardKey]);
            debugCardCount();
            render();
            return;
        }

        G.bangUsed = true;

        await floatCard('bang', getPlayerEl(0), getPlayerEl(targetId));
        await checkMissed(target, p);
    } else if (cardKey === 'panic') {
        if (!target.hand.length) {
            addLog(`${target.name} has no cards.`);
            render();
            return;
        }
        await floatCard('panic', getPlayerEl(0), getPlayerEl(targetId));
        render();

        const picked = await waitForCardPick(
            targetId,
            `😱 Panic! — choose a card to steal from ${target.name}`,
        );

        console.log(picked);

        if (picked.source === 'hand') {
            target.hand.splice(picked.idx, 1);
        } else {
            target.inPlay.splice(picked.idx, 1);
        }

        await floatCard(picked.key, getPlayerEl(targetId), getPlayerEl(0));
        p.hand.push(...[picked.key]);
        debugCardCount();
        addLog(
            `You steal a ${CARD_DEFS[picked.key]?.name || picked.key} from ${target.name}!`,
        );
    }

    render();
    checkWin();
    if (G.over) showGameOver();
}

async function playSelectedCard() {
    if (G.selectedCard === null) return;
    const p = G.players[0];
    const cardKey = p.hand[G.selectedCard];
    if (cardKey === 'missed') {
        addLog("You can't play Missed! card in your turn.");
        render();
        return;
    }

    p.hand.splice(G.selectedCard, 1);
    G.selectedCard = null;

    switch (cardKey) {
        case 'beer':
            if (G.players.filter((q) => q.alive).length <= 2) {
                addLog('Beer has no effect with 2 players left.');
                render();
                return;
            }
            await popupOnPlayer(0, 'beer', 'beer-pop');
            applyHeal(0, 1);
            G.discardPile.push(...[cardKey]);
            debugCardCount();
            break;

        case 'saloon':
            addLog('You play Saloon! All players regain 1LP.');
            await Promise.all([
                popupOnPlayer(p.id, 'saloon', 'saloon-pop'),
                showBanner(`${p.name} play a Saloon! 🍺🍺🍺`, 900),
            ]);
            for (const q of G.players) {
                if (!q.alive) continue;
                applyHeal(q.id, 1);
            }
            G.discardPile.push(...[cardKey]);
            debugCardCount();
            render();
            await wait(300);
            break;

        case 'gatling':
            await popupOnPlayer(0, 'gatling', 'gatling-pop');
            G.discardPile.push(...[cardKey]);
            addLog(
                'You play Gatling! All others will have to Missed! or take 1 damage!',
            );
            render();
            for (const q of G.players) {
                if (q.id === 0 || !q.alive) continue;
                await floatCard('gatling', getPlayerEl(0), getPlayerEl(q.id));
                await checkMissed(q, p);
                render();
                await wait(250);
                if (G.over) break;
            }
            break;

        case 'indians':
            await popupOnPlayer(0, 'indians', 'indians-pop');
            G.discardPile.push(...[cardKey]);
            addLog('You play Indians!');
            render();

            for (const q of G.players) {
                if (q.id === 0 || !q.alive) continue;
                const bi = q.hand.indexOf('bang');
                await floatCard('indians', getPlayerEl(0), getPlayerEl(q.id));

                if (bi >= 0) {
                    const bang = q.hand.splice(bi, 1);
                    await popupOnPlayer(q.id, 'bang', 'bang-pop');
                    G.discardPile.push(...bang);
                    addLog(`${q.name} plays BANG! to dodge.`);
                    applyDodge(q.id);
                } else {
                    await popupOnPlayer(q.id, 'indians', 'bang-pop');
                    applyDamage(q.id, 1, 0);
                }
                debugCardCount();
                render();
                await wait(250);
                if (G.over) break;
            }
            break;

        case 'stagecoach':
            addLog('You play Stagecoach!');
            await popupOnPlayer(0, 'stagecoach', 'stagecoach-pop');
            G.discardPile.push(...[cardKey]);
            debugCardCount();
            drawCards(0, 2);
            break;

        case 'wellsfargo':
            addLog('You play Wells Fargo!');
            await popupOnPlayer(0, 'wellsfargo', 'wellsfargo-pop');
            G.discardPile.push(...[cardKey]);
            debugCardCount();
            drawCards(0, 3);
            break;

        case 'generalstore':
            addLog('You play General Store!');
            await Promise.all([
                popupOnPlayer(p.id, 'generalstore', 'generalstore-pop'),
                showBanner(`${p.name} play a General Store!`, 900),
            ]);
            G.discardPile.push(...[cardKey]);
            debugCardCount();
            render();
            await resolveGeneralStore();
            break;

        case 'mustang':
            p.inPlay.push(...[cardKey]);
            debugCardCount();
            await popupOnPlayer(p.id, 'mustang', 'mustang-pop');
            await showBanner(
                `You play Mustang! Others see you as 1 further away.`,
                900,
            );
            addLog(`You play Mustang! Others see you as 1 further away.`);
            render();
            break;

        case 'scope':
            p.inPlay.push(...[cardKey]);
            debugCardCount();
            await popupOnPlayer(p.id, 'scope', 'scope-pop');
            await showBanner(
                `You play Scope! You view others as distance -1.`,
                900,
            );
            addLog(`You play Scope! You view others as distance -1.`);
            render();
            break;
    }

    render();
    checkWin();
    if (G.over) showGameOver();
}

function handleEndTurn() {
    const p = G.players[0];
    if (p.hand.length > p.hp) {
        addLog(
            `Discard ${p.hand.length - p.hp} card(s) first (hand limit = your HP).`,
        );
        G.discardingToEndTurn = true;
        render();
        return;
    }
    nextTurn();
    render();
    runAI();
}

function showGameOver() {
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('modal-content');
    if (!overlay || !modal) return;
    const msgs = {
        sheriff: '🌟 Sheriff & Deputies Win!',
        outlaws: '💀 Outlaws Win! Sheriff eliminated.',
        renegade_solo: '🎭 Renegade Wins!',
    };
    const msgsDis = G.winner ? msgs[G.winner] : 'Game over.';
    const rows = G.players
        .map(
            (p) =>
                `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid var(--color-border-tertiary);font-size:13px;">
      <span>${p.name}</span>
      <span><span class="badge badge-${p.role}">${p.role}</span> ${p.alive ? '✅' : '❌'}</span>
    </div>`,
        )
        .join('');
    modal.innerHTML = `<h2 style="margin-bottom:8px;">Game Over</h2>
    <p style="color:var(--color-text-secondary);font-size:14px;margin-bottom:1rem;">${msgsDis}</p>
    <div style="text-align:left;margin-bottom:1.5rem;">${rows}</div>
    <button class="btn btn-primary" id="play-again-btn">Play Again</button>`;
    overlay.classList.remove('hidden');
}

function restartGame() {
    const el = document.getElementById('overlay');
    el?.classList.add('hidden');
    G = initGame();
    aiRunning = false;
    Object.keys(flashMap).forEach((k) => delete flashMap[Number(k)]);
    render();
    if (!G.players[G.turn].isHuman) runAI();
}

G = initGame();
render();
if (!G.players[G.turn].isHuman) runAI();

function getGridLayout(playerCount: number) {
    // returns { cols, positions: [{id, row, col}], deckRow, deckCol }
    const layouts: Record<number, GridLayout> = {
        4: {
            cols: 3,
            positions: [
                { id: 0, row: 1, col: 1 }, // you
                { id: 1, row: 1, col: 2 }, // 2
                { id: 2, row: 2, col: 2 }, // 3
                { id: 3, row: 2, col: 1 }, // 4
            ],
            deckRow: 1,
            deckCol: 3,
        },
        5: {
            cols: 4,
            positions: [
                { id: 0, row: 1, col: 1 },
                { id: 1, row: 1, col: 2 },
                { id: 2, row: 1, col: 3 },
                { id: 3, row: 2, col: 2 },
                { id: 4, row: 2, col: 1 },
            ],
            deckRow: 1,
            deckCol: 4,
        },
        6: {
            cols: 4,
            positions: [
                { id: 0, row: 1, col: 1 },
                { id: 1, row: 1, col: 2 },
                { id: 2, row: 1, col: 3 },
                { id: 3, row: 2, col: 3 },
                { id: 4, row: 2, col: 2 },
                { id: 5, row: 2, col: 1 },
            ],
            deckRow: 1,
            deckCol: 4,
        },
        7: {
            cols: 4,
            positions: [
                { id: 0, row: 1, col: 1 },
                { id: 1, row: 1, col: 2 },
                { id: 2, row: 1, col: 3 },
                { id: 3, row: 1, col: 4 }, // flexible 7th wraps to top right
                { id: 4, row: 2, col: 3 },
                { id: 5, row: 2, col: 2 },
                { id: 6, row: 2, col: 1 },
            ],
            deckRow: 2,
            deckCol: 4, // deck shifts down when 7 players
        },
    };
    return layouts[playerCount] || layouts[5];
}

function renderTable() {
    //const alive = G.players.filter((p) => p.alive).length;
    const total = G.players.length;
    const human = G.players[0];
    const layout = getGridLayout(total);

    let html = `<div style="
    display: grid;
    grid-template-columns: repeat(${layout.cols}, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  ">`;

    // place each player at their grid position
    layout.positions.forEach(({ id, row, col }) => {
        const p = G.players[id];
        html += `<div style="grid-column:${col}; grid-row:${row};">
      ${renderPlayerSlot(p, human)}
    </div>`;
    });

    // draw & discard pile
    html += `<div style="grid-column:${layout.deckCol}; grid-row:${layout.deckRow};">
    ${renderDeckSlot()}
  </div>`;

    html += `</div>`;
    return html;
}

function renderDeckSlot() {
    const top = G.discardPile[G.discardPile.length - 1];
    const c = top ? CARD_DEFS[top] : null;
    return `<div style="display:flex;flex-direction:column;gap:6px;align-items:center;">
    <div style="font-size:11px;color:var(--color-text-secondary);font-weight:500;">DECK</div>
    <div class="card back" style="cursor:default;">
      <span class="card-icon">🂠</span>
      <span class="card-name">${G.deck.length} left</span>
    </div>
    <div style="font-size:11px;color:var(--color-text-secondary);font-weight:500;">DISCARD</div>
    <div class="card" style="cursor:default;opacity:${c ? 1 : 0.3};">
      <span class="card-icon">${c?.icon || '?'}</span>
      <span class="card-name">${c?.name || 'empty'}</span>
      <span class="card-name">${G.discardPile.length} cards</span>
    </div>
  </div>`;
}

function renderPlayerSlot(p: Player, human: Player) {
    let canTargetAllPlayers = false;

    if (G.selectedCard) {
        const selectedCard = human.hand[G.selectedCard];
        canTargetAllPlayers = ['catbalou', 'duel'].includes(selectedCard);
    }

    const isClickTarget =
        G.targeting &&
        !p.isHuman &&
        p.alive &&
        (canTargetAllPlayers ? true : inRange(human.id, p.id));

    const isCur = p.id === G.turn;
    const showRole = p.role === 'sheriff' || !p.alive || p.isHuman;
    const roleLabel = showRole ? p.role : 'unknown';
    const flash = flashMap[p.id] || '';
    const dist = p.id <= 0 ? 0 : distance(0, p.id);
    const pips = Array(p.maxHp)
        .fill(0)
        .map(
            (_, i) =>
                `<span class="hp-pip" style="background:${i < p.hp ? '#D85A30' : 'var(--color-border-secondary)'};"></span>`,
        )
        .join('');

    return `<div class="player-row ${!p.alive ? 'dead' : ''} ${isClickTarget ? 'clickable-target' : ''} ${isCur ? 'flash-current' : ''} ${flash}"
    data-pid="${p.id}">
    <div style="flex:1;">
      <div style="font-weight:500;font-size:13px;display:flex;align-items:center;flex-wrap:wrap;gap:2px;">
        ${p.name}
        <span class="badge badge-${roleLabel}">${roleLabel}</span>
        ${isCur ? '<span style="font-size:10px;color:#378ADD;">◀</span>' : ''}
        ${isClickTarget ? '<span style="font-size:11px;color:#E24B4A;">🎯</span>' : ''}
        ${!p.isHuman && p.alive ? `<span class="badge ${dist === 1 ? 'badge-in-range' : 'badge-out-range'}">${dist === 1 ? 'in range' : 'dist ' + dist}</span>` : ''}
      </div>
      <div style="margin-top:3px;">${pips}</div>
      <div style="font-size:11px;color:var(--color-text-secondary);margin-top:1px;">${p.hp}/${p.maxHp} HP · ${p.hand.length} cards</div>
      ${
          p.inPlay.length
              ? `
        <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">
      ${p.inPlay
          .map((cardKey) => {
              const c = CARD_DEFS[cardKey];
              return `<div style="
          display:inline-flex; align-items:center; gap:3px;
          background:#E6F1FB; color:#042C53;
          border:1px solid #185FA5; border-radius:4px;
          font-size:10px; font-weight:500; padding:2px 6px;">
          ${c?.icon || '?'} ${c?.name || cardKey}
        </div>`;
          })
          .join('')}
    </div>`
              : ''
      }
    </div>
  </div>`;
}

const EXPECTED_TOTAL = CARD_POOL.length;

function debugCardCount() {
    const inHands = G.players.reduce((sum, p) => sum + p.hand.length, 0);
    const inPlay = G.players.reduce((sum, p) => sum + p.inPlay.length, 0);
    const inDeck = G.deck.length;
    const inDiscard = G.discardPile.length;
    const total = inHands + inPlay + inDeck + inDiscard;

    // per card type breakdown
    const allCards = [
        ...G.players.flatMap((p) => p.hand),
        ...G.players.flatMap((p) => p.inPlay),
        ...G.deck,
        ...G.discardPile,
    ];
    const counts: Partial<Record<CardKey, number>> = {};
    allCards.forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
    });

    const expectedCounts: Partial<Record<CardKey, number>> = {};
    CARD_POOL.forEach((c) => {
        expectedCounts[c] = (expectedCounts[c] || 0) + 1;
    });

    const mismatches = (Object.keys(expectedCounts) as CardKey[]).filter(
        (c) => counts[c] !== expectedCounts[c],
    );

    console.log(
        `Cards — hands: ${inHands}, inPlay: ${inPlay}, deck: ${inDeck}, discard: ${inDiscard}, TOTAL: ${total}/${EXPECTED_TOTAL}`,
    );

    if (total !== EXPECTED_TOTAL) {
        console.warn(
            `⚠️ Card count mismatch! Expected ${EXPECTED_TOTAL}, got ${total}`,
        );
        mismatches.forEach((c) => {
            console.warn(
                `  ${c}: expected ${expectedCounts[c]}, got ${counts[c] || 0}`,
            );
        });
    }
}
