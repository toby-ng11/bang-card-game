// GameLog component stays the same, changes are in the aside wrapper

import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { useState } from 'react';
import GameLog from './GameLog';

export function BattleLogPanel({ log }: { log: string[] }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="fixed top-1/2 left-0 z-50 flex -translate-y-1/2 items-center drop-shadow-2xl">
            {/* Panel */}
            <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    isOpen ? 'w-65 opacity-100' : 'w-0 opacity-0'
                }`}
            >
                <div className="w-65 rounded-r-2xl border-y border-r border-amber-900/40 bg-[#1a0f0a]/90 shadow-2xl backdrop-blur-md">
                    {/* Header */}
                    <div className="flex items-center gap-2 border-b border-amber-900/20 px-4 pt-4 pb-2">
                        <History size={16} className="text-amber-500" />
                        <h4 className="text-[10px] font-black tracking-[0.2em] text-amber-600 uppercase">
                            Battle Record
                        </h4>
                    </div>

                    {/* Log Content */}
                    <div className="h-100 px-2 py-2">
                        <GameLog log={log} />
                    </div>

                    {/* Subtle Bottom Cap */}
                    <div className="h-4 rounded-br-2xl bg-linear-to-t from-black/20 to-transparent" />
                </div>
            </div>

            {/* Toggle tab */}
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="group flex h-24 w-6 cursor-pointer items-center justify-center rounded-r-xl border-y border-r border-amber-900/40 bg-[#2a1810] text-amber-500 transition-all hover:w-8 hover:bg-[#3d2317]"
            >
                {isOpen ? (
                    <ChevronLeft
                        size={20}
                        className="transition-transform group-hover:-translate-x-0.5"
                    />
                ) : (
                    <ChevronRight
                        size={20}
                        className="transition-transform group-hover:translate-x-0.5"
                    />
                )}
            </button>
        </div>
    );
}
