import { GameAction } from '@/gameReducer';
import { CardKey } from '@/types';
import { Dispatch } from 'react';
import { toast } from 'sonner';

const showBanner = (text: string, duration = 1100): Promise<void> => {
    toast(text, {
        duration,
        position: 'top-center',
    });
    return wait(duration);
};

const triggerPopup = (
    pid: number,
    cardKey: CardKey,
    type: 'play' | 'damage' | 'heal' = 'play',
    dispatch: Dispatch<GameAction>,
) => {
    const id = `popup-${pid}-${Date.now()}`;
    dispatch({ type: 'ADD_POPUP', payload: { id, pid, cardKey, type } });
};

const wait = (ms: number): Promise<void> => {
    return new Promise((r) => setTimeout(r, ms));
};

export { showBanner, triggerPopup, wait };
