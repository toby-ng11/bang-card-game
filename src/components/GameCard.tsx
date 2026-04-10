// components/game/GameCard.tsx
import { CARD_DEFS } from '@/definitions/cards';
import { CardKey } from '@/types';

export default function GameCard({
    cardKey,
    size = 'md',
}: {
    cardKey: CardKey;
    size?: 'sm' | 'md' | 'lg';
}) {
    const card = CARD_DEFS[cardKey];

    const sizeClasses = {
        sm: 'w-16 h-24 text-xs',
        md: 'w-24 h-36 text-sm',
        lg: 'w-32 h-48 text-base',
    };

    return (
        <div
            className={`${sizeClasses[size]} relative flex flex-col items-center justify-between rounded-xl border-2 border-stone-800 bg-stone-100 p-2 shadow-lg transition-transform hover:-translate-y-2`}
        >
            {/* Card Suit/Value Corner */}
            <div className="absolute top-1 left-1 flex flex-col items-center leading-none font-bold text-stone-800">
                <span>A</span>
                <span className="text-red-600">♥</span>
            </div>

            {/* Icon */}
            <div className="mt-4 text-4xl">{card?.icon || '🤠'}</div>

            {/* Name */}
            <div className="text-center leading-tight font-black text-stone-900 uppercase">
                {card?.name || cardKey}
            </div>

            {/* Texture Overlay (Optional) */}
            <div className="pointer-events-none absolute inset-0 bg-[url('/paper-texture.png')] opacity-10"></div>
        </div>
    );
}
