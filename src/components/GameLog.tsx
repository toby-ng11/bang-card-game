import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
    log: string[];
}

export default function GameLog({ log }: Props) {
    return (
        <ScrollArea className="h-32 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-col gap-0.5">
                {log.map((entry, i) => (
                    <div
                        key={crypto.randomUUID()}
                        className={
                            i === 0
                                ? 'text-xs font-medium text-gray-900 dark:text-gray-100'
                                : 'text-xs text-gray-500 dark:text-gray-400'
                        }
                    >
                        {entry}
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
