import { CARD_DEFS } from '@/definitions/cards';
import { distance, inRange } from '@/game/helpers';
import { cn } from '@/lib/utils';
import { CardKey, Player, Role } from '@/types';
import { cva } from 'class-variance-authority';

interface PlayerSlotProps {
    p: Player;
    human: Player;
    players: Player[];
    turn: number;
    targeting: boolean;
    selectedCard: number | null;
    flashClass: string;
    onPlayerClick: (id: number) => void;
}

const roleVariants = cva('badge', {
    variants: {
        role: {
            sheriff: 'badge-sheriff',
            deputy: 'badge-deputy',
            outlaw: 'badge-outlaw',
            renegade: 'badge-renegade',
            unknown: 'badge-unknown',
        },
    },
});

export default function PlayerSlot({
    p,
    human,
    players,
    turn,
    targeting,
    selectedCard,
    flashClass,
    onPlayerClick,
}: PlayerSlotProps) {
    const canTargetAllPlayers =
        selectedCard !== null &&
        ['catbalou', 'duel'].includes(human.hand[selectedCard]);

    const isClickTarget =
        targeting &&
        !p.isHuman &&
        p.alive &&
        (canTargetAllPlayers ? true : inRange(players, human.id, p.id));

    const isCur = p.id === turn;
    const showRole = p.role === 'sheriff' || !p.alive || p.isHuman;
    const roleLabel = showRole ? p.role : 'unknown';
    const dist = p.isHuman ? 0 : distance(players, 0, p.id);

    return (
        <div
            data-pid={p.id}
            onClick={() => onPlayerClick(p.id)}
            className={cn(
                'player-row relative flex flex-col rounded-lg border border-black/20 px-3 py-2 transition duration-300 ease-in-out hover:border-black',
                !p.alive && 'dead',
                targeting &&
                    (isClickTarget
                        ? 'border-red-500/30 hover:border-red-500'
                        : 'cursor-not-allowed opacity-40'),
                isCur && 'border-l-5 border-l-blue-500 hover:border-l-blue-500',
                flashClass,
            )}
        >
            {isClickTarget && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 flex size-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex size-3 rounded-full bg-red-500"></span>
                </span>
            )}
            <div className="flex-1">
                {/* Name row */}
                <div className="flex flex-wrap items-center gap-0.5 text-[13px] font-medium">
                    {p.name}
                    <span
                        className={cn(
                            roleVariants({ role: roleLabel as Role }),
                        )}
                    >
                        {roleLabel}
                    </span>
                    {isCur && (
                        <span className="text-blue-400">◀</span>
                    )}
                    {!p.isHuman && p.alive && (
                        <span
                            className={cn(
                                'badge',
                                dist === 1
                                    ? 'badge-in-range'
                                    : 'badge-out-range',
                            )}
                        >
                            {dist === 1 ? 'in range' : 'dist ' + dist}
                        </span>
                    )}
                </div>

                {/* HP pips */}
                <div className="mt-0.5 flex gap-0.5">
                    {Array(p.maxHp)
                        .fill(0)
                        .map((_, i) => (
                            <span
                                key={`LP-${crypto.randomUUID()}`}
                                className={cn(
                                    'inline-block h-3 w-3 rounded-full',
                                    i < p.hp
                                        ? 'bg-[#D85A30]'
                                        : 'bg-gray-300 dark:bg-gray-600',
                                )}
                            />
                        ))}
                </div>

                {/* HP text + card count */}
                <div className="mt-0.5 text-[11px] text-gray-500">
                    {p.hp}/{p.maxHp} HP · {p.hand.length} cards
                </div>

                {/* In-play cards */}
                {p.inPlay.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                        {p.inPlay.map((cardKey: CardKey) => {
                            const c = CARD_DEFS[cardKey];
                            return (
                                <div
                                    key={cardKey}
                                    className="inline-flex items-center gap-0.5 rounded border border-blue-500 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-900"
                                >
                                    {c?.icon || '?'} {c?.name || cardKey}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
