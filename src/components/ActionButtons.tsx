import { Button } from '@/components/ui/button';
import { CardKey, GameState, Player } from '@/types';

interface ActionButtonsProps {
    G: GameState;
    human: Player;
    onDraw: () => void;
    onTargetPlayer: () => void;
    onPlayCard: () => void;
    onCancelTarget: () => void;
    onEndTurn: () => void;
}

export default function ActionButtons({
    G,
    human,
    onDraw,
    onTargetPlayer,
    onPlayCard,
    onCancelTarget,
    onEndTurn,
}: ActionButtonsProps) {
    const currentPlayer = G.players[G.turn];
    const isMyTurn = currentPlayer.isHuman;

    const selectedCardKey: CardKey | null =
        G.selectedCard !== null ? human.hand[G.selectedCard] : null;

    const needsTarget =
        selectedCardKey !== null &&
        ['bang', 'panic', 'catbalou', 'duel'].includes(selectedCardKey);

    return (
        <div className="mb-3 flex flex-wrap justify-center gap-2">
            {/* Draw phase */}
            {isMyTurn && G.phase === 'draw' && (
                <Button variant="outline" onClick={onDraw}>
                    Draw 2 Cards
                </Button>
            )}

            {/* Play phase */}
            {isMyTurn && G.phase === 'play' && !G.discardingToEndTurn && (
                <>
                    {G.selectedCard !== null &&
                        !G.targeting &&
                        (needsTarget ? (
                            <Button onClick={onTargetPlayer}>
                                Target Player
                            </Button>
                        ) : selectedCardKey !== 'missed' ? (
                            <Button onClick={onPlayCard}>Play Card</Button>
                        ) : null)}
                    {G.targeting && (
                        <Button variant="outline" onClick={onCancelTarget}>
                            Cancel
                        </Button>
                    )}
                    {!G.targeting && (
                        <Button variant="secondary" onClick={onEndTurn}>
                            End Turn
                        </Button>
                    )}
                </>
            )}

            {/* AI turn */}
            {!isMyTurn && (
                <button type="button" className="btn" disabled>
                    Waiting for AI…
                </button>
            )}
        </div>
    );
}
