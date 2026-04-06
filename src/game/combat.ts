import { FlashMap, GameState, Player } from '@/types';
import { popupOnPlayer } from './animation';
import { dealN } from './helpers';

// ── Check win condition ─────────────────────────────────────────
export function checkWin(state: GameState): GameState {
    const newState = { ...state };
    const sheriff = newState.players.find((p) => p.role === 'sheriff');

    if (sheriff && !sheriff.alive) {
        const renegade = newState.players.find((p) => p.role === 'renegade');
        const aliveOutlaws = newState.players.filter(
            (p) => p.role === 'outlaw' && p.alive,
        );
        newState.over = true;
        newState.winner =
            aliveOutlaws.length === 0 && renegade && !renegade.alive
                ? 'renegade_solo'
                : 'outlaws';
        return newState;
    }

    if (
        newState.players
            .filter((p) => p.role === 'outlaw' || p.role === 'renegade')
            .every((p) => !p.alive)
    ) {
        newState.over = true;
        newState.winner = 'sheriff';
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

        if (t.role === 'outlaw') {
            const { cards, state: afterDraw } = dealN(newState, 3);
            newState = afterDraw;
            newState.players[sourceId].hand.push(...cards);
            newState.log = [
                `${newState.players[sourceId].name} draws 3 bonus cards!`,
                ...newState.log,
            ].slice(0, 25);
        }

        if (t.role === 'deputy') {
            const si = newState.players.findIndex((p) => p.role === 'sheriff');
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
