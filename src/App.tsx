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
import { checkBang, checkMissed, checkWin, resolveDuel } from '@/game/combat';
import { resolveGeneralStore } from '@/game/general-store';
import { initGame } from '@/game/init';
import { gameReducer } from '@/gameReducer';
import { CardKey, CardPick, FlashMap } from '@/types';
import { useCallback, useReducer, useRef } from 'react';
import GameLog from './components/GameLog';
import GameOverDialog from './components/GameOverDialog';
import { dealN, distance, inRange, waitForCardPick } from './game/helpers';

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

    const handleCardPickerPick = useCallback(
        (picked: CardPick) => {
            const state = GRef.current;
            if (!state.cardPickerPicking) return;
            state.cardPickerResolve?.(picked);
            dispatch({
                type: 'SET_CARD_PICKER',
                picking: false,
                target: null,
                label: '',
                resolve: null,
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

            // remove card from hand
            const initState = structuredClone(state);
            const cardIdx = initState.players[0].hand.indexOf(cardKey);
            initState.players[0].hand.splice(cardIdx, 1);
            initState.selectedCard = null;
            initState.targeting = false;
            initState.discardPile.push(cardKey);
            dispatch({ type: 'SET_STATE', state: initState });

            switch (cardKey) {
                case 'bang': {
                    if (state.bangUsed) {
                        // give card back
                        const s = structuredClone(GRef.current);
                        s.players[0].hand.push(cardKey);
                        s.discardPile.splice(
                            s.discardPile.lastIndexOf(cardKey),
                            1,
                        );
                        s.log = [
                            'Already used BANG! this turn!',
                            ...s.log,
                        ].slice(0, 25);
                        dispatch({ type: 'SET_STATE', state: s });
                        return;
                    }
                    const bangUsedState = structuredClone(GRef.current);
                    bangUsedState.bangUsed = true;
                    dispatch({ type: 'SET_STATE', state: bangUsedState });

                    await floatCard(
                        'bang',
                        getPlayerEl(0),
                        getPlayerEl(targetId),
                    );
                    const afterBang = await checkMissed(
                        GRef.current,
                        target,
                        p,
                        flashMapRef.current,
                    );
                    dispatch({ type: 'SET_STATE', state: afterBang });
                    break;
                }

                case 'panic': {
                    const hasCards =
                        target.hand.length > 0 || target.inPlay.length > 0;
                    if (!hasCards) {
                        const s = structuredClone(GRef.current);
                        s.log = [
                            `${target.name} has no cards.`,
                            ...s.log,
                        ].slice(0, 25);
                        dispatch({ type: 'SET_STATE', state: s });
                        return;
                    }
                    await floatCard(
                        'panic',
                        getPlayerEl(0),
                        getPlayerEl(targetId),
                    );

                    const picked = await waitForCardPick(
                        GRef.current,
                        targetId,
                        `😱 Panic! — choose a card to steal from ${target.name}`,
                        dispatch,
                    );

                    const panicState = structuredClone(GRef.current);
                    const t = panicState.players[targetId];
                    if (picked.source === 'hand') {
                        t.hand.splice(picked.idx, 1);
                    } else {
                        t.inPlay.splice(picked.idx, 1);
                    }
                    panicState.players[0].hand.push(picked.key);
                    await floatCard(
                        picked.key,
                        getPlayerEl(targetId),
                        getPlayerEl(0),
                    );
                    panicState.log = [
                        `You steal ${CARD_DEFS[picked.key]?.name || picked.key} from ${target.name}!`,
                        ...panicState.log,
                    ].slice(0, 25);
                    dispatch({ type: 'SET_STATE', state: panicState });
                    break;
                }

                case 'catbalou': {
                    const hasCards =
                        target.hand.length > 0 || target.inPlay.length > 0;
                    if (!hasCards) {
                        const s = structuredClone(GRef.current);
                        s.log = [
                            `${target.name} has no cards.`,
                            ...s.log,
                        ].slice(0, 25);
                        dispatch({ type: 'SET_STATE', state: s });
                        return;
                    }
                    await floatCard(
                        'catbalou',
                        getPlayerEl(0),
                        getPlayerEl(targetId),
                    );

                    const picked = await waitForCardPick(
                        GRef.current,
                        targetId,
                        `🃏 Cat Balou — choose a card to discard from ${target.name}`,
                        dispatch,
                    );

                    const catState = structuredClone(GRef.current);
                    const t = catState.players[targetId];
                    if (picked.source === 'hand') {
                        t.hand.splice(picked.idx, 1);
                    } else {
                        t.inPlay.splice(picked.idx, 1);
                    }
                    catState.discardPile.push(picked.key);
                    await popupOnPlayer(
                        targetId,
                        picked.key,
                        `${picked.key}-pop`,
                    );
                    catState.log = [
                        `You discard ${CARD_DEFS[picked.key]?.name || picked.key} from ${target.name}!`,
                        ...catState.log,
                    ].slice(0, 25);
                    dispatch({ type: 'SET_STATE', state: catState });
                    break;
                }

                case 'duel': {
                    await floatCard(
                        'duel',
                        getPlayerEl(0),
                        getPlayerEl(targetId),
                    );
                    await showBanner(
                        `You challenge ${target.name} to a Duel! ⚔️`,
                        900,
                    );
                    const afterDuel = await resolveDuel(
                        GRef.current,
                        0,
                        targetId,
                        flashMapRef.current,
                        dispatch,
                    );
                    dispatch({ type: 'SET_STATE', state: afterDuel });
                    break;
                }
            }

            // check win after any targeted action
            const afterAction = checkWin(GRef.current);
            if (afterAction.over) {
                dispatch({ type: 'SET_STATE', state: afterAction });
            }
        },
        [dispatch, flashMapRef],
    );

    const handleAsyncCard = useCallback(
        async (cardKey: CardKey) => {
            // remove card from hand first
            const newState = structuredClone(GRef.current);
            const p = newState.players[0];
            const cardIdx = p.hand.indexOf(cardKey);
            if (cardIdx < 0) return;
            p.hand.splice(cardIdx, 1);
            newState.selectedCard = null;

            const isBlue = CARD_DEFS[cardKey].color === 'blue';

            if (!isBlue) newState.discardPile.push(cardKey);
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
                        const source = GRef.current.players[0];
                        const newState = await checkMissed(
                            GRef.current,
                            q,
                            source,
                            flashMapRef.current,
                        );
                        dispatch({ type: 'SET_STATE', state: newState });
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
                        const source = GRef.current.players[0];
                        const newState = await checkBang(
                            GRef.current,
                            q,
                            source,
                            flashMapRef.current,
                        );
                        dispatch({ type: 'SET_STATE', state: newState });

                        if (GRef.current.over) break;
                    }
                    break;
                }
                case 'generalstore': {
                    await showBanner('You play General Store! 🏪', 900);
                    await handlePlayGeneralStore();
                    break;
                }
                case 'stagecoach': {
                    await Promise.all([
                        popupOnPlayer(0, 'stagecoach', 'stagecoach-pop'),
                        showBanner('You play Stagecoach! 🃏🃏', 900),
                    ]);
                    const { cards, state: afterDraw } = dealN(GRef.current, 2);
                    afterDraw.players[0].hand.push(...cards);
                    afterDraw.log = [
                        'You play Stagecoach! Drew 2 cards.',
                        ...afterDraw.log,
                    ].slice(0, 25);
                    dispatch({ type: 'SET_STATE', state: afterDraw });
                    break;
                }

                case 'wellsfargo': {
                    await Promise.all([
                        popupOnPlayer(0, 'wellsfargo', 'wellsfargo-pop'),
                        showBanner('You play Wells Fargo! 🃏🃏🃏', 900),
                    ]);
                    const { cards, state: afterDraw } = dealN(GRef.current, 3);
                    afterDraw.players[0].hand.push(...cards);
                    afterDraw.log = [
                        'You play Wells Fargo! Drew 3 cards.',
                        ...afterDraw.log,
                    ].slice(0, 25);
                    dispatch({ type: 'SET_STATE', state: afterDraw });
                    break;
                }
                case 'beer': {
                    if (
                        GRef.current.players.filter((q) => q.alive).length <= 2
                    ) {
                        const s = structuredClone(GRef.current);
                        s.log = [
                            'Beer has no effect with 2 players left.',
                            ...s.log,
                        ].slice(0, 25);
                        dispatch({ type: 'SET_STATE', state: s });
                        break;
                    }
                    await popupOnPlayer(0, 'beer', 'beer-pop');
                    await showBanner('You drink Beer! 🍺', 800);
                    const beerState = structuredClone(GRef.current);
                    beerState.players[0].hp = Math.min(
                        beerState.players[0].maxHp,
                        beerState.players[0].hp + 1,
                    );
                    beerState.log = [
                        `You drink Beer → ${beerState.players[0].hp}/${beerState.players[0].maxHp} HP.`,
                        ...beerState.log,
                    ].slice(0, 25);
                    dispatch({ type: 'SET_STATE', state: beerState });
                    break;
                }

                case 'mustang': {
                    await popupOnPlayer(0, 'mustang', 'mustang-pop');
                    await showBanner('You play Mustang! 🐴', 800);
                    const mustangState = structuredClone(GRef.current);
                    mustangState.players[0].inPlay.push('mustang');
                    mustangState.log = [
                        'You play Mustang! Others see you as 1 further away.',
                        ...mustangState.log,
                    ].slice(0, 25);
                    dispatch({ type: 'SET_STATE', state: mustangState });
                    break;
                }

                case 'scope': {
                    await popupOnPlayer(0, 'scope', 'scope-pop');
                    await showBanner('You play Scope! 🔭', 800);
                    const scopeState = structuredClone(GRef.current);
                    scopeState.players[0].inPlay.push('scope');
                    scopeState.log = [
                        'You play Scope! You view others at distance -1.',
                        ...scopeState.log,
                    ].slice(0, 25);
                    dispatch({ type: 'SET_STATE', state: scopeState });
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
    }, [G.selectedCard, handleAsyncCard, human.hand, dispatch]);

    const handleEndTurn = useCallback(() => {
        dispatch({ type: 'END_TURN' });
    }, [dispatch]);

    const restartGame = useCallback(() => {
        dispatch({ type: 'SET_STATE', state: initGame() });
    }, [dispatch]);

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
            <GameLog log={G.log} />
            <GameOverDialog G={G} onPlayAgain={restartGame} />
        </div>
    );
}
