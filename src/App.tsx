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
import { showBanner, triggerPopup, wait } from '@/game/animation';
import {
    distance,
    inRange,
    isEnemy,
    validateCardFrequencies,
} from '@/game/helpers';
import { initGame } from '@/game/init';
import { gameReducer } from '@/gameReducer';
import { CardKey, CardPick, FlashMap } from '@/types';
import { AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { FloatAnimation } from './components/FloatLayer';
import { BattleLogPanel } from './components/GameLogPanel';
import PopupLayer from './components/PopupLayer';
import { CHARACTER_DEFS } from './definitions/character';
import { aiPickCardFrom, getAIDiscardCard } from './game/ai';
import { getGunScore } from './game/combat';
import { usePhaseResolver } from './game/engine';

export default function App() {
    const [G, dispatch] = useReducer(gameReducer, null, initGame);
    const human = G.players[0];
    const flashMapRef = useRef<FlashMap>({});

    const GRef = useRef(G);
    GRef.current = G;
    const [currentAction] = G.pendingAction;

    const handleDraw = async () => {
        if (!G.players[G.turn].isHuman || G.phase !== 'draw') return;

        const human = G.players[0];
        const isBlackJack = human.character === 'black_jack';

        if (isBlackJack && Math.random() < 0.5) {
            triggerPopup(0, 'ability', 'play', dispatch);
            dispatch({
                type: 'ADD_LOG',
                msg: `${human.name} successfully use ${CHARACTER_DEFS[human.character].name}'s ability! Draw 3 card from the deck.`,
            });
            await wait(1000);

            dispatch({
                type: 'TRIGGER_FLOAT',
                cardKey: 'bang',
                fromId: 'deck',
                toId: 0,
                count: 3,
            });

            await wait(500);

            dispatch({
                type: 'DRAW_CARDS_TO_START_TURN',
                playerId: 0,
                cardNumber: 3,
            });

            return;
        }

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

    const handleCardClick = useCallback(
        (i: number) => {
            const isMyTurn = G.players[G.turn].isHuman && G.phase === 'play';
            const [currentAction] = G.pendingAction;
            const currentReactorId = currentAction?.reactorId[0];
            const isMyTurnToReact = currentReactorId === 0;

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
                state: state,
            });
            if (!state.targeting || state.selectedCard === null) return;

            const p = state.players[0];
            const target = state.players[targetId];
            if (!target.alive || target.isHuman) return;

            const cardKey = p.hand[state.selectedCard];

            // range check for range-dependent cards
            const dist = distance(state.players, 0, targetId);
            let maxReach: number;

            if (cardKey === 'bang') {
                // Bang reach depends on the weapon
                const weapon = human.inPlay
                    .map((k) => CARD_DEFS[k])
                    .find((c) => c?.weapon);
                maxReach = weapon?.range ?? 1;
            } else if (cardKey === 'panic') {
                // Panic reach is ALWAYS 1, ignore the gun!
                maxReach = 1;
            } else {
                maxReach = 10;
            }

            if (dist > maxReach) {
                const s = structuredClone(state);
                s.log = [
                    `${target.name} is out of range! (Distance: ${dist}, Reach: ${maxReach})`,
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
        },
        [dispatch, human.inPlay],
    );

    const handlePlayCard = useCallback(async () => {
        const player = G.players[G.turn];
        const selectedCardKey = G.selectedCard;

        if (selectedCardKey === null) return;
        const cardKey = player.hand[selectedCardKey];

        triggerPopup(player.id, cardKey, 'play', dispatch);
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
    usePhaseResolver(G, dispatch);

    // AI plays
    useEffect(() => {
        const player = G.players[G.turn];
        if (!player.alive || player.isHuman || G.over) return;

        if (G.phase === 'draw') {
            const drawDelay = setTimeout(async () => {
                showBanner(`${player.name}'s turn begins…`, 800);

                const isBlackJack = player.character === 'black_jack';

                if (isBlackJack && Math.random() < 0.5) {
                    triggerPopup(player.id, 'ability', 'play', dispatch);
                    dispatch({
                        type: 'ADD_LOG',
                        msg: `${player.name} successfully use ${CHARACTER_DEFS[player.character].name}'s ability! Draw 3 card from the deck.`,
                    });
                    await wait(1000);

                    dispatch({
                        type: 'TRIGGER_FLOAT',
                        cardKey: 'bang',
                        fromId: 'deck',
                        toId: player.id,
                        count: 3,
                    });

                    await wait(500);

                    dispatch({
                        type: 'DRAW_CARDS_TO_START_TURN',
                        playerId: player.id,
                        cardNumber: 3,
                    });

                    return;
                }

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
            if (player.hand.includes('beer')) {
                if (player.hp < player.maxHp && alivePlayers.length > 2) {
                    const aiDelay = setTimeout(() => {
                        triggerPopup(player.id, 'beer', 'heal', dispatch);
                        dispatch({
                            type: 'PLAY_CARD',
                            cardKey: 'beer',
                            sourceId: player.id,
                            targetId: null,
                        });
                    }, 1500);
                    return () => clearTimeout(aiDelay);
                }
            }

            if (player.hand.includes('saloon')) {
                if (player.hp < player.maxHp) {
                    const aiDelay = setTimeout(() => {
                        // Trigger your beautiful popup!
                        triggerPopup(player.id, 'saloon', 'play', dispatch);

                        dispatch({
                            type: 'PLAY_CARD',
                            cardKey: 'saloon',
                            sourceId: player.id,
                            targetId: null,
                        });
                    }, 1500);
                    return () => clearTimeout(aiDelay);
                }
            }

            if (player.hand.includes('generalstore')) {
                const aiDelay = setTimeout(async () => {
                    triggerPopup(player.id, 'generalstore', 'play', dispatch);

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
                    triggerPopup(player.id, 'stagecoach', 'play', dispatch);

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
                    triggerPopup(player.id, 'wellsfargo', 'play', dispatch);

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

            if (player.hand.includes('mustang')) {
                if (!player.inPlay.includes('mustang')) {
                    const aiDelay = setTimeout(async () => {
                        triggerPopup(player.id, 'mustang', 'play', dispatch);

                        dispatch({
                            type: 'PLAY_CARD',
                            cardKey: 'mustang',
                            sourceId: player.id,
                            targetId: null,
                        });
                    }, 1500);
                    return () => clearTimeout(aiDelay);
                }
            }

            if (player.hand.includes('scope')) {
                if (!player.inPlay.includes('scope')) {
                    const aiDelay = setTimeout(async () => {
                        triggerPopup(player.id, 'scope', 'play', dispatch);

                        dispatch({
                            type: 'PLAY_CARD',
                            cardKey: 'scope',
                            sourceId: player.id,
                            targetId: null,
                        });
                    }, 1500);
                    return () => clearTimeout(aiDelay);
                }
            }

            if (player.hand.includes('barrel')) {
                if (!player.inPlay.includes('barrel')) {
                    const aiDelay = setTimeout(async () => {
                        triggerPopup(player.id, 'barrel', 'play', dispatch);

                        dispatch({
                            type: 'PLAY_CARD',
                            cardKey: 'barrel',
                            sourceId: player.id,
                            targetId: null,
                        });
                    }, 1500);
                    return () => clearTimeout(aiDelay);
                }
            }

            if (player.hand.includes('panic')) {
                const canPlayPanic = (() => {
                    const targets = G.players.filter(
                        (q) =>
                            q.alive &&
                            q.id !== player.id &&
                            inRange(G.players, player.id, q.id, 'panic') &&
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

                    return aiPickCardFrom(G, target, player, 'panic') !== null
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
                            !inRange(G.players, player.id, q.id, 'panic'),
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

                    return aiPickCardFrom(G, target, player, 'catbalou') !==
                        null
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

            const GUNS = Object.entries(CARD_DEFS)
                .filter(([, card]) => card.weapon)
                .map(([key]) => key);
            const gunInHand = player.hand.filter((card) => GUNS.includes(card));
            const gunInPlay = player.inPlay.find((card) => GUNS.includes(card));

            if (gunInHand.length > 0) {
                const bestHandGun = gunInHand.sort((a, b) => {
                    const scoreA = getGunScore(a, player.character);
                    const scoreB = getGunScore(b, player.character);
                    return scoreB - scoreA;
                })[0];

                const currentScore = gunInPlay
                    ? getGunScore(gunInPlay, player.character)
                    : 0;
                const newScore = getGunScore(bestHandGun, player.character);
                if (newScore > currentScore) {
                    const aiDelay = setTimeout(async () => {
                        triggerPopup(player.id, bestHandGun, 'play', dispatch);

                        dispatch({
                            type: 'PLAY_CARD',
                            cardKey: bestHandGun,
                            sourceId: player.id,
                            targetId: null,
                        });
                    }, 1500);
                    return () => clearTimeout(aiDelay);
                }
            }

            if (player.hand.includes('gatling')) {
                const aiDelay = setTimeout(() => {
                    // Trigger your beautiful popup!
                    triggerPopup(player.id, 'gatling', 'play', dispatch);

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
                    triggerPopup(player.id, 'indians', 'play', dispatch);

                    dispatch({
                        type: 'PLAY_CARD',
                        cardKey: 'indians',
                        sourceId: player.id,
                        targetId: null,
                    });
                }, 1500);
                return () => clearTimeout(aiDelay);
            }

            if (player.hand.includes('duel')) {
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

                if (duelTarget && player.hand.includes('bang')) {
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

            if (player.hand.includes('bang')) {
                const canUseBang =
                    !G.bangUsed ||
                    player.inPlay.includes('volcanic') ||
                    player.character === 'willy_the_kid';

                const bangTarget = (() => {
                    const enemies = G.players.filter(
                        (q) =>
                            q.alive &&
                            q.id !== player.id &&
                            isEnemy(G, player.id, q.id) &&
                            inRange(G.players, player.id, q.id, 'bang'),
                    );
                    if (!enemies.length) return false;
                    return enemies.reduce((a, b) => (b.hp < a.hp ? b : a));
                })();

                if (bangTarget && canUseBang) {
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
                    const cardToDiscard = getAIDiscardCard(G, player.id);

                    dispatch({
                        type: 'TRIGGER_FLOAT',
                        cardKey: cardToDiscard,
                        fromId: player.id,
                        toId: 'discard',
                    });

                    await wait(1000);

                    dispatch({
                        type: 'DISCARD_A_CARD_FROM_HAND',
                        playerId: player.id,
                        cardKey: cardToDiscard,
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

    validateCardFrequencies(G);

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
                            <div className="absolute inset-0 z-40 flex items-center justify-center rounded-[100px]">
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

                        {G.cardPickerPicking &&
                            G.cardPickerTarget !== null &&
                            currentAction?.reactorId[0] === human.id && (
                                <div className="absolute inset-0 z-40 flex items-center justify-center rounded-[100px]">
                                    <CardPicker
                                        target={G.players[G.cardPickerTarget]}
                                        label={G.cardPickerLabel}
                                        handOnly={
                                            G.phase === 'el_gringo'
                                                ? true
                                                : false
                                        }
                                        onPick={async (picked) => {
                                            if (
                                                currentAction.type ===
                                                'el_gringo'
                                            ) {
                                                dispatch({
                                                    type: 'TRIGGER_FLOAT',
                                                    cardKey: picked.key,
                                                    fromId: currentAction
                                                        .targetId[0],
                                                    toId: human.id,
                                                });

                                                await wait(1000);
                                                handleCardPickerPick(picked);
                                            } else {
                                                handleCardPickerPick(picked);
                                            }
                                        }}
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
                                triggerPopup(
                                    human.id,
                                    'bang',
                                    'play',
                                    dispatch,
                                );
                                dispatch({
                                    type: 'RESOLVE_DUEL',
                                    playerId: human.id,
                                });
                            }}
                            onDuelingTakeDamage={async () => {
                                triggerPopup(
                                    human.id,
                                    'duel',
                                    'damage',
                                    dispatch,
                                );
                                dispatch({
                                    type: 'TAKE_DAMAGE',
                                    sourceId:
                                        G.pendingAction.filter(
                                            (a) => a.type === 'duel',
                                        )[0].sourceId ?? null,
                                    targetId: human.id,
                                    damageAmount: 1,
                                });
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
