import { CARD_DEFS } from '@/definitions/cards';
import { cn } from '@/lib/utils';
import { CardKey } from '@/types';

interface DeckSlotProps {
    deck: CardKey[];
    discardPile: CardKey[];
}

export default function DeckSlot({ deck, discardPile }: DeckSlotProps) {
    const top = discardPile[0];
    const c = top ? CARD_DEFS[top] : null;

    return (
        <div className="ml-4 flex flex-col justify-center gap-4">
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
                <div className="text-sm font-medium text-gray-500">DECK</div>
                <div className="text-2xl">🂠</div>
                <div className="text-sm text-secondary-foreground">
                    {deck.length} left
                </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
                <div className="text-sm font-medium text-gray-500">DISCARD</div>
                <div
                    className={cn(
                        'flex cursor-default flex-col items-center gap-4',
                        !c && 'opacity-30',
                    )}
                >
                    <div className="text-2xl">{c?.icon || '?'}</div>
                    <div className="text-sm text-secondary-foreground">
                        {c?.name || 'empty'}
                    </div>
                    <div className="text-sm text-secondary-foreground">
                        {discardPile.length} card(s)
                    </div>
                </div>
            </div>
        </div>
    );
}
