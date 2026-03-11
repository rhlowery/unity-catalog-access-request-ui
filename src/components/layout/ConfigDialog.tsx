import React, { lazy, Suspense } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ComponentLoader } from '../OptimizedComponents';

const AdminSettings = React.lazy(() => import('../AdminSettings'));

interface ConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ConfigDialog: React.FC<ConfigDialogProps> = ({ open, onOpenChange }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="resize overflow-hidden flex flex-col p-0 border-border bg-background/95 backdrop-blur-xl !max-w-none"
                style={{
                    width: '85vw',
                    maxWidth: '1600px',
                    minWidth: '400px',
                    height: '85vh',
                    maxHeight: '95vh',
                    minHeight: '400px'
                }}
            >
                <DialogHeader className="p-6 pb-0 shrink-0">
                    <DialogTitle className="text-2xl font-bold tracking-tight">System Configuration</DialogTitle>
                    <DialogDescription>
                        Manage your identity, storage, and Unity Catalog integration settings.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    <Suspense fallback={<ComponentLoader />}>
                        <AdminSettings />
                    </Suspense>
                </div>
                <div className="p-4 border-t border-border bg-background/50 flex justify-end">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
};
