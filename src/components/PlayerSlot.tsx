import { CARD_DEFS } from '@/definitions/cards';
import { CHARACTER_DEFS } from '@/definitions/character';
import { distance, inRange } from '@/game/helpers';
import { cn } from '@/lib/utils';
import { CardKey, Phase, Player, Role } from '@/types';
import { cva } from 'class-variance-authority';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface PlayerSlotProps {
    p: Player;
    human: Player;
    phase: Phase;
    players: Player[];
    turn: number;
    targeting: boolean;
    selectedCard: number | null;
    flashClass: string;
    onPlayerClick: (id: number) => void;
}

const roleVariants = cva('text-[10px] font-medium px-[7px] py-[2px] ml-1', {
    variants: {
        role: {
            SHERIFF: 'bg-[#faeeda] text-[#633806] border-transparent',
            DEPUTY: 'bg-[#e6f1fb] text-[#042c53] border-transparent',
            OUTLAW: 'bg-[#fcebeb] text-[#501313] border-transparent',
            RENEGADE: 'bg-[#eeedfe] text-[#26215c] border-transparent',
        },
    },
});

export default function PlayerSlot({
    p,
    human,
    phase,
    players,
    turn,
    targeting,
    selectedCard,
    flashClass,
    onPlayerClick,
}: PlayerSlotProps) {
    const isGlobalTargetingCard = (cardKey: string) =>
        ['catbalou', 'duel'].includes(cardKey);

    const isJesseJonesSteal = (phase: string, character: string) =>
        phase === 'draw' && character === 'jesse_jones';

    const selectedCardKey =
        selectedCard !== null ? human.hand[selectedCard] : null;

    const canTargetAllPlayers =
        (selectedCardKey && isGlobalTargetingCard(selectedCardKey)) ||
        isJesseJonesSteal(phase, human.character);

    const isClickTarget = (() => {
    // Basic requirements: Must be targeting, a non-human, and alive
    if (!targeting || p.isHuman || !p.alive) return false;

    // Phase-specific targeting logic
    if (phase === 'draw') {
        return isJesseJonesSteal(phase, human.character);
    }

    // Card-specific targeting logic
    if (selectedCard !== null && selectedCardKey) {
        return canTargetAllPlayers || inRange(players, human.id, p.id, selectedCardKey);
    }

    return false;
})();

    const isCur = p.id === turn;
    const showRole = p.role === 'SHERIFF' || !p.alive || p.isHuman;
    const roleLabel = showRole ? p.role : 'unknown';
    const dist = p.isHuman ? 0 : distance(players, 0, p.id);

    return (
        <div
            data-pid={p.id}
            onClick={() => onPlayerClick(p.id)}
            className={cn(
                'player-row relative flex cursor-pointer flex-col rounded-lg border border-amber-800/50 bg-black/20 px-3 py-2 transition duration-300 ease-in-out hover:border-amber-600',
                !p.alive && 'cursor-not-allowed opacity-40',
                targeting &&
                    (isClickTarget
                        ? 'border-red-500/30 hover:border-red-500 hover:bg-red-400/30'
                        : 'cursor-not-allowed opacity-40'),
                isCur && 'border-l-5 border-l-blue-500 hover:border-l-blue-500',
                flashClass,
            )}
        >
            {isClickTarget && (
                <div className="absolute inset-0 animate-ping rounded-lg border-2 border-red-400"></div>
            )}
            <div className="flex flex-col gap-1.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="text-[10px] leading-none font-bold tracking-widest text-amber-600/80 uppercase">
                            {CHARACTER_DEFS[p.character].name}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent
                        side="top"
                        className="bg-amber-200 text-black"
                    >
                        {CHARACTER_DEFS[p.character].desc}
                    </TooltipContent>
                </Tooltip>

                {/* Name row */}
                <div className="flex flex-wrap items-center gap-2 text-lg font-medium">
                    {p.name}
                    <Badge
                        variant="secondary"
                        className={cn(
                            roleVariants({ role: roleLabel as Role }),
                        )}
                    >
                        {roleLabel}
                    </Badge>
                    {isCur && <span className="text-blue-400">◀</span>}
                    {!p.isHuman && p.alive && (
                        <Badge
                            variant="secondary"
                            className="size-4 rounded-full p-2"
                        >
                            {dist}
                        </Badge>
                    )}
                </div>

                {/* HP pips */}
                <div className="mt-0.5 flex gap-1">
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
