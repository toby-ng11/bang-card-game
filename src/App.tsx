import ActionButtons from '@/components/ActionButtons';
import CardPicker from '@/components/CardPicker';
import DistanceMap from '@/components/DistanceMap';
import GameOverDialog from '@/components/GameOverDialog';
import GameTable from '@/components/GameTable';
import GeneralStorePicker from '@/components/GeneralStorePicker';
import PhaseBar from '@/components/PhaseBar';
import PlayerHand from '@/components/PlayerHand';
import RoleBanner from '@/components/RoleBanner';
import { Toaster } from '@/components/ui/sonner';
import { CARD_DEFS } from '@/definitions/cards';
import { showBanner } from '@/game/animation';
import { checkWin } from '@/game/combat';
import { distance, inRange } from '@/game/helpers';
import { initGame } from '@/game/init';
import { gameReducer } from '@/gameReducer';
import { CardKey, CardPick, FlashMap } from '@/types';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import GameLog from './components/GameLog';
import PopupLayer from './components/PopupLayer';

export default function App() {
    const [G, dispatch] = useReducer(gameReducer, null, initGame);
    const human = G.players[0];
    const flashMapRef = useRef<FlashMap>({});

    const GRef = useRef(G);
    GRef.current = G;

    const handleDraw = () => {
        if (!G.players[G.turn].isHuman || G.phase !== 'draw') return;
        dispatch({ type: 'DRAW_CARDS_TO_START_TURN' });
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
            if (!G.players[G.turn].isHuman || G.phase !== 'play' || G.targeting)
                return;

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
                ].slice(0, 25);
                dispatch({ type: 'SET_STATE', state: s });
                return;
            }

            //triggerPopup(p.id, cardKey, 'play');
            await showBanner(
                `${p.name} play a ${CARD_DEFS[cardKey].name}!`,
                900,
            );

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

        dispatch({
            type: 'PLAY_CARD',
            cardKey: cardKey,
            sourceId: player.id,
            targetId: null,
        });
    }, [G.players, G.selectedCard, G.turn]);

    const handleEndTurn = useCallback(() => {
        dispatch({ type: 'END_TURN' });
    }, [dispatch]);

    const restartGame = useCallback(() => {
        dispatch({ type: 'SET_STATE', state: initGame() });
    }, [dispatch]);

    useEffect(() => {
        const reactor = G.players.find((p) => p.id === G.reactorId[0]);
        console.log(G.reactorId);

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
            }, 1000); // 1 second between beers for dramatic effect

            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'bang' && reactor && !reactor.isHuman) {
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
            }, 1000);

            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'gatling' && reactor && !reactor.isHuman) {
            const aiDelay = setTimeout(() => {
                const hasMissed = reactor.hand.includes('missed');

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
                        damageAmount: 2,
                    });
                }
                dispatch({ type: 'FINISH_ACTION' });
            }, 1000);
            return () => clearTimeout(aiDelay);
        }

        if (G.phase === 'indians' && reactor && !reactor.isHuman) {
            const aiDelay = setTimeout(() => {
                const hasBang = reactor.hand.includes('bang');

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

        const currentPickerId = G.generalStoreOrder?.[G.generalStoreIndex];
        const currentPicker = G.players.find((p) => p.id === currentPickerId);
        if (
            G.phase === 'generalstore' &&
            currentPicker &&
            !currentPicker.isHuman
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
                    playerId: currentPicker.id,
                });

                // Show a quick banner so the human knows what the AI took
                await showBanner(
                    `${currentPicker.name} picks ${CARD_DEFS[pick]?.name || pick}.`,
                    700,
                );
            }, 1200); // Slightly longer delay than reaction to feel more "natural"

            return () => clearTimeout(aiDelay);
        }
    }, [
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

    console.log(G.discardPile);

    return (
        <div id="game" className="flex flex-col gap-4 p-4">
            <div
                id="float-card"
                className="pointer-events-none fixed z-50 flex h-18 w-13 flex-col items-center justify-center rounded-md border border-gray-300 bg-white text-[10px] font-medium opacity-0"
            >
                <div className="fi text-xl" />
                <div id="fc-name" className="text-[9px]" />
            </div>
            <div
                id="action-banner"
                className="pointer-events-none fixed top-14 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-5 py-2 text-[13px] font-medium whitespace-nowrap opacity-0 transition-opacity duration-200"
            />

            <PopupLayer activePopups={G.activePopups} />
            <RoleBanner human={human} />
            <DistanceMap players={G.players} />
            <PhaseBar G={G} />
            <GameTable
                G={G}
                flashMap={flashMapRef.current}
                onPlayerClick={handlePlayerClick}
            />
            {G.phase === 'generalstore' && G.generalStorePicking && (
                <GeneralStorePicker
                    key="general-store-active"
                    cards={G.generalStoreCards}
                    pickerName={currentPicker?.name || 'Unknown'}
                    isHumanPicking={isHumanTurnToPick}
                    onPick={handleGeneralStorePick}
                />
            )}

            {G.cardPickerPicking && G.cardPickerTarget !== null && (
                <CardPicker
                    target={G.players[G.cardPickerTarget]}
                    label={G.cardPickerLabel}
                    onPick={(picked) => handleCardPickerPick(picked)}
                />
            )}
            <PlayerHand
                hand={human.hand}
                currentLP={human.hp}
                selectedCard={G.selectedCard}
                discardingToEndTurn={G.discardingToEndTurn}
                onCardClick={handleCardClick}
            />
            <ActionButtons
                G={G}
                human={human}
                onDraw={handleDraw}
                onTargetPlayer={() =>
                    dispatch({ type: 'SET_TARGETING', targeting: true })
                }
                onPlayCard={handlePlayCard}
                onCancelTarget={() =>
                    dispatch({ type: 'SET_TARGETING', targeting: false })
                }
                onEndTurn={handleEndTurn}
            />
            <GameLog log={G.log} />
            <GameOverDialog G={G} onPlayAgain={restartGame} />
            <Toaster position="top-center" richColors />
        </div>
    );
}
