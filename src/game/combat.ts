import { GameAction } from '@/gameReducer';
import { FlashMap, GameState, Player } from '@/types';
import { popupOnPlayer, showBanner, wait } from './animation';
import { dealN } from './helpers';

// ── Check win condition ─────────────────────────────────────────
export function checkWin(state: GameState): GameState {
    const newState = { ...state };
    const sheriff = newState.players.find((p) => p.role === 'SHERIFF');

    if (sheriff && !sheriff.alive) {
        const renegade = newState.players.find((p) => p.role === 'RENEGADE');
        const aliveOutlaws = newState.players.filter(
            (p) => p.role === 'OUTLAW' && p.alive,
        );
        newState.over = true;
        newState.winner =
            aliveOutlaws.length === 0 && renegade && !renegade.alive
                ? 'RENEGADE'
                : 'OUTLAW';
        return newState;
    }

    if (
        newState.players
            .filter((p) => p.role === 'OUTLAW' || p.role === 'RENEGADE')
            .every((p) => !p.alive)
    ) {
        newState.over = true;
        newState.winner = 'SHERIFF';
    }

    return newState;
}

// ── Apply damage ────────────────────────────────────────────────
export function applyDamage(
    state: GameState,
    targetId: number,
    amount: number,
    sourceId: number,
    flashMap: FlashMap,
): GameState {
    let newState = structuredClone(state);
    const t = newState.players[targetId];
    if (!t.alive) return newState;

    t.hp = Math.max(0, t.hp - amount);
    flashMap[targetId] = 'flash-hit';
    newState.log = [
        `${t.name} takes ${amount} damage → ${t.hp}/${t.maxHp} HP.`,
        ...newState.log,
    ].slice(0, 25);

    if (t.hp === 0) {
        t.alive = false;
        newState.log = [
            `☠ ${t.name} eliminated! Role: ${t.role.toUpperCase()}.`,
            ...newState.log,
        ].slice(0, 25);

        newState.discardPile.push(...t.hand, ...t.inPlay);
        t.hand = [];
        t.inPlay = [];

        if (t.role === 'OUTLAW') {
            const { cards, state: afterDraw } = dealN(newState, 3);
            newState = afterDraw;
            newState.players[sourceId].hand.push(...cards);
            newState.log = [
                `${newState.players[sourceId].name} draws 3 bonus cards!`,
                ...newState.log,
            ].slice(0, 25);
        }

        if (t.role === 'DEPUTY') {
            const si = newState.players.findIndex((p) => p.role === 'SHERIFF');
            if (sourceId === si) {
                newState.discardPile.push(...newState.players[si].hand);
                newState.players[si].hand = [];
                newState.log = [
                    'Sheriff shot a Deputy! Sheriff loses all cards.',
                    ...newState.log,
                ].slice(0, 25);
            }
        }

        newState = checkWin(newState);
    }

    return newState;
}

// ── Apply dodge (flash only) ────────────────────────────────────
export function applyDodge(targetId: number, flashMap: FlashMap): void {
    flashMap[targetId] = 'flash-dodge';
}

// ── Check missed ────────────────────────────────────────────────
export async function checkMissed(
    state: GameState,
    target: Player,
    source: Player,
    flashMap: FlashMap,
): Promise<GameState> {
    let newState = structuredClone(state);
    const t = newState.players[target.id];
    const missedIdx = t.hand.indexOf('missed');

    if (missedIdx >= 0) {
        const [missedCard] = t.hand.splice(missedIdx, 1);
        newState.discardPile.push(missedCard);
        newState.log = [
            `${t.name} plays Missed! and dodges.`,
            ...newState.log,
        ].slice(0, 25);
        applyDodge(target.id, flashMap);
        await popupOnPlayer(target.id, 'missed', 'missed-pop');
    } else {
        await popupOnPlayer(target.id, 'bang', 'bang-pop');
        newState = applyDamage(newState, target.id, 1, source.id, flashMap);
    }

    return newState;
}

export async function checkBang(
    state: GameState,
    target: Player,
    source: Player,
    flashMap: FlashMap,
): Promise<GameState> {
    let newState = structuredClone(state);
    const t = newState.players[target.id];
    const bangIdx = t.hand.indexOf('bang');

    if (bangIdx >= 0) {
        const [bangCard] = t.hand.splice(bangIdx, 1);
        newState.discardPile.push(bangCard);
        newState.log = [
            `${t.name} plays Bang! and dodges.`,
            ...newState.log,
        ].slice(0, 25);
        applyDodge(target.id, flashMap);
        await popupOnPlayer(target.id, 'bang', 'bang-pop');
    } else {
        await popupOnPlayer(target.id, 'indians', 'indians-pop');
        newState = applyDamage(newState, target.id, 1, source.id, flashMap);
    }

    return newState;
}

export async function resolveDuel(
    state: GameState,
    challengerId: number,
    targetId: number,
    flashMap: FlashMap,
    dispatch: React.Dispatch<GameAction>,
): Promise<GameState> {
    let current = targetId;
    let other = challengerId;
    let newState = structuredClone(state);

    while (true) {
        const p = newState.players[current];
        const bangIdx = p.hand.indexOf('bang');

        if (bangIdx >= 0) {
            const [bang] = p.hand.splice(bangIdx, 1);
            newState.discardPile.push(bang);
            newState.log = [
                `${p.name} plays BANG! to stay in the duel.`,
                ...newState.log,
            ].slice(0, 25);
            await Promise.all([
                popupOnPlayer(p.id, 'bang', 'bang-pop'),
                showBanner(`${p.name} plays BANG! ⚔️`, 800),
            ]);
            dispatch({ type: 'SET_STATE', state: newState });
        } else {
            newState.log = [
                `${p.name} has no BANG! and loses the duel.`,
                ...newState.log,
            ].slice(0, 25);
            await showBanner(`${p.name} loses the duel! 💀`, 900);
            newState = applyDamage(newState, p.id, 1, other, flashMap);
            dispatch({ type: 'SET_STATE', state: newState });
            break;
        }

        [current, other] = [other, current];
        await wait(400);
        if (newState.over) break;
    }

    return newState;
}
