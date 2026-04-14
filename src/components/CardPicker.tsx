import { CARD_DEFS } from '@/definitions/cards';
import { shuffle } from '@/game/helpers';
import { cn } from '@/lib/utils';
import { CardPick, CardPickSource, Player } from '@/types';
import { AnimatePresence, motion } from 'motion/react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';

interface CardPickerProps {
    target: Player;
    label: string;
    onPick: (picked: CardPick) => void;
}

export default function CardPicker({ target, label, onPick }: CardPickerProps) {
    const allCards: CardPick[] = [
        ...shuffle(
            target.hand.map((key, idx) => ({
                source: 'hand' as CardPickSource,
                idx,
                key,
            })),
        ),
        ...target.inPlay.map((key, idx) => ({
            source: 'inPlay' as CardPickSource,
            idx,
            key,
        })),
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-2xl overflow-hidden rounded-xl border-2 border-amber-600/50 bg-slate-900 shadow-2xl"
            >
                {/* Header */}
                <div className="bg-amber-600 p-3 text-center">
                    <h2 className="font-bold tracking-widest text-white uppercase">
                        {label}
                    </h2>
                </div>

                <div className="p-6">
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <AnimatePresence>
                            {allCards.map((pick) => {
                                const { source, idx, key } = pick;
                                const c = CARD_DEFS[key];
                                const isInPlay = source === 'inPlay';

                                return (
                                    <motion.div
                                        key={`${source}-${idx}`}
                                        whileHover={{ y: -5, scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => onPick(pick)}
                                    >
                                        <Card
                                            className={cn(
                                                'relative flex aspect-2/3 w-30 cursor-pointer flex-col items-center justify-center overflow-hidden border-2 p-2 text-center transition-colors select-none',
                                                isInPlay
                                                    ? 'border-blue-400 bg-white text-slate-900'
                                                    : 'border-amber-500 bg-linear-to-br from-red-800 to-red-950 text-white',
                                            )}
                                        >
                                            {isInPlay ? (
                                                <>
                                                    <span className="mb-1 text-2xl">
                                                        {c?.icon}
                                                    </span>
                                                    <span className="text-[10px] leading-tight font-bold uppercase">
                                                        {c?.name}
                                                    </span>
                                                    <Badge
                                                        variant="secondary"
                                                        className="absolute -bottom-1 h-4 border-blue-200 bg-blue-100 px-1 text-[8px] text-blue-700"
                                                    >
                                                        IN PLAY
                                                    </Badge>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="absolute inset-1 rounded-sm border border-amber-500/30" />
                                                    <span className="rotate-12 text-4xl opacity-20">
                                                        🤠
                                                    </span>
                                                    <span className="font-serif text-[10px] tracking-tighter opacity-80">
                                                        BANG!
                                                    </span>
                                                </>
                                            )}
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="bg-slate-950/50 p-3 text-center text-xs text-slate-400 italic">
                    Careful... choosing a card can change the fate of the West.
                </div>
            </motion.div>
        </div>
    );
}
