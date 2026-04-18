import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';

export default function GameLog({ log }: { log: string[] }) {
    return (
        <div className="scrollbar-thin scrollbar-thumb-amber-900/40 scrollbar-track-transparent flex h-full flex-col gap-2 overflow-y-auto pr-2">
            <AnimatePresence initial={false}>
                {log.map((entry) => {
                    // Logic to detect entry type for styling
                    const isDamage =
                        entry.includes('damage') || entry.includes('died');
                    const isHeal =
                        entry.includes('beer') ||
                        entry.includes('heal') ||
                        entry.includes('dodge');
                    const isAction =
                        entry.includes('play') || entry.includes('unleashed');
                    const isAbility = entry.includes('ability');
                    const isDuel = entry.includes('Duel');

                    return (
                        <motion.div
                            key={`${entry}-${crypto.randomUUID()}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(
                                'rounded-lg border-l-2 border-amber-700/30 bg-white/5 p-2 text-xs leading-relaxed text-stone-300 transition-colors',
                                isDamage &&
                                    'border-red-600 bg-red-950/20 text-red-200',
                                isHeal &&
                                    'border-green-600 bg-green-950/20 text-green-200',
                                isDuel &&
                                    'border-orange-500 bg-orange-950/30 text-orange-200',
                                isAbility &&
                                    'border-orange-500 bg-orange-950/30 text-orange-200',
                            )}
                        >
                            <span className="font-medium opacity-90">
                                {entry}
                            </span>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
