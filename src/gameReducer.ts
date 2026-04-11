import { CARD_DEFS } from './definitions/cards';
import { dealN, shuffle } from './game/helpers';
import {
    CardKey,
    CardPick,
    GameState,
    Phase,
    Player,
    PlayerAction,
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
    | { type: 'ADD_LOG'; msg: string }
    | { type: 'NEXT_TURN' }
    | { type: 'SET_OVER'; winner: GameState['winner'] }
    | { type: 'DISCARD_TO_END_TURN'; idx: number }
    | { type: 'DISCARD_A_CARD_FROM_HAND'; playerId: number; cardKey: CardKey }
    | { type: 'DRAW_CARDS_TO_START_TURN' }
    | {
          type: 'TAKE_DAMAGE';
          sourceId: number | null;
          targetId: number;
          damageAmount: number;
      }
    | { type: 'DRINK_BEER_TO_SURVIVE'; playerId: number; prevPhase: Phase }
    | { type: 'RESOLVE_CARD_PICK'; payload: CardPick }
    | { type: 'RESOLVE_GENERAL_STORE_PICK'; cardKey: CardKey; playerId: number }
    | { type: 'RESOLVE_GATLING'; playerId: number }
    | { type: 'RESOLVE_INDIANS'; playerId: number }
    | { type: 'RESOLVE_DUEL'; playerId: number }
    | { type: 'FINISH_ACTION' }
    | {
          type: 'PLAY_CARD';
          cardKey: CardKey;
          sourceId: number;
          targetId: number | null;
      }
    | { type: 'END_TURN' };

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

        case 'DRAW_CARDS_TO_START_TURN': {
            const { cards, state: newState } = dealN(state, 2);
            return {
                ...newState,
                players: newState.players.map((p, idx) =>
                    idx === newState.turn
                        ? { ...p, hand: [...p.hand, ...cards] }
                        : p,
                ),
                phase: 'play',
                bangUsed: false,
                log: [`You draws 2 cards.`, ...newState.log].slice(0, 25),
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
            newState.discardPile.push(...discarded);
            newState.log = [
                `You discard ${CARD_DEFS[discarded[0]]?.name || discarded[0]}.`,
                ...newState.log,
            ].slice(0, 25);

            if (player.hand.length <= player.hp) {
                newState.discardingToEndTurn = false;
                let next = (newState.turn + 1) % newState.players.length;
                let att = 0;
                while (
                    !newState.players[next].alive &&
                    att < newState.players.length
                ) {
                    next = (next + 1) % newState.players.length;
                    att++;
                }
                newState.turn = next;
                newState.phase = 'draw';
                newState.bangUsed = false;
                newState.selectedCard = null;
                newState.targeting = false;
            }
            return newState;
        }

        case 'DISCARD_A_CARD_FROM_HAND': {
            const { playerId, cardKey } = action;

            const newPlayerState = removeCardFromHand(cardKey, playerId, state);
            return { ...state, players: newPlayerState };
        }

        case 'END_TURN': {
            const human = state.players[0];
            if (human.hand.length > human.hp) {
                return {
                    ...state,
                    discardingToEndTurn: true,
                    log: [
                        `Discard ${human.hand.length - human.hp} card(s) first (hand limit = your HP).`,
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
            };
        }

        case 'FINISH_ACTION': {
            const isReacting = state.reactorId.length > 0;

            return {
                ...state,
                pendingAction: isReacting ? state.pendingAction : null,
                phase: isReacting ? state.phase : 'play',
            };
        }

        case 'DRINK_BEER_TO_SURVIVE': {
            const { playerId, prevPhase } = action;
            const player = state.players[playerId];

            const newPlayerState = removeCardFromHand('beer', playerId, state);
            const applyHeal = newPlayerState.map((p) =>
                p.id === playerId ? { ...p, hp: p.hp + 1 } : { ...p },
            );

            const newHp = player.hp + 1;
            const isNowSafe = newHp > 0;

            const newReactors = state.reactorId.filter((p) => p !== playerId);

            return {
                ...state,
                players: applyHeal,
                discardPile: ['beer', ...state.discardPile],
                // If they are still at 0 (e.g. they took 3 dmg from Dynamite),
                // they stay in 'dying' phase until they play another beer or click 'die'.
                phase: isNowSafe ? prevPhase : 'dying',
                reactorId: isNowSafe ? newReactors : state.reactorId,
                log: [
                    `${state.players[playerId].name} drank a beer to stay alive!`,
                    ...state.log,
                ],
            };
        }

        case 'TAKE_DAMAGE': {
            const { sourceId, targetId, damageAmount } = action;
            const pendingAction = state.pendingAction;

            if (targetId === null) return state;

            const updatedPlayers = state.players.map((p) => {
                if (p.id === targetId) {
                    return { ...p, hp: p.hp - damageAmount };
                }
                return p;
            });

            const targetPlayer = updatedPlayers[targetId];
            const isDying = targetPlayer.hp <= 0;

            if (isDying) {
                const isBeerEffective =
                    state.players.filter((p) => p.alive).length > 2;
                const hasBeer = targetPlayer.hand.includes('beer');

                if (isBeerEffective && hasBeer) {
                    return {
                        ...state,
                        players: updatedPlayers,
                        phase: 'dying',
                        reactorId: [targetId, ...state.reactorId], // They are the one who needs to drink
                        log: [
                            `${targetPlayer.name} is at death's door! Play a Beer?`,
                            ...state.log,
                        ],
                    };
                } else {
                    // No beer or only 2 players left? They are eliminated immediately.
                    return handleElimination(
                        {
                            ...state,
                            reactorId: state.reactorId.filter(
                                (i) => i !== targetId,
                            ),
                        },
                        updatedPlayers,
                        targetId,
                        sourceId,
                        pendingAction,
                    );
                }
            }

            const newReactors = removeElementFromArray(
                targetId,
                state.reactorId,
            );

            return {
                ...state,
                players: updatedPlayers,
                reactorId: newReactors,
                //pendingAction: null,
                log: [
                    `${targetPlayer.name} took ${damageAmount} damage!`,
                    ...state.log,
                ],
            };
        }

        case 'RESOLVE_CARD_PICK': {
            const { source, idx, key } = action.payload;
            const { sourceId, targetId, type } = state.pendingAction!;

            let updatedPlayers = state.players.map((p) => {
                if (p.id === targetId) {
                    if (source === 'hand') {
                        const newHand = [...shuffle(p.hand)];
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
                if (p.id === sourceId && type === 'panic') {
                    return { ...p, hand: [...p.hand, key] };
                }
                return p;
            });
            return {
                ...state,
                players: updatedPlayers,
                discardPile:
                    type === 'catbalou'
                        ? [key, ...state.discardPile]
                        : state.discardPile,

                phase: 'play',
                cardPickerPicking: false,
                cardPickerTarget: null,
                pendingAction: null,
                log: [
                    `${state.players[sourceId].name} ${type === 'catbalou' ? 'discard' : 'stole'} a ${CARD_DEFS[key].name} from ${state.players[targetId!].name}.`,
                    ...state.log,
                ],
            };
        }

        case 'RESOLVE_GENERAL_STORE_PICK': {
            const { cardKey, playerId } = action;
            const currentPickerId =
                state.generalStoreOrder[state.generalStoreIndex];

            if (playerId !== currentPickerId) return state;

            const newPlayerState = state.players.map((p) => {
                if (p.id === playerId) {
                    return { ...p, hand: [...p.hand, cardKey] };
                } else return { ...p };
            });

            const newStoreCards = removeElementFromArray(
                cardKey,
                state.generalStoreCards,
            );

            const nextIndex = state.generalStoreIndex + 1;
            const isFinished =
                nextIndex >= state.generalStoreOrder.length ||
                newStoreCards.length === 0;

            return {
                ...state,
                players: newPlayerState,
                generalStoreCards: newStoreCards,
                generalStoreIndex: nextIndex,
                generalStorePicking: !isFinished,
                phase: isFinished ? 'play' : state.phase,
                log: [
                    `${state.players[playerId].name} picked a ${CARD_DEFS[cardKey].name}.`,
                    ...state.log,
                ],
            };
        }

        case 'RESOLVE_GATLING': {
            if (state.pendingAction?.type !== 'gatling') return { ...state };
            const { playerId } = action;

            const remainingQueue = removeElementFromArray(
                playerId,
                state.reactorId,
            );
            const nextReactor = remainingQueue[0];

            return {
                ...state,
                reactorId: remainingQueue,
                phase: nextReactor ? 'gatling' : 'play', // Go back to playing if queue empty
            };
        }

        case 'RESOLVE_INDIANS': {
            if (state.pendingAction?.type !== 'indians') return { ...state };
            const { playerId } = action;

            const newPlayers = removeCardFromHand('bang', playerId, state);

            const remainingQueue = removeElementFromArray(
                playerId,
                state.reactorId,
            );

            return {
                ...state,
                players: newPlayers,
                discardPile: ['bang', ...state.discardPile],
                reactorId: remainingQueue,
                log: [
                    `${state.players[playerId].name} discard a BANG! and dodge.`,
                    ...state.log,
                ],
            };
        }

        case 'RESOLVE_DUEL': {
            if (state.pendingAction?.type !== 'duel') return { ...state };
            const { playerId } = action;

            const newPlayers = removeCardFromHand('bang', playerId, state);

            const otherDuelist =
                playerId === state.pendingAction.sourceId
                    ? state.pendingAction.targetId
                    : state.pendingAction.sourceId;

            if (otherDuelist === null) return { ...state };

            return {
                ...state,
                players: newPlayers,
                discardPile: ['bang', ...state.discardPile],
                reactorId: [otherDuelist],
                log: [
                    `${state.players[playerId].name} discard a BANG! to stay in the duel.`,
                    ...state.log,
                ],
            };
        }

        case 'PLAY_CARD': {
            const { cardKey, sourceId, targetId } = action;
            const sourcePlayer = state.players[sourceId];

            if (!sourcePlayer.hand.includes(cardKey)) return state;

            switch (cardKey) {
                case 'beer': {
                    const newPlayerState = removeCardFromHand(
                        cardKey,
                        sourceId,
                        state,
                    );

                    const isBeerEffective =
                        state.players.filter((p) => p.alive).length > 2;
                    if (!isBeerEffective) {
                        return {
                            ...state,
                            players: newPlayerState,
                            discardPile: ['beer', ...state.discardPile],
                            log: [
                                `${sourcePlayer.name} played a Beer but it has no effect when there are 2 players left!`,
                                ...state.log,
                            ],
                        };
                    } else {
                        const applyHeal = newPlayerState.map((p) =>
                            p.id === sourceId
                                ? { ...p, hp: p.hp + 1 }
                                : { ...p },
                        );

                        return {
                            ...state,
                            players: applyHeal,
                            discardPile: ['beer', ...state.discardPile],
                            log: [
                                `${sourcePlayer.name} heals +1 LP → ${sourcePlayer.hp}/${sourcePlayer.maxHp}.`,
                                ...state.log,
                            ],
                        };
                    }
                }

                case 'stagecoach':
                case 'wellsfargo': {
                    const count = cardKey === 'stagecoach' ? 2 : 3;
                    const { updatedPlayers, updatedState } = handleDrawEffect(
                        state,
                        sourceId,
                        cardKey,
                        count,
                    );

                    return {
                        ...updatedState,
                        players: updatedPlayers,
                        discardPile: [cardKey, ...state.discardPile],
                        log: [
                            `${sourcePlayer.name} played ${cardKey === 'stagecoach' ? 'Stagecoach' : 'Wells Fargo'} and drew ${count} cards.`,
                            ...state.log,
                        ],
                    };
                }

                case 'panic':
                case 'catbalou': {
                    if (!targetId) return { ...state };

                    const targetPlayer = state.players[targetId];
                    const newPlayerState = removeCardFromHand(
                        cardKey,
                        sourceId,
                        state,
                    );

                    return {
                        ...state,
                        players: newPlayerState,
                        discardPile: [cardKey, ...state.discardPile],
                        targeting: false,
                        phase: cardKey,
                        cardPickerPicking: true,
                        cardPickerTarget: targetId,
                        cardPickerLabel:
                            cardKey === 'panic'
                                ? `Steal a card from ${targetPlayer.name}`
                                : `Discard a card from ${targetPlayer.name}`,
                        pendingAction: {
                            type: cardKey,
                            sourceId: sourceId,
                            targetId: targetId,
                        },
                        log: [
                            cardKey === 'panic'
                                ? `😱 Panic! — ${sourcePlayer.name} is choosing a card to steal from ${targetPlayer.name}.`
                                : `Catbalou! ${sourcePlayer.name} is choosing a card to discard from ${targetPlayer.name}.`,
                            ...state.log,
                        ],
                    };
                }

                case 'generalstore': {
                    const newPlayerState = removeCardFromHand(
                        cardKey,
                        sourceId,
                        state,
                    );

                    const alivePlayersCount = state.players.filter(
                        (p) => p.hp > 0,
                    ).length;
                    const drawnCards = state.deck.slice(0, alivePlayersCount);
                    const remainingDeck = state.deck.slice(alivePlayersCount);

                    const startIndex = state.players.findIndex(
                        (p) => p.id === sourceId,
                    );
                    const pickOrderIds = [];
                    for (let i = 0; i < state.players.length; i++) {
                        const player =
                            state.players[
                                (startIndex + i) % state.players.length
                            ];
                        if (player.hp > 0) pickOrderIds.push(player.id);
                    }

                    return {
                        ...state,
                        deck: remainingDeck,
                        discardPile: [cardKey, ...state.discardPile],
                        players: newPlayerState,

                        phase: cardKey,
                        generalStoreCards: drawnCards,
                        generalStorePicking: true,
                        generalStoreOrder: pickOrderIds,
                        generalStoreIndex: 0,
                        pendingAction: {
                            type: cardKey,
                            sourceId: sourceId,
                            targetId: null,
                        },
                        log: [
                            `${sourcePlayer.name} played a General Store! ${alivePlayersCount} cards revealed.`,
                            ...state.log,
                        ],
                    };
                }

                case 'bang': {
                    //const hasVolcanic = state.players[shooterIdx].inPlay.includes('volcanic');
                    if (!targetId) return { ...state };
                    else {
                        const targetPlayer = state.players[targetId];
                        if (state.bangUsed) {
                            return {
                                ...state,
                                log: [
                                    `You already used BANG! this turn!`,
                                    ...state.log,
                                ],
                            };
                        }

                        const newPlayerState = removeCardFromHand(
                            cardKey,
                            sourceId,
                            state,
                        );

                        return {
                            ...state,
                            players: newPlayerState,
                            discardPile: [cardKey, ...state.discardPile],
                            targeting: false,
                            bangUsed: true,
                            phase: 'bang',
                            pendingAction: {
                                type: cardKey,
                                sourceId: sourceId,
                                targetId: targetId,
                            },
                            reactorId: [targetId],
                            log: [
                                `${sourcePlayer.name} shot at ${targetPlayer.name}!`,
                                ...state.log,
                            ],
                        };
                    }
                }

                case 'missed': {
                    if (state.phase !== 'bang' && state.phase !== 'gatling')
                        return state;

                    const { sourceId } = action; // The player who is reacting

                    const newReactors = removeElementFromArray(
                        sourceId,
                        state.reactorId,
                    );

                    return {
                        ...state,
                        // 1. Remove the Missed! card from the reactor's hand
                        players: state.players.map((p) =>
                            p.id === sourceId
                                ? {
                                      ...p,
                                      hand: p.hand.filter(
                                          (c, i) =>
                                              i !== p.hand.indexOf(cardKey),
                                      ),
                                  }
                                : p,
                        ),
                        discardPile: [cardKey, ...state.discardPile],
                        phase: state.phase === 'bang' ? 'play' : 'gatling', //continue, let RESOLVE_GATLING handle phase
                        reactorId: newReactors,
                        log: [
                            `${state.players[sourceId].name} played a Missed! and dodge the shot!`,
                            ...state.log,
                        ],
                    };
                }

                case 'gatling': {
                    // same as BANG!, but no target (all players)
                    const newPlayerState = removeCardFromHand(
                        cardKey,
                        sourceId,
                        state,
                    );

                    const startIndex = state.players.findIndex(
                        (p) => p.id === sourceId,
                    );
                    const newReactors = [];
                    for (let i = 0; i < state.players.length; i++) {
                        const player =
                            state.players[
                                (startIndex + i) % state.players.length
                            ];
                        if (player.hp > 0 && player.id !== sourceId)
                            newReactors.push(player.id);
                    }

                    return {
                        ...state,
                        players: newPlayerState,
                        discardPile: [cardKey, ...state.discardPile],
                        //bangUsed: true, doesnt count as BANG!
                        phase: 'gatling',
                        pendingAction: {
                            type: cardKey,
                            sourceId: sourceId,
                            targetId: null,
                        },
                        reactorId: [...newReactors],
                        log: [
                            `${sourcePlayer.name} play Gatling! Everyone must Missed! or lose 1 LP.`,
                            ...state.log,
                        ],
                    };
                }

                case 'indians': {
                    const newPlayerState = removeCardFromHand(
                        cardKey,
                        sourceId,
                        state,
                    );

                    const startIndex = state.players.findIndex(
                        (p) => p.id === sourceId,
                    );
                    const newReactors = [];
                    for (let i = 0; i < state.players.length; i++) {
                        const player =
                            state.players[
                                (startIndex + i) % state.players.length
                            ];
                        if (player.hp > 0 && player.id !== sourceId)
                            newReactors.push(player.id);
                    }

                    return {
                        ...state,
                        players: newPlayerState,
                        discardPile: [cardKey, ...state.discardPile],
                        phase: 'indians',
                        pendingAction: {
                            type: cardKey,
                            sourceId: sourceId,
                            targetId: null,
                        },
                        reactorId: [...newReactors],
                        log: [
                            `${sourcePlayer.name} play Indians! Everyone must discard a BANG! card or lose 1 LP.`,
                            ...state.log,
                        ],
                    };
                }

                case 'duel': {
                    if (!targetId) return { ...state };
                    else {
                        const targetPlayer = state.players[targetId];
                        const newPlayerState = removeCardFromHand(
                            cardKey,
                            sourceId,
                            state,
                        );

                        return {
                            ...state,
                            players: newPlayerState,
                            discardPile: [cardKey, ...state.discardPile],
                            targeting: false,
                            phase: cardKey,
                            pendingAction: {
                                type: cardKey,
                                sourceId: sourceId,
                                targetId: targetId,
                            },
                            reactorId: [targetId],
                            log: [
                                `${sourcePlayer.name} challenges ${targetPlayer.name} to a Duel!`,
                                ...state.log,
                            ],
                        };
                    }
                }

                case 'saloon':
                    return { ...state };

                case 'mustang':
                    return { ...state };

                case 'scope':
                    return { ...state };

                default:
                    return { ...state };
            }
        }

        default:
            return state;
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

function handleElimination(
    state: GameState,
    players: Player[],
    deadId: number,
    killerId: number | null,
    pendingAction: PlayerAction | null,
): GameState {
    const deadPlayer = players[deadId];
    const killer = killerId !== null ? players[killerId] : null;

    // 1. Mark player as eliminated
    let updatedPlayers = players.map((p) =>
        p.id === deadId
            ? { ...p, hp: 0, isEliminated: true, hand: [], table: [] }
            : p,
    );

    // 2. MOVE dead player's cards to discard pile
    const cardsToDiscard = [...deadPlayer.hand, ...deadPlayer.inPlay];
    const newDiscard = [...cardsToDiscard, ...state.discardPile];

    // 3. BANG! BOUNTY RULES
    if (killer) {
        // Rule: Kill an Outlaw -> Draw 3 cards
        if (deadPlayer.role === 'OUTLAW') {
            const { cards, state: newState } = dealN(state, 3);
            updatedPlayers = updatedPlayers.map((p) =>
                p.id === killerId ? { ...p, hand: [...p.hand, ...cards] } : p,
            );
        }

        // Rule: Sheriff kills a Deputy -> Sheriff loses EVERYTHING
        if (killer.role === 'SHERIFF' && deadPlayer.role === 'DEPUTY') {
            updatedPlayers = updatedPlayers.map((p) =>
                p.id === killerId ? { ...p, hand: [], table: [] } : p,
            );
        }
    }

    // 4. CHECK WIN CONDITIONS
    const aliveRoles = updatedPlayers.filter((p) => p.alive).map((p) => p.role);
    let gameOverMessage = null;

    if (!aliveRoles.includes('SHERIFF')) {
        // If Sheriff is dead, check if a Renegade is the only one left
        gameOverMessage =
            aliveRoles.length === 1 && aliveRoles[0] === 'RENEGADE'
                ? 'Renegade Wins!'
                : 'Outlaws Win!';
    } else if (
        !aliveRoles.includes('OUTLAW') &&
        !aliveRoles.includes('RENEGADE')
    ) {
        gameOverMessage = 'Sheriff and Deputies Win!';
    }

    return {
        ...state,
        players: updatedPlayers,
        discardPile: newDiscard,
        phase: gameOverMessage
            ? 'game-over'
            : pendingAction
              ? pendingAction.type
              : 'play',
        //message: gameOverMessage || `${deadPlayer.name} was eliminated!`,
        log: [
            `${deadPlayer.name} is DEAD. They were a ${deadPlayer.role}.`,
            ...state.log,
        ],
    };
}

function handleDrawEffect(
    state: GameState,
    sourceId: number,
    cardKey: CardKey,
    count: number,
) {
    // 1. Remove the played card from the hand
    const playersAfterDiscard = state.players.map((p) =>
        p.id === sourceId
            ? {
                  ...p,
                  hand: p.hand.filter((_, i) => i !== p.hand.indexOf(cardKey)),
              }
            : p,
    );

    // 2. Draw N cards from the deck
    // We pass a temporary state object with the updated players to dealN
    const { cards, state: stateAfterDraw } = dealN(
        { ...state, players: playersAfterDiscard },
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
