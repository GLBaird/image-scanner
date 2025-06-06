'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useRouter, usePathname } from 'next/navigation';
import Logo from '@/components/ui/logo';
import CreateAccountForm from '@/components/CreateAccountForm';

export default function CreateAccountModal() {
    const router = useRouter();
    const pathname = usePathname();

    const isCreateAccountOverlay = pathname === '/create-account';

    function handleOpenStateChange(open: boolean) {
        if (!open && pathname === '/create-account') router.replace('/welcome');
    }

    return (
        <Dialog open={isCreateAccountOverlay} onOpenChange={handleOpenStateChange}>
            <DialogContent>
                <DialogHeader>
                    <div className="text-center">
                        <Logo />
                        <DialogTitle className="text-3xl mt-2 sm:mt-5">Create New Account</DialogTitle>
                    </div>
                    <DialogDescription className="sr-only">
                        Create your account with Github, Google or your personal credentials.
                    </DialogDescription>
                    <CreateAccountForm popupMode />
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
}
