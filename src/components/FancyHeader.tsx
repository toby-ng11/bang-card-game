import { ReactNode } from 'react';

interface FancyHeaderProps {
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg';
    color?: 'amber' | 'red';
}

export default function FancyHeader({
    children,
    size = 'md',
    color = 'amber',
}: FancyHeaderProps) {
    const sizes: Record<string, string> = {
        sm: 'text-xl',
        md: 'text-3xl',
        lg: 'text-5xl',
    };

    const colors: Record<string, string> = {
        amber: 'text-amber-500 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]',
        red: 'text-red-600 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]',
    };

    return (
        <h2
            className={`${sizes[size]} ${colors[color]} font-black tracking-tighter uppercase italic`}
        >
            {children}
        </h2>
    );
}
