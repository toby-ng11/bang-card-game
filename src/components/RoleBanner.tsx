import { ROLE_INFO } from '@/definitions/roles';
import { cn } from '@/lib/utils';
import { Player, Role } from '@/types';
import { cva } from 'class-variance-authority';

const bannerVariants = cva(
    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm',
    {
        variants: {
            role: {
                sheriff: 'bg-[#FAEEDA] text-[#633806]',
                deputy: 'bg-[#E6F1FB] text-[#042C53]',
                outlaw: 'bg-[#FCEBEB] text-[#501313]',
                renegade: 'bg-[#EEEDFE] text-[#26215C]',
            } satisfies Record<Role, string>,
        },
    },
);

interface RoleBannerProps {
    human: Player;
}

export default function RoleBanner({ human }: RoleBannerProps) {
    const ri = ROLE_INFO[human.role];
    return (
        <div className={cn(bannerVariants({ role: human.role }))}>
            <div className="text-2xl">🤠</div>
            <div>
                <div className="text-lg font-medium">
                    You are the <strong>{ri.label}</strong>.
                </div>
                <div className="text-sm opacity-85">{ri.goal}</div>
            </div>
            <div className="ml-auto text-right text-xs">
                HP:{' '}
                <strong>
                    {human.hp}/{human.maxHp}
                </strong>{' '}
                · Hand: <strong>{human.hand.length}</strong>
            </div>
        </div>
    );
}
