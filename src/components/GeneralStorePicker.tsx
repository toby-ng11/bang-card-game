import { CARD_DEFS } from '@/definitions/cards';
import { CardKey } from '@/types';
import { Package, ShoppingCart, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import FancyHeader from './FancyHeader';
import GameCard from './GameCard';

interface GeneralStorePickerProps {
    cards: CardKey[];
    pickerName: string;
    isHumanPicking: boolean;
    onPick: (key: CardKey) => void;
}

const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

const modalVariants = {
    hidden: { scale: 0.9, y: 30, opacity: 0 },
    visible: { scale: 1, y: 0, opacity: 1, transition: { delay: 0.1 } },
};

export default function GeneralStorePicker({
    cards,
    pickerName,
    isHumanPicking,
    onPick,
}: GeneralStorePickerProps) {
    // Stable snapshot of the original card list, set once when the store opens
    const originalCardsRef = useRef(
        cards.map((key, i) => ({
            key,
            displayKey: `${key}-stable-${i}`,
        })),
    );

    // Track which original indices have been picked (by this component)
    const [pickedIndices, setPickedIndices] = useState<Set<number>>(
        () => new Set(),
    );
    const prevCardsRef = useRef<CardKey[]>(cards);

    // When the AI picks a card (cards prop shrinks), sync pickedIndices so the
    // correct cell collapses. We diff the previous live count against the new one.
    useEffect(() => {
        const prev = prevCardsRef.current;
        if (prev.length > cards.length) {
            // Find which key was removed (first missing one by count)
            const prevCount = new Map<CardKey, number>();
            prev.forEach((k) => prevCount.set(k, (prevCount.get(k) ?? 0) + 1));
            const nextCount = new Map<CardKey, number>();
            cards.forEach((k) => nextCount.set(k, (nextCount.get(k) ?? 0) + 1));

            let removedKey: CardKey | null = null;
            for (const [k, count] of prevCount) {
                if ((nextCount.get(k) ?? 0) < count) {
                    removedKey = k;
                    break;
                }
            }

            if (removedKey !== null) {
                const rk = removedKey;

                // Use the functional setter to access the latest 'prevIndices'
                // without needing 'pickedIndices' in the dependency array
                setPickedIndices((currentSet) => {
                    const targetIndex = originalCardsRef.current.findIndex(
                        ({ key }, i) => key === rk && !currentSet.has(i),
                    );

                    if (targetIndex !== -1) {
                        const nextSet = new Set(currentSet);
                        nextSet.add(targetIndex);
                        return nextSet;
                    }
                    return currentSet; // No change
                });
            }
        }

        prevCardsRef.current = cards;
    }, [cards]);

    const handlePick = (key: CardKey, index: number) => {
        if (!isHumanPicking) return;
        // Mark as picked immediately so the card exits from its cell
        setPickedIndices((prev) => new Set(prev).add(index));
        // Delay onPick slightly so the exit animation has time to start
        setTimeout(() => onPick(key), 350);
    };

    return (
        <AnimatePresence>
            {originalCardsRef.current.length > 0 && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0 }}
                    variants={overlayVariants}
                >
                    <motion.div
                        className="w-full max-w-4xl rounded-3xl border-2 border-amber-900/50 bg-[#2c1a11] p-8 shadow-2xl shadow-black/60"
                        variants={modalVariants}
                    >
                        {/* Header */}
                        <div className="mb-8 flex items-center justify-between gap-6 border-b border-amber-900/30 pb-6">
                            <div className="flex items-center gap-5">
                                <div className="rounded-2xl border border-amber-700/50 bg-[#1e110b] p-5 shadow-inner">
                                    <ShoppingCart className="h-10 w-10 text-amber-500" />
                                </div>
                                <div>
                                    <FancyHeader size="lg" color="amber">
                                        General Store
                                    </FancyHeader>
                                    <div className="mt-1 flex items-center gap-2 text-amber-300">
                                        <Package size={16} />
                                        <span>
                                            {cards.length} cards remaining
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-sm font-semibold tracking-wider text-amber-600 uppercase">
                                    Current Turn
                                </div>
                                <div className="flex items-center gap-2 text-2xl font-bold text-stone-100">
                                    {isHumanPicking && (
                                        <Sparkles className="h-6 w-6 animate-pulse text-yellow-400" />
                                    )}
                                    {isHumanPicking
                                        ? 'Your Pick!'
                                        : `${pickerName} Picking...`}
                                </div>
                            </div>
                        </div>

                        {/* Card pool — stable grid, cells never reflow */}
                        <div className="relative rounded-2xl border-4 border-dashed border-amber-900/30 bg-[#25160e] p-6">
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] justify-center gap-6">
                                {originalCardsRef.current.map(
                                    ({ key, displayKey }, index) => {
                                        const isPicked =
                                            pickedIndices.has(index);
                                        const cardDef = CARD_DEFS[key];

                                        return (
                                            // Permanent grid cell — never unmounts, never shifts
                                            <div
                                                key={displayKey}
                                                className="relative flex items-center justify-center"
                                            >
                                                <AnimatePresence>
                                                    {!isPicked && (
                                                        <motion.div
                                                            initial={{
                                                                opacity: 0,
                                                                scale: 0.5,
                                                                y: -20,
                                                            }}
                                                            animate={{
                                                                opacity: 1,
                                                                scale: 1,
                                                                y: 0,
                                                            }}
                                                            exit={{
                                                                opacity: 0,
                                                                scale: 0.4,
                                                                y: -70,
                                                                rotate: -8,
                                                            }}
                                                            transition={{
                                                                type: 'spring',
                                                                stiffness: 200,
                                                                damping: 20,
                                                            }}
                                                            className={`group relative ${
                                                                isHumanPicking
                                                                    ? 'cursor-pointer'
                                                                    : 'pointer-events-none opacity-70'
                                                            }`}
                                                            onClick={() =>
                                                                handlePick(
                                                                    key,
                                                                    index,
                                                                )
                                                            }
                                                        >
                                                            <GameCard
                                                                cardKey={key}
                                                                size="lg"
                                                            />

                                                            {/* Hover overlay — human only */}
                                                            {isHumanPicking && (
                                                                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                                                    <motion.button
                                                                        whileHover={{
                                                                            scale: 1.1,
                                                                        }}
                                                                        whileTap={{
                                                                            scale: 0.95,
                                                                        }}
                                                                        className="flex items-center gap-2 rounded-full border border-amber-400 bg-amber-600 px-6 py-2.5 font-bold text-stone-50 shadow-lg"
                                                                    >
                                                                        <Package
                                                                            size={
                                                                                18
                                                                            }
                                                                        />
                                                                        Take
                                                                        Card
                                                                    </motion.button>
                                                                </div>
                                                            )}

                                                            {/* AI tooltip */}
                                                            {!isHumanPicking &&
                                                                cardDef && (
                                                                    <div className="pointer-events-none absolute top-1 right-1 w-48 rounded bg-black/90 p-2 text-xs text-white opacity-0 group-hover:opacity-100">
                                                                        {
                                                                            cardDef.name
                                                                        }{' '}
                                                                        —{' '}
                                                                        {
                                                                            cardDef.desc
                                                                        }
                                                                    </div>
                                                                )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-8 text-center text-sm text-stone-500 italic">
                            {isHumanPicking
                                ? 'Everyone alive chooses one card from the pool, starting with the player who activated the General Store.'
                                : 'Waiting for the current player to select a card...'}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
