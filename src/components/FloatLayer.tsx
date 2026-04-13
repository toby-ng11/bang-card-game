import { CARD_DEFS } from '@/definitions/cards';
import { cn } from '@/lib/utils';
import { CardKey } from '@/types';
import { motion } from 'motion/react';
import { useState } from 'react';

interface FloatAnimationProps {
    cardKey: CardKey;
    fromId: number | string;
    toId: number | string;
    onComplete: () => void;
}

export function FloatAnimation({
    cardKey,
    fromId,
    toId,
    onComplete,
}: FloatAnimationProps) {
    const [fromEl] = useState(() =>
        document.querySelector(`[data-pid="${fromId}"]`),
    );
    const [toEl] = useState(() =>
        document.querySelector(`[data-pid="${toId}"]`),
    );

    if (!fromEl || !toEl) {
        onComplete();
        return null;
    }

    const start = fromEl.getBoundingClientRect();
    const end = toEl.getBoundingClientRect();
    const c = CARD_DEFS[cardKey];

    // Logic: If it's coming from the deck, start face down
    const isDrawing = fromId === 'deck';

    return (
        <motion.div
            initial={{
                x: start.left + start.width / 2 - 40,
                y: start.top + start.height / 2 - 55,
                scale: 0.6,
                rotateY: isDrawing ? 180 : 0, // Start flipped if drawing
                opacity: 0,
            }}
            animate={{
                x: end.left + end.width / 2 - 40,
                y: end.top + end.height / 2 - 55,
                scale: 1,
                rotateY: 0, // Always finish face up
                rotateZ: [0, -10, 10, 0], // The "Wobble" toss
                opacity: 1,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
                duration: 0.7,
                ease: [0.23, 1, 0.32, 1], // "Back" ease for a snappy feel
                rotateY: { duration: 0.4, delay: 0.2 }, // Flip halfway through
            }}
            onAnimationComplete={onComplete}
            className={cn(
                'absolute z-120 flex h-27.5 w-20 flex-col items-center justify-center rounded-xl border-2 shadow-2xl backface-hidden',
                c?.color === 'blue'
                    ? 'border-blue-800 bg-blue-100'
                    : 'border-amber-800 bg-amber-100',
                isDrawing && 'border-stone-600 bg-stone-800', // Temporary back color
            )}
            style={{ transformStyle: 'preserve-3d' }}
        >
            {/* The Front of the card */}
            <div className="flex flex-col items-center">
                <span className="text-3xl">{c?.icon || '?'}</span>
                <span className="mt-1 px-1 text-center text-[9px] font-black uppercase">
                    {c?.name}
                </span>
            </div>

            {/* The Back of the card (Visible during flip) */}
            <div
                className="absolute inset-0 flex rotate-y-180 items-center justify-center rounded-xl border-2 border-stone-700 bg-stone-900 backface-hidden"
            >
                <div className="flex h-16 w-12 items-center justify-center rounded border border-amber-900/30">
                    <span className="font-serif text-xl text-amber-900/50">
                        B
                    </span>
                </div>
            </div>
        </motion.div>
    );
}
