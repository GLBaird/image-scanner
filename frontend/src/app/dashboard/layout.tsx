import type { Metadata } from 'next';
import Header from '@/components/Header';
import Navigation from '@/components/Navigation';
import Routes from '@/lib/routes';

export const metadata: Metadata = {
    title: 'Image scanner - Dashboard',
    description: 'Scan image media for additional information and classifications.',
};

export default async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div>
            <Header />
            <Navigation
                routes={[
                    { route: Routes.DASHBOARD_JOBS, name: 'Jobs' },
                    { route: Routes.DASHBOARD_USERS, name: 'Users' },
                    { route: Routes.DASHBOARD_PROGRESS, name: 'Progress' },
                ]}
            />
            {children}
        </div>
    );
}
