import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Routes from '@/lib/routes';

export default async function Home() {
    const session = await auth();
    if (session) redirect(Routes.DASHBOARD);
    else redirect(Routes.WELCOME);
}
