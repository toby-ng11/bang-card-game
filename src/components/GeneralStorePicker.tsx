import { CARD_DEFS } from '@/definitions/cards';
import { CardKey } from '@/types';

interface GeneralStorePickerProps {
    cards: CardKey[];
    onPick: (key: CardKey) => void;
}

export default function GeneralStorePicker({
    cards,
    onPick,
}: GeneralStorePickerProps) {
    if (!cards.length) return null;

    return (
        <div className="mb-3">
            <div className="mb-2 text-xs font-medium text-blue-500">
                🏪 General Store — pick one card
            </div>
            <div className="flex flex-wrap gap-2">
                {cards.map((cardKey) => {
                    const c = CARD_DEFS[cardKey];
                    return (
                        <div
                            key={cardKey}
                            className="card tooltip cursor-pointer"
                            onClick={() => onPick(cardKey)}
                            title={c?.desc || ''}
                        >
                            <span className="card-icon">{c?.icon || '?'}</span>
                            <span className="card-name">
                                {c?.name || cardKey}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
