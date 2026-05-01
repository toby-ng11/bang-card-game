import { Button } from '@/components/ui/button';
import { CharacterKey } from '@/definitions/character';
import { CardKey, GameState, Player } from '@/types';
import { HeartCrack, Swords, Zap } from 'lucide-react';
import { CancelAiblityButton } from './command-buttons/cancel-ability-button';
import { CancelDiscardButton } from './command-buttons/cancel-discard-button';
import { DrawCardsToStartTurnButton } from './command-buttons/draw-cards-to-start-turn-button';
import { EndTurnButton } from './command-buttons/end-turn-button';
import { UseCharacterAbilityButton } from './command-buttons/use-character-ability-button';
import { UseJesseJonesAbilityButton } from './command-buttons/use-jesse-jones-ability-button';

interface ActionButtonsProps {
    G: GameState;
    human: Player;
    onDraw: () => void;
    onTargetPlayer: () => void;
    onPlayCard: () => void;
    onCancelTarget: () => void;
    onEndTurn: () => void;
    onCancelEndTurn: () => void;
    onDuelingDiscardBang: () => void;
    onDuelingTakeDamage: () => void;
    onActiveAbility: (characterKey: CharacterKey) => void;
    onCancelAbility: (characterKey: CharacterKey) => void;
}

export default function ActionButtons({
    G,
    human,
    onDraw,
    onTargetPlayer,
    onPlayCard,
    onCancelTarget,
    onEndTurn,
    onCancelEndTurn,
    onDuelingDiscardBang,
    onDuelingTakeDamage,
    onActiveAbility,
    onCancelAbility,
}: ActionButtonsProps) {
    const currentPlayer = G.players[G.turn];
    const isMyTurn = currentPlayer.isHuman;

    const selectedCardKey: CardKey | null =
        G.selectedCard !== null ? human.hand[G.selectedCard] : null;

    const needsTarget =
        selectedCardKey !== null &&
        ['bang', 'panic', 'catbalou', 'duel'].includes(selectedCardKey);

    const [currentAction] = G.pendingAction;

    return (
        <div className="flex w-full flex-col justify-center gap-2">
            {/* Draw phase */}

            {isMyTurn && G.phase === 'draw' && (
                <>
                    {currentPlayer.character === 'jesse_jones' && (
                        <UseJesseJonesAbilityButton
                            onTargetPlayer={onTargetPlayer}
                        />
                    )}
                    {human.character === 'pedro_ramirez' &&
                        G.discardPile.length > 0 && (
                            <UseCharacterAbilityButton
                                character={human.character}
                                onActiveAbility={() =>
                                    onActiveAbility(human.character)
                                }
                            />
                        )}
                    <DrawCardsToStartTurnButton onDraw={onDraw} />
                </>
            )}
            {G.phase === 'sid_ketchum' && G.SidKetchumCardsDiscarded === 0 && (
                <CancelAiblityButton
                    onCancelAbility={() => onCancelAbility(human.character)}
                />
            )}
            {/* Play phase */}
            {isMyTurn && G.phase === 'play' && !G.discardingToEndTurn && (
                <>
                    {human.character === 'sid_ketchum' && (
                        <UseCharacterAbilityButton
                            character={human.character}
                            onActiveAbility={() =>
                                onActiveAbility(human.character)
                            }
                        />
                    )}
                    {G.selectedCard !== null &&
                        !G.targeting &&
                        (needsTarget ? (
                            <Button
                                variant="secondary"
                                onClick={onTargetPlayer}
                            >
                                Target Player
                            </Button>
                        ) : selectedCardKey !== 'missed' ? (
                            <Button variant="secondary" onClick={onPlayCard}>
                                Play Card
                            </Button>
                        ) : null)}
                    {G.targeting && (
                        <Button variant="outline" onClick={onCancelTarget}>
                            Cancel
                        </Button>
                    )}
                    {!G.targeting && <EndTurnButton onEndTurn={onEndTurn} />}
                </>
            )}
            {G.phase === 'duel' && currentAction.reactorId[0] === human.id && (
                <div className="flex animate-in flex-col items-center gap-4 duration-300 fade-in zoom-in">
                    {/* Duel Info Header */}
                    <div className="flex flex-col items-center rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-center shadow-xl backdrop-blur-md">
                        <div className="mb-1 flex items-center gap-2">
                            <Swords
                                className="animate-pulse text-red-500"
                                size={24}
                            />
                            <span className="text-xl font-black tracking-widest text-red-500 uppercase italic">
                                Duel!
                            </span>
                        </div>
                        <p className="text-sm font-medium text-stone-200">
                            It's your turn. Discard a{' '}
                            <span className="font-bold text-orange-400">
                                BANG!
                            </span>{' '}
                            or lose 1 LP.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        {/* 1. Discard Bang Button */}
                        <Button
                            size="lg"
                            disabled={
                                !human.hand.includes('bang') ||
                                selectedCardKey !== 'bang'
                            }
                            onClick={onDuelingDiscardBang} // Ensure this handles 'bang' in your Duel logic
                            className="group relative h-16 overflow-hidden rounded-xl border-b-4 border-red-800 bg-linear-to-br from-orange-500 to-red-600 px-8 transition-all hover:from-orange-400 hover:to-red-500 active:translate-y-1 active:border-b-0"
                        >
                            <div className="flex items-center gap-3">
                                <Zap className="transition-transform group-hover:rotate-12" />
                                <div className="flex flex-col items-start">
                                    <span className="text-xs font-bold uppercase opacity-80">
                                        Fight back
                                    </span>
                                    <span className="text-lg leading-none font-black">
                                        Discard BANG!
                                    </span>
                                </div>
                            </div>
                        </Button>

                        {/* 2. Lose LP Button */}
                        <Button
                            size="lg"
                            variant="destructive"
                            onClick={onDuelingTakeDamage}
                            className="group h-16 rounded-xl border-b-4 border-stone-900 bg-stone-800 px-8 transition-all hover:bg-stone-700 active:translate-y-1 active:border-b-0"
                        >
                            <div className="flex items-center gap-3 text-stone-300 group-hover:text-red-400">
                                <HeartCrack />
                                <div className="flex flex-col items-start">
                                    <span className="text-xs font-bold uppercase opacity-80">
                                        Surrender
                                    </span>
                                    <span className="text-lg leading-none font-black">
                                        Lose 1 LP
                                    </span>
                                </div>
                            </div>
                        </Button>
                    </div>
                </div>
            )}
            {G.discardingToEndTurn && (
                <CancelDiscardButton onCancelEndTurn={onCancelEndTurn} />
            )}
            {}
            {/* AI turn */}
            {!isMyTurn && (
                <button type="button" className="btn" disabled>
                    Waiting for AI…
                </button>
            )}
        </div>
    );
}
