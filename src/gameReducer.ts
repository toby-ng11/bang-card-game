import { CARD_DEFS } from './definitions/cards';
import { CHARACTER_DEFS, CharacterKey } from './definitions/character';
import { dealN } from './game/helpers';
import {
    CardKey,
    CardPick,
    GameState,
    Player,
    PlayerAction,
    Role,
} from './types';

type GameAction =
    | { type: 'SET_STATE'; state: GameState }
    | { type: 'SET_PHASE'; phase: GameState['phase'] }
    | { type: 'SET_SELECTED_CARD'; idx: number | null }
    | { type: 'SET_TARGETING'; targeting: boolean }
    | { type: 'SET_DISCARDING_TO_END_TURN'; value: boolean }
    | { type: 'SET_BANG_USED'; value: boolean }
    | {
          type: 'SET_CARD_PICKER';
          picking: boolean;
          target: number | null;
          label: string;
          resolve: ((p: CardPick) => void) | null;
      }
    | {
          type: 'SET_GENERAL_STORE';
          cards: CardKey[];
          picking: boolean;
          resolve: ((c: CardKey) => void) | null;
      }
    | {
          type: 'ADD_POPUP';
          payload: {
              id: string;
              pid: number;
              cardKey: CardKey;
              type: 'play' | 'damage' | 'heal';
          };
      }
    | { type: 'REMOVE_POPUP'; id: string }
    | {
          type: 'TRIGGER_FLOAT';
          cardKey: CardKey;
          fromId: number | 'deck' | 'discard';
          toId: number | 'deck' | 'discard';
          count?: number;
      }
    | { type: 'CLEAR_FLOAT' }
    | { type: 'ADD_LOG'; msg: string }
    | { type: 'NEXT_TURN' }
    | { type: 'SET_OVER'; winner: GameState['winner'] }
    | { type: 'DISCARD_TO_END_TURN'; idx: number }
    | { type: 'DISCARD_A_CARD_FROM_HAND'; playerId: number; cardKey: CardKey }
    | { type: 'DRAW_CARDS_TO_START_TURN'; playerId: number }
    | {
          type: 'TAKE_DAMAGE';
          sourceId: number | null;
          targetId: number;
          damageAmount: number;
      }
    | { type: 'DRINK_BEER_TO_SURVIVE'; playerId: number }
    | { type: 'HEAL_A_PLAYER'; playerId: number; amount: number }
    | { type: 'RESOLVE_CARD_PICK'; payload: CardPick }
    | { type: 'RESOLVE_GENERAL_STORE_PICK'; cardKey: CardKey; playerId: number }
    | { type: 'RESOLVE_GATLING'; playerId: number }
    | { type: 'RESOLVE_INDIANS'; playerId: number }
    | { type: 'RESOLVE_DUEL'; playerId: number }
    | { type: 'RESOLVE_SALOON'; playerId: number }
    | { type: 'RESOLVE_BARREL'; playerId: number }
    | { type: 'FINISH_ACTION' }
    | {
          type: 'PLAY_CARD';
          cardKey: CardKey;
          sourceId: number;
          targetId: number | null;
      }
    | {
          type: 'RESOLVE_CHARACTER_ABILITY';
          characterKey: CharacterKey;
          sourceId: number;
          targetId: number | null;
      }
    | { type: 'END_TURN'; playerId: number }
    | { type: 'CANCEL_END_TURN'; playerId: number };

function gameReducer(state: GameState, action: GameAction): GameState {
    console.log('REDUCER ACTION:', action);
    console.log('PENDING ACTION:', state.pendingAction);
    switch (action.type) {
        case 'SET_STATE':
            return action.state;

        case 'ADD_LOG': {
            return { ...state, log: [action.msg, ...state.log] };
        }

        case 'ADD_POPUP':
            return {
                ...state,
                activePopups: [...state.activePopups, { ...action.payload }],
            };

        case 'REMOVE_POPUP':
            return {
                ...state,
                activePopups: state.activePopups.filter(
                    (p) => p.id !== action.id,
                ),
            };

        case 'TRIGGER_FLOAT':
            return {
                ...state,
                floatingCard: {
                    cardKey: action.cardKey,
                    fromId: action.fromId,
                    toId: action.toId,
                    count: action.count,
                },
            };
        case 'CLEAR_FLOAT':
            return { ...state, floatingCard: null };

        case 'DRAW_CARDS_TO_START_TURN': {
            const { playerId } = action;
            const { cards, state: newState } = dealN(state, 2);

            return {
                ...newState,
                players: newState.players.map((p) =>
                    p.id === playerId
                        ? { ...p, hand: [...p.hand, ...cards] }
                        : p,
                ),
                phase: 'play',
                bangUsed: false,
                log: [
                    `${newState.players[playerId].name} draws 2 cards.`,
                    ...newState.log,
                ].slice(0, 25),
            };
        }

        case 'SET_PHASE':
            return { ...state, phase: action.phase };

        case 'SET_TARGETING':
            return {
                ...state,
                targeting: action.targeting,
                selectedCard: action.targeting ? state.selectedCard : null,
            };

        case 'SET_SELECTED_CARD':
            return { ...state, selectedCard: action.idx };

        case 'SET_BANG_USED':
            return { ...state, bangUsed: action.value };

        case 'SET_DISCARDING_TO_END_TURN':
            return { ...state, discardingToEndTurn: action.value };

        case 'SET_OVER':
            return { ...state, over: true, winner: action.winner };

        case 'NEXT_TURN': {
            let next = (state.turn + 1) % state.players.length;
            let att = 0;
            while (!state.players[next].alive && att < state.players.length) {
                next = (next + 1) % state.players.length;
                att++;
            }
            return {
                ...state,
                turn: next,
                phase: 'draw',
                bangUsed: false,
                selectedCard: null,
                targeting: false,
                discardingToEndTurn: false,
            };
        }

        case 'SET_CARD_PICKER':
            return {
                ...state,
                cardPickerPicking: action.picking,
                cardPickerTarget: action.target,
                cardPickerLabel: action.label,
                cardPickerResolve: action.resolve,
            };

        case 'SET_GENERAL_STORE':
            return {
                ...state,
                generalStoreCards: action.cards,
                generalStorePicking: action.picking,
                generalStoreResolve: action.resolve,
            };

        case 'DISCARD_TO_END_TURN': {
            const newState = structuredClone(state);
            const player = newState.players[0];
            const discarded = player.hand.splice(action.idx, 1);
            const canEndTurn = player.hand.length <= player.hp;

            let next = (newState.turn + 1) % newState.players.length;
            let att = 0;
            while (
                !newState.players[next].alive &&
                att < newState.players.length
            ) {
                next = (next + 1) % newState.players.length;
                att++;
            }

            return {
                ...newState,
                discardPile: [discarded[0], ...newState.discardPile],
                log: [
                    `You discard ${CARD_DEFS[discarded[0]]?.name || discarded[0]}.`,
                    ...newState.log,
                ],
                discardingToEndTurn: canEndTurn
                    ? false
                    : newState.discardingToEndTurn,
                turn: canEndTurn ? next : newState.turn,
                phase: canEndTurn ? 'draw' : newState.phase,
                bangUsed: canEndTurn ? false : newState.bangUsed,
                selectedCard: null,
                targeting: canEndTurn ? false : newState.targeting,
            };
        }

        case 'DISCARD_A_CARD_FROM_HAND': {
            const { playerId, cardKey } = action;
            const player = state.players[playerId];

            const newPlayerState = removeCardFromHand(cardKey, playerId, state);
            return {
                ...state,
                players: newPlayerState,
                discardPile: [cardKey, ...state.discardPile],
                log: [
                    `${player.name} discard a ${CARD_DEFS[cardKey].name || cardKey}.`,
                    ...state.log,
                ],
            };
        }

        case 'END_TURN': {
            const playerId = action.playerId;
            const player = state.players[playerId];
            if (player.hand.length > player.hp) {
                return {
                    ...state,
                    discardingToEndTurn: true,
                    log: [
                        `${player.name} must discard ${player.hand.length - player.hp} card(s) first before ending turn.`,
                        ...state.log,
                    ],
                };
            }
            // advance turn — same logic as NEXT_TURN
            let next = (state.turn + 1) % state.players.length;
            let att = 0;
            while (!state.players[next].alive && att < state.players.length) {
                next = (next + 1) % state.players.length;
                att++;
            }
            return {
                ...state,
                turn: next,
                phase: 'draw',
                bangUsed: false,
                selectedCard: null,
                targeting: false,
                discardingToEndTurn: false,
                log: [`${player.name} ends turn.`, ...state.log],
            };
        }

        case 'CANCEL_END_TURN': {
            if (!state.discardingToEndTurn) return { ...state };
            const playerId = action.playerId;
            const player = state.players[playerId];

            return {
                ...state,
                discardingToEndTurn: false,
                log: [
                    `${player.name} cancel discard to end turn.`,
                    ...state.log,
                ],
            };
        }

        case 'FINISH_ACTION': {
            const newState = structuredClone(state);
            const [actionToClear, ...updatedActions] = newState.pendingAction;
            const isReacting = actionToClear.reactorId.length > 0;

            return {
                ...newState,
                pendingAction: isReacting
                    ? [...newState.pendingAction]
                    : [...updatedActions],
                phase: isReacting ? newState.phase : 'play',
                selectedCard: null,
            };
        }

        case 'DRINK_BEER_TO_SURVIVE': {
            const newState = structuredClone(state);
            const { playerId } = action;
            const player = newState.players[playerId];

            const newPlayerState = removeCardFromHand(
                'beer',
                playerId,
                newState,
            );
            const applyHeal = newPlayerState.map((p) =>
                p.id === playerId ? { ...p, hp: p.hp + 1 } : { ...p },
            );

            const newHp = player.hp + 1;
            const isNowSafe = newHp > 0;

            const [, ...updatedActions] = newState.pendingAction;
            //const newReactors = newState.reactorId.filter((p) => p !== playerId);

            return {
                ...newState,
                players: applyHeal,
                discardPile: ['beer', ...newState.discardPile],
                // If they are still at 0 (e.g. they took 3 dmg from Dynamite),
                // they stay in 'dying' phase until they play another beer or click 'die'.
                phase: isNowSafe ? updatedActions[0].type : 'dying',
                pendingAction: isNowSafe
                    ? [...updatedActions]
                    : newState.pendingAction,
                log: [
                    `${state.players[playerId].name} drank a beer to stay alive!`,
                    ...state.log,
                ],
            };
        }

        case 'TAKE_DAMAGE': {
            const newState = structuredClone(state);
            const { sourceId, targetId, damageAmount } = action;
            const [currentAction, ...otherActions] = newState.pendingAction;

            if (targetId === null) return newState;

            const updatedPlayers = newState.players.map((p) => {
                if (p.id === targetId) {
                    return { ...p, hp: p.hp - damageAmount };
                }
                return p;
            });

            const targetPlayer = updatedPlayers[targetId];
            const isDying = targetPlayer.hp <= 0;

            const updatedAction = removeReactorFromCurrentAction(
                currentAction,
                targetId,
            );

            if (isDying) {
                const isBeerEffective =
                    newState.players.filter((p) => p.alive).length > 2;
                const hasBeer = targetPlayer.hand.includes('beer');

                if (isBeerEffective && hasBeer) {
                    const newAction: PlayerAction = {
                        type: 'dying',
                        sourceId: targetId,
                        targetId: [],
                        reactorId: [targetId],
                    };

                    return {
                        ...newState,
                        players: updatedPlayers,
                        phase: 'dying',
                        pendingAction: [
                            newAction,
                            currentAction,
                            ...otherActions,
                        ], // They are the one who needs to drink
                        log: [
                            `${targetPlayer.name} is at death's door! Play a Beer?`,
                            ...newState.log,
                        ],
                    };
                } else {
                    // No beer or only 2 players left? They are eliminated immediately.
                    return handleElimination(
                        {
                            ...newState,
                            pendingAction: [updatedAction],
                        },
                        updatedPlayers,
                        targetId,
                        sourceId,
                        updatedAction,
                    );
                }
            }

            return {
                ...newState,
                players: updatedPlayers,
                pendingAction:
                    updatedAction.reactorId.length > 0
                        ? [updatedAction, ...otherActions]
                        : otherActions,
                phase:
                    updatedAction.reactorId.length === 0 &&
                    otherActions.length === 0
                        ? 'play'
                        : currentAction?.type,
                //pendingAction: null,
                log: [
                    `${targetPlayer.name} took ${damageAmount} damage!`,
                    ...newState.log,
                ],
            };
        }

        case 'HEAL_A_PLAYER': {
            const { playerId, amount } = action;
            const player = state.players[playerId];

            const applyHeal = state.players.map((p) =>
                p.id === playerId
                    ? { ...p, hp: Math.min(p.hp + amount, p.maxHp) }
                    : { ...p },
            );

            return {
                ...state,
                players: applyHeal,
                log: [
                    `${player.name} heal ${amount} LP → ${applyHeal[playerId].hp}/${applyHeal[playerId].maxHp} LP.`,
                    ...state.log,
                ],
            };
        }

        case 'RESOLVE_CARD_PICK': {
            const newState = structuredClone(state);
            const [currentAction, ...otherAction] = newState.pendingAction;
            if (
                currentAction?.type !== 'panic' &&
                currentAction?.type !== 'catbalou' &&
                currentAction?.type !== 'el_gringo'
            )
                return { ...newState };
            const { source, idx, key } = action.payload;
            const { sourceId, targetId, type } = currentAction;
            const sourcePlayer = newState.players[sourceId];
            const targetPlayer = newState.players[targetId[0]];

            let updatedPlayers = newState.players.map((p) => {
                if (p.id === targetId[0]) {
                    if (source === 'hand') {
                        const newHand = [...p.hand];
                        // Safety check: ensure idx is valid for this specific player
                        newHand.splice(idx, 1);
                        return { ...p, hand: newHand };
                    } else {
                        const newInPlay = p.inPlay.filter((c) => c !== key);
                        return { ...p, inPlay: newInPlay };
                    }
                }
                return p;
            });

            updatedPlayers = updatedPlayers.map((p) => {
                if (
                    p.id === sourceId &&
                    (type === 'panic' || type === 'el_gringo')
                ) {
                    return { ...p, hand: [...p.hand, key] };
                }
                return p;
            });
            return {
                ...newState,
                players: updatedPlayers,
                discardPile:
                    type === 'catbalou'
                        ? [key, ...newState.discardPile]
                        : newState.discardPile,

                phase: otherAction.length > 0 ? otherAction[0].type : 'play',
                cardPickerPicking: false,
                cardPickerTarget: null,
                pendingAction: [...otherAction],
                log: [
                    `${sourcePlayer.name} ${type === 'catbalou' ? 'discard' : 'stole'} a ${CARD_DEFS[key].name} from ${targetPlayer.name}.`,
                    ...newState.log,
                ],
            };
        }

        case 'RESOLVE_GENERAL_STORE_PICK': {
            const newState = structuredClone(state);
            const { cardKey, playerId } = action;
            const currentPickerId =
                newState.generalStoreOrder[newState.generalStoreIndex];

            if (playerId !== currentPickerId) return newState;

            const newPlayerState = newState.players.map((p) => {
                if (p.id === playerId) {
                    return { ...p, hand: [...p.hand, cardKey] };
                } else return { ...p };
            });

            const newStoreCards = removeElementFromArray(
                cardKey,
                newState.generalStoreCards,
            );

            const nextIndex = newState.generalStoreIndex + 1;
            const isFinished =
                nextIndex >= newState.generalStoreOrder.length ||
                newStoreCards.length === 0;

            return {
                ...newState,
                players: newPlayerState,
                generalStoreCards: newStoreCards,
                generalStoreIndex: nextIndex,
                generalStorePicking: !isFinished,
                phase: isFinished ? 'play' : newState.phase,
                log: [
                    `${newState.players[playerId].name} picked a ${CARD_DEFS[cardKey].name}.`,
                    ...newState.log,
                ],
            };
        }

        case 'RESOLVE_GATLING': {
            const newState = structuredClone(state);
            const [currentAction, ...otherActions] = newState.pendingAction;
            if (currentAction?.type !== 'gatling') return { ...newState };
            const { playerId } = action;

            const updatedAction = removeReactorFromCurrentAction(
                currentAction,
                playerId,
            );

            return {
                ...newState,
                pendingAction:
                    updatedAction.reactorId.length > 0
                        ? [updatedAction, ...otherActions]
                        : otherActions,
                phase:
                    updatedAction.reactorId.length === 0 &&
                    otherActions.length === 0
                        ? 'play'
                        : currentAction?.type,
            };
        }

        case 'RESOLVE_INDIANS': {
            const newState = structuredClone(state);
            const [currentAction, ...otherActions] = newState.pendingAction;
            if (currentAction?.type !== 'indians') return { ...newState };

            const { playerId } = action;
            const newPlayers = removeCardFromHand('bang', playerId, newState);
            const updatedAction = removeReactorFromCurrentAction(
                currentAction,
                playerId,
            );

            return {
                ...newState,
                players: newPlayers,
                discardPile: ['bang', ...newState.discardPile],
                pendingAction:
                    updatedAction.reactorId.length > 0
                        ? [updatedAction, ...otherActions]
                        : otherActions,
                phase:
                    updatedAction.reactorId.length === 0 &&
                    otherActions.length === 0
                        ? 'play'
                        : currentAction?.type,
                log: [
                    `${newState.players[playerId].name} discard a BANG! and dodge.`,
                    ...newState.log,
                ],
            };
        }

        case 'RESOLVE_DUEL': {
            const newState = structuredClone(state);
            const [currentAction, ...otherActions] = newState.pendingAction;
            if (currentAction?.type !== 'duel') return { ...state };
            const { playerId } = action;

            const newPlayers = removeCardFromHand('bang', playerId, state);

            const otherDuelist =
                playerId === currentAction?.sourceId
                    ? currentAction?.targetId[0]
                    : currentAction?.sourceId;

            if (otherDuelist === null) return { ...state };

            const updatedAction = {
                ...currentAction,
                reactorId: [otherDuelist],
            };

            return {
                ...state,
                players: newPlayers,
                discardPile: ['bang', ...state.discardPile],
                pendingAction: [updatedAction, ...otherActions],
                log: [
                    `${state.players[playerId].name} discard a BANG! to stay in the duel.`,
                    ...state.log,
                ],
            };
        }

        case 'RESOLVE_SALOON': {
            const newState = structuredClone(state);
            const [currentAction, ...otherActions] = newState.pendingAction;
            if (currentAction?.type !== 'saloon') return { ...newState };

            const { playerId } = action;
            const updatedAction = removeReactorFromCurrentAction(
                currentAction,
                playerId,
            );

            return {
                ...newState,
                pendingAction:
                    updatedAction.reactorId.length > 0
                        ? [updatedAction, ...otherActions]
                        : otherActions,
                phase:
                    updatedAction.reactorId.length === 0 &&
                    otherActions.length === 0
                        ? 'play'
                        : currentAction?.type,
            };
        }

        case 'RESOLVE_BARREL': {
            const newState = structuredClone(state);
            const [currentAction, ...otherActions] = newState.pendingAction;
            if (
                currentAction?.type !== 'bang' &&
                currentAction?.type !== 'gatling'
            )
                return { ...state };
            const { playerId } = action;
            const updatedAction = removeReactorFromCurrentAction(
                currentAction,
                playerId,
            );

            return {
                ...state,
                pendingAction:
                    updatedAction.reactorId.length > 0
                        ? [updatedAction, ...otherActions]
                        : otherActions,
                phase:
                    updatedAction.reactorId.length === 0 &&
                    otherActions.length === 0
                        ? 'play'
                        : currentAction?.type,
                log: [
                    `${state.players[playerId].name} successfully use Barrel and dodge a BANG!.`,
                    ...state.log,
                ],
            };
        }

        case 'PLAY_CARD': {
            const newState = structuredClone(state);
            const { cardKey, sourceId, targetId } = action;
            const sourcePlayer = newState.players[sourceId];

            if (!sourcePlayer.hand.includes(cardKey)) return newState;
            const cardColor = CARD_DEFS[cardKey].color;
            switch (cardColor) {
                case 'brown': {
                    const newPlayerState = removeCardFromHand(
                        cardKey,
                        sourceId,
                        newState,
                    );

                    const newDiscardPile = [cardKey, ...newState.discardPile];

                    switch (cardKey) {
                        case 'beer': {
                            const isBeerEffective =
                                newState.players.filter((p) => p.alive).length >
                                2;
                            if (!isBeerEffective) {
                                return {
                                    ...newState,
                                    players: newPlayerState,
                                    discardPile: [
                                        'beer',
                                        ...newState.discardPile,
                                    ],
                                    log: [
                                        `${sourcePlayer.name} played a Beer but it has no effect when there are 2 players left!`,
                                        ...newState.log,
                                    ],
                                };
                            } else {
                                const applyHeal = newPlayerState.map((p) =>
                                    p.id === sourceId
                                        ? {
                                              ...p,
                                              hp: Math.min(p.hp + 1, p.maxHp),
                                          }
                                        : { ...p },
                                );

                                return {
                                    ...newState,
                                    players: applyHeal,
                                    discardPile: newDiscardPile,
                                    log: [
                                        `${sourcePlayer.name} played a Beer and heals +1 LP → ${applyHeal[sourceId].hp}/${applyHeal[sourceId].maxHp}.`,
                                        ...newState.log,
                                    ],
                                };
                            }
                        }

                        case 'stagecoach':
                        case 'wellsfargo': {
                            const count = cardKey === 'stagecoach' ? 2 : 3;
                            const { updatedPlayers, updatedState } =
                                handleDrawEffect(
                                    { ...newState, players: newPlayerState },
                                    sourceId,
                                    count,
                                );

                            return {
                                ...updatedState,
                                players: updatedPlayers,
                                discardPile: newDiscardPile,
                                log: [
                                    `${sourcePlayer.name} played ${cardKey === 'stagecoach' ? 'Stagecoach' : 'Wells Fargo'} and drew ${count} cards.`,
                                    ...newState.log,
                                ],
                            };
                        }

                        case 'panic':
                        case 'catbalou': {
                            if (targetId === null) return { ...newState };

                            const targetPlayer = newState.players[targetId];
                            const newAction: PlayerAction = {
                                type: cardKey,
                                sourceId: sourceId,
                                targetId: [targetId],
                                reactorId: [],
                            };

                            return {
                                ...newState,
                                players: newPlayerState,
                                discardPile: newDiscardPile,
                                targeting: false,
                                phase: cardKey,
                                cardPickerPicking: true,
                                cardPickerTarget: targetId,
                                cardPickerLabel:
                                    cardKey === 'panic'
                                        ? `Steal a card from ${targetPlayer.name}`
                                        : `Discard a card from ${targetPlayer.name}`,
                                pendingAction: [newAction],
                                log: [
                                    cardKey === 'panic'
                                        ? `😱 Panic! — ${sourcePlayer.name} is choosing a card to steal from ${targetPlayer.name}.`
                                        : `Catbalou! ${sourcePlayer.name} is choosing a card to discard from ${targetPlayer.name}.`,
                                    ...newState.log,
                                ],
                            };
                        }

                        case 'generalstore': {
                            const alivePlayersCount = newState.players.filter(
                                (p) => p.hp > 0,
                            ).length;
                            const drawnCards = newState.deck.slice(
                                0,
                                alivePlayersCount,
                            );
                            const remainingDeck =
                                newState.deck.slice(alivePlayersCount);

                            const startIndex = newState.players.findIndex(
                                (p) => p.id === sourceId,
                            );
                            const pickOrderIds = [];
                            for (let i = 0; i < newState.players.length; i++) {
                                const player =
                                    newState.players[
                                        (startIndex + i) %
                                            newState.players.length
                                    ];
                                if (player.hp > 0) pickOrderIds.push(player.id);
                            }

                            const newAction: PlayerAction = {
                                type: cardKey,
                                sourceId: sourceId,
                                targetId: [],
                                reactorId: [],
                            };

                            return {
                                ...newState,
                                deck: remainingDeck,
                                discardPile: newDiscardPile,
                                players: newPlayerState,

                                phase: cardKey,
                                generalStoreCards: drawnCards,
                                generalStorePicking: true,
                                generalStoreOrder: pickOrderIds,
                                generalStoreIndex: 0,
                                pendingAction: [newAction],
                                log: [
                                    `${sourcePlayer.name} played a General Store! ${alivePlayersCount} cards revealed.`,
                                    ...newState.log,
                                ],
                            };
                        }

                        case 'bang': {
                            if (targetId === null) return { ...newState };

                            const sourcePlayer = newState.players[sourceId];
                            const hasVolcanic =
                                sourcePlayer.inPlay.includes('volcanic');

                            const isWillyTheKid =
                                sourcePlayer.character === 'willy_the_kid';
                            const targetPlayer = newState.players[targetId];
                            if (
                                newState.bangUsed &&
                                !hasVolcanic &&
                                !isWillyTheKid
                            ) {
                                return {
                                    ...newState,
                                    log: [
                                        `You already used BANG! this turn!`,
                                        ...newState.log,
                                    ],
                                };
                            }

                            const newAction: PlayerAction = {
                                type: cardKey,
                                sourceId: sourceId,
                                targetId: [targetId],
                                reactorId: [targetId],
                            };

                            return {
                                ...newState,
                                players: newPlayerState,
                                discardPile: newDiscardPile,
                                targeting: false,
                                bangUsed: true,
                                phase: 'bang',
                                pendingAction: [newAction],
                                log: [
                                    `${sourcePlayer.name} shot at ${targetPlayer.name}!`,
                                    ...newState.log,
                                ],
                            };
                        }

                        case 'missed': {
                            const [currentAction, ...otherActions] =
                                newState.pendingAction;
                            if (
                                currentAction?.type !== 'bang' &&
                                currentAction?.type !== 'gatling'
                            )
                                return newState;

                            const { sourceId } = action; // The player who is reacting

                            const updatedAction =
                                removeReactorFromCurrentAction(
                                    currentAction,
                                    sourceId,
                                );

                            return {
                                ...newState,
                                players: newPlayerState,
                                discardPile: newDiscardPile,
                                pendingAction:
                                    updatedAction.reactorId.length > 0
                                        ? [updatedAction, ...otherActions]
                                        : otherActions,
                                phase:
                                    updatedAction.reactorId.length === 0 &&
                                    otherActions.length === 0
                                        ? 'play'
                                        : currentAction?.type,
                                log: [
                                    `${newState.players[sourceId].name} played a Missed! and dodge the shot!`,
                                    ...newState.log,
                                ],
                            };
                        }

                        case 'indians':
                        case 'gatling': {
                            const startIndex = newState.players.findIndex(
                                (p) => p.id === sourceId,
                            );
                            const newReactors = [];
                            for (let i = 0; i < newState.players.length; i++) {
                                const player =
                                    newState.players[
                                        (startIndex + i) %
                                            newState.players.length
                                    ];
                                if (player.hp > 0 && player.id !== sourceId)
                                    newReactors.push(player.id);
                            }

                            const newAction: PlayerAction = {
                                type: cardKey,
                                sourceId: sourceId,
                                targetId: newReactors,
                                reactorId: newReactors,
                            };

                            return {
                                ...newState,
                                players: newPlayerState,
                                discardPile: newDiscardPile,
                                //bangUsed: true, doesnt count as BANG!
                                phase: cardKey,
                                pendingAction: [newAction],
                                log: [
                                    cardKey === 'gatling'
                                        ? `${sourcePlayer.name} play Gatling! Everyone must Missed! or lose 1 LP.`
                                        : `${sourcePlayer.name} play Indians! Everyone must discard a BANG! card or lose 1 LP.`,
                                    ...newState.log,
                                ],
                            };
                        }

                        case 'duel': {
                            if (targetId === null) return { ...newState };

                            const targetPlayer = newState.players[targetId];
                            const newAction: PlayerAction = {
                                type: cardKey,
                                sourceId: sourceId,
                                targetId: [targetId],
                                reactorId: [targetId],
                            };

                            return {
                                ...newState,
                                players: newPlayerState,
                                discardPile: newDiscardPile,
                                targeting: false,
                                phase: cardKey,
                                pendingAction: [newAction],
                                log: [
                                    `${sourcePlayer.name} challenges ${targetPlayer.name} to a Duel!`,
                                    ...newState.log,
                                ],
                            };
                        }

                        case 'saloon': {
                            const startIndex = newState.players.findIndex(
                                (p) => p.id === sourceId,
                            );
                            const newReactors = [];
                            for (let i = 0; i < newState.players.length; i++) {
                                const player =
                                    newState.players[
                                        (startIndex + i) %
                                            newState.players.length
                                    ];
                                if (player.hp > 0) newReactors.push(player.id);
                            }

                            const newAction: PlayerAction = {
                                type: cardKey,
                                sourceId: sourceId,
                                targetId: [],
                                reactorId: newReactors,
                            };

                            return {
                                ...newState,
                                players: newPlayerState,
                                discardPile: newDiscardPile,
                                phase: cardKey,
                                pendingAction: [newAction],
                                log: [
                                    `${sourcePlayer.name} play Saloon! Everyone will gain 1 LP.`,
                                    ...newState.log,
                                ],
                            };
                        }

                        default:
                            return newState;
                    }
                }

                case 'blue': {
                    const playerStateAfterHandRemoval = removeCardFromHand(
                        cardKey,
                        sourceId,
                        newState,
                    );
                    const player = playerStateAfterHandRemoval[sourceId];
                    const cardDef = CARD_DEFS[cardKey];

                    let newInPlay = [...player.inPlay];
                    let newDiscardPile = [...newState.discardPile];

                    const cardToReplace = player.inPlay.find((existingKey) => {
                        const existingDef = CARD_DEFS[existingKey];
                        const isExactDuplicate = existingKey === cardKey;
                        const isWeaponSwap =
                            cardDef.weapon && existingDef.weapon;

                        return isExactDuplicate || isWeaponSwap;
                    });

                    if (cardToReplace) {
                        // Remove the old one from the in-play array
                        newInPlay = newInPlay.filter(
                            (k) => k !== cardToReplace,
                        );
                        // Add the old one to the top of the discard pile
                        newDiscardPile = [cardToReplace, ...newDiscardPile];
                    }

                    newInPlay.push(cardKey);
                    const newPlayerState = playerStateAfterHandRemoval.map(
                        (p) =>
                            p.id === sourceId ? { ...p, inPlay: newInPlay } : p,
                    );

                    switch (cardKey) {
                        case 'mustang': {
                            return {
                                ...newState,
                                players: newPlayerState,
                                discardPile: [...newDiscardPile],
                                log: [
                                    `${sourcePlayer.name} play Mustang! Everyone will see ${sourcePlayer.name} at +1 distance.`,
                                    ...newState.log,
                                ],
                            };
                        }

                        case 'scope': {
                            return {
                                ...newState,
                                players: newPlayerState,
                                discardPile: [...newDiscardPile],
                                log: [
                                    `${sourcePlayer.name} play Scope! ${sourcePlayer.name} will see everyone at -1 distance.`,
                                    ...newState.log,
                                ],
                            };
                        }

                        case 'barrel': {
                            return {
                                ...newState,
                                players: newPlayerState,
                                discardPile: [...newDiscardPile],
                                log: [
                                    `${sourcePlayer.name} play Barrel! BANG! will have 25% chance Missed! if target them.`,
                                    ...newState.log,
                                ],
                            };
                        }

                        case 'schofield':
                        case 'remington':
                        case 'revcarabine':
                        case 'winchester': {
                            return {
                                ...newState,
                                players: newPlayerState,
                                discardPile: [...newDiscardPile],
                                log: [
                                    `${sourcePlayer.name} play Schofield! Now they can BANG! targets up to distance ${cardDef.range}.`,
                                    ...newState.log,
                                ],
                            };
                        }

                        case 'volcanic': {
                            return {
                                ...newState,
                                players: newPlayerState,
                                discardPile: [...newDiscardPile],
                                log: [
                                    `${sourcePlayer.name} play Volcanic! Now they can play any number of BANG! in turn.`,
                                    ...newState.log,
                                ],
                            };
                        }

                        default:
                            return newState;
                    }
                }

                default:
                    return newState;
            }
        }

        case 'RESOLVE_CHARACTER_ABILITY': {
            const newState = structuredClone(state);
            const { characterKey, sourceId, targetId } = action;
            const character = CHARACTER_DEFS[characterKey];
            const sourcePlayer = newState.players[sourceId];

            switch (characterKey) {
                case 'bart_cassidy': {
                    const count = 1;
                    const { updatedPlayers, updatedState } = handleDrawEffect(
                        { ...newState },
                        sourceId,
                        count,
                    );

                    return {
                        ...updatedState,
                        players: updatedPlayers,
                        log: [
                            `${sourcePlayer.name} use ${character.name}'s ability! Draw 1 card from the deck.`,
                            ...newState.log,
                        ],
                    };
                }
                case 'black_jack': {
                    return newState;
                }
                case 'calamity_janet': {
                    return newState;
                }
                case 'el_gringo': {
                    if (targetId === null) return { ...state };

                    const targetPlayer = newState.players[targetId];
                    const newAction: PlayerAction = {
                        type: characterKey,
                        sourceId: sourceId,
                        targetId: [targetId],
                        reactorId: [],
                    };
                    return {
                        ...newState,
                        phase: characterKey,
                        cardPickerPicking: true,
                        cardPickerTarget: targetId,
                        cardPickerLabel: `Steal a card from ${targetPlayer.name}`,
                        pendingAction: [newAction, ...newState.pendingAction],
                        log: [
                            `${sourcePlayer.name} use ${character.name}'s ability! Draw 1 card from ${targetPlayer.name}'s hand.`,
                            ...newState.log,
                        ],
                    };
                }
                case 'jesse_jones':
                case 'jourdonnas':
                case 'kit_carlson':
                case 'lucky_duke':
                case 'paul_regret':
                case 'pedro_ramirez':
                case 'rose_doolan':
                case 'sid_ketchum':
                case 'slab_the_killer':
                case 'suzy_lafayette':
                case 'vulture_sam':
                case 'willy_the_kid':
                default:
                    return state;
            }
        }
    }
}

function removeElementFromArray<T>(element: T, array: T[]): T[] {
    const idx = array.indexOf(element);
    const newArray = [...array];

    if (idx !== -1) {
        newArray.splice(idx, 1);
    }
    return newArray;
}

function removeCardFromHand(
    cardKey: CardKey,
    playerId: number,
    state: GameState,
): Player[] {
    const newPlayerState = state.players.map((p) => {
        if (p.id === playerId) {
            const newHand = removeElementFromArray(cardKey, p.hand);
            return { ...p, hand: newHand };
        }
        return p;
    });
    return newPlayerState;
}

function removeReactorFromCurrentAction(
    action: PlayerAction,
    reactorId: number,
): PlayerAction {
    const updatedAction = {
        ...action,
        reactorId: removeElementFromArray(reactorId, action.reactorId),
    };

    return updatedAction;
}

function handleElimination(
    state: GameState,
    players: Player[],
    deadId: number,
    killerId: number | null,
    pendingAction: PlayerAction | null,
): GameState {
    let originalState = structuredClone(state);
    const deadPlayer = players[deadId];
    const killer = killerId !== null ? players[killerId] : null;

    // 1. Mark player as eliminated
    let updatedPlayers = players.map((p) =>
        p.id === deadId
            ? {
                  ...p,
                  hp: 0,
                  alive: false,
                  isEliminated: true,
                  hand: [],
                  inPlay: [],
              }
            : p,
    );

    // 2. MOVE dead player's cards to discard pile
    const cardsToDiscard = [...deadPlayer.hand, ...deadPlayer.inPlay];
    let newDiscard = [...cardsToDiscard, ...originalState.discardPile];

    // 3. BANG! BOUNTY RULES
    if (killer) {
        // Rule: Kill an Outlaw -> Draw 3 cards
        if (deadPlayer.role === 'OUTLAW') {
            const { cards, state: newState } = dealN(originalState, 3);
            originalState = newState;
            updatedPlayers = updatedPlayers.map((p) =>
                p.id === killerId ? { ...p, hand: [...p.hand, ...cards] } : p,
            );
        }

        // Rule: Sheriff kills a Deputy -> Sheriff loses EVERYTHING
        if (killer.role === 'SHERIFF' && deadPlayer.role === 'DEPUTY') {
            updatedPlayers = updatedPlayers.map((p) =>
                p.id === killerId ? { ...p, hand: [], inPlay: [] } : p,
            );
            newDiscard = [...killer.hand, ...killer.inPlay, ...newDiscard];
        }
    }

    // 4. CHECK WIN CONDITIONS
    const aliveRoles = updatedPlayers.filter((p) => p.alive).map((p) => p.role);
    let gameOverMessage = null;
    let gameWinner: Role | null = null;

    if (!aliveRoles.includes('SHERIFF')) {
        // If Sheriff is dead, check if a Renegade is the only one left
        gameOverMessage =
            aliveRoles.length === 1 && aliveRoles[0] === 'RENEGADE'
                ? 'Renegade Wins!'
                : 'Outlaws Win!';

        gameWinner =
            aliveRoles.length === 1 && aliveRoles[0] === 'RENEGADE'
                ? 'RENEGADE'
                : 'OUTLAW';
    } else if (
        !aliveRoles.includes('OUTLAW') &&
        !aliveRoles.includes('RENEGADE')
    ) {
        gameOverMessage = 'Sheriff and Deputies Win!';
        gameWinner = 'SHERIFF';
    }

    let next = (originalState.turn + 1) % originalState.players.length;
    let att = 0;
    while (
        !originalState.players[next].alive &&
        att < originalState.players.length
    ) {
        next = (next + 1) % originalState.players.length;
        att++;
    }

    return {
        ...originalState,
        players: updatedPlayers,
        discardPile: newDiscard,
        over: gameOverMessage !== null ? true : false,
        turn: killerId === deadId ? next : state.turn, // self kill
        winner: gameWinner,
        phase: gameOverMessage
            ? 'game-over'
            : pendingAction
              ? pendingAction.type
              : 'play',
        log: [
            `${deadPlayer.name} is DEAD. They were a ${deadPlayer.role}.`,
            ...state.log,
        ],
    };
}

function handleDrawEffect(state: GameState, sourceId: number, count: number) {
    // 2. Draw N cards from the deck
    // We pass a temporary state object with the updated players to dealN
    const { cards, state: stateAfterDraw } = dealN(
        { ...state, players: state.players },
        count,
    );

    // 3. Add those cards back to the player's hand
    const finalPlayers = stateAfterDraw.players.map((p) =>
        p.id === sourceId ? { ...p, hand: [...p.hand, ...cards] } : p,
    );

    return {
        updatedPlayers: finalPlayers,
        updatedState: stateAfterDraw,
        drawnCount: count,
    };
}

export { GameAction, gameReducer };
