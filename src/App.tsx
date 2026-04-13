import ActionButtons from '@/components/ActionButtons';
import CardPicker from '@/components/CardPicker';
import GameOverDialog from '@/components/GameOverDialog';
import GameTable from '@/components/GameTable';
import GeneralStorePicker from '@/components/GeneralStorePicker';
import PhaseBar from '@/components/PhaseBar';
import PlayerHand from '@/components/PlayerHand';
import RoleBanner from '@/components/RoleBanner';
import { Toaster } from '@/components/ui/sonner';
import { CARD_DEFS } from '@/definitions/cards';
import { showBanner, wait } from '@/game/animation';
import { checkWin } from '@/game/combat';
import { distance, inRange, isEnemy } from '@/game/helpers';
import { initGame } from '@/game/init';
import { gameReducer } from '@/gameReducer';
import { CardKey, CardPick, FlashMap } from '@/types';
import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { FloatAnimation } from './components/FloatLayer';
import { BattleLogPanel } from './components/GameLogPanel';
import PopupLayer from './components/PopupLayer';
import { aiPickCardFrom } from './game/ai';

export default function App() {
    const [G, dispatch] = useReducer(gameReducer, null, initGame);
    const human = G.players[0];
    const flashMapRef = useRef<FlashMap>({});

    const GRef = useRef(G);
    GRef.current = G;

    const handleDraw = async () => {
        if (!G.players[G.turn].isHuman || G.phase !== 'draw') return;

        dispatch({
            type: 'TRIGGER_FLOAT',
            cardKey: 'bang',
            fromId: 'deck',
            toId: 0,
            count: 2,
        });

        await wait(500);

        dispatch({ type: 'DRAW_CARDS_TO_START_TURN', playerId: 0 });
    };

    const triggerPopup = (
        pid: number,
        cardKey: CardKey,
        type: 'play' | 'damage' | 'heal' = 'play',
    ) => {
        const id = Math.random().toString();
        dispatch({ type: 'ADD_POPUP', payload: { id, pid, cardKey, type } });

        // Auto-remove after animation finishes
        setTimeout(() => {
            dispatch({ type: 'REMOVE_POPUP', id });
        }, 1500);
    };

    const handleCardClick = useCallback(
        (i: number) => {
            const isMyTurn = G.players[G.turn].isHuman && G.phase === 'play';
            const isMyTurnToReact = G.reactorId[0] === 0;

            if ((!isMyTurn && !isMyTurnToReact) || G.targeting) return;

            if (G.discardingToEndTurn) {
                dispatch({ type: 'DISCARD_TO_END_TURN', idx: i });
                return;
            }

            dispatch({
                type: 'SET_SELECTED_CARD',
                idx: G.selectedCard === i ? null : i,
            });
        },
        [G, dispatch],
    );

    const currentPickerId = G.generalStoreOrder[G.generalStoreIndex];
    const currentPicker = G.players.find((p) => p.id === currentPickerId);
    const isHumanTurnToPick = currentPicker?.isHuman || false;

    // human picks a card from general store
    const handleGeneralStorePick = (cardKey: CardKey) => {
        dispatch({
            type: 'RESOLVE_GENERAL_STORE_PICK',
            cardKey,
            playerId: currentPickerId,
        });
    };

    // call resolveGeneralStore
    //const handlePlayGeneralStore = useCallback(async () => {
    //    await resolveGeneralStore(() => GRef.current, dispatch);
    //}, [dispatch]);

    const handleCardPickerPick = useCallback(
        (picked: CardPick) => {
            dispatch({
                type: 'RESOLVE_CARD_PICK',
                payload: picked,
            });
        },
        [dispatch],
    );

    const handlePlayerClick = useCallback(
        async (targetId: number) => {
            const state = GRef.current;
            console.log('handlePlayerClick', {
                targeting: state.targeting,
                selectedCard: state.selectedCard,
                targetId,
                hand: state.players[targetId].hand,
                bangUsed: state.bangUsed,
                alive: state.players[targetId].alive,
                cardPick: state.cardPickerTarget,
            });
            if (!state.targeting || state.selectedCard === null) return;

            const p = state.players[0];
            const target = state.players[targetId];
            if (!target.alive || target.isHuman) return;

            const cardKey = p.hand[state.selectedCard];

            // range check for range-dependent cards
            const needsRange = ['bang', 'panic'].includes(cardKey);
            if (needsRange && !inRange(state.players, 0, targetId)) {
                const s = structuredClone(state);
                s.log = [
                    `${target.name} is out of range! (distance ${distance(state.players, 0, targetId)})`,
                    ...s.log,
                ];
                dispatch({ type: 'SET_STATE', state: s });
                return;
            }

            const needsCards = ['catbalou', 'panic'].includes(cardKey);
            if (
                needsCards &&
                target.hand.length === 0 &&
                target.inPlay.length === 0
            ) {
                const s = structuredClone(state);
                s.log = [`${target.name} has no card!`, ...s.log];
                dispatch({ type: 'SET_STATE', state: s });
                return;
            }

            //triggerPopup(p.id, cardKey, 'play');
            await showBanner(
                `${p.name} play a ${CARD_DEFS[cardKey].name}!`,
                900,
            );

            dispatch({
                type: 'TRIGGER_FLOAT',
                cardKey: cardKey,
                fromId: p.id,
                toId: target.id,
            });

            await wait(1000);

            dispatch({
                type: 'PLAY_CARD',
                cardKey: cardKey,
                sourceId: p.id,
                targetId: targetId,
            });

            // check win after any targeted action
            const afterAction = checkWin(GRef.current);
            if (afterAction.over) {
                dispatch({ type: 'SET_STATE', state: afterAction });
            }
        },
        [dispatch],
    );

    const handlePlayCard = useCallback(async () => {
        const player = G.players[G.turn];
        const selectedCardKey = G.selectedCard;

        if (selectedCardKey === null) return;
        const cardKey = player.hand[selectedCardKey];

        triggerPopup(player.id, cardKey, 'play');
        await showBanner(
            `${player.name} play a ${CARD_DEFS[cardKey].name}!`,
            900,
        );

        if (cardKey === 'stagecoach') {
            dispatch({
                type: 'TRIGGER_FLOAT',
                cardKey: 'bang',
                fromId: 'deck',
                toId: 0,
                count: 2,
            });
            await wait(1000);
        }

        if (cardKey === 'wellsfargo') {
            dispatch({
                type: 'TRIGGER_FLOAT',
                cardKey: 'bang',
                fromId: 'deck',
                toId: 0,
                count: 3,
            });
            await wait(1000);
        }

        dispatch({
            type: 'PLAY_CARD',
            cardKey: cardKey,
            sourceId: player.id,
            targetId: null,
        });
    }, [G.players, G.selectedCard, G.turn]);

    const handleEndTurn = useCallback(() => {
        dispatch({ type: 'END_TURN', playerId: human.id });
    }, [dispatch, human.id]);

    const handleCancelEndTurn = useCallback(() => {
        dispatch({ type: 'CANCEL_END_TURN', playerId: human.id });
    }, [dispatch, human.id]);

    const restartGame = useCallback(() => {
        dispatch({ type: 'SET_STATE', state: initGame() });
    }, [dispatch]);

    // Auto effects
    useEffect(() => {
        const reactor = G.players.find((p) => p.id === G.reactorId[0]);

        if (G.phase === 'dying' && reactor && !reactor.isHuman) {
            const aiDelay = setTimeout(() => {
                const hasBeer = reactor.hand.includes('beer');

                if (hasBeer) {
                    // AI chugs a beer
                    triggerPopup(reactor.id, 'beer', 'heal');
                    dispatch({
                        type: 'DRINK_BEER_TO_SURVIVE',
                        playerId: reactor.id,
                        prevPhase: G.pendingAction?.type
                            ? G.pendingAction?.type
                            : 'play',
                    });
                } else {
                    // No more beers and HP <= 0? Dead.
                    dispatch({
                        type: 'TAKE_DAMAGE',
                        sourceId: G.pendingAction?.sourceId ?? null,
                        targetId: reactor.id,
                        damageAmount: 999,
                    });
                }

                dispatch({ type: 'FINISH_ACTION' });
            }, 1000); // 1 second between beers for dramatic effect

            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'bang' && reactor) {
            const aiDelay = setTimeout(async () => {
                const hasMissed = reactor.hand.includes('missed');
                if (hasMissed) {
                    triggerPopup(reactor.id, 'missed', 'play');
                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: 'missed',
                        sourceId: reactor.id,
                        targetId: G.pendingAction?.targetId ?? null,
                    });
                } else {
                    triggerPopup(reactor.id, 'bang', 'damage');
                    dispatch({
                        type: 'TAKE_DAMAGE',
                        sourceId: G.pendingAction?.sourceId ?? null,
                        targetId: reactor.id,
                        damageAmount: 1,
                    });
                }
                dispatch({ type: 'FINISH_ACTION' });
            }, 1000);

            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'gatling' && reactor) {
            const aiDelay = setTimeout(async () => {
                const hasMissed = reactor.hand.includes('missed');
                const sourceId = G.pendingAction?.sourceId;

                if (sourceId !== undefined) {
                    dispatch({
                        type: 'TRIGGER_FLOAT',
                        cardKey: 'gatling',
                        fromId: sourceId,
                        toId: reactor.id,
                    });
                }

                await wait(1000);

                if (hasMissed) {
                    // Trigger your beautiful popup!
                    triggerPopup(reactor.id, 'missed', 'play');

                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: 'missed',
                        sourceId: reactor.id,
                        targetId: G.pendingAction?.targetId ?? null,
                    });
                } else {
                    // Take damage popup
                    triggerPopup(reactor.id, 'gatling', 'damage');

                    dispatch({
                        type: 'TAKE_DAMAGE',
                        sourceId: G.pendingAction?.sourceId ?? null,
                        targetId: reactor.id,
                        damageAmount: 1,
                    });
                }
                dispatch({ type: 'FINISH_ACTION' });
            }, 1000);
            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'indians' && reactor) {
            const aiDelay = setTimeout(async () => {
                const hasBang = reactor.hand.includes('bang');
                const sourceId = G.pendingAction?.sourceId;

                if (sourceId !== undefined) {
                    dispatch({
                        type: 'TRIGGER_FLOAT',
                        cardKey: 'gatling',
                        fromId: sourceId,
                        toId: reactor.id,
                    });
                }

                await wait(1000);

                if (hasBang) {
                    // Trigger your beautiful popup!
                    triggerPopup(reactor.id, 'bang', 'play');

                    dispatch({
                        type: 'RESOLVE_INDIANS',
                        playerId: reactor.id,
                    });
                } else {
                    // Take damage popup
                    triggerPopup(reactor.id, 'indians', 'damage');

                    dispatch({
                        type: 'TAKE_DAMAGE',
                        sourceId: G.pendingAction?.sourceId ?? null,
                        targetId: reactor.id,
                        damageAmount: 1,
                    });
                }

                dispatch({ type: 'FINISH_ACTION' });
            }, 1000);
            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'duel' && reactor && !reactor.isHuman) {
            const aiDelay = setTimeout(() => {
                const hasBang = reactor.hand.includes('bang');

                if (hasBang) {
                    // Trigger your beautiful popup!
                    triggerPopup(reactor.id, 'bang', 'play');

                    dispatch({
                        type: 'RESOLVE_DUEL',
                        playerId: reactor.id,
                    });
                } else {
                    // Take damage popup
                    triggerPopup(reactor.id, 'duel', 'damage');

                    dispatch({
                        type: 'TAKE_DAMAGE',
                        sourceId: G.pendingAction?.sourceId ?? null,
                        targetId: reactor.id,
                        damageAmount: 1,
                    });
                }

                dispatch({ type: 'FINISH_ACTION' });
            }, 1000);
            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'saloon' && reactor) {
            const aiDelay = setTimeout(() => {
                // Trigger your beautiful popup!
                triggerPopup(reactor.id, 'beer', 'heal');

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

                dispatch({ type: 'FINISH_ACTION' });
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
            const aiDelay = setTimeout(async () => {
                // AI Logic: Priority is 'bang', otherwise take the first available card
                const availableCards = G.generalStoreCards;
                if (!availableCards || availableCards.length === 0) return;

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

        const currentCardPickerId = G.pendingAction?.sourceId;
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
            const aiDelay = setTimeout(async () => {
                const picked = aiPickCardFrom(
                    G,
                    currentCardPickerTarget,
                    currentCardPicker,
                );

                if (picked !== null) {
                    dispatch({
                        type: 'RESOLVE_CARD_PICK',
                        payload: picked,
                    });

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
                }
            }, 1200); // Slightly longer delay than reaction to feel more "natural"

            return () => clearTimeout(aiDelay);
        }
    }, [
        G,
        G.phase,
        G.reactorId,
        G.players,
        G.pendingAction?.type,
        G.pendingAction?.sourceId,
        G.pendingAction?.targetId,
        G.generalStoreCards,
        G.generalStoreIndex,
        G.generalStoreOrder,
    ]);

    // AI plays
    useEffect(() => {
        const player = G.players[G.turn];
        if (!player.alive || player.isHuman || G.over) return;

        if (G.phase === 'draw') {
            const drawDelay = setTimeout(async () => {
                showBanner(`${player.name}'s turn begins…`, 800);

                dispatch({
                    type: 'TRIGGER_FLOAT',
                    cardKey: 'bang',
                    fromId: 'deck',
                    toId: player.id,
                    count: 2,
                });

                await wait(500);

                dispatch({
                    type: 'DRAW_CARDS_TO_START_TURN',
                    playerId: player.id,
                });
            }, 1000);
            return () => {
                clearTimeout(drawDelay);
            };
        }

        const alivePlayers = G.players.filter((p) => p.alive);
        if (G.phase === 'play') {
            if (
                player.hp <= 2 &&
                alivePlayers.length > 2 &&
                player.hand.includes('beer')
            ) {
                const aiDelay = setTimeout(() => {
                    triggerPopup(player.id, 'beer', 'heal');
                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: 'beer',
                        sourceId: player.id,
                        targetId: null,
                    });
                }, 1500);
                return () => clearTimeout(aiDelay);
            }

            if (player.hp < player.maxHp && player.hand.includes('saloon')) {
                const aiDelay = setTimeout(() => {
                    // Trigger your beautiful popup!
                    triggerPopup(player.id, 'saloon', 'play');

                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: 'saloon',
                        sourceId: player.id,
                        targetId: null,
                    });
                }, 1500);
                return () => clearTimeout(aiDelay);
            }

            if (player.hand.includes('generalstore')) {
                const aiDelay = setTimeout(async () => {
                    triggerPopup(player.id, 'generalstore', 'play');

                    await wait(1000);

                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: 'generalstore',
                        sourceId: player.id,
                        targetId: null,
                    });
                }, 1500);
                return () => clearTimeout(aiDelay);
            }

            if (player.hand.includes('stagecoach')) {
                const aiDelay = setTimeout(async () => {
                    triggerPopup(player.id, 'stagecoach', 'play');

                    await wait(1000);

                    dispatch({
                        type: 'TRIGGER_FLOAT',
                        cardKey: 'bang',
                        fromId: 'deck',
                        toId: player.id,
                        count: 2,
                    });

                    await wait(1000);

                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: 'stagecoach',
                        sourceId: player.id,
                        targetId: null,
                    });
                }, 1500);
                return () => clearTimeout(aiDelay);
            }

            if (player.hand.includes('wellsfargo')) {
                const aiDelay = setTimeout(async () => {
                    triggerPopup(player.id, 'wellsfargo', 'play');

                    await wait(1000);

                    dispatch({
                        type: 'TRIGGER_FLOAT',
                        cardKey: 'bang',
                        fromId: 'deck',
                        toId: player.id,
                        count: 3,
                    });

                    await wait(1000);

                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: 'wellsfargo',
                        sourceId: player.id,
                        targetId: null,
                    });
                }, 1500);
                return () => clearTimeout(aiDelay);
            }

            if (
                player.hand.includes('mustang') &&
                !player.inPlay.includes('mustang')
            ) {
                const aiDelay = setTimeout(async () => {
                    triggerPopup(player.id, 'mustang', 'play');

                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: 'mustang',
                        sourceId: player.id,
                        targetId: null,
                    });
                }, 1500);
                return () => clearTimeout(aiDelay);
            }

            if (
                player.hand.includes('scope') &&
                !player.inPlay.includes('scope')
            ) {
                const aiDelay = setTimeout(async () => {
                    triggerPopup(player.id, 'scope', 'play');

                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: 'scope',
                        sourceId: player.id,
                        targetId: null,
                    });
                }, 1500);
                return () => clearTimeout(aiDelay);
            }

            if (player.hand.includes('panic')) {
                const canPlayPanic = (() => {
                    const targets = G.players.filter(
                        (q) =>
                            q.alive &&
                            q.id !== player.id &&
                            inRange(G.players, player.id, q.id) &&
                            (q.hand.length > 0 || q.inPlay.length > 0),
                    );
                    if (!targets.length) return false;

                    const enemies = targets.filter((q) =>
                        isEnemy(G, player.id, q.id),
                    );
                    const pool = enemies.length ? enemies : targets;
                    const inPlayTargets = pool.filter(
                        (q) => q.inPlay.length > 0,
                    );
                    const target = inPlayTargets.length
                        ? inPlayTargets[
                              Math.floor(Math.random() * inPlayTargets.length)
                          ]
                        : pool[Math.floor(Math.random() * pool.length)];

                    return aiPickCardFrom(G, target, player) !== null
                        ? target
                        : false;
                })();

                if (canPlayPanic) {
                    const target = canPlayPanic;
                    const aiDelay = setTimeout(async () => {
                        dispatch({
                            type: 'TRIGGER_FLOAT',
                            cardKey: 'panic',
                            fromId: player.id,
                            toId: target.id,
                        });

                        await wait(1000);

                        dispatch({
                            type: 'PLAY_CARD',
                            cardKey: 'panic',
                            sourceId: player.id,
                            targetId: target.id,
                        });
                    }, 1200);
                    return () => clearTimeout(aiDelay);
                }
            }

            if (player.hand.includes('catbalou')) {
                const canPlayCatbalou = (() => {
                    const targets = G.players.filter(
                        (q) =>
                            q.alive &&
                            q.id !== player.id &&
                            (q.hand.length > 0 || q.inPlay.length > 0),
                    );
                    if (!targets.length) return false;

                    const enemies = targets.filter((q) =>
                        isEnemy(G, player.id, q.id),
                    );
                    const pool = enemies.length ? enemies : targets;

                    const mustangBlockers = pool.filter(
                        (q) =>
                            q.inPlay.includes('mustang') &&
                            !inRange(G.players, player.id, q.id),
                    );
                    const inPlayTargets = pool.filter(
                        (q) => q.inPlay.length > 0,
                    );
                    const target = mustangBlockers.length
                        ? mustangBlockers[
                              Math.floor(Math.random() * mustangBlockers.length)
                          ]
                        : inPlayTargets.length
                          ? inPlayTargets[
                                Math.floor(Math.random() * inPlayTargets.length)
                            ]
                          : pool[Math.floor(Math.random() * pool.length)];

                    return aiPickCardFrom(G, target, player) !== null
                        ? target
                        : false;
                })();

                if (canPlayCatbalou) {
                    const target = canPlayCatbalou;
                    const aiDelay = setTimeout(async () => {
                        dispatch({
                            type: 'TRIGGER_FLOAT',
                            cardKey: 'catbalou',
                            fromId: player.id,
                            toId: target.id,
                        });

                        await wait(1000);

                        dispatch({
                            type: 'PLAY_CARD',
                            cardKey: 'catbalou',
                            sourceId: player.id,
                            targetId: target.id,
                        });
                    }, 1200);
                    return () => clearTimeout(aiDelay);
                }
                // fall through to discard/end turn
            }

            if (player.hand.includes('gatling')) {
                const aiDelay = setTimeout(() => {
                    // Trigger your beautiful popup!
                    triggerPopup(player.id, 'gatling', 'play');

                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: 'gatling',
                        sourceId: player.id,
                        targetId: null,
                    });
                }, 1500);
                return () => clearTimeout(aiDelay);
            }

            if (player.hand.includes('indians')) {
                const aiDelay = setTimeout(() => {
                    // Trigger your beautiful popup!
                    triggerPopup(player.id, 'indians', 'play');

                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: 'indians',
                        sourceId: player.id,
                        targetId: null,
                    });
                }, 1500);
                return () => clearTimeout(aiDelay);
            }

            if (player.hand.includes('duel') && player.hand.includes('bang')) {
                const duelTarget = (() => {
                    const enemies = G.players.filter(
                        (q) =>
                            q.alive &&
                            q.id !== player.id &&
                            isEnemy(G, player.id, q.id),
                    );
                    if (!enemies.length) return false;
                    return enemies.reduce((a, b) => (b.hp < a.hp ? b : a));
                })();

                if (duelTarget) {
                    const aiDelay = setTimeout(async () => {
                        dispatch({
                            type: 'TRIGGER_FLOAT',
                            cardKey: 'duel',
                            fromId: player.id,
                            toId: duelTarget.id,
                        });

                        await wait(1000);

                        dispatch({
                            type: 'PLAY_CARD',
                            cardKey: 'duel',
                            sourceId: player.id,
                            targetId: duelTarget.id,
                        });
                    }, 1200);
                    return () => {
                        clearTimeout(aiDelay);
                    };
                }
            }

            if (player.hand.includes('bang') && !G.bangUsed) {
                const bangTarget = (() => {
                    const enemies = G.players.filter(
                        (q) =>
                            q.alive &&
                            q.id !== player.id &&
                            isEnemy(G, player.id, q.id) &&
                            inRange(G.players, player.id, q.id),
                    );
                    if (!enemies.length) return false;
                    return enemies.reduce((a, b) => (b.hp < a.hp ? b : a));
                })();

                if (bangTarget) {
                    const aiDelay = setTimeout(async () => {
                        dispatch({
                            type: 'TRIGGER_FLOAT',
                            cardKey: 'bang',
                            fromId: player.id,
                            toId: bangTarget.id,
                        });

                        await wait(1000);

                        dispatch({
                            type: 'PLAY_CARD',
                            cardKey: 'bang',
                            sourceId: player.id,
                            targetId: bangTarget.id,
                        });
                    }, 1200);
                    return () => clearTimeout(aiDelay);
                }
            }

            const maxCards = player.hp;
            if (player.hand.length > maxCards) {
                const aiDelay = setTimeout(async () => {
                    const cardIdx = Math.floor(
                        Math.random() * player.hand.length,
                    );
                    const cardKey = player.hand[cardIdx];

                    dispatch({
                        type: 'TRIGGER_FLOAT',
                        cardKey: cardKey,
                        fromId: player.id,
                        toId: 'discard',
                    });

                    await wait(1000);

                    dispatch({
                        type: 'DISCARD_A_CARD_FROM_HAND',
                        playerId: player.id,
                        cardKey: cardKey,
                    });
                }, 1500);
                return () => {
                    clearTimeout(aiDelay);
                };
            } else {
                const aiDelay = setTimeout(async () => {
                    await showBanner(`${player.name} ends their turn.`, 800);
                    dispatch({ type: 'END_TURN', playerId: player.id });
                }, 1500);
                return () => {
                    clearTimeout(aiDelay);
                };
            }
        }
    }, [G, G.over, G.phase, G.players, G.turn, G.generalStoreCards]);

    console.log(G.discardPile);
    console.log(G.reactorId);

    return (
        <div
            id="game"
            className="relative min-h-screen w-full overflow-hidden bg-[#1a0f0a] font-sans text-stone-200"
        >
            <div className="pointer-events-none absolute inset-0 bg-[url('/wood-texture.png')] opacity-20 mix-blend-overlay" />
            <div className="bg-radial-gradient(circle_at_center, transparent 0%, rgba(0,0,0,0.4) 100%) absolute inset-0" />

            <PopupLayer activePopups={G.activePopups} />

            {G.floatingCard && (
                <FloatAnimation
                    {...G.floatingCard}
                    onComplete={() => dispatch({ type: 'CLEAR_FLOAT' })}
                />
            )}

            <header className="fixed top-0 right-0 left-0 z-30 flex items-center justify-between bg-linear-to-b from-black/60 to-transparent p-4">
                <RoleBanner human={human} />
                <div className="flex flex-col items-center gap-2">
                    <PhaseBar G={G} />
                    {/*<DistanceMap players={G.players} />*/}
                </div>
                <div className="flex gap-2">
                    {/* Quick Settings or Menu buttons could go here */}
                </div>
            </header>

            <main className="relative flex h-screen flex-col items-center justify-center px-4 pt-32 pb-64">
                <div className="relative flex aspect-video w-full max-w-6xl items-center justify-center rounded-[100px] border-4 border-amber-900/20 bg-[#2a1810]/40 p-12 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
                    <GameTable
                        G={G}
                        flashMap={flashMapRef.current}
                        onPlayerClick={handlePlayerClick}
                    />

                    <AnimatePresence>
                        {G.phase === 'generalstore' && (
                            <div className="absolute inset-0 z-40 flex items-center justify-center rounded-[100px] backdrop-blur-md">
                                <GeneralStorePicker
                                    key="general-store-active"
                                    cards={G.generalStoreCards}
                                    pickerName={
                                        currentPicker?.name || 'Unknown'
                                    }
                                    isHumanPicking={isHumanTurnToPick}
                                    onPick={handleGeneralStorePick}
                                />
                            </div>
                        )}

                        {G.cardPickerPicking && G.cardPickerTarget !== null && (
                            <div className="absolute inset-0 z-40 flex items-center justify-center rounded-[100px] backdrop-blur-md">
                                <CardPicker
                                    target={G.players[G.cardPickerTarget]}
                                    label={G.cardPickerLabel}
                                    onPick={(picked) =>
                                        handleCardPickerPick(picked)
                                    }
                                />
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <BattleLogPanel log={G.log} />

            <footer className="fixed right-0 bottom-0 left-0 z-30 bg-linear-to-t from-black/90 via-black/60 to-transparent px-8 pt-20 pb-6">
                <div className="mx-auto flex max-w-7xl items-end gap-10">
                    {/* Action Buttons Column */}
                    <div className="mb-2 flex min-w-55 flex-col gap-3 border-r border-amber-900/30 pr-10">
                        <div className="px-2">
                            <h3 className="text-[10px] font-bold tracking-[0.2em] text-amber-500 uppercase opacity-60">
                                Player Commands
                            </h3>
                        </div>
                        <ActionButtons
                            G={G}
                            human={human}
                            onDraw={handleDraw}
                            onTargetPlayer={() =>
                                dispatch({
                                    type: 'SET_TARGETING',
                                    targeting: true,
                                })
                            }
                            onPlayCard={handlePlayCard}
                            onCancelTarget={() =>
                                dispatch({
                                    type: 'SET_TARGETING',
                                    targeting: false,
                                })
                            }
                            onDuelingDiscardBang={() => {
                                triggerPopup(human.id, 'bang', 'play');
                                dispatch({
                                    type: 'RESOLVE_DUEL',
                                    playerId: human.id,
                                });
                            }}
                            onDuelingTakeDamage={() => {
                                triggerPopup(human.id, 'duel', 'damage');
                                dispatch({
                                    type: 'TAKE_DAMAGE',
                                    sourceId: G.pendingAction?.sourceId ?? null,
                                    targetId: human.id,
                                    damageAmount: 1,
                                });

                                dispatch({ type: 'FINISH_ACTION' });
                            }}
                            onEndTurn={handleEndTurn}
                            onCancelEndTurn={handleCancelEndTurn}
                        />
                    </div>

                    {/* Hand Container */}
                    <div className="group relative flex-1">
                        <div className="absolute -top-6 left-4 rounded-t-lg border-x border-t border-amber-700/50 bg-amber-900/80 px-3 py-1">
                            <span className="text-[10px] font-bold tracking-widest text-amber-200 uppercase">
                                Your Hand — {human.hand.length} Cards
                            </span>
                        </div>
                        <div className="rounded-2xl rounded-tl-none border border-amber-900/40 bg-[#1e110b]/60 p-6 shadow-2xl backdrop-blur-md transition-all duration-300 group-hover:border-amber-700/50 group-hover:bg-[#1e110b]/80">
                            <PlayerHand
                                hand={human.hand}
                                currentLP={human.hp}
                                selectedCard={G.selectedCard}
                                discardingToEndTurn={G.discardingToEndTurn}
                                onCardClick={handleCardClick}
                            />
                        </div>
                    </div>
                </div>
            </footer>

            <GameOverDialog G={G} onPlayAgain={restartGame} />
            <Toaster position="top-center" richColors />
        </div>
    );
}
