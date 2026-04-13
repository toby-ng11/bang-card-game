import { inRange, isEnemy } from '@/game/helpers';
import { CardPick, GameState, Player } from '@/types';

function aiPickCardFrom(state: GameState, target: Player, perspective: Player) {
    // perspective = the AI player doing the action
    const allCards: CardPick[] = [
        ...target.hand.map((c, i) => ({ source: 'hand' as const, idx: i, key: c })),
        ...target.inPlay.map((c, i) => ({ source: 'inPlay' as const, idx: i, key: c })),
    ];
    if (!allCards.length) return null;

    // priority: steal/discard mustang if it's blocking range, else scope, else random
    const mustang = allCards.find((c) => c.key === 'mustang');
    const scope = allCards.find((c) => c.key === 'scope');
    //const barrel = allCards.find((c) => c.key === "barrel");

    // if target has mustang and AI can't reach them, discard it
    if (mustang && !inRange(state.players, perspective.id, target.id))
        return mustang;
    // if target has scope and is an enemy, discard it
    if (scope && isEnemy(state, perspective.id, target.id)) return scope;
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

export { aiPickCardFrom };
