import { GridLayout } from '@/types';

export function getGridLayout(playerCount: number): GridLayout {
    const layouts: Record<number, GridLayout> = {
        4: {
            cols: 2,
            positions: [
                { id: 0, row: 1, col: 1 },
                { id: 1, row: 1, col: 2 },
                { id: 2, row: 2, col: 2 },
                { id: 3, row: 2, col: 1 },
            ],
        },
        5: {
            cols: 3,
            positions: [
                { id: 0, row: 1, col: 1 },
                { id: 1, row: 1, col: 2 },
                { id: 2, row: 1, col: 3 },
                { id: 3, row: 2, col: 3 },
                { id: 4, row: 2, col: 2 },
            ],
        },
        6: {
            cols: 4,
            positions: [
                { id: 0, row: 1, col: 2 },
                { id: 1, row: 1, col: 3 },
                { id: 2, row: 2, col: 4 },
                { id: 3, row: 3, col: 3 },
                { id: 4, row: 3, col: 2 },
                { id: 5, row: 2, col: 1 },
            ],
        },
        7: {
            cols: 4,
            positions: [
                { id: 0, row: 1, col: 2 },
                { id: 1, row: 1, col: 3 },
                { id: 2, row: 2, col: 4 },
                { id: 3, row: 3, col: 3 },
                { id: 4, row: 3, col: 2 },
                { id: 5, row: 3, col: 1 },
                { id: 6, row: 2, col: 1 },
            ],
        },
        8: {
            cols: 4,
            positions: [
                { id: 0, row: 1, col: 2 },
                { id: 1, row: 1, col: 3 },
                { id: 2, row: 2, col: 4 },
                { id: 3, row: 3, col: 4 },
                { id: 4, row: 3, col: 3 },
                { id: 5, row: 3, col: 2 },
                { id: 6, row: 3, col: 1 },
                { id: 7, row: 2, col: 1 },
            ],
        },
    };
    return layouts[playerCount] || layouts[5];
}
