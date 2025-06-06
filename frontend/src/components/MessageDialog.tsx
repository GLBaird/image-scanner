import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';

export type MessageDialogProps = {
    title: string;
    children: React.ReactNode;
    open: boolean;
    onConfirm: () => void;
};

export default function MessageDialog({ title, children, open, onConfirm }: MessageDialogProps) {
    const handleChange = (state: boolean) => {
        if (!state) onConfirm();
    };

    return (
        <Dialog open={open} onOpenChange={handleChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <DialogDescription>{children}</DialogDescription>
                <DialogFooter>
                    <Button onClick={onConfirm}>Okay</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
