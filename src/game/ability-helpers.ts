import { GameAction } from '@/gameReducer';
import { Player } from '@/types';
import { Dispatch } from 'react';
import { triggerPopup, wait } from './animation';

export const triggerPostDamageAbility = async (
    dispatch: Dispatch<GameAction>,
    reactor: Player,
    sourceId: number | null | undefined,
    damageAmount = 1,
) => {
    // Only characters who have post-damage triggers go here
    const validCharacters = ['bart_cassidy', 'el_gringo'];
    if (!validCharacters.includes(reactor.character)) return;

    triggerPopup(reactor.id, 'ability', 'play', dispatch);
    await wait(1000);

    if (reactor.character === 'bart_cassidy') {
        dispatch({
            type: 'TRIGGER_FLOAT',
            cardKey: 'bang',
            fromId: 'deck',
            toId: reactor.id,
            count: 1,
        });
        dispatch({
            type: 'RESOLVE_CHARACTER_ABILITY',
            characterKey: 'bart_cassidy',
            sourceId: reactor.id,
            targetId: null,
            damageAmount,
        });
    }
};
