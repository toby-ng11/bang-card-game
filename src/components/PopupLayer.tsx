import { CARD_DEFS } from '@/definitions/cards';
import { GameAction } from '@/gameReducer';
import { CardKey } from '@/types';
import { AnimatePresence, motion } from 'motion/react';
import { Dispatch } from 'react';

interface PopupInstanceProps {
    id: string;
    pid: number;
    cardKey: CardKey;
    type: 'play' | 'damage' | 'heal';
    dispatch: Dispatch<GameAction>;
}

export default function PopupLayer({
    activePopups,
    dispatch,
}: {
    activePopups: Array<{
        id: string;
        pid: number;
        cardKey: CardKey;
        type: 'play' | 'damage' | 'heal';
    }>;
    dispatch: Dispatch<GameAction>;
}) {
    return (
        <div className="pointer-events-none fixed inset-0 z-100">
            <AnimatePresence>
                {activePopups.map((popup) => (
                    <PopupInstance
                        key={popup.id}
                        {...popup}
                        dispatch={dispatch}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

function PopupInstance({
    id,
    pid,
    cardKey,
    type,
    dispatch,
}: PopupInstanceProps) {
    // Find the player element to get coordinates
    const getPlayerElement = () =>
        document.querySelector(`[data-pid="${pid}"]`);
    const playerEl = getPlayerElement();
    if (!playerEl) return null;

    const rect = playerEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top; // Start at the top of the player slot

    const card = CARD_DEFS[cardKey];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: -60, scale: 1.1 }} // Float upwards
            exit={{
                opacity: 0,
                y: -100,
                scale: 0.8,
                transition: { duration: 0.4, delay: 0.8 },
            }}
            transition={{ ease: 'easeOut' }}
            className="absolute flex flex-col items-center justify-center rounded-xl border-2 border-amber-500 bg-white p-2 shadow-2xl"
            style={{
                width: '80px',
                height: '110px',
                position: 'absolute',
                left: x - 40,
                top: y,
            }}
            onAnimationComplete={() => dispatch({ type: 'REMOVE_POPUP', id })}
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
