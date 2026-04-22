import { CARD_DEFS } from '@/definitions/cards';
import { cn } from '@/lib/utils';
import { CardKey } from '@/types';
import { Crosshair } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface PlayerHandProps {
    hand: CardKey[];
    currentLP: number;
    selectedCard: number | null;
    discardingToEndTurn: boolean;
    bangUsed: boolean;
    hasVolcanic: boolean;
    isHumanTurn: boolean;
    isHumanTurnToReact: boolean;
    onCardClick: (idx: number) => void;
}

export default function PlayerHand({
    hand,
    currentLP,
    selectedCard,
    discardingToEndTurn,
    bangUsed,
    hasVolcanic,
    isHumanTurn,
    isHumanTurnToReact,
    onCardClick,
}: PlayerHandProps) {
    const handleReturn = () => {
        return;
    };
    return (
        <div className="relative min-w-0 px-4">
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

            <div className="flex flex-row gap-2">
                {hand.map((cardKey, i) => {
                    const c = CARD_DEFS[cardKey];
                    if (!c) return null;
                    const isSel = selectedCard === i;
                    return (
                        <Tooltip key={`${cardKey}-${crypto.randomUUID()}`}>
                            <TooltipTrigger asChild>
                                <motion.div
                                    layout
                                    whileHover={{ y: -20, zIndex: 50 }}
                                    className={cn(
                                        // Base Styles: Fixed height, flexible width with min/max constraints
                                        '@container relative flex aspect-2/3 w-full max-w-30 min-w-0 shrink cursor-pointer flex-col items-center justify-between rounded-xl border-2 p-2 shadow-2xl select-none',

                                        // Color Themes
                                        c.color === 'brown' &&
                                            'border-amber-800 bg-linear-to-br from-amber-100 to-amber-200 text-amber-950',
                                        c.color === 'blue' &&
                                            'border-blue-800 bg-linear-to-br from-blue-100 to-blue-200 text-blue-950',
                                        cardKey === 'bang' &&
                                            bangUsed &&
                                            isHumanTurn &&
                                            !hasVolcanic &&
                                            !discardingToEndTurn &&
                                            'cursor-not-allowed opacity-60',
                                        // Selection / Discard States
                                        isSel &&
                                            'z-40 -translate-y-6 border-yellow-500 ring-4 shadow-yellow-500/50 ring-yellow-400',
                                        discardingToEndTurn &&
                                            'border-red-500 grayscale-[0.3] hover:grayscale-0',
                                        !isSel &&
                                            !discardingToEndTurn &&
                                            'hover:border-white',
                                    )}
                                    onClick={() =>
                                        cardKey === 'bang' &&
                                        bangUsed &&
                                        !hasVolcanic &&
                                        !discardingToEndTurn
                                            ? handleReturn
                                            : onCardClick(i)
                                    }
                                >
                                    {/* Card Content */}
                                    <div className="flex w-full items-start justify-between font-roboto text-[15cqi] font-black font-stretch-50%">
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

                                    <div className="my-auto flex flex-col items-center gap-2 text-[40cqi] drop-shadow-sm filter">
                                        {/* Main Card Icon (e.g., the Gun or the Hand) */}
                                        {c.icon}

                                        {/* Range Indicator - only shows if c.range exists */}
                                        {c.range && (
                                            <div className="flex items-center justify-center gap-1 opacity-90">
                                                <Crosshair className="inline-block" />
                                                <span className="font-bold">
                                                    {c.range}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Decorative Bottom Detail */}
                                    <div className="flex w-full justify-center opacity-20">
                                        <div className="h-px w-full bg-current"></div>
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
                            </TooltipTrigger>
                            <TooltipContent
                                side="top"
                                className="bg-amber-200 text-black"
                            >
                                {c.desc}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </div>
    );
}
