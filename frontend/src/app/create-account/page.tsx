import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CreateAccountForm from '@/components/CreateAccountForm';
import Logo from '@/components/ui/logo';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Routes from '@/lib/routes';

export default async function CreateAccount() {
    const session = await auth();
    if (session) redirect(Routes.DASHBOARD);

    return (
        <div className="flex justify-center items-center">
            <Card className="credentials-panel">
                <CardHeader>
                    <CardTitle className="text-center">
                        <Logo />
                        <h2 className="mt-2 sm:mt-5">Create New Account</h2>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CreateAccountForm />
                </CardContent>
            </Card>
        </div>
    );
}
