import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { GameState, Player, Role, Winner } from '@/types';
import { cva } from 'class-variance-authority';

interface Props {
    G: GameState;
    onPlayAgain: () => void;
}

const WINNER_MESSAGES: Record<NonNullable<Winner>, string> = {
    SHERIFF: '🌟 Sheriff & Deputies Win!',
    OUTLAW: '💀 Outlaws Win! Sheriff eliminated.',
    RENEGADE: '🎭 Renegade Wins!',
};

const roleBadgeVariants = cva('text-[10px] font-medium px-2 py-0.5 rounded', {
    variants: {
        role: {
            SHERIFF: 'bg-[#FAEEDA] text-[#633806]',
            DEPUTY: 'bg-[#E6F1FB] text-[#042C53]',
            OUTLAW: 'bg-[#FCEBEB] text-[#501313]',
            RENEGADE: 'bg-[#EEEDFE] text-[#26215C]',
        } satisfies Record<Role, string>,
    },
});

function PlayerRow({ p }: { p: Player }) {
    return (
        <div className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm last:border-0 dark:border-gray-800">
            <span>{p.name}</span>
            <div className="flex items-center gap-2">
                <span className={cn(roleBadgeVariants({ role: p.role }))}>
                    {p.role}
                </span>
                <span>{p.alive ? '✅' : '❌'}</span>
            </div>
        </div>
    );
}

export default function GameOverDialog({ G, onPlayAgain }: Props) {
    const message = G.winner ? WINNER_MESSAGES[G.winner] : 'Game over.';

    return (
        <Dialog open={G.over}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Game Over</DialogTitle>
                    <DialogDescription>{message}</DialogDescription>
                </DialogHeader>

                <div className="my-2">
                    {G.players.map((p) => (
                        <PlayerRow key={p.id} p={p} />
                    ))}
                </div>

                <Button onClick={onPlayAgain} className="w-full">
                    Play Again
                </Button>
            </DialogContent>
        </Dialog>
    );
}
