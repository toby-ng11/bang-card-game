import { CardKey, CardPick, GameState } from './types';

type GameAction =
    | { type: 'SET_STATE'; state: GameState }
    | { type: 'SET_PHASE'; phase: GameState['phase'] }
    | { type: 'SET_TARGETING'; targeting: boolean }
    | { type: 'SET_SELECTED_CARD'; idx: number | null }
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
    | { type: 'SET_OVER'; winner: GameState['winner'] };

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case 'SET_STATE':
            return action.state;

        case 'ADD_LOG': {
            const log = [action.msg, ...state.log].slice(0, 25);
            return { ...state, log };
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

        default:
            return state;
    }
}

export { GameAction, gameReducer };
