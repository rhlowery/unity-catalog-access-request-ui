import React, { useState, useEffect } from 'react';
import { Shield, User, Users, CheckCircle, Search, Activity, Lock, Unlock, Database, Key, Eye, Edit3, Zap, Play, Cpu, Terminal, HardDrive, Check } from 'lucide-react';
import { IdentityService } from '../services/identity/IdentityService';
import { PERMISSIONS, submitRequest } from '../services/mockData';
import { useAuth } from '../context/AuthProvider';
import { NodeIcon } from './CatalogTree';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    RadioGroup,
    RadioGroupItem
} from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from '@/components/ui/card';

const AccessForm = ({ selectedObjects, onClearSelection }) => {
    const { user } = useAuth();
    const [identities, setIdentities] = useState([]);
    const [selectedPrincipals, setSelectedPrincipals] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [timeConstraint, setTimeConstraint] = useState({ type: 'PERMANENT', value: 24, start: '', end: '' });
    const [justification, setJustification] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const getPermissionIcon = (perm: string) => {
        const p = perm.toUpperCase();
        if (p.includes('SELECT') || p.includes('READ')) return <Eye size={16} />;
        if (p.includes('MODIFY') || p.includes('WRITE')) return <Edit3 size={16} />;
        if (p.includes('USE') || p.includes('CATALOG') || p.includes('SCHEMA')) return <Database size={16} />;
        if (p.includes('ALL')) return <Zap size={16} />;
        if (p.includes('EXECUTE')) return <Play size={16} />;
        if (p.includes('MODEL')) return <Cpu size={16} />;
        if (p.includes('COMPUTE')) return <Terminal size={16} />;
        if (p.includes('STORAGE')) return <HardDrive size={16} />;
        return <Lock size={16} />;
    };

    useEffect(() => {
        const loadIdentities = async () => {
            const data = await IdentityService.fetchIdentities();
            setIdentities([
                ...data.users,
                ...data.groups,
                ...data.servicePrincipals
            ]);
        };
        loadIdentities();
    }, []);

    const handlePrincipalToggle = (id) => {
        if (selectedPrincipals.includes(id)) {
            setSelectedPrincipals(selectedPrincipals.filter(p => p !== id));
        } else {
            setSelectedPrincipals([...selectedPrincipals, id]);
        }
    };

    const handlePermissionToggle = (perm) => {
        if (selectedPermissions.includes(perm)) {
            setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
        } else {
            setSelectedPermissions([...selectedPermissions, perm]);
        }
    };

    const handleSubmit = async () => {
        if (selectedPrincipals.length === 0 || selectedPermissions.length === 0 || selectedObjects.length === 0 || !justification.trim()) return;

        setIsSubmitting(true);
        const request = {
            requestedObjects: selectedObjects.map(o => ({ id: o.id, name: o.name, type: o.type })),
            principals: identities.filter(i => selectedPrincipals.includes(i.id)),
            permissions: selectedPermissions,
            timeConstraint: timeConstraint,
            justification: justification,
            requesterId: user ? user.name : 'Unknown User',
        };

        await submitRequest(request);

        setIsSubmitting(false);
        setSuccessMessage('Access request submitted successfully!');
        setTimeout(() => {
            setSuccessMessage('');
            onClearSelection();
            setSelectedPrincipals([]);
            setSelectedPermissions([]);
            setJustification('');
        }, 3000);
    };

    if (selectedObjects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-muted p-6 rounded-full mb-6">
                    <Shield size={64} className="text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-2">No Data Objects Selected</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">
                    Select schemas, tables, or views from the catalog tree on the left to start building your request.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <Card className="border-white/5 bg-background/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                <CardHeader className="bg-white/[0.02] border-b border-white/5 py-4 px-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg font-bold tracking-tight text-primary/90">Selected Objects</CardTitle>
                            <CardDescription className="text-xs uppercase tracking-widest opacity-60">
                                Requesting access to {selectedObjects.length} object{selectedObjects.length !== 1 ? 's' : ''}
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive">
                            Clear Selection
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex flex-wrap gap-2">
                        {selectedObjects.map(obj => (
                            <Badge key={obj.id} variant="secondary" className="pl-1.5 pr-2.5 py-1.5 gap-2 flex items-center bg-white/5 border-white/5 text-[11px] font-medium hover:bg-white/10 transition-colors">
                                <NodeIcon type={obj.type} />
                                <span className="opacity-50 font-normal uppercase tracking-tighter">{obj.type}:</span>
                                <span className="text-foreground/90">{obj.name}</span>
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="border-white/5 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden">
                    <CardHeader className="pb-4 bg-white/[0.01] border-b border-white/5">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-base font-bold tracking-tight">1. Select Principals</CardTitle>
                                <CardDescription className="text-xs">Identities requiring access</CardDescription>
                            </div>
                            <div className="relative w-40 sm:w-56">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" />
                                <Input
                                    placeholder="Filter idents..."
                                    className="h-8 pl-9 text-xs bg-white/5 border-white/5 focus:bg-white/10 transition-all rounded-lg"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="space-y-0.5 max-h-[380px] overflow-y-auto custom-scrollbar p-2">
                            {identities
                                .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map(principal => (
                                    <div
                                        key={principal.id}
                                        className={cn(
                                            "flex items-center gap-4 p-3 rounded-xl transition-all duration-500 cursor-pointer border group relative overflow-hidden",
                                            selectedPrincipals.includes(principal.id)
                                                ? "bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(88,166,255,0.08)]"
                                                : "hover:bg-white/[0.04] border-transparent"
                                        )}
                                        onClick={() => handlePrincipalToggle(principal.id)}
                                    >
                                        {/* Selection Glow Indicator */}
                                        {selectedPrincipals.includes(principal.id) && (
                                            <div className="absolute inset-y-0 left-0 w-1 bg-primary animate-pulse shadow-[0_0_10px_rgba(88,166,255,0.8)]" />
                                        )}

                                        <div className={cn(
                                            "p-2.5 rounded-xl shadow-lg transition-all duration-500 flex-shrink-0",
                                            selectedPrincipals.includes(principal.id)
                                                ? "bg-primary text-primary-foreground shadow-primary/20 scale-110"
                                                : "bg-white/5 text-muted-foreground group-hover:text-foreground/70"
                                        )}>
                                            {principal.type === 'USER' && <User size={16} />}
                                            {principal.type === 'GROUP' && <Users size={16} />}
                                            {principal.type === 'SERVICE_PRINCIPAL' && <Lock size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[13px] font-bold text-foreground/90 tracking-tight truncate">{principal.name}</div>
                                            <div className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.1em] opacity-40 leading-none mt-1">
                                                {principal.type.replace('_', ' ')}
                                            </div>
                                        </div>
                                        <Checkbox
                                            checked={selectedPrincipals.includes(principal.id)}
                                            className="h-5 w-5 border-white/10 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-500"
                                        />
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-white/5 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden">
                    <CardHeader className="pb-4 bg-white/[0.01] border-b border-white/5">
                        <CardTitle className="text-base font-bold tracking-tight">2. Select Permissions</CardTitle>
                        <CardDescription className="text-xs">Required action levels</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {PERMISSIONS.map(perm => (
                                <div
                                    key={perm}
                                    className={cn(
                                        "flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 cursor-pointer group relative overflow-hidden",
                                        selectedPermissions.includes(perm)
                                            ? "border-primary/40 bg-primary/10 shadow-[inner_0_0_12px_rgba(88,166,255,0.05)]"
                                            : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                                    )}
                                    onClick={() => handlePermissionToggle(perm)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg transition-all duration-300",
                                            selectedPermissions.includes(perm)
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110"
                                                : "bg-white/5 text-muted-foreground/50 group-hover:text-muted-foreground/80"
                                        )}>
                                            {getPermissionIcon(perm)}
                                        </div>
                                        <span className={cn(
                                            "text-xs font-bold tracking-tight transition-colors truncate max-w-[120px]",
                                            selectedPermissions.includes(perm) ? "text-primary" : "text-foreground/50 group-hover:text-foreground/80"
                                        )}>
                                            {perm}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "h-5 w-5 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500",
                                        selectedPermissions.includes(perm) ? "bg-primary border-primary scale-110 shadow-[0_0_8px_rgba(88,166,255,0.4)]" : "bg-transparent"
                                    )}>
                                        {selectedPermissions.includes(perm) && <Check size={12} className="text-primary-foreground" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-white/5 bg-background/40 backdrop-blur-xl shadow-2xl">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-bold tracking-tight">3. Constraints & Justification</CardTitle>
                    <CardDescription className="text-xs">Duration and reason for access</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="space-y-5">
                        <Label className="text-primary/70 uppercase text-[11px] font-bold tracking-[0.2em]">Time Constraint</Label>
                        <RadioGroup
                            value={timeConstraint.type}
                            onValueChange={(val) => setTimeConstraint({ ...timeConstraint, type: val })}
                            className="flex flex-wrap gap-8"
                        >
                            <div className="flex items-center space-x-3 group">
                                <RadioGroupItem value="PERMANENT" id="permanent" className="border-white/20 text-primary" />
                                <Label htmlFor="permanent" className="text-sm font-semibold opacity-80 group-hover:opacity-100 transition-opacity">Permanent</Label>
                            </div>
                            <div className="flex items-center space-x-3 group">
                                <RadioGroupItem value="DURATION" id="duration" className="border-white/20 text-primary" />
                                <Label htmlFor="duration" className="text-sm font-semibold opacity-80 group-hover:opacity-100 transition-opacity">Duration (Hours)</Label>
                            </div>
                            <div className="flex items-center space-x-3 group">
                                <RadioGroupItem value="RANGE" id="range" className="border-white/20 text-primary" />
                                <Label htmlFor="range" className="text-sm font-semibold opacity-80 group-hover:opacity-100 transition-opacity">Date Range</Label>
                            </div>
                        </RadioGroup>

                        {timeConstraint.type === 'DURATION' && (
                            <div className="pl-7 animate-in slide-in-from-left-2 duration-500 max-w-[180px]">
                                <Label className="text-[11px] uppercase tracking-widest opacity-50 mb-2 block">Hours</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={timeConstraint.value}
                                    onChange={(e) => setTimeConstraint({ ...timeConstraint, value: parseInt(e.target.value) || 1 })}
                                    className="bg-transparent border-white/10 focus:border-primary/50"
                                />
                            </div>
                        )}

                        {timeConstraint.type === 'RANGE' && (
                            <div className="pl-7 animate-in slide-in-from-left-2 duration-500 flex gap-4 max-w-md">
                                <div className="flex-1">
                                    <Label className="text-[11px] uppercase tracking-widest opacity-50 mb-2 block">Start Date</Label>
                                    <Input
                                        type="date"
                                        value={timeConstraint.start}
                                        onChange={(e) => setTimeConstraint({ ...timeConstraint, start: e.target.value })}
                                        className="bg-transparent border-white/10 focus:border-primary/50"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-[11px] uppercase tracking-widest opacity-50 mb-2 block">End Date</Label>
                                    <Input
                                        type="date"
                                        value={timeConstraint.end}
                                        onChange={(e) => setTimeConstraint({ ...timeConstraint, end: e.target.value })}
                                        className="bg-transparent border-white/10 focus:border-primary/50"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator className="opacity-10" />

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                                <Key size={14} />
                            </div>
                            <Label htmlFor="justification" className="text-foreground/90 uppercase text-[10px] font-black tracking-[0.2em]">Justification & Rational</Label>
                        </div>
                        <Textarea
                            id="justification"
                            placeholder="Provide details on the business requirement for this access..."
                            className="min-h-[160px] resize-none bg-white/[0.02] border-white/5 focus:border-primary/40 focus:bg-white/[0.04] focus:ring-primary/10 rounded-2xl transition-all duration-500 p-6 text-sm leading-relaxed shadow-inner"
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                        />
                    </div>
                </CardContent>
                <CardFooter className="bg-white/[0.02] border-t border-white/5 mt-6 p-8">
                    {successMessage ? (
                        <div className="bg-primary/20 text-primary border border-primary/20 rounded-xl px-4 py-3 w-full flex items-center gap-3 font-bold animate-in zoom-in duration-500 justify-center shadow-lg shadow-primary/10">
                            <CheckCircle size={20} className="animate-bounce" /> {successMessage}
                        </div>
                    ) : (
                        <Button
                            className="w-full h-14 text-base font-bold tracking-tight bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all active:scale-[0.98] rounded-xl group"
                            onClick={handleSubmit}
                            disabled={isSubmitting || selectedPrincipals.length === 0 || selectedPermissions.length === 0 || !justification.trim()}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center gap-3">
                                    <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Processing Request...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Submit Access Request
                                    <Shield size={18} className="transition-transform group-hover:rotate-12" />
                                </div>
                            )}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default AccessForm;
