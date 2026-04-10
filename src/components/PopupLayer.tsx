import { CARD_DEFS } from '@/definitions/cards';
import { CardKey } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

interface PopupInstanceProps {
    pid: number;
    cardKey: CardKey;
    type: 'play' | 'damage' | 'heal';
}

export default function PopupLayer({
    activePopups,
}: {
    activePopups: Array<{
        id: string;
        pid: number;
        cardKey: CardKey;
        type: 'play' | 'damage' | 'heal';
    }>;
}) {
    return (
        <div className="pointer-events-none fixed inset-0 z-100">
            <AnimatePresence>
                {activePopups.map((popup) => (
                    <PopupInstance key={popup.id} {...popup} />
                ))}
            </AnimatePresence>
        </div>
    );
}

function PopupInstance({ pid, cardKey, type }: PopupInstanceProps) {
    // Find the player element to get coordinates
    const [playerEl] = useState(() =>
        document.querySelector(`[data-pid="${pid}"]`),
    );
    if (!playerEl) return null;

    const rect = playerEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top; // Start at the top of the player slot

    const card = CARD_DEFS[cardKey];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: -60, scale: 1.1 }} // Float upwards
            exit={{ opacity: 0, y: -100, scale: 0.8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute flex flex-col items-center justify-center rounded-xl border-2 border-amber-500 bg-white p-2 shadow-2xl"
            style={{
                width: '80px',
                height: '110px',
                position: 'absolute',
                left: x - 40,
                top: y,
            }}
        >
            <span className="text-3xl">{card?.icon || '❓'}</span>
            <span className="mt-1 w-full truncate text-center text-[10px] font-bold text-stone-800 uppercase">
                {card?.name}
            </span>

            {/* Glow effect based on type */}
            <div
                className={`absolute inset-0 -z-10 opacity-50 blur-xl ${
                    type === 'heal'
                        ? 'bg-green-500'
                        : type === 'damage'
                          ? 'bg-red-500'
                          : 'bg-amber-400'
                }`}
            />
        </motion.div>
    );
}
