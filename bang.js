const CARD_DEFS = {
  bang: {
    name: "BANG!",
    icon: "🔫",
    desc: "Deal 1 damage to a player in range. They may Missed! to dodge.",
  },
  missed: {
    name: "Missed!",
    icon: "💨",
    desc: "Cancel a BANG! targeting you.",
  },
  beer: {
    name: "Beer",
    icon: "🍺",
    desc: "Regain 1 LP. No effect with 2 players left.",
  },
  gatling: {
    name: "Gatling",
    icon: "💥",
    desc: "Deal 1 damage to ALL others.",
  },
  indians: {
    name: "Indians!",
    icon: "🏹",
    desc: "All must play BANG! or lose 1 LP.",
  },
  panic: {
    name: "Panic!",
    icon: "😱",
    desc: "Steal a random card from an adjacent player.",
  },
  catbalou: {
    name: "Cat Balou",
    icon: "🃏",
    desc: "Discard a card from any player.",
  },
  stagecoach: {
    name: "Stagecoach",
    icon: "🃏🃏",
    desc: "Draw 2 cards.",
  },
  wellsfargo: {
    name: "Wells Fargo",
    icon: "🃏🃏🃏",
    desc: "Draw 3 cards.",
  },
  saloon: {
    name: "Saloon",
    icon: "🍺🍺🍺",
    desc: "All player regain 1 LP.",
  },
  duel: {
    name: "Duel",
    icon: "⚔️",
    desc: "A target player discard a BANG!, then you, etc. First player failing to discard a BANG! loses 1LP.",
  },
  generalstore: {
    name: "General Store",
    icon: "🏪",
    desc: "Reveal as many card as players. Each player draw 1.",
  },
};
const CARD_POOL = [
  ...Array(25).fill("bang"),
  ...Array(12).fill("missed"),
  ...Array(6).fill("beer"),
  ...Array(1).fill("gatling"),
  ...Array(2).fill("indians"),
  ...Array(4).fill("panic"),
  ...Array(4).fill("catbalou"),
  ...Array(2).fill("stagecoach"),
  ...Array(1).fill("wellsfargo"),
  ...Array(1).fill("saloon"),
  ...Array(3).fill("duel"),
  ...Array(2).fill("generalstore"),
];
const ROLE_INFO = {
  sheriff: {
    label: "Sheriff",
    goal: "Eliminate all Outlaws and the Renegade.",
    bg: "#FAEEDA",
    color: "#633806",
  },
  deputy: {
    label: "Deputy",
    goal: "Protect the Sheriff. Eliminate enemies.",
    bg: "#E6F1FB",
    color: "#042C53",
  },
  outlaw: {
    label: "Outlaw",
    goal: "Kill the Sheriff. Work with other Outlaws.",
    bg: "#FCEBEB",
    color: "#501313",
  },
  renegade: {
    label: "Renegade",
    goal: "Be the last one standing — kill everyone.",
    bg: "#EEEDFE",
    color: "#26215C",
  },
};

function shuffle(a) {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function dealN(deck, n) {
  const c = [];
  for (let i = 0; i < n; i++) {
    if (deck.length) c.push(deck.shift());
  }
  return c;
}

let G,
  aiRunning = false;
const flashMap = {};

function initGame() {
  const roles = shuffle(["sheriff", "deputy", "outlaw", "outlaw", "renegade"]);

  const deck = shuffle([...CARD_POOL]);

  const names = ["You", "Billy", "Rosa", "Duke", "Jade"];

  const players = roles.map((role, i) => ({
    id: i,
    name: names[i],
    role,
    hp: role === "sheriff" ? 5 : 4,
    maxHp: role === "sheriff" ? 5 : 4,
    hand: dealN(deck, role === "sheriff" ? 5 : 4),
    alive: true,
    isHuman: i === 0,
  }));

  const si = players.findIndex((p) => p.role === "sheriff");

  return {
    players,
    deck,
    discardPile: [],
    turn: si,
    phase: "draw",
    bangUsed: false,
    log: [
      "Game started! Your role is shown below. Enemy roles stay hidden until death.",
    ],
    over: false,
    winner: null,
    selectedCard: null,
    targeting: false,
    discardingToEndTurn: false,
    generalStoreCards: [],
    generalStorePicking: false,
    generalStoreResolve: null,
  };
}

function getAliveOrder() {
  return G.players.filter((p) => p.alive).map((p) => p.id);
}

function distance(from, to) {
  const alive = getAliveOrder();
  const fi = alive.indexOf(from),
    ti = alive.indexOf(to);
  if (fi < 0 || ti < 0) return 99;
  const n = alive.length,
    d = Math.abs(fi - ti);
  return Math.min(d, n - d);
}
function inRange(from, to) {
  return distance(from, to) <= 1;
}

function addLog(msg) {
  G.log.unshift(msg);
  if (G.log.length > 25) G.log.pop();
}

function addLogAnotherPlayACard(player, cardname) {
  G.log.unshift(`${player.name} plays a ${cardname}.`);
  if (G.log.length > 25) G.log.pop();
}

function refillDeck() {
  if (G.deck.length <= 2) {
    G.deck = [...G.deck, ...shuffle([...G.discardPile])];
    G.discardPile = [];
  }
}

function checkWin() {
  const sheriff = G.players.find((p) => p.role === "sheriff");
  if (!sheriff.alive) {
    const renegade = G.players.find((p) => p.role === "renegade");
    const aliveOutlaws = G.players.filter(
      (p) => p.role === "outlaw" && p.alive,
    );
    G.over = true;
    G.winner =
      aliveOutlaws.length === 0 && renegade && !renegade.alive
        ? "renegade_solo"
        : "outlaws";
    return;
  }
  if (
    G.players
      .filter((p) => p.role === "outlaw" || p.role === "renegade")
      .every((p) => !p.alive)
  ) {
    G.over = true;
    G.winner = "sheriff";
  }
}

function applyDamage(targetId, amount, sourceId) {
  const t = G.players[targetId];
  if (!t.alive) return;
  t.hp = Math.max(0, t.hp - amount);
  flashMap[targetId] = "flash-hit";
  addLog(`${t.name} takes ${amount} damage → ${t.hp}/${t.maxHp} HP.`);
  if (t.hp === 0) {
    t.alive = false;
    addLog(`☠ ${t.name} eliminated! Role: ${t.role.toUpperCase()}.`);

    G.discardPile.push(...t.hand);
    t.hand = [];

    if (t.role === "outlaw") {
      const killer = G.players[sourceId];
      if (killer) {
        killer.hand.push(...dealN(G.deck, 3));
        addLog(`${killer.name} draws 3 bonus cards!`);
      }
    }
    if (t.role === "deputy") {
      const si = G.players.findIndex((p) => p.role === "sheriff");
      if (sourceId === si) {
        G.discardPile.push(...G.players[si].hand);
        G.players[si].hand = [];
        addLog(`Sheriff shot a Deputy! Sheriff loses all cards.`);
      }
    }
    render();
    checkWin();
  }
}

function applyHeal(targetId, amount) {
  const t = G.players[targetId];
  t.hp = Math.min(t.maxHp, t.hp + amount);
  flashMap[targetId] = "flash-heal";
  addLog(`${t.name} heals +${amount} HP → ${t.hp}/${t.maxHp}.`);
}

function drawCards(targetId, numberOfCard) {
  const t = G.players[targetId];
  refillDeck();
  t.hand.push(...dealN(G.deck, numberOfCard));
  refillDeck();
}

function applyDodge(targetId) {
  flashMap[targetId] = "flash-dodge";
}

function isEnemy(from, to) {
  const f = G.players[from],
    t = G.players[to];
  if (f.role === "sheriff" || f.role === "deputy")
    return t.role === "outlaw" || t.role === "renegade";
  if (f.role === "outlaw") return t.role === "sheriff" || t.role === "deputy";
  return t.role !== "renegade";
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
  G.phase = "draw";
  G.bangUsed = false;
  G.selectedCard = null;
  G.targeting = false;
  G.discardingToEndTurn = false;
}

async function resolveDuel(challengerId, targetId) {
  // target responds first, then challenger, alternating
  let current = targetId;
  let other = challengerId;

  while (true) {
    const p = G.players[current];
    const bang = p.hand.indexOf("bang");

    if (bang >= 0) {
      // has a BANG! — must play it to stay in
      p.hand.splice(bang, 1);
      G.discardPile.push("bang");
      await Promise.all([
        popupOnPlayer(p.id, "bang", "bang-pop"),
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

    if (p.isHuman) {
      // let human pick — store flipped in G and render a picker
      G.generalStoreCards = flipped;
      G.generalStorePicking = true;
      render();
      // wait until human picks
      await new Promise((res) => {
        G.generalStoreResolve = res;
      });
      G.generalStorePicking = false;
      G.generalStoreCards = [];
    } else {
      // AI picks: take the first BANG! if available, else first card
      const pick = flipped.includes("bang")
        ? flipped.splice(flipped.indexOf("bang"), 1)[0]
        : flipped.splice(0, 1)[0];
      p.hand.push(pick);
      addLog(
        `${p.name} picks ${CARD_DEFS[pick]?.name || pick} from General Store.`,
      );
      await Promise.all([
        popupOnPlayer(p.id, pick, "heal-pop"),
        showBanner(`${p.name} picks ${CARD_DEFS[pick]?.name || pick}`, 700),
      ]);

      render();
      await wait(400);
    }
  }

  // any remaining cards go to discard (shouldn't happen but safety net)
  G.discardPile.push(...flipped);
}

function handleGeneralStorePick(cardKey) {
  if (!G.generalStorePicking) return;
  const idx = G.generalStoreCards.indexOf(cardKey);
  if (idx < 0) return;
  G.generalStoreCards.splice(idx, 1);
  G.players[0].hand.push(cardKey);
  addLog(`You pick ${CARD_DEFS[cardKey]?.name || cardKey} from General Store.`);
  G.generalStoreResolve?.();
}

// ── Visual helpers ──────────────────────────────────────────────
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function showBanner(text, duration = 1100) {
  const b = document.getElementById("action-banner");
  if (!b) return Promise.resolve();
  b.textContent = text;
  b.style.opacity = "1";
  return new Promise((res) =>
    setTimeout(() => {
      b.style.opacity = "0";
      setTimeout(res, 200);
    }, duration),
  );
}

// Show popup card on top of a player row (beer / missed / bang)
function popupOnPlayer(pid, cardKey, variant) {
  const row = document.querySelector(`[data-pid="${pid}"]`);
  if (!row) return Promise.resolve();
  row.style.position = "relative";
  const c = CARD_DEFS[cardKey];
  const el = document.createElement("div");
  el.className = `popup-card ${variant}`;
  el.innerHTML = `<span style="font-size:22px;">${c ? c.icon : "?"}</span><span style="font-size:9px;margin-top:2px;">${c ? c.name : ""}</span>`;
  row.appendChild(el);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.classList.add("show");
    });
  });
  return new Promise((res) =>
    setTimeout(() => {
      el.remove();
      res();
    }, 1100),
  );
}

function floatCard(cardKey, fromEl, toEl) {
  const fc = document.getElementById("float-card");
  const fiEl = fc.querySelector(".fi"),
    fnEl = document.getElementById("fc-name");
  if (!fc || !fromEl || !toEl) return Promise.resolve();
  const c = CARD_DEFS[cardKey];
  fiEl.textContent = c ? c.icon : "?";
  fnEl.textContent = c ? c.name : "";
  const fr = fromEl.getBoundingClientRect(),
    tr = toEl.getBoundingClientRect();
  const sx = fr.left + fr.width / 2 - 26,
    sy = fr.top + fr.height / 2 - 36;
  const ex = tr.left + tr.width / 2 - 26,
    ey = tr.top + tr.height / 2 - 36;
  fc.style.transition = "none";
  fc.style.left = sx + "px";
  fc.style.top = sy + "px";
  fc.style.opacity = "1";
  fc.style.transform = "scale(1)";
  return new Promise((res) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fc.style.transition =
          "left 0.5s cubic-bezier(0.4,0,0.2,1),top 0.5s cubic-bezier(0.4,0,0.2,1),opacity 0.3s 0.3s,transform 0.5s";
        fc.style.left = ex + "px";
        fc.style.top = ey + "px";
        fc.style.opacity = "0";
        fc.style.transform = "scale(0.7)";
        setTimeout(res, 650);
      });
    });
  });
}

function getPlayerEl(id) {
  return document.querySelector(`[data-pid="${id}"]`);
}

// ── Distance map renderer ───────────────────────────────────────
function renderDistanceMap() {
  const alive = getAliveOrder();
  const you = 0;
  const others = G.players.filter((p) => p.id !== 0);

  // build circle layout string
  // show all players in alive order, mark distances from you
  let html = `<div class="dist-map">
    <div class="dist-map-title">Distance from you (range 1 = can BANG!)</div>
    <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">`;

  const aliveAll = G.players.filter((p) => p.alive);
  const youIdx = aliveAll.findIndex((p) => p.id === 0);

  // render circle of alive players
  aliveAll.forEach((p, i) => {
    const dist = p.id === 0 ? 0 : distance(0, p.id);
    const isYou = p.id === 0;
    html += `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div class="dist-node ${isYou ? "you" : ""} ${!p.alive ? "dead-node" : ""}" title="${p.name}">
        ${p.name.substring(0, 2)}
      </div>
      ${!isYou ? `<span style="font-size:10px;color:${dist === 1 ? "#3B6D11" : "var(--color-text-secondary)"};">${dist === 1 ? "🎯 1" : "dist " + dist}</span>` : '<span style="font-size:10px;color:#185FA5;">YOU</span>'}
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
async function aiPlay() {
  const p = G.players[G.turn];
  if (!p.alive || p.isHuman) return;
  await showBanner(`${p.name}'s turn begins…`, 800);
  refillDeck();
  p.hand.push(...dealN(G.deck, 2));
  refillDeck();
  addLog(`--- ${p.name} draws 2 cards ---`);
  render();
  await wait(500);

  if (p.hp <= 2 && p.hand.includes("beer")) {
    const card = p.hand.splice(p.hand.indexOf("beer"), 1);
    await Promise.all([
      popupOnPlayer(p.id, "beer", "beer-pop"),
      showBanner(`${p.name} drinks a Beer! 🍺`, 900),
    ]);
    applyHeal(p.id, 1);
    addLogAnotherPlayACard(p, "Beer");
    G.discardPile.push(...card);
    render();
    await wait(300);
  }

  if (p.hp <= p.maxHp && p.hand.includes("saloon")) {
    const card = p.hand.splice(p.hand.indexOf("saloon"), 1);
    await Promise.all([
      popupOnPlayer(p.id, "saloon", "saloon-pop"),
      showBanner(`${p.name} play a Saloon! 🍺🍺🍺`, 900),
    ]);
    for (const q of G.players) {
      if (!q.alive) continue;
      applyHeal(q.id, 1);
    }
    G.discardPile.push(...card);
    addLogAnotherPlayACard(p, "Saloon!");
    render();
    await wait(300);
  }

  if (!G.over && p.hand.includes("stagecoach")) {
    const card = p.hand.splice(p.hand.indexOf("stagecoach"), 1);
    await Promise.all([
      popupOnPlayer(p.id, "stagecoach", "stagecoach-pop"),
      showBanner(`${p.name} play a Stagecoach! 🃏🃏`, 900),
    ]);
    drawCards(p.id, 2);
    addLogAnotherPlayACard(p, "Stagecoach");
    G.discardPile.push(...card);
    render();
    await wait(300);
  }

  if (!G.over && p.hand.includes("wellsfargo")) {
    const card = p.hand.splice(p.hand.indexOf("wellsfargo"), 1);
    await Promise.all([
      popupOnPlayer(p.id, "wellsfargo", "wellsfargo-pop"),
      showBanner(`${p.name} play a Wells Fargo! 🃏🃏🃏`, 900),
    ]);
    drawCards(p.id, 3);
    addLogAnotherPlayACard(p, "Wells Fargo");
    G.discardPile.push(...card);
    render();
    await wait(300);
  }

  if (!G.over && p.hand.includes("generalstore")) {
    const card = p.hand.splice(p.hand.indexOf("generalstore"), 1);
    await Promise.all([
      popupOnPlayer(p.id, "generalstore", "generalstore-pop"),
      showBanner(`${p.name} play General Store! 🏪`, 900),
    ]);
    drawCards(p.id, 3);
    addLogAnotherPlayACard(p, "General Store");
    await resolveGeneralStore();
    G.discardPile.push(...card);
    render();
    await wait(300);
  }

  if (!G.over && p.hand.includes("panic")) {
    const adj = G.players.filter(
      (q) =>
        q.alive && q.id !== p.id && inRange(p.id, q.id) && q.hand.length > 0,
    );
    if (adj.length) {
      const t = adj[0];
      const card = p.hand.splice(p.hand.indexOf("panic"), 1);
      const stolen = t.hand.splice(
        Math.floor(Math.random() * t.hand.length),
        1,
      );
      p.hand.push(...stolen);
      addLog(
        `${p.name} plays Panic! and steals a ${CARD_DEFS[stolen[0]]?.name || stolen[0]} from ${t.name}.`,
      );
      await floatCard("panic", getPlayerEl(p.id), getPlayerEl(t.id));
      await showBanner(`${p.name} steals from ${t.name}! 😱`, 700);
      G.discardPile.push(...card);
      render();
      await wait(300);
    }
  }

  if (!G.over && p.hand.includes("catbalou")) {
    const targets = G.players.filter(
      (q) => q.alive && q.id !== p.id && q.hand.length > 0,
    );
    if (targets.length) {
      const t = targets[0];
      const card = p.hand.splice(p.hand.indexOf("catbalou"), 1);
      const disc = t.hand.splice(Math.floor(Math.random() * t.hand.length), 1);

      addLog(
        `${p.name} plays Cat Balou! on ${t.name}. Discarded a ${CARD_DEFS[disc[0]]?.name || disc[0]}.`,
      );
      await floatCard("catbalou", getPlayerEl(p.id), getPlayerEl(t.id));
      G.discardPile.push(...disc);
      G.discardPile.push(...card);
      render();
      await wait(300);
    }
  }

  if (!G.over && p.hand.includes("gatling")) {
    const card = p.hand.splice(p.hand.indexOf("gatling"), 1);
    addLog(`${p.name} plays Gatling!`);
    await showBanner(`${p.name} fires the Gatling! 💥`, 900);
    G.discardPile.push(...card);
    render();

    for (const q of G.players) {
      if (q.id === p.id || !q.alive) continue;
      await floatCard("gatling", getPlayerEl(p.id), getPlayerEl(q.id));

      const mi = q.hand.indexOf("missed");
      if (mi >= 0) {
        const missedCard = q.hand.splice(mi, 1);
        await popupOnPlayer(q.id, "missed", "missed-pop");
        addLog(`${q.name} plays Missed! and dodges.`);
        G.discardPile.push(...missedCard);
        applyDodge(q.id);
      } else {
        await popupOnPlayer(q.id, "gatling", "bang-pop");
        applyDamage(q.id, 1, p.id);
      }

      render();
      await wait(250);
      if (G.over) break;
    }
    await wait(300);
  }

  if (!G.over && p.hand.includes("duel")) {
    const enemies = G.players.filter(
      (q) => q.alive && q.id !== p.id && isEnemy(p.id, q.id),
    );
    if (enemies.length) {
      const target = enemies.reduce((a, b) => (b.hp < a.hp ? b : a));
      const card = p.hand.splice(p.hand.indexOf("duel"), 1);
      await Promise.all([
        addLog(`${p.name} challenges ${target.name} to a Duel!`),
        showBanner(`${p.name} challenges ${target.name} to a Duel! ⚔️`, 1000),
        floatCard("duel", getPlayerEl(p.id), getPlayerEl(target.id)),
      ]);

      await resolveDuel(p.id, target.id);
      G.discardPile.push(...card);
      render();
      await wait(300);
    }
  }

  if (!G.over && p.hand.includes("indians")) {
    const card = p.hand.splice(p.hand.indexOf("indians"), 1);
    addLog(`${p.name} plays Indians!`);
    await showBanner(`${p.name} plays Indians! 🏹`, 900);
    G.discardPile.push(...card);
    render();

    for (const q of G.players) {
      if (q.id === p.id || !q.alive) continue;
      await floatCard("indians", getPlayerEl(p.id), getPlayerEl(q.id));

      const bi = q.hand.indexOf("bang");
      if (bi >= 0) {
        const bangCard = q.hand.splice(bi, 1);
        await popupOnPlayer(q.id, "bang", "bang-pop");
        addLog(`${q.name} plays BANG! to dodge Indians.`);
        G.discardPile.push(...bangCard);
        applyDodge(q.id);
      } else {
        await popupOnPlayer(q.id, "indians", "bang-pop");
        applyDamage(q.id, 1, p.id);
      }
      render();
      await wait(250);
      if (G.over) break;
    }
    render();
    await wait(300);
  }

  if (!G.over && p.hand.includes("bang")) {
    const enemies = G.players.filter(
      (q) =>
        q.alive && q.id !== p.id && isEnemy(p.id, q.id) && inRange(p.id, q.id),
    );
    if (enemies.length) {
      const target = enemies.reduce((a, b) => (b.hp < a.hp ? b : a));
      const card = p.hand.splice(p.hand.indexOf("bang"), 1);
      addLog(`${p.name} shoots BANG! at ${target.name}!`);
      await showBanner(`${p.name} shoots BANG! at ${target.name}! 🔫`, 900);
      await floatCard("bang", getPlayerEl(p.id), getPlayerEl(target.id));
      G.discardPile.push(...card);
      render();

      const mi = target.hand.indexOf("missed");
      if (mi >= 0) {
        const missedCard = target.hand.splice(mi, 1);
        await popupOnPlayer(target.id, "missed", "missed-pop");
        addLog(`${target.name} plays Missed! and dodges.`);
        G.discardPile.push(...missedCard);
        applyDodge(target.id);
      } else {
        await popupOnPlayer(target.id, "bang", "bang-pop");
        applyDamage(target.id, 1, p.id);
      }
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
  const app = document.getElementById("app");
  if (!app) return;
  if (G.over) {
    showGameOver();
    return;
  }

  const human = G.players[0];
  const cur = G.players[G.turn];
  const isMyTurn = cur.isHuman;
  const ri = ROLE_INFO[human.role];

  let html = "";

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
    <span style="font-size:15px;font-weight:500;">${isMyTurn ? "Your Turn" : cur.name + "'s Turn"}</span>
    <span style="color:var(--color-text-secondary);">Phase: <strong>${isMyTurn ? G.phase : "AI playing…"}</strong></span>
    <span style="color:var(--color-text-secondary);">Deck: ${G.deck.length}</span>
    <span style="color:var(--color-text-secondary);">Discard Pile: ${G.discardPile.length}</span>
    ${G.targeting ? '<span style="color:#E24B4A;font-weight:500;">🎯 Click a highlighted player</span>' : ""}
  </div>`;

  // Players
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">`;
  G.players.forEach((p) => {
    const isClickTarget =
      G.targeting && !p.isHuman && p.alive && inRange(human.id, p.id);
    const isCur = p.id === G.turn;
    const showRole = p.role === "sheriff" || !p.alive || p.isHuman;
    const roleLabel = showRole ? p.role : "unknown";
    const flash = flashMap[p.id] || "";
    const dist = p.id === 0 ? 0 : distance(0, p.id);
    const pips = Array(p.maxHp)
      .fill(0)
      .map(
        (_, i) =>
          `<span class="hp-pip" style="background:${i < p.hp ? "#D85A30" : "var(--color-border-secondary)"};"></span>`,
      )
      .join("");

    html += `<div class="player-row ${!p.alive ? "dead" : ""} ${isClickTarget ? "clickable-target" : ""} ${isCur ? "flash-current" : ""} ${flash}"
      data-pid="${p.id}" onclick="handlePlayerClick(${p.id})">
      <div style="flex:1;">
        <div style="font-weight:500;font-size:13px;display:flex;align-items:center;flex-wrap:wrap;gap:2px;">
          ${p.name}
          <span class="badge badge-${roleLabel}">${roleLabel}</span>
          ${isCur ? '<span style="font-size:10px;color:#378ADD;">◀</span>' : ""}
          ${isClickTarget ? '<span style="font-size:11px;color:#E24B4A;">🎯</span>' : ""}
          ${!p.isHuman && p.alive ? `<span class="badge ${dist === 1 ? "badge-in-range" : "badge-out-range"}">${dist === 1 ? "in range" : "dist " + dist}</span>` : ""}
        </div>
        <div style="margin-top:3px;">${pips}</div>
        <div style="font-size:11px;color:var(--color-text-secondary);margin-top:1px;">${p.hp}/${p.maxHp} HP · ${p.hand.length} cards</div>
      </div>
    </div>`;
  });
  html += `</div>`;

  if (G.generalStorePicking) {
    html += `<div style="margin-bottom:12px;">
    <div style="font-size:12px;font-weight:500;color:#185FA5;margin-bottom:8px;">
      🏪 General Store — pick one card
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">`;
    G.generalStoreCards.forEach((cardKey) => {
      const c = CARD_DEFS[cardKey];
      html += `<div class="card tooltip" onclick="handleGeneralStorePick('${cardKey}')">
      <span class="card-icon">${c?.icon || "?"}</span>
      <span class="card-name">${c?.name || cardKey}</span>
      <div class="tip">${c?.desc || ""}</div>
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
      ? "border-color:#E24B4A;cursor:pointer;"
      : "";
    html += `<div class="card tooltip ${isSel ? "selected" : ""}" style="${discardStyle}" onclick="handleCardClick(${i})">
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
  if (isMyTurn && G.phase === "draw")
    html += `<button class="btn btn-primary" onclick="handleDraw()">Draw 2 Cards</button>`;
  if (isMyTurn && G.phase === "play") {
    if (!G.discardingToEndTurn) {
      if (G.selectedCard !== null && !G.targeting) {
        const ck = human.hand[G.selectedCard];
        if (["bang", "panic", "catbalou", "duel"].includes(ck))
          html += `<button class="btn btn-primary" onclick="startTargeting()">Target Player</button>`;
        else
          html += `<button class="btn btn-primary" onclick="playSelectedCard()">Play Card</button>`;
      }
      if (G.targeting)
        html += `<button class="btn" onclick="cancelTargeting()">Cancel</button>`;
      if (!G.targeting)
        html += `<button class="btn" onclick="handleEndTurn()">End Turn</button>`;
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
  html += `<div class="log-box">${G.log.map((l) => `<div>${l}</div>`).join("")}</div>`;

  app.innerHTML = html;
  Object.keys(flashMap).forEach((id) => {
    flashMap[id] = "";
  });
}

// ── Human actions ───────────────────────────────────────────────
function handleDraw() {
  if (!G.players[G.turn].isHuman || G.phase !== "draw") return;
  const p = G.players[G.turn];
  refillDeck();
  p.hand.push(...dealN(G.deck, 2));
  refillDeck();
  G.phase = "play";
  G.bangUsed = false;
  addLog(`You draw 2 cards.`);
  render();
}

function handleCardClick(i) {
  if (!G.players[G.turn].isHuman || G.phase !== "play" || G.targeting) return;

  if (G.discardingToEndTurn) {
    const player = G.players[0];
    const discarded = player.hand.splice(i, 1);
    G.discardPile.push(...discarded);
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

  if (G.phase !== "play") return;
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

async function handlePlayerClick(targetId) {
  if (!G.targeting || G.selectedCard === null) return;
  const p = G.players[0];
  const target = G.players[targetId];
  if (!target.alive || target.isHuman) return;
  if (!inRange(p.id, targetId)) {
    addLog(
      `${target.name} is out of range! (distance ${distance(0, targetId)})`,
    );
    render();
    return;
  }

  const cardKey = p.hand[G.selectedCard];
  p.hand.splice(G.selectedCard, 1);
  G.discardPile.push(cardKey);
  G.selectedCard = null;
  G.targeting = false;

  if (cardKey === "bang") {
    if (G.bangUsed) {
      addLog("Already used BANG! this turn!");
      p.hand.push(cardKey);
      render();
      return;
    }
    G.bangUsed = true;
    await floatCard("bang", getPlayerEl(0), getPlayerEl(targetId));
    const mi = target.hand.indexOf("missed");
    if (mi >= 0) {
      target.hand.splice(mi, 1);
      await popupOnPlayer(targetId, "missed", "missed-pop");
      addLog(`You shoot ${target.name}. ${target.name} plays Missed! 💨`);
      applyDodge(targetId);
    } else {
      await popupOnPlayer(targetId, "bang", "bang-pop");
      addLog(`You shoot ${target.name}!`);
      applyDamage(targetId, 1, 0);
    }
  } else if (cardKey === "panic") {
    if (!target.hand.length) {
      addLog(`${target.name} has no cards.`);
      render();
      return;
    }
    await floatCard("panic", getPlayerEl(0), getPlayerEl(targetId));
    const stolen = target.hand.splice(
      Math.floor(Math.random() * target.hand.length),
      1,
    );
    p.hand.push(...stolen);
    addLog(`You steal a card from ${target.name}!`);
  } else if (cardKey === "catbalou") {
    if (!target.hand.length) {
      addLog(`${target.name} has no cards.`);
      render();
      return;
    }
    await floatCard("catbalou", getPlayerEl(0), getPlayerEl(targetId));
    const disc = target.hand.splice(
      Math.floor(Math.random() * target.hand.length),
      1,
    );
    G.discardPile.push(...disc);
    addLog(
      `You discard a ${CARD_DEFS[disc[0]]?.name || disc[0]} from ${target.name}!`,
    );
  } else if (cardKey === "duel") {
    addLog(`You challenge ${target.name} to a Duel!`);
    await Promise.all([
      showBanner(`You challenge ${target.name} to a Duel! ⚔️`, 1000),
      floatCard("duel", getPlayerEl(0), getPlayerEl(targetId)),
    ]);
    await resolveDuel(0, targetId);
  }

  render();
  checkWin();
  if (G.over) showGameOver();
}

async function playSelectedCard() {
  if (G.selectedCard === null) return;
  const p = G.players[0];
  const cardKey = p.hand[G.selectedCard];
  p.hand.splice(G.selectedCard, 1);
  G.discardPile.push(cardKey);
  G.selectedCard = null;

  if (cardKey === "beer") {
    if (G.players.filter((q) => q.alive).length <= 2) {
      addLog("Beer has no effect with 2 players left.");
      render();
      return;
    }
    await popupOnPlayer(0, "beer", "beer-pop");
    applyHeal(0, 1);
  } else if (cardKey === "saloon") {
    addLog("You play Saloon! All players regain 1LP.");
    await Promise.all([
      popupOnPlayer(p.id, "saloon", "saloon-pop"),
      showBanner(`${p.name} play a Saloon! 🍺🍺🍺`, 900),
    ]);
    for (const q of G.players) {
      if (!q.alive) continue;
      applyHeal(q.id, 1);
    }
    render();
    await wait(300);
  } else if (cardKey === "gatling") {
    addLog(
      "You play Gatling! All others will have to Missed! or take 1 damage!",
    );
    const pEl = getPlayerEl(0);
    for (const q of G.players) {
      if (q.id === 0 || !q.alive) continue;
      await floatCard("gatling", pEl, getPlayerEl(q.id));
      await popupOnPlayer(q.id, "gatling", "bang-pop");
      applyDamage(q.id, 1, 0);
      render();
      await wait(250);
      if (G.over) break;
    }
  } else if (cardKey === "indians") {
    addLog("You play Indians!");
    const pEl = getPlayerEl(0);
    for (const q of G.players) {
      if (q.id === 0 || !q.alive) continue;
      const bi = q.hand.indexOf("bang");
      await floatCard("indians", pEl, getPlayerEl(q.id));
      if (bi >= 0) {
        q.hand.splice(bi, 1);
        await popupOnPlayer(q.id, "bang", "bang-pop");
        addLog(`${q.name} plays BANG! to dodge.`);
        applyDodge(q.id);
      } else {
        await popupOnPlayer(q.id, "indians", "bang-pop");
        applyDamage(q.id, 1, 0);
      }
      render();
      await wait(250);
      if (G.over) break;
    }
  } else if (cardKey === "stagecoach") {
    addLog("You play Stagecoach!");
    await popupOnPlayer(0, "stagecoach", "stagecoach-pop");
    drawCards(0, 2);
  } else if (cardKey === "wellsfargo") {
    addLog("You play Wells Fargo!");
    await popupOnPlayer(0, "wellsfargo", "wellsfargo-pop");
    drawCards(0, 3);
  } else if (cardKey === "generalstore") {
    addLog("You play General Store!");
    await Promise.all([
      popupOnPlayer(p.id, "generalstore", "generalstore-pop"),
      showBanner(`${p.name} play a General Store!`, 900),
    ]);
    await resolveGeneralStore();
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
  const overlay = document.getElementById("overlay");
  const modal = document.getElementById("modal-content");
  if (!overlay || !modal) return;
  const msgs = {
    sheriff: "🌟 Sheriff & Deputies Win!",
    outlaws: "💀 Outlaws Win! Sheriff eliminated.",
    renegade_solo: "🎭 Renegade Wins!",
  };
  const rows = G.players
    .map(
      (p) =>
        `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:0.5px solid var(--color-border-tertiary);font-size:13px;">
      <span>${p.name}</span>
      <span><span class="badge badge-${p.role}">${p.role}</span> ${p.alive ? "✅" : "❌"}</span>
    </div>`,
    )
    .join("");
  modal.innerHTML = `<h2 style="margin-bottom:8px;">Game Over</h2>
    <p style="color:var(--color-text-secondary);font-size:14px;margin-bottom:1rem;">${msgs[G.winner] || "Game over."}</p>
    <div style="text-align:left;margin-bottom:1.5rem;">${rows}</div>
    <button class="btn btn-primary" onclick="restartGame()">Play Again</button>`;
  overlay.classList.remove("hidden");
}

function restartGame() {
  document.getElementById("overlay").classList.add("hidden");
  G = initGame();
  aiRunning = false;
  Object.keys(flashMap).forEach((k) => delete flashMap[k]);
  render();
  if (!G.players[G.turn].isHuman) runAI();
}

G = initGame();
render();
if (!G.players[G.turn].isHuman) runAI();
