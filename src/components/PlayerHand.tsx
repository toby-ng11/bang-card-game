import { CARD_DEFS } from '@/definitions/cards';
import { cn } from '@/lib/utils';
import { CardKey } from '@/types';
import { AnimatePresence, motion } from 'motion/react';

interface PlayerHandProps {
    hand: CardKey[];
    currentLP: number;
    selectedCard: number | null;
    discardingToEndTurn: boolean;
    onCardClick: (idx: number) => void;
}

export default function PlayerHand({
    hand,
    currentLP,
    selectedCard,
    discardingToEndTurn,
    onCardClick,
}: PlayerHandProps) {
    return (
        <div className="relative w-full min-w-0 px-4">
            <div className="absolute -top-12 left-1/2 w-full -translate-x-1/2 text-center">
                <AnimatePresence mode="wait">
                    {discardingToEndTurn ? (
                        <motion.span
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            className="inline-block rounded-full border border-red-500/50 bg-red-950/80 px-4 py-1 text-xs font-bold text-red-400 shadow-lg backdrop-blur-sm"
                        >
                            ⚠️ Discard {hand.length - currentLP} more to end
                            turn
                        </motion.span>
                    ) : (
                        hand.length === 0 && (
                            <span className="text-xs tracking-widest text-stone-500 uppercase italic">
                                Your Hand is Empty
                            </span>
                        )
                    )}
                </AnimatePresence>
            </div>

            <div className="mx-auto flex min-h-10 w-full max-w-6xl flex-row flex-nowrap items-end justify-center gap-1 overflow-visible sm:gap-2">
                {hand.map((cardKey, i) => {
                    const c = CARD_DEFS[cardKey];
                    if (!c) return null;
                    const isSel = selectedCard === i;
                    return (
                        <motion.div
                            key={`${cardKey}-${crypto.randomUUID()}`}
                            layout
                            whileHover={{ y: -20, zIndex: 50 }}
                            className={cn(
                                // Base Styles: Fixed height, flexible width with min/max constraints
                                'relative flex shrink cursor-pointer flex-col items-center justify-between rounded-xl p-2 select-none',
                                'aspect-2/3 w-full max-w-30 min-w-0',
                                'border-2 shadow-2xl',

                                // Color Themes
                                c.color === 'brown' &&
                                    'border-amber-800 bg-linear-to-br from-amber-100 to-amber-200 text-amber-950',
                                c.color === 'blue' &&
                                    'border-blue-800 bg-linear-to-br from-blue-100 to-blue-200 text-blue-950',

                                // Selection / Discard States
                                isSel &&
                                    'z-40 -translate-y-6 border-yellow-500 ring-4 shadow-yellow-500/50 ring-yellow-400',
                                discardingToEndTurn &&
                                    'border-red-500 grayscale-[0.3] hover:grayscale-0',
                                !isSel &&
                                    !discardingToEndTurn &&
                                    'hover:border-white',
                            )}
                            onClick={() => onCardClick(i)}
                        >
                            {/* Card Content */}
                            <div className="flex w-full items-start justify-between text-[10px] font-black sm:text-xs">
                                <span className="pr-1 leading-none wrap-break-word uppercase">
                                    {c.name}
                                </span>
                                <span
                                    className={cn(
                                        c.color === 'brown'
                                            ? 'text-red-600'
                                            : 'text-stone-800',
                                    )}
                                >
                                    ♥
                                </span>
                            </div>

                            <div className="my-auto text-3xl drop-shadow-sm filter sm:text-4xl">
                                {c.icon}
                            </div>

                            {/* Decorative Bottom Detail */}
                            <div className="flex w-full justify-center opacity-20">
                                <div className="h-px w-full bg-current" />
                            </div>

                            {/* Discard Overlay Hint */}
                            {discardingToEndTurn && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-900/10 opacity-0 transition-opacity hover:opacity-100">
                                    <span className="rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white">
                                        DISCARD
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
