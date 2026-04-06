import { GameState } from '@/types';

interface PhaseBarProps {
    G: GameState;
}

export default function PhaseBar({ G }: PhaseBarProps) {
    const currentPlayer = G.players[G.turn];
    const isHumanTurn = currentPlayer.isHuman;

    return (
        <div className="mb-3 flex flex-row flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
            <div className="font-medium">
                {isHumanTurn ? 'Your turn' : currentPlayer.name + "'s Turn"}
            </div>
            <div className="text-secondary">
                Phase:{' '}
                <strong>{isHumanTurn ? G.phase : 'AI playing…'}</strong>
            </div>
            <div className="text-secondary">Deck: {G.deck.length}</div>
            <div className="text-secondary">
                Discard Pile: {G.discardPile.length}
            </div>
            {G.targeting && (
                <div className="font-medium text-red-500">
                    🎯 Click a highlighted player
                </div>
            )}
        </div>
    );
}
