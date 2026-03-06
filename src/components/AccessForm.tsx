import React, { useState, useEffect } from 'react';
import { Send, ShieldCheck, X, Fingerprint } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IdentityService } from '@/services/identity/IdentityService';
import { cn } from '@/lib/utils';
import { SelectedObjectsList } from './access-form/SelectedObjectsList';
import { PrincipalSelector } from './access-form/PrincipalSelector';
import { PermissionSelector } from './access-form/PermissionSelector';
import { ConstraintSelector } from './access-form/ConstraintSelector';
import { toast } from 'sonner';

interface AccessFormProps {
    selectedObjects: any[];
    onClearSelection: () => void;
    onSubmit: (request: any) => void;
}

const Separator = ({ orientation = 'horizontal', className = '' }: { orientation?: 'horizontal' | 'vertical', className?: string }) => (
    <div className={cn(
        "bg-white/10",
        orientation === 'horizontal' ? "h-[1px] w-full" : "w-[1px] h-full",
        className
    )} />
);

export const AccessForm: React.FC<AccessFormProps> = ({ selectedObjects, onClearSelection, onSubmit }) => {
    const [identities, setIdentities] = useState<any[]>([]);
    const [selectedPrincipals, setSelectedPrincipals] = useState<string[]>([]);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [justification, setJustification] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [timeConstraint, setTimeConstraint] = useState({
        type: 'PERMANENT',
        value: 1,
        start: '',
        end: ''
    });

    useEffect(() => {
        const fetchIdentities = async () => {
            try {
                // IdentityService.fetchIdentities returns { users, groups, servicePrincipals }
                const data = await IdentityService.fetchIdentities();
                const flattenedIdentities = [
                    ...data.users,
                    ...data.groups,
                    ...data.servicePrincipals
                ];
                setIdentities(flattenedIdentities);
            } catch (error) {
                console.error('Failed to fetch identities:', error);
            }
        };

        fetchIdentities();
    }, []);

    const togglePrincipal = (id: string) => {
        setSelectedPrincipals(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const togglePermission = (perm: string) => {
        setSelectedPermissions(prev =>
            prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
        );
    };

    const handleSubmit = () => {
        // Validation: principals
        if (selectedPrincipals.length === 0) {
            toast.error("Please select at least one principal.");
            return;
        }

        // Validation: permissions
        if (selectedPermissions.length === 0) {
            toast.error("Please select at least one permission.");
            return;
        }

        // Validation: justification
        if (!justification.trim()) {
            toast.error("Please provide a justification.");
            return;
        }

        // Validation: justification length
        if (justification.trim().length < 10) {
            toast.error("Justification must be at least 10 characters.");
            return;
        }

        if (justification.trim().length > 1000) {
            toast.error("Justification must be less than 1000 characters.");
            return;
        }

        // Validation: time constraint dates
        if (timeConstraint.type === 'RANGE') {
            if (!timeConstraint.start || !timeConstraint.end) {
                toast.error("Please provide both start and end dates.");
                return;
            }
            const startDate = new Date(timeConstraint.start);
            const endDate = new Date(timeConstraint.end);
            if (endDate < startDate) {
                toast.error("End date must be after start date.");
                return;
            }
            // Check max range of 1 year
            const oneYear = 365 * 24 * 60 * 60 * 1000;
            if (endDate.getTime() - startDate.getTime() > oneYear) {
                toast.error("Access duration cannot exceed 1 year.");
                return;
            }
        }

        // Sanitize inputs
        const sanitizedJustification = justification.trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .slice(0, 1000); // Truncate to max length

        const request = {
            objects: selectedObjects,
            principals: selectedPrincipals,
            permissions: selectedPermissions,
            timeConstraint,
            justification: sanitizedJustification,
            timestamp: Date.now()
        };

        onSubmit(request);
    };

    if (selectedObjects.length === 0) {
        return (
            <Card className="border-dashed border-white/10 bg-transparent h-[450px] flex flex-col items-center justify-center p-8 transition-all hover:bg-white/[0.02]">
                <div className="relative group p-8 rounded-full bg-white/[0.03] border border-white/5 shadow-2xl overflow-hidden mb-8">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="relative p-6 rounded-full bg-background border border-white/10 shadow-inner ring-1 ring-white/20">
                        <ShieldCheck size={64} className="text-primary/20 group-hover:text-primary/60 transition-all duration-700 group-hover:scale-110 drop-shadow-[0_0_15px_rgba(88,166,255,0.4)]" />
                    </div>
                </div>
                <div className="text-center space-y-3 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <h3 className="text-2xl font-black text-foreground/70 tracking-tighter uppercase italic">Secure Access Bridge</h3>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed opacity-50 tracking-widest px-4">
                        SELECT OBJECTS FROM THE CATALOG ON THE LEFT TO BEGIN THE PROVISIONING FLOW
                    </p>
                </div>
                <div className="mt-12 flex gap-4 opacity-30">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-300" />
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
            {/* Header section with summary stats */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-1">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 px-2 rounded-md bg-primary/20 border border-primary/20">
                            <Fingerprint size={12} className="text-primary" />
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/70 italic">Provisioning Terminal</span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter text-foreground/90 uppercase">Access Request</h2>
                    <p className="text-muted-foreground text-xs font-medium opacity-50 tracking-wider">SECURE END-TO-END IDENTITY PROVISIONING INTERFACE</p>
                </div>
                <div className="flex items-center gap-6 bg-white/[0.02] border border-white/5 p-4 py-3 rounded-2xl backdrop-blur-md">
                    <div className="text-center px-1">
                        <div className="text-lg font-black text-primary leading-none uppercase tracking-tighter italic">{selectedObjects.length}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1 opacity-40 italic">Targets</div>
                    </div>
                    <Separator orientation="vertical" className="h-8 opacity-10" />
                    <div className="text-center px-1">
                        <div className="text-lg font-black text-foreground/90 leading-none uppercase tracking-tighter italic">{selectedPrincipals.length}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1 opacity-40 italic">Idents</div>
                    </div>
                </div>
            </div>

            {/* Selected targets summary widget */}
            <SelectedObjectsList selectedObjects={selectedObjects} onClearSelection={onClearSelection} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Principal Selection */}
                <PrincipalSelector
                    identities={identities}
                    selectedPrincipals={selectedPrincipals}
                    onTogglePrincipal={togglePrincipal}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                />

                {/* 2. Permission Selection */}
                <PermissionSelector
                    selectedPermissions={selectedPermissions}
                    onTogglePermission={togglePermission}
                />
            </div>

            {/* 3. Justification & Constraints */}
            <ConstraintSelector
                timeConstraint={timeConstraint}
                onTimeConstraintChange={setTimeConstraint}
                justification={justification}
                onJustificationChange={setJustification}
            />

            {/* Action buttons with enhanced aesthetics */}
            <div className="flex flex-col sm:flex-row justify-end gap-5 pt-8 pb-12">
                <Button variant="ghost" className="px-10 h-14 text-sm font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100 hover:bg-white/5 transition-all text-foreground rounded-2xl">
                    <X size={16} className="mr-3" /> Save Draft
                </Button>
                <Button
                    onClick={handleSubmit}
                    data-testid="submit-request-button"
                    className="relative group px-12 h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.3em] text-sm rounded-2xl shadow-2xl shadow-primary/30 active:scale-95 transition-all overflow-hidden border-t border-white/20"
                >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-[30deg]" />
                    <span className="flex items-center gap-3 relative">
                        Submit Provisioning Request <Send size={18} className="transition-transform group-hover:translate-x-1" />
                    </span>
                </Button>
            </div>
        </div>
    );
};

export default AccessForm;
