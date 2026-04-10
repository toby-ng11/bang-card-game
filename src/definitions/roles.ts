import { Role, RoleInfo } from '@/types';

const ROLE_INFO: Record<Role, RoleInfo> = {
    SHERIFF: {
        label: 'Sheriff',
        goal: 'Eliminate all Outlaws and the Renegade.',
        bg: '#FAEEDA',
        color: '#633806',
    },
    DEPUTY: {
        label: 'Deputy',
        goal: 'Protect the Sheriff. Eliminate enemies.',
        bg: '#E6F1FB',
        color: '#042C53',
    },
    OUTLAW: {
        label: 'Outlaw',
        goal: 'Kill the Sheriff. Work with other Outlaws.',
        bg: '#FCEBEB',
        color: '#501313',
    },
    RENEGADE: {
        label: 'Renegade',
        goal: 'Be the last one standing — kill everyone.',
        bg: '#EEEDFE',
        color: '#26215C',
    },
};

export { ROLE_INFO };
