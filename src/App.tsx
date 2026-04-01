import RoleBanner from '@/components/RoleBanner';
import { initGame } from '@/game/init';
import { gameReducer } from '@/gameReducer';
import { useReducer } from 'react';

export default function App() {
    const [G, dispatch] = useReducer(gameReducer, null, initGame);
    const human = G.players[0];

    return (
        <div id="game">
            <RoleBanner human={human} />
        </div>
    );
}
