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
        <div className="mb-3 flex flex-wrap gap-2">
            {/* Draw phase */}
            {isMyTurn && G.phase === 'draw' && (
                <button className="btn btn-primary" onClick={onDraw}>
                    Draw 2 Cards
                </button>
            )}

            {/* Play phase */}
            {isMyTurn && G.phase === 'play' && !G.discardingToEndTurn && (
                <>
                    {G.selectedCard !== null &&
                        !G.targeting &&
                        (needsTarget ? (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={onTargetPlayer}
                            >
                                Target Player
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={onPlayCard}
                            >
                                Play Card
                            </button>
                        ))}
                    {G.targeting && (
                        <button
                            type="button"
                            className="btn"
                            onClick={onCancelTarget}
                        >
                            Cancel
                        </button>
                    )}
                    {!G.targeting && (
                        <button
                            type="button"
                            className="btn"
                            onClick={onEndTurn}
                        >
                            End Turn
                        </button>
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
