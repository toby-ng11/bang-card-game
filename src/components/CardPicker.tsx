import { CARD_DEFS } from '@/definitions/cards';
import { cn } from '@/lib/utils';
import { CardPick, CardPickSource, Player } from '@/types';

interface CardPickerProps {
    target: Player;
    label: string;
    onPick: (picked: CardPick) => void;
}

export default function CardPicker({ target, label, onPick }: CardPickerProps) {
    const allCards: CardPick[] = [
        ...target.hand.map((key, idx) => ({
            source: 'hand' as CardPickSource,
            idx,
            key,
        })),
        ...target.inPlay.map((key, idx) => ({
            source: 'inPlay' as CardPickSource,
            idx,
            key,
        })),
    ];

    return (
        <div className="mb-3">
            <div className="mb-2 text-xs font-medium text-red-500">{label}</div>
            <div className="flex flex-wrap gap-2">
                {allCards.map(({ source, idx, key }) => {
                    const c = CARD_DEFS[key];
                    const isInPlay = source === 'inPlay';
                    return (
                        <div
                            key={`${source}-${idx}`}
                            onClick={() => onPick({ source, idx, key })}
                            title={
                                isInPlay ? c?.desc || '' : 'A face-down card'
                            }
                            className={cn(
                                'card tooltip cursor-pointer',
                                isInPlay
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'bg-gray-100 dark:bg-gray-800',
                            )}
                        >
                            <span className="card-icon">
                                {isInPlay ? c?.icon || '?' : '🂠'}
                            </span>
                            <span className="card-name">
                                {isInPlay ? c?.name || key : 'Unknown'}
                            </span>
                            {isInPlay && (
                                <span className="text-[9px] text-blue-500">
                                    in play
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
