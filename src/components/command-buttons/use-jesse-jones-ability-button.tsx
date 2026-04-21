import { Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

interface UseJesseJonesAbilityButtonProps {
    onTargetPlayer: () => void;
}
export function UseJesseJonesAbilityButton({
    onTargetPlayer,
}: UseJesseJonesAbilityButtonProps) {
    return (
        <div className="group relative flex items-center justify-center">
            <Button
                size="lg"
                onClick={onTargetPlayer}
                className="group relative h-16 flex-1 overflow-hidden rounded-xl border-b-4 border-amber-800 bg-linear-to-br from-yellow-500 to-amber-600 px-8 transition-all ease-in-out hover:scale-110 hover:from-yellow-400 hover:to-amber-500 active:translate-y-1 active:border-b-0"
            >
                <div className="flex items-center gap-3">
                    <Sparkles className="size-6 transition-transform group-hover:scale-120" />
                    <div className="flex flex-col items-start">
                        <span className="text-xs font-bold uppercase opacity-80">
                            START TURN
                        </span>
                        <span className="text-lg leading-none font-black">
                            Use Ability
                        </span>
                    </div>
                </div>
            </Button>
        </div>
    );
}
