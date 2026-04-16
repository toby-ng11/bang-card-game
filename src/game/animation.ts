import { CARD_DEFS } from '@/definitions/cards';
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
    const id = Math.random().toString();
    dispatch({ type: 'ADD_POPUP', payload: { id, pid, cardKey, type } });

    // Auto-remove after animation finishes
    setTimeout(() => {
        dispatch({ type: 'REMOVE_POPUP', id });
    }, 1500);
};

function popupOnPlayer(
    pid: number,
    cardKey: CardKey,
    variant: string,
): Promise<void> {
    const row = document.querySelector(`[data-pid="${pid}"]`) as HTMLDivElement;
    if (!row) return Promise.resolve();
    const c = CARD_DEFS[cardKey];
    const el = document.createElement('div');
    el.className = `popup-card ${variant}`;
    el.innerHTML = `
    <span style="font-size:22px;">${c ? c.icon : '?'}</span>
    <span style="font-size:9px;margin-top:2px;">${c ? c.name : ''}</span>
  `;
    row.appendChild(el);
    requestAnimationFrame(() =>
        requestAnimationFrame(() => el.classList.add('show')),
    );
    return new Promise<void>((res) =>
        setTimeout(() => {
            el.remove();
            res();
        }, 1100),
    );
}

const wait = (ms: number): Promise<void> => {
    return new Promise((r) => setTimeout(r, ms));
};

export { popupOnPlayer, showBanner, triggerPopup, wait };
