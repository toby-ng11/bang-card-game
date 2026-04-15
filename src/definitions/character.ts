type CharacterKey =
    | 'bart_cassidy'
    | 'black_jack'
    | 'calamity_janet'
    | 'el_gringo'
    | 'jesse_jones'
    | 'jourdonnas'
    | 'kit_carlson'
    | 'lucky_duke'
    | 'paul_regret'
    | 'pedro_ramirez'
    | 'rose_doolan'
    | 'sid_ketchum'
    | 'slab_the_killer'
    | 'suzy_lafayette'
    | 'vulture_sam'
    | 'willy_the_kid';

interface CharacterInfo {
    name: string;
    life_points: number;
    desc: string;
}

const CHARACTER_DEFS: Record<CharacterKey, CharacterInfo> = {
    bart_cassidy: {
        name: 'Bart Cassidy',
        life_points: 4,
        desc: 'Each time he is hit, he draws a card.',
    },
    black_jack: {
        name: 'Black Jack',
        life_points: 4,
        desc: 'He always show the second card he drew. He has 50% chance to draw the third card.',
    },
    calamity_janet: {
        name: 'Calamity Janet',
        life_points: 4,
        desc: 'She can play BANG! as Missed! and vice versa.',
    },
    el_gringo: {
        name: 'El Gringo',
        life_points: 3,
        desc: 'Each time he is hit by a player, he draws a card from the hand of that player.',
    },
    jesse_jones: {
        name: 'Jesse Jones',
        life_points: 4,
        desc: 'He may draw his first card from the hand of a player.',
    },
    jourdonnas: {
        name: 'Jourdonnas',
        life_points: 4,
        desc: 'BANG! targets him has 25% chance Missed!.',
    },
    kit_carlson: {
        name: 'Kit Carlson',
        life_points: 4,
        desc: 'In the draw phase, he looks at the top three cards of the deck and chooses 2 to draw.',
    },
    lucky_duke: {
        name: 'Lucky Duke',
        life_points: 4,
        desc: 'Each time he faces a chance-based check (Barrel, Jail, Dynamite), the success rate is increased.',
    },
    paul_regret: {
        name: 'Paul Regret',
        life_points: 3,
        desc: 'All players see him at distance +1.',
    },
    pedro_ramirez: {
        name: 'Pedro Ramirez',
        life_points: 4,
        desc: 'In the draw phase, He may draw his first card from the discard pile.',
    },
    rose_doolan: {
        name: 'Rose Doolan',
        life_points: 4,
        desc: 'She sees all players at distance -1.',
    },
    sid_ketchum: {
        name: 'Sid Ketchum',
        life_points: 4,
        desc: 'At any time, he may discard 2 cards from hand to regain 1 LP.',
    },
    slab_the_killer: {
        name: 'Slab The Killer',
        life_points: 4,
        desc: 'Players need 1 extra Missed! to cancel his BANG! card.',
    },
    suzy_lafayette: {
        name: 'Suzy Lafayette',
        life_points: 4,
        desc: 'When she has no card in hand, she draws 1 card immediately.',
    },
    vulture_sam: {
        name: 'Vulture Sam',
        life_points: 4,
        desc: 'When a player is eliminated, he takes all cards of that player (hand and in-play).',
    },
    willy_the_kid: {
        name: 'Willy The Kid',
        life_points: 4,
        desc: 'During his turn, he can play any number of BANG! card.',
    },
};

export { CHARACTER_DEFS, CharacterInfo, CharacterKey };
