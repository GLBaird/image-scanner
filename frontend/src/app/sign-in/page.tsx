import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SignInForm from '@/components/SignInForm';
import Logo from '@/components/ui/logo';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Routes from '@/lib/routes';

export default async function SignIn() {
    const session = await auth();
    if (session) redirect(Routes.DASHBOARD);
    return (
        <div className="flex justify-center items-center">
            <Card className="credentials-panel">
                <CardHeader>
                    <CardTitle className="text-center">
                        <Logo />
                        <h2 className="mt-2 sm:mt-5">Sign in</h2>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SignInForm />
                </CardContent>
            </Card>
        </div>
    );
}
