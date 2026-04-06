import ActionButtons from '@/components/ActionButtons';
import CardPicker from '@/components/CardPicker';
import DistanceMap from '@/components/DistanceMap';
import GameTable from '@/components/GameTable';
import GeneralStorePicker from '@/components/GeneralStorePicker';
import PhaseBar from '@/components/PhaseBar';
import PlayerHand from '@/components/PlayerHand';
import RoleBanner from '@/components/RoleBanner';
import { CARD_DEFS } from '@/definitions/cards';
import {
    floatCard,
    getPlayerEl,
    popupOnPlayer,
    showBanner,
} from '@/game/animation';
import { checkBang, checkMissed } from '@/game/combat';
import { resolveGeneralStore } from '@/game/general-store';
import { initGame } from '@/game/init';
import { gameReducer } from '@/gameReducer';
import { CardKey, CardPick, FlashMap } from '@/types';
import { useCallback, useReducer, useRef } from 'react';

export default function App() {
    const [G, dispatch] = useReducer(gameReducer, null, initGame);
    const human = G.players[0];
    const flashMapRef = useRef<FlashMap>({});

    const GRef = useRef(G);
    GRef.current = G;

    const handlePlayerClick = useCallback((id: number) => {
        // will wire up later
        console.log('player clicked', id);
    }, []);

    // human picks a card from general store
    const handleGeneralStorePick = useCallback(
        (key: CardKey) => {
            const state = GRef.current;
            if (!state.generalStorePicking) return;
            const idx = state.generalStoreCards.indexOf(key);
            if (idx < 0) return;

            const newState = structuredClone(state);
            newState.generalStoreCards.splice(idx, 1);
            newState.players[0].hand.push(key);
            newState.log = [
                `You pick ${CARD_DEFS[key]?.name || key} from General Store.`,
                ...newState.log,
            ].slice(0, 25);
            newState.generalStoreResolve?.(key);
            newState.generalStoreResolve = null;
            dispatch({ type: 'SET_STATE', state: newState });
        },
        [dispatch],
    );

    // call resolveGeneralStore
    const handlePlayGeneralStore = useCallback(async () => {
        await resolveGeneralStore(() => GRef.current, dispatch);
    }, [dispatch]);

    const handleCardPickerPick = (picked: CardPick) => {
        if (!G.cardPickerPicking) return;
        G.cardPickerPicking = false;
        G.cardPickerTarget = null;
        G.cardPickerLabel = '';
        G.cardPickerResolve?.(picked);
        G.cardPickerResolve = null;
    };

    const handleCardClick = useCallback(
        (i: number) => {
            if (!G.players[G.turn].isHuman || G.phase !== 'play' || G.targeting)
                return;

            if (G.discardingToEndTurn) {
                dispatch({ type: 'DISCARD_CARD_FROM_HAND', idx: i });
                return;
            }

            dispatch({
                type: 'SET_SELECTED_CARD',
                idx: G.selectedCard === i ? null : i,
            });
        },
        [G, dispatch],
    );

    const handleDraw = useCallback(() => {
        if (!G.players[G.turn].isHuman || G.phase !== 'draw') return;
        dispatch({ type: 'DRAW_CARDS_TO_START_TURN' });
    }, [G, dispatch]);

    const handleAsyncCard = useCallback(
        async (cardKey: CardKey) => {
            // remove card from hand first
            const newState = structuredClone(GRef.current);
            const p = newState.players[0];
            p.hand.splice(newState.selectedCard!, 1);
            newState.selectedCard = null;
            newState.discardPile.push(cardKey);
            dispatch({ type: 'SET_STATE', state: newState });

            switch (cardKey) {
                case 'saloon': {
                    await popupOnPlayer(0, 'saloon', 'saloon-pop');
                    await showBanner(
                        'You play Saloon! All players regain 1 LP.',
                        900,
                    );
                    const healState = structuredClone(GRef.current);
                    healState.players.forEach((q) => {
                        if (q.alive) q.hp = Math.min(q.maxHp, q.hp + 1);
                    });
                    healState.log = [
                        'You play Saloon!',
                        ...healState.log,
                    ].slice(0, 25);
                    dispatch({ type: 'SET_STATE', state: healState });
                    break;
                }
                case 'gatling': {
                    await popupOnPlayer(0, 'gatling', 'gatling-pop');
                    await showBanner('You play Gatling! 💥', 900);
                    // damage each player one by one
                    for (const q of GRef.current.players) {
                        if (q.id === 0 || !q.alive) continue;
                        await floatCard(
                            'gatling',
                            getPlayerEl(0),
                            getPlayerEl(q.id),
                        );
                        // checkMissed needs to dispatch too — see below
                        await checkMissed(
                            GRef.current,
                            q,
                            p,
                            flashMapRef.current,
                        );
                        if (GRef.current.over) break;
                    }
                    break;
                }
                case 'indians': {
                    await showBanner('You play Indians! 🏹', 900);
                    for (const q of GRef.current.players) {
                        if (q.id === 0 || !q.alive) continue;
                        await floatCard(
                            'indians',
                            getPlayerEl(0),
                            getPlayerEl(q.id),
                        );
                        const bi =
                            GRef.current.players[q.id].hand.indexOf('bang');
                        if (bi >= 0) {
                            const s = structuredClone(GRef.current);
                            s.players[q.id].hand.splice(bi, 1);
                            s.discardPile.push('bang');
                            s.log = [
                                `${q.name} plays BANG! to dodge.`,
                                ...s.log,
                            ].slice(0, 25);
                            dispatch({ type: 'SET_STATE', state: s });
                            await popupOnPlayer(q.id, 'bang', 'bang-pop');
                        } else {
                            await checkBang(
                                GRef.current,
                                q,
                                p,
                                flashMapRef.current,
                            );
                        }
                        if (GRef.current.over) break;
                    }
                    break;
                }
                case 'generalstore': {
                    await showBanner('You play General Store! 🏪', 900);
                    await handlePlayGeneralStore();
                    break;
                }
            }
        },
        [dispatch, handlePlayGeneralStore],
    );

    const handlePlayCard = useCallback(async () => {
        if (G.selectedCard === null) return;
        const cardKey = human.hand[G.selectedCard];

        // async cards — handle outside reducer
        if (
            ['gatling', 'indians', 'saloon', 'generalstore'].includes(cardKey)
        ) {
            await handleAsyncCard(cardKey);
            return;
        }

        // sync cards — go through reducer
        dispatch({ type: 'PLAY_CARD' });
    }, [G.selectedCard, handleAsyncCard, human.hand]);

    const handleEndTurn = useCallback(() => {
        dispatch({ type: 'END_TURN' });
    }, [dispatch]);

    return (
        <div id="game">
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

            <RoleBanner human={human} />
            <DistanceMap players={G.players} />
            <PhaseBar G={G} />
            <GameTable
                G={G}
                flashMap={flashMapRef.current}
                onPlayerClick={handlePlayerClick}
            />
            {G.generalStorePicking && (
                <GeneralStorePicker
                    cards={G.generalStoreCards}
                    onPick={(key) => handleGeneralStorePick(key)}
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
        </div>
    );
}
