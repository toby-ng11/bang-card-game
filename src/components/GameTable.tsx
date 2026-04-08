import { getGridLayout } from '@/definitions/grid';
import { colSpan, gridCols, rowSpan } from '@/lib/tailwind-grid';
import { cn } from '@/lib/utils';
import { FlashMap, GameState } from '@/types';
import DeckSlot from './DeckSlot';
import PlayerSlot from './PlayerSlot';

interface GameTableProps {
    G: GameState;
    flashMap: FlashMap;
    onPlayerClick: (id: number) => void;
}

export default function GameTable({
    G,
    flashMap,
    onPlayerClick,
}: GameTableProps) {
    const human = G.players[0];
    const layout = getGridLayout(G.players.length);

    return (
        <div className="flex flex-row justify-center gap-2">
            <div className={cn('mb-4 grid gap-2', gridCols[layout.cols])}>
                {layout.positions.map(({ id, row, col }) => {
                    const p = G.players[id];

                    return (
                        <div
                            key={id}
                            className={cn(colSpan[col], rowSpan[row])}
                        >
                            <PlayerSlot
                                p={p}
                                human={human}
                                players={G.players}
                                turn={G.turn}
                                targeting={G.targeting}
                                selectedCard={G.selectedCard}
                                flashClass={flashMap[p.id] || ''}
                                onPlayerClick={onPlayerClick}
                            />
                        </div>
                    );
                })}
            </div>
            <DeckSlot deck={G.deck} discardPile={G.discardPile} />
        </div>
    );
}
