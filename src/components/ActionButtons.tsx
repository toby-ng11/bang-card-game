import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CardKey, GameState, Player } from '@/types';
import { HeartCrack, Swords, Zap } from 'lucide-react';

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
}: ActionButtonsProps) {
    const currentPlayer = G.players[G.turn];
    const isMyTurn = currentPlayer.isHuman;

    const selectedCardKey: CardKey | null =
        G.selectedCard !== null ? human.hand[G.selectedCard] : null;

    const needsTarget =
        selectedCardKey !== null &&
        ['bang', 'panic', 'catbalou', 'duel'].includes(selectedCardKey);

    return (
        <div className="flex w-full flex-col justify-center gap-2">
            {/* Draw phase */}
            {isMyTurn && G.phase === 'draw' && (
                <div className="relative flex items-center justify-center p-2">
                    {/* The Pulsing Notification Ring */}
                    <div className="absolute inset-0 animate-pulse rounded-full border-4 border-amber-500/60" />
                    <div className="absolute inset-0 animate-ping rounded-full border-2 border-amber-600" />

                    <Button
                        variant="outline"
                        onClick={onDraw}
                        className={cn(
                            'relative h-20 w-20 rounded-full border-4 border-amber-700 bg-[#2a1810]',
                            'flex flex-col items-center justify-center gap-0.5 shadow-[0_0_20px_rgba(180,83,9,0.4)]',
                            'transition-all duration-300 hover:scale-110 hover:border-amber-500 hover:shadow-amber-500/50',
                            'group active:scale-95',
                        )}
                    >
                        {/* Decorative inner ring */}
                        <div className="pointer-events-none absolute inset-1 rounded-full border border-amber-900/50" />

                        <span className="text-[10px] font-black tracking-tighter text-amber-600 uppercase group-hover:text-amber-400">
                            Start
                        </span>

                        <div className="my-0.5 flex -space-x-2">
                            <div className="h-6 w-4 rotate-15 rounded-sm border border-amber-800 bg-stone-100 shadow-sm" />
                            <div className="h-6 w-4 rotate-15 rounded-sm border border-amber-800 bg-stone-200 shadow-sm" />
                        </div>

                        <span className="text-[10px] font-bold text-amber-500 group-hover:text-amber-300">
                            DRAW 2
                        </span>
                    </Button>
                </div>
            )}
            {/* Play phase */}
            {isMyTurn && G.phase === 'play' && !G.discardingToEndTurn && (
                <>
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
                    {!G.targeting && (
                        <Button onClick={onEndTurn}>End Turn</Button>
                    )}
                </>
            )}
            {G.phase === 'duel' && G.reactorId[0] === human.id && (
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
                <Button onClick={onCancelEndTurn}>Cancel Discard</Button>
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
