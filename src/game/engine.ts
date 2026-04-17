import { CARD_DEFS } from '@/definitions/cards';
import { GameAction } from '@/gameReducer';
import { GameState } from '@/types';
import { Dispatch, useEffect } from 'react';
import { handlePostDamageAbilities } from './ability-helpers';
import { aiPickCardFrom } from './ai';
import { showBanner, triggerPopup, wait } from './animation';

const usePhaseResolver = (G: GameState, dispatch: Dispatch<GameAction>) => {
    return useEffect(() => {
        const [currentAction] = G.pendingAction;
        const reactor = G.players.find(
            (p) => p.id === currentAction?.reactorId[0],
        );

        if (G.phase === 'dying' && reactor && !reactor.isHuman) {
            const aiDelay = setTimeout(() => {
                const hasBeer = reactor.hand.includes('beer');

                if (hasBeer) {
                    // AI chugs a beer
                    triggerPopup(reactor.id, 'beer', 'heal', dispatch);
                    dispatch({
                        type: 'DRINK_BEER_TO_SURVIVE',
                        playerId: reactor.id,
                    });
                } else {
                    // No more beers and HP <= 0? Dead.
                    dispatch({
                        type: 'TAKE_DAMAGE',
                        sourceId: currentAction?.sourceId ?? null,
                        targetId: reactor.id,
                        damageAmount: 999,
                    });
                }
            }, 1000); // 1 second between beers for dramatic effect

            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'bang' && reactor) {
            const aiDelay = setTimeout(async () => {
                const hasBarrel = reactor.inPlay.includes('barrel');
                const chance = 0.25;
                if (hasBarrel && Math.random() < chance) {
                    triggerPopup(reactor.id, 'barrel', 'heal', dispatch);
                    dispatch({
                        type: 'RESOLVE_BARREL',
                        playerId: reactor.id,
                    });
                } else {
                    const hasMissed = reactor.hand.includes('missed');
                    if (hasMissed) {
                        triggerPopup(reactor.id, 'missed', 'play', dispatch);
                        dispatch({
                            type: 'PLAY_CARD',
                            cardKey: 'missed',
                            sourceId: reactor.id,
                            targetId: currentAction?.targetId[0] ?? null,
                        });
                    } else {
                        triggerPopup(reactor.id, 'bang', 'damage', dispatch);
                        dispatch({
                            type: 'TAKE_DAMAGE',
                            sourceId: currentAction?.sourceId ?? null,
                            targetId: reactor.id,
                            damageAmount: 1,
                        });

                        await handlePostDamageAbilities(
                            G,
                            reactor,
                            currentAction?.sourceId,
                            dispatch,
                        );
                    }
                }
            }, 1000);

            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'gatling' && reactor) {
            const aiDelay = setTimeout(async () => {
                const sourceId = currentAction?.sourceId;
                if (sourceId !== undefined) {
                    dispatch({
                        type: 'TRIGGER_FLOAT',
                        cardKey: 'gatling',
                        fromId: sourceId,
                        toId: reactor.id,
                    });
                }

                await wait(1000);

                const hasBarrel = reactor.inPlay.includes('barrel');
                const chance = 0.25;
                if (hasBarrel && Math.random() < chance) {
                    triggerPopup(reactor.id, 'barrel', 'heal', dispatch);
                    dispatch({
                        type: 'RESOLVE_BARREL',
                        playerId: reactor.id,
                    });
                } else {
                    const hasMissed = reactor.hand.includes('missed');

                    if (hasMissed) {
                        // Trigger your beautiful popup!
                        triggerPopup(reactor.id, 'missed', 'play', dispatch);

                        dispatch({
                            type: 'PLAY_CARD',
                            cardKey: 'missed',
                            sourceId: reactor.id,
                            targetId: null,
                        });
                    } else {
                        // Take damage popup
                        triggerPopup(reactor.id, 'gatling', 'damage', dispatch);

                        dispatch({
                            type: 'TAKE_DAMAGE',
                            sourceId: currentAction?.sourceId ?? null,
                            targetId: reactor.id,
                            damageAmount: 1,
                        });

                        await handlePostDamageAbilities(
                            G,
                            reactor,
                            currentAction?.sourceId,
                            dispatch,
                        );
                    }
                }
            }, 1000);
            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'indians' && reactor) {
            const aiDelay = setTimeout(async () => {
                const hasBang = reactor.hand.includes('bang');
                const sourceId = currentAction?.sourceId;

                if (sourceId !== undefined) {
                    dispatch({
                        type: 'TRIGGER_FLOAT',
                        cardKey: 'indians',
                        fromId: sourceId,
                        toId: reactor.id,
                    });
                }

                await wait(1000);

                if (hasBang) {
                    // Trigger your beautiful popup!
                    triggerPopup(reactor.id, 'bang', 'play', dispatch);

                    dispatch({
                        type: 'RESOLVE_INDIANS',
                        playerId: reactor.id,
                    });
                } else {
                    // Take damage popup
                    triggerPopup(reactor.id, 'indians', 'damage', dispatch);

                    dispatch({
                        type: 'TAKE_DAMAGE',
                        sourceId: currentAction?.sourceId ?? null,
                        targetId: reactor.id,
                        damageAmount: 1,
                    });

                    await handlePostDamageAbilities(
                        G,
                        reactor,
                        currentAction?.sourceId,
                        dispatch,
                    );
                }
            }, 1000);
            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'duel' && reactor && !reactor.isHuman) {
            const aiDelay = setTimeout(async () => {
                const hasBang = reactor.hand.includes('bang');

                if (hasBang) {
                    // Trigger your beautiful popup!
                    triggerPopup(reactor.id, 'bang', 'play', dispatch);

                    dispatch({
                        type: 'RESOLVE_DUEL',
                        playerId: reactor.id,
                    });
                } else {
                    // Take damage popup
                    triggerPopup(reactor.id, 'duel', 'damage', dispatch);

                    dispatch({
                        type: 'TAKE_DAMAGE',
                        sourceId: currentAction?.sourceId ?? null,
                        targetId: reactor.id,
                        damageAmount: 1,
                    });

                    await handlePostDamageAbilities(
                        G,
                        reactor,
                        currentAction?.sourceId,
                        dispatch,
                    );
                }
            }, 1000);
            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'saloon' && reactor) {
            const aiDelay = setTimeout(() => {
                // Trigger your beautiful popup!
                triggerPopup(reactor.id, 'beer', 'heal', dispatch);

                const healAmount = 1;

                dispatch({
                    type: 'HEAL_A_PLAYER',
                    playerId: reactor.id,
                    amount: healAmount,
                });

                dispatch({
                    type: 'RESOLVE_SALOON',
                    playerId: reactor.id,
                });
            }, 1000);
            return () => clearTimeout(aiDelay);
        }

        const currentGeneralStorePickerId =
            G.generalStoreOrder?.[G.generalStoreIndex];
        const currentGeneralStorePicker = G.players.find(
            (p) => p.id === currentGeneralStorePickerId,
        );
        if (
            G.phase === 'generalstore' &&
            currentGeneralStorePicker &&
            !currentGeneralStorePicker.isHuman
        ) {
            const availableCards = G.generalStoreCards;
            if (availableCards && availableCards.length > 0) {
                const aiDelay = setTimeout(async () => {
                    // AI Logic: Priority is 'bang', otherwise take the first available card
                    const pick = availableCards.includes('bang')
                        ? 'bang'
                        : availableCards[0];

                    dispatch({
                        type: 'RESOLVE_GENERAL_STORE_PICK',
                        cardKey: pick,
                        playerId: currentGeneralStorePicker.id,
                    });

                    // Show a quick banner so the human knows what the AI took
                    await showBanner(
                        `${currentGeneralStorePicker.name} picks ${CARD_DEFS[pick]?.name || pick}.`,
                        700,
                    );
                }, 1200); // Slightly longer delay than reaction to feel more "natural"

                return () => clearTimeout(aiDelay);
            }
        }

        const currentCardPickerId = currentAction?.sourceId;
        const currentCardPicker = G.players.find(
            (p) => p.id === currentCardPickerId,
        );
        const currentCardPickerTargetId = G.cardPickerTarget;
        const currentCardPickerTarget = G.players.find(
            (p) => p.id === currentCardPickerTargetId,
        );

        if (
            (G.phase === 'panic' || G.phase === 'catbalou') &&
            currentCardPicker &&
            !currentCardPicker.isHuman &&
            currentCardPickerTarget
        ) {
            const cardKey = G.phase;
            const aiDelay = setTimeout(async () => {
                const picked = aiPickCardFrom(
                    G,
                    currentCardPickerTarget,
                    currentCardPicker,
                    cardKey,
                );

                if (picked !== null) {
                    if (G.phase === 'panic') {
                        dispatch({
                            type: 'TRIGGER_FLOAT',
                            cardKey: picked.key,
                            fromId: currentCardPickerTarget.id,
                            toId: currentCardPicker.id,
                        });

                        // Show a quick banner so the human knows what the AI took
                        await showBanner(
                            `${currentCardPicker.name} picks ${CARD_DEFS[picked.key]?.name || picked.key}.`,
                            700,
                        );
                    } else {
                        dispatch({
                            type: 'TRIGGER_FLOAT',
                            cardKey: picked.key,
                            fromId: currentCardPickerTarget.id,
                            toId: 'discard',
                        });

                        // Show a quick banner so the human knows what the AI took
                        await showBanner(
                            `${currentCardPicker.name} discard a ${CARD_DEFS[picked.key]?.name || picked.key} from ${currentCardPickerTarget.name}.`,
                            700,
                        );
                    }

                    dispatch({
                        type: 'RESOLVE_CARD_PICK',
                        payload: picked,
                    });
                }
            }, 1200); // Slightly longer delay than reaction to feel more "natural"

            return () => clearTimeout(aiDelay);
        }
    }, [
        G,
        G.phase,
        G.players,
        G.generalStoreCards,
        G.generalStoreIndex,
        G.generalStoreOrder,
        dispatch,
    ]);
};

export { usePhaseResolver };
