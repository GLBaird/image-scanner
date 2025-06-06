import React from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Loader as Loader } from 'lucide-react';

export type ConfirmDialogProps = {
    title: string;
    children: React.ReactNode;
    open: boolean;
    pending?: boolean;
    destructive?: boolean;
    onCancel?: () => void;
    onConfirm: () => void;
};

export default function ConfirmDialog({
    title,
    children,
    open,
    pending = false,
    destructive = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const handleChange = (state: boolean) => {
        if (!state && !pending && onCancel) onCancel();
    };

    return (
        <Dialog open={open} onOpenChange={handleChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                {children}
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={pending}>
                        Cancel
                    </Button>
                    <Button
                        className="mb-5 sm:ml-5 sm:mb-0"
                        variant={destructive ? 'destructive' : 'default'}
                        onClick={onConfirm}
                        disabled={pending}
                    >
                        {pending ? <Loader className="animate-spin" /> : 'Okay'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
