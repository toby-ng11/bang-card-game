import { CARD_DEFS } from '@/definitions/cards';
import { GameAction } from '@/gameReducer';
import { GameState } from '@/types';
import { Dispatch, useEffect } from 'react';
import { aiPickCardFrom } from './ai';
import { showBanner, triggerPopup, wait } from './animation';
import { getCardScore } from './combat';

const usePhaseResolver = (G: GameState, dispatch: Dispatch<GameAction>) => {
    return useEffect(() => {
        const isSuzyWithEmptyHand = G.players.find(
            (p) =>
                p.alive &&
                p.hand.length === 0 &&
                p.character === 'suzy_lafayette',
        );
        if (G.phase === 'play' && isSuzyWithEmptyHand) {
            const aiDelay = setTimeout(async () => {
                // Trigger your beautiful popup!
                triggerPopup(
                    isSuzyWithEmptyHand.id,
                    'ability',
                    'play',
                    dispatch,
                );

                await wait(1000);

                dispatch({
                    type: 'TRIGGER_FLOAT',
                    cardKey: 'bang',
                    fromId: 'deck',
                    toId: isSuzyWithEmptyHand.id,
                });

                dispatch({
                    type: 'RESOLVE_CHARACTER_ABILITY',
                    characterKey: 'suzy_lafayette',
                    sourceId: isSuzyWithEmptyHand.id,
                    targetId: null,
                });
            }, 1000);
            return () => clearTimeout(aiDelay);
        }

        const [currentAction] = G.pendingAction;
        if (!currentAction || currentAction.isProcessing) return;

        const reactor = G.players.find(
            (p) => p.id === currentAction.reactorId[0],
        );

        if (G.phase === 'ability' && !reactor) {
            const timeDelay = setTimeout(async () => {
                dispatch({
                    type: 'SET_ACTION_PROCESSING',
                    id: currentAction.id,
                });
                triggerPopup(
                    currentAction?.sourceId,
                    'ability',
                    'play',
                    dispatch,
                );
            }, 1200);

            return () => clearTimeout(timeDelay);
        }

        if (G.phase === 'dying' && reactor) {
            const aiDelay = setTimeout(() => {
                dispatch({
                    type: 'SET_ACTION_PROCESSING',
                    id: currentAction.id,
                });
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
                        sourceId: currentAction.sourceId ?? null,
                        targetId: reactor.id,
                        damageAmount: 999,
                    });
                }
                dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
            }, 1000); // 1 second between beers for dramatic effect

            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'bang' && reactor) {
            const aiDelay = setTimeout(async () => {
                dispatch({
                    type: 'SET_ACTION_PROCESSING',
                    id: currentAction.id,
                });
                // 1. ROLL ABILITY / BARREL (Check up to two times)
                const isLuckyDuke = reactor.character === 'lucky_duke';

                // Roll 1: If Jourdonnais, check Ability
                if (
                    reactor.character === 'jourdonnas' &&
                    Math.random() < 0.25
                ) {
                    triggerPopup(reactor.id, 'ability', 'play', dispatch);
                    dispatch({
                        type: 'RESOLVE_CHARACTER_ABILITY',
                        characterKey: 'jourdonnas',
                        sourceId: reactor.id,
                        targetId: null,
                    });
                    dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
                    return;
                }
                // Roll 2: If Barrel in play, check Barrel
                if (
                    reactor.inPlay.includes('barrel') &&
                    Math.random() < (isLuckyDuke ? 0.4375 : 0.25)
                ) {
                    triggerPopup(reactor.id, 'barrel', 'heal', dispatch);
                    dispatch({ type: 'RESOLVE_BARREL', playerId: reactor.id });
                    dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
                    return;
                }

                // 2. CHECK REACTIONS (Cards)
                const cardToPlay = reactor.hand.includes('missed')
                    ? 'missed'
                    : reactor.character === 'calamity_janet' &&
                        reactor.hand.includes('bang')
                      ? 'bang'
                      : null;

                if (cardToPlay) {
                    triggerPopup(reactor.id, cardToPlay, 'play', dispatch);
                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: cardToPlay,
                        sourceId: reactor.id,
                        targetId: null,
                    });
                    dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
                    return;
                }
                const damageAmount = 1;

                // 3. DAMAGE FALLBACK
                triggerPopup(reactor.id, 'bang', 'damage', dispatch);
                await wait(1000);
                dispatch({
                    type: 'TAKE_DAMAGE',
                    sourceId: currentAction?.sourceId ?? null,
                    targetId: reactor.id,
                    damageAmount: damageAmount,
                });

                dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
            }, 500);

            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'gatling' && reactor) {
            const aiDelay = setTimeout(async () => {
                dispatch({
                    type: 'SET_ACTION_PROCESSING',
                    id: currentAction.id,
                });
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
                const luckyDukeChance = 0.4375;
                if (
                    reactor.character === 'jourdonnas' &&
                    Math.random() < chance
                ) {
                    triggerPopup(reactor.id, 'ability', 'play', dispatch);
                    dispatch({
                        type: 'RESOLVE_CHARACTER_ABILITY',
                        characterKey: 'jourdonnas',
                        sourceId: reactor.id,
                        targetId: null,
                    });
                    dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
                    return;
                }

                if (hasBarrel) {
                    if (
                        reactor.character === 'lucky_duke' &&
                        Math.random() < luckyDukeChance
                    ) {
                        triggerPopup(reactor.id, 'barrel', 'heal', dispatch);
                        dispatch({
                            type: 'RESOLVE_BARREL',
                            playerId: reactor.id,
                        });
                        dispatch({
                            type: 'RESOLVE_ACTION',
                            id: currentAction.id,
                        });
                        return;
                    } else if (Math.random() < chance) {
                        triggerPopup(reactor.id, 'barrel', 'heal', dispatch);
                        dispatch({
                            type: 'RESOLVE_BARREL',
                            playerId: reactor.id,
                        });
                        dispatch({
                            type: 'RESOLVE_ACTION',
                            id: currentAction.id,
                        });
                        return;
                    }
                }

                let cardToPlay: 'bang' | 'missed' | null = null;

                if (reactor.hand.includes('missed')) {
                    cardToPlay = 'missed';
                } else if (
                    reactor.character === 'calamity_janet' &&
                    reactor.hand.includes('bang')
                ) {
                    cardToPlay = 'bang'; // Janet plays Bang as Missed
                }

                if (cardToPlay) {
                    triggerPopup(reactor.id, cardToPlay, 'play', dispatch);
                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: cardToPlay,
                        sourceId: reactor.id,
                        targetId: null,
                    });
                } else {
                    // No reaction possible, take damage
                    triggerPopup(reactor.id, 'bang', 'damage', dispatch);
                    await wait(1000);
                    const damageAmount = 1;
                    dispatch({
                        type: 'TAKE_DAMAGE',
                        sourceId: currentAction?.sourceId ?? null,
                        targetId: reactor.id,
                        damageAmount: damageAmount,
                    });
                }
                dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
            }, 500);
            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'indians' && reactor) {
            const aiDelay = setTimeout(async () => {
                dispatch({
                    type: 'SET_ACTION_PROCESSING',
                    id: currentAction.id,
                });
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

                let cardToDiscard: 'bang' | 'missed' | null = null;

                if (reactor.hand.includes('bang')) {
                    cardToDiscard = 'bang';
                } else if (
                    reactor.character === 'calamity_janet' &&
                    reactor.hand.includes('missed')
                ) {
                    cardToDiscard = 'missed'; // Janet plays Missed as Bang
                }

                if (cardToDiscard) {
                    // Trigger your beautiful popup!
                    triggerPopup(reactor.id, cardToDiscard, 'play', dispatch);

                    dispatch({
                        type: 'RESOLVE_INDIANS',
                        playerId: reactor.id,
                        discardKey: cardToDiscard,
                    });
                } else {
                    // Take damage popup
                    triggerPopup(reactor.id, 'indians', 'damage', dispatch);
                    await wait(1000);
                    const damageAmount = 1;
                    dispatch({
                        type: 'TAKE_DAMAGE',
                        sourceId: currentAction?.sourceId ?? null,
                        targetId: reactor.id,
                        damageAmount: damageAmount,
                    });
                }
                dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
            }, 500);
            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'duel' && reactor && !reactor.isHuman) {
            const aiDelay = setTimeout(async () => {
                dispatch({
                    type: 'SET_ACTION_PROCESSING',
                    id: currentAction.id,
                });
                let cardToDiscard: 'bang' | 'missed' | null = null;

                if (reactor.hand.includes('bang')) {
                    cardToDiscard = 'bang';
                } else if (
                    reactor.character === 'calamity_janet' &&
                    reactor.hand.includes('missed')
                ) {
                    cardToDiscard = 'missed'; // Janet plays Missed as Bang
                }

                if (cardToDiscard) {
                    // Trigger your beautiful popup!
                    triggerPopup(reactor.id, cardToDiscard, 'play', dispatch);

                    dispatch({
                        type: 'RESOLVE_DUEL',
                        playerId: reactor.id,
                        discardKey: cardToDiscard,
                    });
                } else {
                    // Take damage popup
                    triggerPopup(reactor.id, 'duel', 'damage', dispatch);
                    await wait(1000);
                    const damageAmount = 1;
                    dispatch({
                        type: 'TAKE_DAMAGE',
                        sourceId: currentAction?.sourceId ?? null,
                        targetId: reactor.id,
                        damageAmount: damageAmount,
                    });
                }
                dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
            }, 1000);
            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'saloon' && reactor) {
            const aiDelay = setTimeout(() => {
                dispatch({
                    type: 'SET_ACTION_PROCESSING',
                    id: currentAction.id,
                });
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
                dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
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
                    dispatch({
                        type: 'SET_ACTION_PROCESSING',
                        id: currentAction.id,
                    });
                    // AI Logic: Priority is 'bang', otherwise take the first available card
                    // const pick = availableCards.includes('bang')
                    //     ? 'bang'
                    //     : availableCards[0];

                    const pick = [...availableCards].sort(
                        (a, b) =>
                            getCardScore(b, currentGeneralStorePicker) -
                            getCardScore(a, currentGeneralStorePicker),
                    )[0];

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
                    dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
                }, 1100); // Slightly longer delay than reaction to feel more "natural"

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
            (G.phase === 'panic' ||
                G.phase === 'catbalou' ||
                G.phase === 'el_gringo') &&
            currentCardPicker &&
            !currentCardPicker.isHuman &&
            currentCardPickerTarget
        ) {
            const cardKey = G.phase === 'el_gringo' ? null : G.phase;
            const aiDelay = setTimeout(async () => {
                dispatch({
                    type: 'SET_ACTION_PROCESSING',
                    id: currentAction.id,
                });
                const picked =
                    G.phase === 'el_gringo'
                        ? aiPickCardFrom(
                              G,
                              currentCardPickerTarget,
                              currentCardPicker,
                              cardKey,
                              true,
                          )
                        : aiPickCardFrom(
                              G,
                              currentCardPickerTarget,
                              currentCardPicker,
                              cardKey,
                          );

                if (picked !== null) {
                    if (G.phase === 'el_gringo') {
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
                    } else if (G.phase === 'panic') {
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
                    dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
                }
            }, 1200); // Slightly longer delay than reaction to feel more "natural"

            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'bart_cassidy' && reactor) {
            const timeDelay = setTimeout(async () => {
                dispatch({
                    type: 'SET_ACTION_PROCESSING',
                    id: currentAction.id,
                });

                dispatch({
                    type: 'TRIGGER_FLOAT',
                    cardKey: 'bang',
                    fromId: 'deck',
                    toId: reactor.id,
                    count: 1,
                });

                await wait(1000);

                dispatch({
                    type: 'RESOLVE_CHARACTER_ABILITY',
                    characterKey: 'bart_cassidy',
                    sourceId: reactor.id,
                    targetId: null,
                });
                dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
            }, 1000);

            return () => clearTimeout(timeDelay);
        }

        if (
            G.phase === 'jesse_jones' &&
            reactor &&
            !reactor.isHuman &&
            currentCardPicker &&
            !currentCardPicker.isHuman &&
            currentCardPickerTarget
        ) {
            const timeDelay = setTimeout(async () => {
                dispatch({
                    type: 'SET_ACTION_PROCESSING',
                    id: currentAction.id,
                });

                const picked = aiPickCardFrom(
                    G,
                    currentCardPickerTarget,
                    currentCardPicker,
                    null,
                    true,
                );
                if (picked !== null) {
                    dispatch({
                        type: 'TRIGGER_FLOAT',
                        cardKey: 'ability',
                        fromId: currentCardPickerTarget.id,
                        toId: currentCardPicker.id,
                    });

                    await wait(300);

                    dispatch({
                        type: 'TRIGGER_FLOAT',
                        cardKey: 'bang',
                        fromId: 'deck',
                        toId: currentCardPicker.id,
                        count: 1,
                    });

                    await wait(1000);

                    dispatch({
                        type: 'RESOLVE_CHARACTER_ABILITY',
                        characterKey: 'jesse_jones',
                        sourceId: currentCardPicker.id,
                        targetId: currentCardPickerTarget.id,
                        payload: { cardPick: picked },
                    });
                }
                dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
            }, 1000);

            return () => clearTimeout(timeDelay);
        }

        if (
            G.phase === 'pedro_ramirez' &&
            reactor &&
            G.discardPile.length > 0
        ) {
            const timeDelay = setTimeout(async () => {
                dispatch({
                    type: 'SET_ACTION_PROCESSING',
                    id: currentAction.id,
                });

                dispatch({
                    type: 'TRIGGER_FLOAT',
                    cardKey: G.discardPile[G.discardPile.length - 1],
                    fromId: 'discard',
                    toId: reactor.id,
                    count: 1,
                });

                await wait(300);

                dispatch({
                    type: 'TRIGGER_FLOAT',
                    cardKey: 'bang',
                    fromId: 'deck',
                    toId: reactor.id,
                    count: 1,
                });

                await wait(1000);

                dispatch({
                    type: 'RESOLVE_CHARACTER_ABILITY',
                    characterKey: 'pedro_ramirez',
                    sourceId: reactor.id,
                    targetId: null,
                });
                dispatch({ type: 'RESOLVE_ACTION', id: currentAction.id });
            }, 1000);

            return () => clearTimeout(timeDelay);
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
