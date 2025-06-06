'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { User, Trash2 as Trash, EditIcon } from 'lucide-react';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserData } from '@/data-access/user';
import LocalDate from '@/components/ui/locale-date';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import MessageDialog from '@/components/MessageDialog';
import { deleteUserData } from '@/app/actions/manage-users';
import { DialogDescription } from '@/components/ui/dialog';
import ErrorsList from './ErrorsList';

type userImageProps = { imageURL: string | null };
const UserImage = ({ imageURL }: userImageProps) => (
    <div className="relative w-9 h-8 inline-block">
        {imageURL ? (
            <div
                style={{ backgroundImage: `url(\"${imageURL}\")` }}
                className="w-9 h-9 rounded-full bg-cover bg-center"
            />
        ) : (
            <User width="100%" height="100%" className="size-9" />
        )}
    </div>
);

type UserRowProps = { user: UserData; onSelect: (id: string) => void };
const UserRow = ({ user, onSelect }: UserRowProps) => (
    <TableRow
        key={user.id}
        className="even:bg-blue-100 hover:bg-amber-100"
        onClick={(e) => {
            e.preventDefault();
            onSelect(user.id);
        }}
    >
        <TableCell className="text-center w-20">
            <UserImage imageURL={user.image} />
        </TableCell>
        <TableCell>{user.name ?? 'Anonymous User'}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell className="hidden sm:table-cell">{user.provider}</TableCell>
        <TableCell className="text-right hidden w-30 md:table-cell">
            <LocalDate date={user.createdAt} />
        </TableCell>
        <TableCell className="text-right hidden w-40 md:table-cell">
            <LocalDate date={user.updatedAt} />
        </TableCell>
    </TableRow>
);

type SelectedUserRowProps = { user: UserData; onDelete: () => void; onEdit: () => void };
const SelectedUserRow = ({ user, onDelete, onEdit }: SelectedUserRowProps) => (
    <TableRow key={user.id} className="bg-red-100 hover:bg-red-100">
        <TableCell className="text-center w-20">
            <UserImage imageURL={user.image} />
        </TableCell>
        <TableCell>{user.name ?? 'Anonymous User'}</TableCell>
        <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
        <TableCell className="hidden md:table-cell">{user.provider}</TableCell>
        <TableCell className="text-right hidden w-30 md:table-cell">
            <LocalDate date={user.createdAt} />
        </TableCell>
        <TableCell className="text-right w-40">
            <Button variant="ghost" className="p-1 mr-1" title="Edit User" onClick={onEdit} asChild>
                <EditIcon className="size-fit" />
            </Button>
            <Button
                variant="ghost"
                className="hover:bg-red-600 hover:text-white p-1"
                title="Delete User"
                onClick={onDelete}
                asChild
            >
                <Trash className="size-fit" />
            </Button>
        </TableCell>
    </TableRow>
);

export type UserListProps = {
    users: UserData[];
};

export default function UserList({ users }: UserListProps) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [editUserDetails, setEditUserDetails] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [pending, setPending] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const selectedUser = searchParams.get('selected');

    const handleSelect = (userId: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('selected', userId);
        router.replace(`${pathname}?${params}`, { scroll: false });
    };

    const handleDelete = async () => {
        if (!selectedUser) {
            setErrors(['no valid user selected']);
            return;
        }
        setPending(true);
        try {
            const response = await deleteUserData(selectedUser);
            setErrors(response.errors ?? []);
            setPending(false);
            if (!response.errors) setConfirmDelete(false);
        } catch (error) {
            console.error(error);
            setErrors(['Error calling server. ' + ((error as Error)?.message ?? error)]);
            setPending(false);
        }
    };

    return (
        <div>
            <ConfirmDialog
                open={confirmDelete}
                pending={pending}
                title="Delete User, are you sure?"
                onConfirm={handleDelete}
                onCancel={() => {
                    setConfirmDelete(false);
                    setErrors([]);
                }}
                destructive
            >
                <DialogDescription>This will permanently remove the user from the system.</DialogDescription>
                <ErrorsList errors={errors} />
            </ConfirmDialog>
            <MessageDialog title="Edit user details" open={editUserDetails} onConfirm={() => setEditUserDetails(false)}>
                Currently, this feature is not implemented. Instead, delete a user and then create a new user with the
                details you wish.
            </MessageDialog>
            <div className="flex justify-center">
                <div className="w-[80%] max-w-400">
                    <div className="bg-white shadow dashboard-container scroll-container w-full">
                        <Table>
                            <TableHeader className="bg-gray-200">
                                <TableRow>
                                    <TableHead className="text-center">Avatar</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>email</TableHead>
                                    <TableHead className="hidden sm:table-cell">Provider</TableHead>
                                    <TableHead className="text-right hidden md:table-cell">Created At</TableHead>
                                    <TableHead className="text-right hidden md:table-cell">Updated At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) =>
                                    selectedUser === user.id ? (
                                        <SelectedUserRow
                                            key={user.id}
                                            user={user}
                                            onDelete={() => setConfirmDelete(true)}
                                            onEdit={() => setEditUserDetails(true)}
                                        />
                                    ) : (
                                        <UserRow key={user.id} user={user} onSelect={handleSelect} />
                                    ),
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}
