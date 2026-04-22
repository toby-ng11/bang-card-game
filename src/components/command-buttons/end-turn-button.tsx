import { Button } from '@/components/ui/button';

interface EndTurnButtonProps {
    onEndTurn: () => void;
}

export function EndTurnButton({ onEndTurn }: EndTurnButtonProps) {
    return (
        <div className="group relative flex items-center justify-center">
            <Button
                size="lg"
                onClick={onEndTurn}
                className="group relative h-16 flex-1 overflow-hidden rounded-xl border-b-4 border-red-950 bg-linear-to-br from-amber-900 to-red-900 px-8 transition-colors ease-in-out hover:from-amber-700 hover:to-red-700 active:translate-y-1 active:border-b-0"
            >
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="text-lg leading-none font-black">
                            END TURN
                        </span>
                    </div>
                </div>
            </Button>
        </div>
    );
}
