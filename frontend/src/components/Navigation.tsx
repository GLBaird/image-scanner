'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type NavigationProps = {
    routes: { route: string; name: string }[];
};

export default function Navigation({ routes }: NavigationProps) {
    const pathname = usePathname();

    const isCurrent = (route: string): string | null => {
        if (route === pathname) return 'bg-gray-100';
        return null;
    };

    return (
        <nav>
            <ul className="flex flex-row justify-center items-center gap-4 bg-white py-3 shadow">
                {routes.map((navR) => (
                    <li key={navR.route} className={cn(isCurrent(navR.route), 'py-3 px-3 -my-3')}>
                        <Link href={navR.route}>{navR.name}</Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
