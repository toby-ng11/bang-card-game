import { CARD_DEFS } from '@/definitions/cards';
import { CharacterKey } from '@/definitions/character';
import { CardKey } from '@/types';

function getGunScore(cardKey: CardKey, character: CharacterKey) {
    if (!cardKey) return 1; // Default Colt .45 score
    const def = CARD_DEFS[cardKey];
    let score = def.range || 1;

    if (cardKey === 'volcanic') {
        // Volcanic is worthless to Willy (range 1 vs his ability)
        // But high value for others (ability to spam BANGs)
        score = character === 'willy_the_kid' ? 0.5 : 1.5;
    }

    return score;
}

export { getGunScore };
