import { CARD_DEFS } from '@/definitions/cards';
import { inRange, isEnemy } from '@/game/helpers';
import { CardKey, CardPick, GameState, Player } from '@/types';

function aiPickCardFrom(state: GameState, target: Player, perspective: Player) {
    // perspective = the AI player doing the action
    const allCards: CardPick[] = [
        ...target.hand.map((c, i) => ({
            source: 'hand' as const,
            idx: i,
            key: c,
        })),
        ...target.inPlay.map((c, i) => ({
            source: 'inPlay' as const,
            idx: i,
            key: c,
        })),
    ];
    if (!allCards.length) return null;

    // priority: steal/discard mustang if it's blocking range, else scope, else random
    const mustang = allCards.find((c) => c.key === 'mustang');
    const scope = allCards.find((c) => c.key === 'scope');
    const barrel = allCards.find((c) => c.key === 'barrel');

    // if target has mustang and AI can't reach them, discard it
    if (mustang && !inRange(state.players, perspective.id, target.id))
        return mustang;
    // if target has scope and is an enemy, discard it
    if (scope && isEnemy(state, perspective.id, target.id)) return scope;
    // if target has barrel, discard it so BANG! lands reliably
    if (barrel && isEnemy(state, perspective.id, target.id)) return barrel;

    // otherwise pick a random hand card (don't peek at face-down hand)
    const handCards = allCards.filter((c) => c.source === 'hand');
    const inPlayCards = allCards.filter((c) => c.source === 'inPlay');

    // prefer stealing hand cards for panic, inPlay for catbalou
    return handCards.length
        ? handCards[Math.floor(Math.random() * handCards.length)]
        : inPlayCards[Math.floor(Math.random() * inPlayCards.length)];
}

const getAIDiscardCard = (G: GameState, playerId: number): CardKey => {
    const player = G.players[playerId];
    const hand = player.hand;

    // Weighting logic: Higher score = Keep, Lower score = Discard
    const cardScores = hand.map((cardKey, index) => {
        const card = CARD_DEFS[cardKey];
        let score = 0;

        // 1. Core Survival: Beer is the most valuable if HP is low
        if (cardKey === 'beer') {
            score += (player.maxHp - player.hp) * 10;
        }

        // 2. Defense: Missed! cards are high priority to keep
        if (cardKey === 'missed') score += 15;

        // 3. Equipment: Blue cards are valuable if NOT already in play
        if (card.color === 'blue') {
            const alreadyInPlay = player.inPlay.some((c) => c === cardKey);
            score += alreadyInPlay ? 0 : 8; // Drop duplicates
        }

        // 4. Duplicate Check: Don't hold 4 'Bang!' cards if you can only play 1
        if (cardKey === 'bang') {
            const bangCount = hand.filter((k) => k === 'bang').length;
            //const hasVolcanic = player.inPlay.some((c) => c === 'volcanic');
            const hasVolcanic = false;

            // If we have many bangs and no volcanic, the extra ones are useless
            score += (hasVolcanic ? 12 : 5) - bangCount * 2;
        }

        // 5. Reach: Scopes/Volcanics are kept if enemies are alive
        //if (cardKey === 'scope' || cardKey === 'volcanic') score += 10;
        if (cardKey === 'scope') score += 10;

        return { cardKey, score, index };
    });

    // Sort by score ascending (lowest first) and pick the worst one
    cardScores.sort((a, b) => a.score - b.score);

    return cardScores[0].cardKey;
};

export { aiPickCardFrom, getAIDiscardCard };
