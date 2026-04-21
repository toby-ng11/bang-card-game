import { Button } from '@/components/ui/button';

interface DrawCardsToStartTurnButtonProps {
    onDraw: () => void;
}

export function DrawCardsToStartTurnButton({
    onDraw,
}: DrawCardsToStartTurnButtonProps) {
    return (
        <div className="group relative flex items-center justify-center">
            <Button
                size="lg"
                onClick={onDraw}
                className="group relative h-16 flex-1 overflow-hidden rounded-xl border-b-4 border-amber-800 bg-linear-to-br from-yellow-500 to-amber-600 px-8 transition-all ease-in-out hover:scale-110 hover:from-yellow-400 hover:to-amber-500 active:translate-y-1 active:border-b-0"
            >
                <div className="flex items-center gap-3">
                    <div className="my-0.5 flex -space-x-2 transition-all ease-in-out group-hover:scale-120">
                        <div className="h-6 w-4 rotate-15 rounded-sm border border-amber-800 bg-stone-100 shadow-sm" />
                        <div className="h-6 w-4 rotate-15 rounded-sm border border-amber-800 bg-stone-200 shadow-sm" />
                    </div>

                    <div className="flex flex-col items-start">
                        <span className="text-xs font-bold uppercase opacity-80">
                            START TURN
                        </span>
                        <span className="text-lg leading-none font-black">
                            Draw 2 cards
                        </span>
                    </div>
                </div>
            </Button>
        </div>
    );
}
