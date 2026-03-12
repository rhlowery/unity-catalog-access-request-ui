import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, AlertCircle, X, Clock, Users } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { getRequests, approveRequest, MOCK_IDENTITIES } from '../services/mockData';
import { ConfigService } from '../services/config/ConfigService';
import { ObservabilityService } from '../services/ObservabilityService';
import { usePersona } from '../hooks/usePersona';
import ErrorTestPanel from './ErrorTestPanel';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    APPROVED: 'bg-green-500/20 text-green-400 border-green-500/40',
    DENIED: 'bg-red-500/20 text-red-400 border-red-500/40',
    EXPIRED: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
};

import { toast } from 'sonner';

const ApproverDashboard = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [denialState, setDenialState] = useState<{ reqId: string | null; reason: string }>({ reqId: null, reason: '' });
    const [activePersona, setActivePersona] = useState('group_governance');

    const { canViewApprover: hasApproverAccess } = usePersona(user);

    const personaOptions = [
        { id: 'group_governance', name: 'Governance Team' },
        { id: 'group_finance_admins', name: 'Finance Admins' },
        { id: 'group_hr_admins', name: 'HR Admins' },
        { id: 'group_security', name: 'Security Admins' },
        { id: 'group_marketing', name: 'Marketing Admins' },
    ];

    const config = ConfigService.getConfig();
    const isProduction = import.meta.env.PROD;
    const isSimulationMode = (!isProduction || (window as any).ACS_DEMO_MODE) && config.enableSimulationMode;

    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['requests'],
        queryFn: getRequests,
        enabled: hasApproverAccess // Only query if they have access
    });

    const approveMutation = useMutation({
        mutationFn: async ({ reqId, action, reason }: any) =>
            await approveRequest(reqId, activePersona, reason, action, isSimulationMode),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            const actionLabel = variables.action === 'APPROVE' ? 'approved' : 'denied';
            toast.success(`Request ${actionLabel} successfully.`);
        },
        onError: (error: any) => {
            toast.error(`Failed to process request: ${error.message || 'Unknown error'}`);
        }
    });

    useEffect(() => {
        if (!hasApproverAccess) return;

        const BFF_URL = import.meta.env.VITE_BFF_URL || 'http://localhost:3001';
        const eventSource = new EventSource(`${BFF_URL}/api/storage/requests/stream`, {
            withCredentials: true
        });

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'UPDATE') {
                    console.log('[SSE] Received update event, refreshing requests...');
                    queryClient.invalidateQueries({ queryKey: ['requests'] });
                }
            } catch (err) {
                console.error('[SSE] Failed to parse event', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('[SSE] Connection error', err);
        };

        return () => {
            eventSource.close();
        };
    }, [hasApproverAccess, queryClient]);

    if (!hasApproverAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle size={48} className="text-destructive opacity-50" />
                <h2 className="text-xl font-bold text-destructive">Access Denied</h2>
                <p className="text-muted-foreground text-center max-w-md">
                    You don't have approver permissions. Contact your administrator to request access.
                </p>
            </div>
        );
    }

    const handleApprove = (reqId: string) =>
        approveMutation.mutate({ reqId, action: 'APPROVE', reason: 'Approved via Dashboard' });

    const confirmDenial = () => {
        if (!denialState.reason.trim()) return;
        approveMutation.mutate({ reqId: denialState.reqId, action: 'DENY', reason: denialState.reason });
        setDenialState({ reqId: null, reason: '' });
    };

    const handlePersonaChange = (newPersona: string) => {
        ObservabilityService.logPersonaSwitch('current_user', activePersona, newPersona);
        setActivePersona(newPersona);
    };

    const pendingForMe = requests.filter(r =>
        r.status === 'PENDING' && r.approvalState?.[activePersona] === 'PENDING'
    );
    const otherPending = requests.filter(r =>
        r.status === 'PENDING' && r.approvalState?.[activePersona] === 'APPROVED'
    );
    const completedRequests = requests.filter(r =>
        r.status !== 'PENDING' && Object.keys(r.approvalState || {}).includes(activePersona)
    );

    return (
        <div className="approver-dashboard animate-in fade-in slide-in-from-bottom-2 duration-700 space-y-10 p-2 max-w-5xl mx-auto">
            {/* Simulation Mode Banner */}
            {isSimulationMode && (
                <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-md overflow-hidden">
                    <CardContent className="py-4 flex items-center gap-6">
                        <Badge className="bg-amber-500 text-black text-[10px] font-bold tracking-widest px-2 py-0.5">SIMULATION</Badge>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest opacity-60">
                            <Users size={14} />
                            <span>Viewing as :</span>
                        </div>
                        <Select value={activePersona} onValueChange={handlePersonaChange}>
                            <SelectTrigger className="w-[240px] h-10 bg-black/20 border-white/5 hover:bg-black/30 transition-all font-medium">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                                {personaOptions.map(p => (
                                    <SelectItem key={p.id} value={p.id} className="text-sm">
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            )}

            {/* Action Required */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold tracking-tight text-foreground/90 flex items-center gap-3">
                        <AlertCircle size={24} className="text-primary/70" />
                        Action Required
                    </h2>
                    <Badge className={cn("px-2.5 py-0.5 font-bold tabular-nums", statusColors.PENDING)}>{pendingForMe.length}</Badge>
                </div>
                {isLoading && <div className="text-sm text-[var(--text-secondary)] p-4">Loading requests...</div>}
                {!isLoading && pendingForMe.length === 0 && (
                    <Card className="bg-background/20 backdrop-blur-md border-dashed border-white/5 py-12">
                        <CardContent className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 mb-2">
                                <Check size={32} className="text-primary opacity-40" />
                            </div>
                            <p className="text-lg font-medium tracking-tight">You're all caught up!</p>
                            <p className="text-xs uppercase tracking-[0.2em] opacity-50">No pending approvals at this time</p>
                        </CardContent>
                    </Card>
                )}
                <div className="space-y-3">
                    {pendingForMe.map(req => (
                        <RequestCard
                            key={req.id}
                            req={req}
                            isActionable={true}
                            onApprove={() => handleApprove(req.id)}
                            onDeny={() => setDenialState({ reqId: req.id, reason: '' })}
                        />
                    ))}
                </div>
            </section>

            {/* Pending Others */}
            {otherPending.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                        <Clock size={18} />
                        Pending Others
                        <Badge variant="secondary">{otherPending.length}</Badge>
                    </h2>
                    <div className="space-y-3 opacity-70">
                        {otherPending.map(req => <RequestCard key={req.id} req={req} isActionable={false} />)}
                    </div>
                </section>
            )}

            {/* History */}
            {completedRequests.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-[var(--text-secondary)] mb-3">History</h2>
                    <div className="space-y-3">
                        {completedRequests.map(req => <RequestCard key={req.id} req={req} isActionable={false} isHistory />)}
                    </div>
                </section>
            )}

            {/* Denial Dialog */}
            <Dialog open={!!denialState.reqId} onOpenChange={(open) => !open && setDenialState({ reqId: null, reason: '' })}>
                <DialogContent className="bg-background/95 backdrop-blur-2xl border-white/10 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-400">
                            <AlertCircle size={18} /> Deny Request
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-[var(--text-secondary)]">Please provide a reason for denying this request.</p>
                    <Textarea
                        placeholder="Please explain why access is being denied..."
                        value={denialState.reason}
                        onChange={(e) => setDenialState(s => ({ ...s, reason: e.target.value }))}
                        className="bg-black/20 border-white/5 min-h-[120px] focus:border-primary/50 transition-all font-medium"
                        autoFocus
                        data-testid="denial-reason-input"
                    />
                    <DialogFooter className="mt-8 gap-3 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setDenialState({ reqId: null, reason: '' })}
                            className="font-bold uppercase tracking-widest text-xs opacity-60 hover:opacity-100 h-11"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDenial}
                            disabled={!denialState.reason.trim()}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold uppercase tracking-widest text-xs h-11 shadow-lg shadow-red-500/20"
                            data-testid="confirm-denial-button"
                        >
                            Confirm Denial
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

interface RequestCardProps {
    req: any;
    isActionable: boolean;
    onApprove?: () => void;
    onDeny?: () => void;
    isHistory?: boolean;
}

const RequestCard = ({ req, isActionable, onApprove, onDeny, isHistory }: RequestCardProps) => {
    const states = Object.values(req.approvalState || {});
    const approved = states.filter((s: any) => s === 'APPROVED').length;
    const total = states.length;
    const progressPercent = total > 0 ? (approved / total) * 100 : 0;

    return (
        <Card className={cn(
            "bg-background/40 backdrop-blur-xl border-white/5 transition-all duration-300 hover:border-white/10 hover:bg-background/60 shadow-lg group",
            isHistory && "opacity-60 grayscale-[0.5]"
        )}>
            <CardHeader className="py-4 px-6 flex flex-row items-center justify-between space-y-0 border-b border-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {new Date(req.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                </div>
                {isHistory ? (
                    <Badge className={cn("text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm", statusColors[req.status] || statusColors.PENDING)}>
                        {req.status}
                    </Badge>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-primary tracking-widest uppercase opacity-70">Progress</span>
                        <span className="text-xs font-mono font-bold">{approved}/{total}</span>
                    </div>
                )}
            </CardHeader>

            {!isHistory && (
                <div className="px-6 pt-1">
                    <div className="h-1 rounded-full bg-white/[0.03] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-primary/40 to-primary shadow-[0_0_8px_rgba(88,166,255,0.3)] transition-all duration-700 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            <CardContent className="p-6 space-y-5">
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 opacity-60">Requested Resources</p>
                    <div className="flex flex-wrap gap-2">
                        {req.requestedObjects?.map((obj: any) => (
                            <Badge key={obj.id} variant="secondary" className="text-[11px] font-semibold bg-white/5 border-white/5 px-2.5 py-0.5 hover:bg-white/10 transition-colors">
                                {obj.name}
                            </Badge>
                        ))}
                    </div>
                </div>
                {req.justification && (
                    <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5">
                        <p className="text-xs text-foreground/70 leading-relaxed italic">"{req.justification}"</p>
                    </div>
                )}
                {!isHistory && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {Object.entries(req.approvalState || {}).map(([approver, status]: [string, any]) => (
                            <div key={approver} className="flex items-center gap-3 p-2 rounded-md bg-white/[0.01] border border-white/[0.03]">
                                <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", {
                                    'bg-green-500 shadow-green-500/20': status === 'APPROVED',
                                    'bg-amber-500 shadow-amber-500/20': status === 'PENDING',
                                    'bg-red-500 shadow-red-500/20': status === 'DENIED',
                                })} />
                                <span className="text-[11px] font-medium text-foreground/60">{approver}</span>
                                <Badge variant="ghost" className={cn("ml-auto text-[10px] font-bold uppercase tracking-widest h-5 px-1.5", {
                                    'text-green-400': status === 'APPROVED',
                                    'text-amber-400': status === 'PENDING',
                                    'text-red-400': status === 'DENIED',
                                })}>{status}</Badge>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {isActionable && (
                <CardFooter className="px-6 pb-6 pt-0 flex justify-end gap-3">
                    <Button variant="ghost" size="sm" onClick={onDeny} className="text-red-400 hover:bg-red-500/10 hover:text-red-400 h-9 px-4 font-bold tracking-tight">
                        <X size={16} className="mr-2" /> Deny Request
                    </Button>
                    <Button size="sm" onClick={onApprove} className="bg-primary hover:bg-primary-hover text-primary-foreground h-9 px-6 font-bold tracking-tight shadow-lg shadow-primary/10">
                        <Check size={16} className="mr-2" /> Approve Request
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
};

export default ApproverDashboard;
