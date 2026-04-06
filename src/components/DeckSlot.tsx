import { CARD_DEFS } from '@/definitions/cards';
import { cn } from '@/lib/utils';
import { CardKey } from '@/types';

interface DeckSlotProps {
    deck: CardKey[];
    discardPile: CardKey[];
}

export default function DeckSlot({ deck, discardPile }: DeckSlotProps) {
    const top = discardPile[discardPile.length - 1];
    const c = top ? CARD_DEFS[top] : null;

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="text-[11px] font-medium text-gray-500">DECK</div>
            <div className="card back cursor-default">
                <div className="card-icon">🂠</div>
                <div className="card-name">{deck.length} left</div>
            </div>
            <div className="text-[11px] font-medium text-gray-500">DISCARD</div>
            <div className={cn('card cursor-default', !c && 'opacity-30')}>
                <div className="card-icon">{c?.icon || '?'}</div>
                <div className="card-name">{c?.name || 'empty'}</div>
                <div className="card-name">{discardPile.length} cards</div>
            </div>
        </div>
    );
}
