import { CARD_DEFS } from '@/definitions/cards';
import { cn } from '@/lib/utils';
import { CardKey } from '@/types';

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
            <div className="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
                {discardingToEndTurn ? (
                    <span className="text-red-500 normal-case">
                        Discard {hand.length} card(s) to end your turn — click a
                        card to discard it
                    </span>
                ) : (
                    'Your Hand'
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {hand.length === 0 && (
                    <span className="text-sm text-gray-500">No cards.</span>
                )}
                {hand.map((cardKey, i) => {
                    const c = CARD_DEFS[cardKey];
                    if (!c) return null;
                    const isSel = selectedCard === i;
                    return (
                        <div
                            key={`${cardKey}-${crypto.randomUUID()}`}
                            onClick={() => onCardClick(i)}
                            title={c.desc}
                            className={cn(
                                'card tooltip cursor-pointer',
                                isSel && 'selected',
                                discardingToEndTurn && 'border-red-500',
                            )}
                        >
                            <span className="card-icon">{c.icon}</span>
                            <span className="card-name">{c.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
