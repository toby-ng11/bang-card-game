import { CardKey } from '@/types';

const CARD_POOL: CardKey[] = [
    ...Array<CardKey>(25).fill('bang'),
    ...Array<CardKey>(12).fill('missed'),
    ...Array<CardKey>(6).fill('beer'),
    ...Array<CardKey>(1).fill('gatling'),
    ...Array<CardKey>(2).fill('indians'),
    ...Array<CardKey>(4).fill('panic'),
    ...Array<CardKey>(4).fill('catbalou'),
    ...Array<CardKey>(2).fill('stagecoach'),
    ...Array<CardKey>(1).fill('wellsfargo'),
    ...Array<CardKey>(1).fill('saloon'),
    ...Array<CardKey>(3).fill('duel'),
    ...Array<CardKey>(2).fill('generalstore'),
    ...Array<CardKey>(2).fill('mustang'),
    ...Array<CardKey>(1).fill('scope'),
    ...Array<CardKey>(2).fill('barrel'),
    ...Array<CardKey>(3).fill('schofield'),
];

export { CARD_POOL };
