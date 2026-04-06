import { distance } from '@/game/helpers';
import { cn } from '@/lib/utils';
import { Player } from '@/types';

interface DistanceMapProps {
    players: Player[];
}

export default function DistanceMap({ players }: DistanceMapProps) {
    const aliveAll = players.filter((p) => p.alive);
    const dead = players.filter((p) => !p.alive && p.id !== 0);

    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-2 text-[11px] font-medium tracking-wide text-gray-500 uppercase">
                Distance from you (range 1 = can BANG!)
            </div>

            <div className="flex flex-wrap items-center gap-1">
                {aliveAll.map((p, i) => {
                    const dist = p.isHuman ? 0 : distance(players, 0, p.id);
                    const isYou = p.isHuman;

                    return (
                        <div key={p.id} className="flex items-center gap-1">
                            <div className="flex flex-col items-center gap-0.5">
                                <div
                                    title={p.name}
                                    className={cn(
                                        'flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-medium',
                                        isYou
                                            ? 'border-blue-500 bg-blue-100 text-blue-800'
                                            : 'border-gray-300 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300',
                                    )}
                                >
                                    {p.name.substring(0, 2)}
                                </div>
                                {isYou ? (
                                    <span className="text-[10px] text-blue-500">
                                        YOU
                                    </span>
                                ) : (
                                    <span
                                        className={cn(
                                            'text-[10px]',
                                            dist === 1
                                                ? 'text-green-700'
                                                : 'text-gray-400',
                                        )}
                                    >
                                        {dist === 1 ? '🎯 1' : 'dist ' + dist}
                                    </span>
                                )}
                            </div>

                            {i < aliveAll.length - 1 && (
                                <div className="h-0.5 min-w-2.5 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
                            )}
                        </div>
                    );
                })}

                {dead.length > 0 && (
                    <div className="ml-2 flex items-center gap-1">
                        {dead.map((p) => (
                            <div
                                key={p.id}
                                title={`${p.name} (dead)`}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-[10px] font-medium opacity-35"
                            >
                                {p.name.substring(0, 2)}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-1.5 text-[11px] text-gray-400">
                🎯 = distance 1 (in BANG! range) · Players wrap around — it's a
                circle
            </div>
        </div>
    );
}
