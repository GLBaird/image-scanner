import { auth } from '@/auth';
import Logo from './ui/logo';
import UserAvatar from './UserAvatar';

export default async function Header() {
    const session = await auth();
    const user = session?.user ?? {};

    return (
        <header className="bg-(--header-background) shadow py-4 px-10">
            <div
                className="flex flex-col
                            md:flex-row md:justify-between items-center"
            >
                <Logo />
                <UserAvatar name={user.name} email={user.email} image={user.image} />
            </div>
        </header>
    );
}
