import { GameAction } from '@/gameReducer';
import { GameState, Player } from '@/types';
import { triggerPopup, wait } from './animation';

export const handlePostDamageAbilities = async (
    G: GameState,
    source: Player,
    targetId: number | null,
    dispatch: React.Dispatch<GameAction>,
) => {
    switch (source.character) {
        case 'bart_cassidy':
            await wait(1200);
            triggerPopup(source.id, 'ability', 'play', dispatch);
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
                characterKey: source.character,
                sourceId: source.id,
                targetId: null,
            });
            break;

        case 'el_gringo':
            await wait(1200);
            triggerPopup(source.id, 'ability', 'play', dispatch);
            await wait(1000);
            if (targetId !== null && targetId !== source.id) {
                const target = G.players[targetId];

                dispatch({
                    type: 'RESOLVE_CHARACTER_ABILITY',
                    characterKey: source.character,
                    sourceId: source.id,
                    targetId: target.id,
                });
            }
            break;

        // Add more cases here...
    }
};
