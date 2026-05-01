import { CardKey, CardPick, GameState, Phase, Winner } from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { initGame } from './game/init';

type GameAction = {
    // UI / ephemeral actions
    setState: (state: GameState) => void;
    setPhase: (phase: Phase) => void;
    setSelectedCard: (idx: number | null) => void;
    setTargeting: (targeting: boolean) => void;

    setActionProcessing: (id: string) => void;
    resolveAction: (id: string) => void;

    setDiscardingToEndTurn: (value: boolean) => void;
    setBangUsed: (value: boolean) => void;

    setOver: (winner: Winner) => void;

    addLog: (msg: string) => void;
    addPopup: (popup: GameState['activePopups'][number]) => void;
    removePopup: (id: string) => void;

    triggerFloat: (float: NonNullable<GameState['floatingCard']>) => void;
    clearFloat: () => void;

    // Card picker
    setCardPicker: (opts: {
        picking: boolean;
        target: number | null;
        label: string;
        resolve: ((p: CardPick) => void) | null;
    }) => void;

    // General store
    setGeneralStore: (opts: {
        cards: CardKey[];
        picking: boolean;
        resolve: ((c: CardKey) => void) | null;
    }) => void;

    resetGame: () => void;
};

export const useGameStore = create<GameState & GameAction>()(
    devtools(
        (set) => ({
            ...initGame(),
            setState: (state) => set(state),
            setSelectedCard: (idx) => set({ selectedCard: idx }),
            setTargeting: (targeting) => set({ targeting }),
            setPhase: (phase) => set({ phase }),
            setDiscardingToEndTurn: (value) =>
                set({ discardingToEndTurn: value }),
            setBangUsed: (value) => set({ bangUsed: value }),
            addLog: (msg) => set((s) => ({ log: [...s.log, msg] })),

            addPopup: (popup) =>
                set((s) => ({ activePopups: [...s.activePopups, popup] })),
            removePopup: (id) =>
                set((s) => ({
                    activePopups: s.activePopups.filter((p) => p.id !== id),
                })),

            triggerFloat: (float) => set({ floatingCard: float }),
            clearFloat: () => set({ floatingCard: null }),
            setOver: (winner) => set({ over: true, winner }),

            setCardPicker: ({ picking, target, label, resolve }) =>
                set({
                    cardPickerPicking: picking,
                    cardPickerTarget: target,
                    cardPickerLabel: label,
                    cardPickerResolve: resolve,
                }),

            setGeneralStore: ({ cards, picking, resolve }) =>
                set({
                    generalStoreCards: cards,
                    generalStorePicking: picking,
                    generalStoreResolve: resolve,
                }),

            // For bulk state updates from game logic (replaces SET_STATE)

            resetGame: () => set(initGame()),
        }),
        { name: 'BangGameStore' },
    ),
);
