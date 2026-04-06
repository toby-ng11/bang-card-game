// src/lib/generalStore.ts
import { CARD_DEFS } from '@/definitions/cards';
import { popupOnPlayer, showBanner, wait } from '@/game/animation';
import { dealN } from '@/game/helpers';
import { GameAction } from '@/gameReducer';
import { CardKey, GameState } from '@/types';

export async function resolveGeneralStore(
    getState: () => GameState, // GRef.current
    dispatch: React.Dispatch<GameAction>,
): Promise<void> {
    const initial = getState();
    const alivePlayers = initial.players.filter((p) => p.alive);

    // deal cards into state
    const { cards: storeCards, state: afterDeal } = dealN(
        initial,
        alivePlayers.length,
    );
    afterDeal.generalStoreCards = storeCards;
    afterDeal.generalStorePicking = true;
    afterDeal.log = [
        `General Store: ${storeCards.length} cards flipped face-up.`,
        ...afterDeal.log,
    ].slice(0, 25);
    dispatch({ type: 'SET_STATE', state: afterDeal });
    await showBanner('General Store! Pick a card. 🏪', 900);

    // pick order starting from current turn
    const idx = initial.players.findIndex((p) => p.id === initial.turn);
    const pickOrder = [];
    for (let i = 0; i < alivePlayers.length; i++) {
        const p = initial.players[(idx + i) % initial.players.length];
        if (p.alive) pickOrder.push(p);
    }

    for (const p of pickOrder) {
        // always read latest state after each await
        if (!getState().generalStoreCards.length) break;

        if (p.isHuman) {
            // set human picking flag and wait for them to pick via the resolver
            await new Promise<CardKey>((res) => {
                dispatch({
                    type: 'SET_GENERAL_STORE',
                    cards: getState().generalStoreCards,
                    picking: true,
                    resolve: res,
                });
            });
            await wait(400);
        } else {
            // AI picks
            const current = getState();
            const newState = structuredClone(current);
            const pick = newState.generalStoreCards.includes('bang')
                ? newState.generalStoreCards.splice(
                      newState.generalStoreCards.indexOf('bang'),
                      1,
                  )[0]
                : newState.generalStoreCards.splice(0, 1)[0];

            newState.players[p.id].hand.push(pick);
            newState.log = [
                `${p.name} picks ${CARD_DEFS[pick]?.name || pick} from General Store.`,
                ...newState.log,
            ].slice(0, 25);
            dispatch({ type: 'SET_STATE', state: newState });

            await Promise.all([
                popupOnPlayer(p.id, pick, 'heal-pop'),
                showBanner(
                    `${p.name} picks ${CARD_DEFS[pick]?.name || pick}`,
                    700,
                ),
            ]);
            await wait(400);
        }
    }

    // cleanup
    const final = getState();
    const finalState = structuredClone(final);
    finalState.discardPile.push(...finalState.generalStoreCards);
    finalState.generalStoreCards = [];
    finalState.generalStorePicking = false;
    finalState.generalStoreResolve = null;
    dispatch({ type: 'SET_STATE', state: finalState });
}
