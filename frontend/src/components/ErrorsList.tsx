import { cn } from '@/lib/utils';

export default function ErrorsList({
    errors,
    className,
    showMessage = false,
}: {
    errors: string[];
    showMessage?: boolean;
    className?: string;
}) {
    if (errors.length === 0) return null;
    return (
        <div className={cn('text-red-700 mt-1', className)}>
            {showMessage && 'There has been errors:'}
            <ul>
                {errors.map((e) => (
                    <li key={e} className="list-disc ml-3">
                        {e}
                    </li>
                ))}
            </ul>
        </div>
    );
}
