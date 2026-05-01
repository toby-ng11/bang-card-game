import { CARD_DEFS } from '@/definitions/cards';
import { CharacterKey } from '@/definitions/character';
import { CardKey, Player } from '@/types';

const getGunScore = (cardKey: CardKey, character: CharacterKey) => {
    if (!cardKey) return 1; // Default Colt .45 score
    const def = CARD_DEFS[cardKey];
    let score = def.range || 1;

    if (cardKey === 'volcanic') {
        // Volcanic is worthless to Willy (range 1 vs his ability)
        // But high value for others (ability to spam BANGs)
        score = character === 'willy_the_kid' ? 0.5 : 1.5;
    }

    return score;
};

const getCardScore = (cardKey: CardKey, player: Player): number => {
    let score = 0;

    switch (cardKey) {
        // --- SURVIVAL (High priority if low HP) ---
        case 'beer':
            score += player.hp < player.maxHp ? 100 : 10;
            break;
        case 'missed':
            score += 70; // Always good to have
            if (player.hand.length < 2) score += 20;
            break;

        // --- OFFENSE (High priority if healthy) ---
        case 'bang':
            score += 50;
            //if (player.enemiesInRange > 0) score += 15;
            break;

        // --- UTILITY/DRAW ---
        case 'wellsfargo':
            score += 90; // Drawing 3 is almost always best
            break;
        case 'stagecoach':
            score += 80;
            break;
        case 'saloon':
            score += player.hp < player.maxHp ? 75 : 30;
            break;
        case 'panic':
            score += 75;
            break;
        case 'catbalou':
            score += 70;
            break;

        // --- EQUIPMENT ---
        case 'schofield':
        case 'remington':
        case 'winchester':
            score += player.inPlay.includes(cardKey) ? 10 : 65; // High value if unarmed
            break;
        case 'volcanic':
            score += player.inPlay.includes(cardKey)
                ? 10
                : player.character === 'suzy_lafayette'
                  ? 100
                  : 65; // High value if unarmed
            break;
        case 'mustang':
            score += player.inPlay.includes(cardKey) ? 20 : 80; // High value
            break;
        case 'scope':
            score += player.inPlay.includes(cardKey) ? 20 : 79; // High value
            break;
        case 'barrel':
            score += 75; // Permanent defense is great
            break;

        default:
            score += 40; // Generic cards
    }

    return score;
};

const shouldPedroPickDiscard = (
    discardPile: CardKey[],
    player: Player,
): boolean => {
    if (discardPile.length === 0 || player.character !== 'pedro_ramirez')
        return false;

    const topCard = discardPile[discardPile.length - 1];
    const topCardScore = getCardScore(topCard, player);

    // The "Deck" has an average value of roughly 55.
    // Pedro picks from discard only if the card is better than an average draw.
    return topCardScore > 55;
};

export { getCardScore, getGunScore, shouldPedroPickDiscard };
