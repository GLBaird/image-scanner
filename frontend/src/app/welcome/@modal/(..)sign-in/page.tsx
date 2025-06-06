'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter, usePathname } from 'next/navigation';
import Logo from '@/components/ui/logo';
import SignInForm from '@/components/SignInForm';

export default function ModalSignin() {
    const router = useRouter();
    const pathname = usePathname();

    const isCreateAccountOverlay = pathname === '/sign-in';

    function handleOpenStateChange(open: boolean) {
        if (!open && pathname === '/sign-in') router.replace('/welcome');
    }

    return (
        <Dialog open={isCreateAccountOverlay} onOpenChange={handleOpenStateChange}>
            <DialogContent>
                <DialogHeader>
                    <div className="text-center">
                        <Logo />
                        <DialogTitle className="text-3xl mt-2 sm:mt-5">Sign in</DialogTitle>
                    </div>
                    <DialogDescription className="sr-only">
                        Sign into your account with Github, Google or your personal credentials.
                    </DialogDescription>
                    <SignInForm popupMode />
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}
