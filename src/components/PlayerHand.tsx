import { CARD_DEFS } from '@/definitions/cards';
import { cn } from '@/lib/utils';
import { CardKey } from '@/types';
import { Button } from './ui/button';

interface PlayerHandProps {
    hand: CardKey[];
    selectedCard: number | null;
    discardingToEndTurn: boolean;
    onCardClick: (idx: number) => void;
}

export default function PlayerHand({
    hand,
    selectedCard,
    discardingToEndTurn,
    onCardClick,
}: PlayerHandProps) {
    return (
        <div className="mb-3">
            <div className="mb-2 text-center text-xs font-medium tracking-wide text-gray-500 uppercase">
                {discardingToEndTurn ? (
                    <span className="text-red-500 normal-case">
                        Discard {hand.length} card(s) to end your turn — click a
                        card to discard it
                    </span>
                ) : (
                    'Your Hand'
                )}
            </div>

            <div className="flex flex-wrap justify-center gap-4">
                {hand.length === 0 && (
                    <span className="text-sm text-gray-500">No cards.</span>
                )}
                {hand.map((cardKey, i) => {
                    const c = CARD_DEFS[cardKey];
                    if (!c) return null;
                    const isSel = selectedCard === i;
                    return (
                        <Button
                            key={`${cardKey}-${crypto.randomUUID()}`}
                            onClick={() => onCardClick(i)}
                            variant="secondary"
                            className={cn(
                                'flex min-h-35 w-25 cursor-pointer flex-col items-center gap-4 rounded-sm border py-4 hover:scale-110',
                                c.color === 'brown' &&
                                    'border border-amber-600 bg-amber-500/20 hover:bg-amber-500/40',
                                c.color === 'blue' &&
                                    'border border-blue-500 bg-blue-400/20 hover:bg-blue-400/40',
                                isSel && 'border-3',
                                discardingToEndTurn && 'border-red-500',
                            )}
                        >
                            <div className="text-xl font-bold font-stretch-extra-condensed">
                                {c.name}
                            </div>
                            <div className="text-3xl">{c.icon}</div>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
