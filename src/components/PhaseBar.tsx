import { GameState } from '@/types';

interface PhaseBarProps {
    G: GameState;
}

export default function PhaseBar({ G }: PhaseBarProps) {
    const currentPlayer = G.players[G.turn];
    const isHumanTurn = currentPlayer.isHuman;

    return (
        <div className="px-4 mb-3 flex flex-row flex-wrap items-center justify-center gap-4 rounded-lg border py-2 text-sm">
            <div className="font-medium">
                {isHumanTurn ? 'Your turn' : currentPlayer.name + "'s Turn"}
            </div>
            <div>
                Phase: <strong>{G.phase}</strong>
            </div>
            <div>Deck: {G.deck.length}</div>
            <div>Discard Pile: {G.discardPile.length}</div>
            {G.targeting && (
                <div className="font-medium text-red-500">
                    🎯 Click a highlighted player
                </div>
            )}
        </div>
    );
}
