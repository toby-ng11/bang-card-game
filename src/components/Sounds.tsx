import { GameAction } from '@/gameReducer';
import { useEffect, useRef } from 'react';

const SOUNDS = {
    playCard: '/sounds/card-slide.mp3',
    damage: '/sounds/grunt.mp3',
    heal: '/sounds/drink.mp3',
    draw: '/sounds/deal.mp3',
    gatling: '/sounds/machine-gun.mp3',
    missed: '/sounds/whoosh.mp3',
};

interface SoundEngineProps {
    lastAction: GameAction;
}

export const SoundEngine = ({ lastAction }: SoundEngineProps) => {
    // We use a ref to hold the Audio objects to prevent reloading files
    const audioCacheRef = useRef<Record<string, HTMLAudioElement>>({});

    useEffect(() => {
        if (!lastAction) return;

        const play = (key: keyof typeof SOUNDS) => {
            if (!audioCacheRef.current[key]) {
                audioCacheRef.current[key] = new Audio(SOUNDS[key]);
            }
            // Reset and play (allows rapid firing like Gatling)
            audioCacheRef.current[key].currentTime = 0;
            audioCacheRef.current[key].play().catch(() => {}); // Catch browser block
        };

        // Map Action Types to Sounds
        switch (lastAction.type) {
            case 'PLAY_CARD':
                if (lastAction.cardKey === 'missed') play('missed');
                else play('playCard');
                break;
            case 'TAKE_DAMAGE':
                play('damage');
                break;
            case 'HEAL_A_PLAYER':
                play('heal');
                break;
            case 'TRIGGER_FLOAT':
                if (lastAction.cardKey === 'gatling') play('gatling');
                break;
        }
    }, [lastAction]); // Fired whenever the game state records a new action

    return null; // This component has no UI
};
