import { CARD_DEFS } from './definitions/cards';
import { dealN } from './game/helpers';
import { CardKey, CardPick, GameState } from './types';

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
    | { type: 'ADD_LOG'; msg: string }
    | { type: 'NEXT_TURN' }
    | { type: 'SET_OVER'; winner: GameState['winner'] }
    | { type: 'DISCARD_CARD_FROM_HAND'; idx: number }
    | { type: 'DRAW_CARDS_TO_START_TURN' }
    | { type: 'PLAY_CARD' }
    | { type: 'END_TURN' };

function gameReducer(state: GameState, action: GameAction): GameState {
    console.log('REDUCER ACTION:', action);
    switch (action.type) {
        case 'SET_STATE':
            return action.state;

        case 'ADD_LOG': {
            const log = [action.msg, ...state.log].slice(0, 25);
            return { ...state, log };
        }

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

        case 'DISCARD_CARD_FROM_HAND': {
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

        case 'END_TURN': {
            const human = state.players[0];
            if (human.hand.length > human.hp) {
                return {
                    ...state,
                    discardingToEndTurn: true,
                    log: [
                        `Discard ${human.hand.length - human.hp} card(s) first (hand limit = your HP).`,
                        ...state.log,
                    ].slice(0, 25),
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

        default:
            return state;
    }
}

export { GameAction, gameReducer };
