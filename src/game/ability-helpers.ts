import { GameAction } from '@/gameReducer';
import { Player } from '@/types';
import { triggerPopup, wait } from './animation';

export const handlePostDamageAbilities = async (
    source: Player,
    targetId: number | null,
    dispatch: React.Dispatch<GameAction>,
) => {
    switch (source.character) {
        case 'bart_cassidy':
            await wait(1000);
            triggerPopup(source.id, 'ability', 'play', dispatch); // Use character icon/name here
            await wait(1000);
            dispatch({
                type: 'TRIGGER_FLOAT',
                cardKey: 'bang', // Usually show the card back since it's a deck draw
                fromId: 'deck',
                toId: source.id,
                count: 1,
            });

            await wait(1000);
            dispatch({
                type: 'RESOLVE_CHARACTER_ABILITY',
                characterKey: 'bart_cassidy',
                sourceId: source.id,
                targetId: null,
            });
            break;

        case 'el_gringo':
            if (source !== null) {
                // Logic for stealing a card from sourceId
            }
            break;

        // Add more cases here...
    }
};
