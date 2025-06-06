'use client';

import { User, Loader2 as Loader } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useState } from 'react';
import { signOutUser } from '@/app/actions/sign-out';

type UserAvatarProps = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
};

export default function UserAvatar({ name, email, image }: UserAvatarProps) {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const userName = name ?? email ?? 'Anonymous User';

    if (pending) {
        return <Loader className="animate-spin size-8" />;
    }

    const handleOpen = () => setOpen((prev) => !prev);
    const handleClose = () => setOpen(false);
    const handleSignOut = async () => {
        setOpen(false);
        setPending(true);
        await signOutUser();
    };

    const userImage = image ? (
        <div
            className={'bg-contain bg-center bg-no-repeat size-full'}
            style={{ backgroundImage: `url(\"${image}\")` }}
        />
    ) : (
        <User className="" width="fill" height="fill" />
    );

    return (
        <div className="mt-2 md:mt-0">
            <div
                className="flex flex-col gap-1 justify-center items-center md:flex-row md:gap-5"
                role="button"
                onClick={handleOpen}
            >
                <div>
                    <div>{userName}</div>
                    <div className="md:hidden">
                        <Button variant="ghost" onClick={handleSignOut}>
                            Sign Out
                        </Button>
                    </div>
                </div>
                <div
                    className="relative h-12 w-12 rounded-full
                                border-3 border-black overflow-hidden bg-white shadow
                                hidden md:block"
                >
                    {userImage}
                </div>
            </div>
            {open && (
                <div className="absolute w-80 right-3 mt-6 hidden md:block z-50">
                    <div
                        className="border-20 border-transparent border-b-gray-100 md:border-b-white
                                    size-0 absolute right-8 -top-9.5"
                    />
                    <Card className="bg-gray-100 md:bg-white">
                        <CardHeader>
                            <CardTitle>User Info</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative h-30 mb-4 bg-gray-100 -mt-4 py-1">{userImage}</div>
                            {name && (
                                <div>
                                    <strong>name:</strong> {name}
                                </div>
                            )}
                            {email && (
                                <div>
                                    <strong>email:</strong> {email}
                                </div>
                            )}
                            {!name && !email && (
                                <div>
                                    <strong>name:</strong> {userName}
                                </div>
                            )}
                            <div className="flex justify-end mt-5">
                                <Button variant="ghost" onClick={handleClose}>
                                    Close
                                </Button>
                                <Button variant="ghost" onClick={handleSignOut}>
                                    Sign Out
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
