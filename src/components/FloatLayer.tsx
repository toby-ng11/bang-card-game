import { CARD_DEFS } from '@/definitions/cards';
import { cn } from '@/lib/utils';
import { CardKey } from '@/types';
import { motion } from 'motion/react';
import { useState } from 'react';

interface FloatAnimationProps {
    cardKey: CardKey;
    fromId: number | 'deck' | 'discard';
    toId: number | 'deck' | 'discard';
    count?: number;
    onComplete: () => void;
}

export function FloatAnimation({
    cardKey,
    fromId,
    toId,
    count = 1,
    onComplete,
}: FloatAnimationProps) {
    const [rects] = useState(() => {
        const fromEl = document.querySelector(`[data-pid="${fromId}"]`);
        const toEl = document.querySelector(`[data-pid="${toId}"]`);
        if (!fromEl || !toEl) return null;
        return {
            start: fromEl.getBoundingClientRect(),
            end: toEl.getBoundingClientRect(),
        };
    });

    if (!rects) {
        onComplete();
        return null;
    }

    const { start, end } = rects;
    const c = CARD_DEFS[cardKey];
    const isDrawing = fromId === 'deck';

    const cardW = 80; // w-20
    const cardH = 110; // h-27.5

    const startX = start.left + start.width / 2 - cardW / 2;
    const startY = start.top + start.height / 2 - cardH / 2;
    const endX = end.left + end.width / 2 - cardW / 2;
    const endY = end.top + end.height / 2 - cardH / 2;

    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <motion.div
                    key={`float-${cardKey}-${i}`}
                    className={cn(
                        'fixed z-120 flex h-27.5 w-20 flex-col items-center justify-center rounded-xl border-2 shadow-2xl',
                        isDrawing
                            ? 'border-stone-600 bg-stone-800' // face-down while traveling
                            : c?.color === 'blue'
                              ? 'border-blue-800 bg-blue-100'
                              : 'border-amber-800 bg-amber-100',
                    )}
                    style={{ transformStyle: 'preserve-3d' }}
                    initial={{
                        x: startX,
                        y: startY,
                        scale: 0.7,
                        opacity: 0.9,
                        rotateZ: 0,
                        rotateY: 0,
                    }}
                    animate={{
                        x: endX,
                        y: endY,
                        scale: 1,
                        rotateY: 0, // Always finish face up
                        rotateZ: [0, -10, 10, 0], // The "Wobble" toss
                        opacity: 1,
                    }}
                    transition={{
                        duration: 0.7,
                        ease: [0.23, 1, 0.32, 1],
                        delay: i * 0.1,
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onAnimationComplete={() => {
                        // Only trigger the final completion if this is the last card in the count
                        if (i === count - 1) {
                            onComplete();
                        }
                    }}
                >
                    {/* The Front of the card */}
                    <div className="flex flex-col items-center">
                        <span className="text-3xl">{c?.icon || '?'}</span>
                        <span className="mt-1 px-1 text-center text-[9px] font-black text-amber-900 uppercase">
                            {c?.name}
                        </span>
                    </div>

                    {/* The Back of the card (Visible during flip) */}
                    <div className="absolute inset-0 flex rotate-y-180 items-center justify-center rounded-xl border-2 border-stone-700 bg-stone-900 backface-hidden">
                        <div className="flex h-16 w-12 items-center justify-center rounded border border-amber-900/30">
                            <span className="font-serif text-xl text-amber-900/50">
                                B
                            </span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </>
    );
}
