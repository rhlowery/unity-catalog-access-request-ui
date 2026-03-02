import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, AlertCircle, X, Clock, Users } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { getRequests, approveRequest, MOCK_IDENTITIES } from '../services/mockData';
import { ConfigService } from '../services/config/ConfigService';
import { ObservabilityService } from '../services/ObservabilityService';
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

const ApproverDashboard = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [denialState, setDenialState] = useState<{ reqId: string | null; reason: string }>({ reqId: null, reason: '' });
    const [activePersona, setActivePersona] = useState('group_governance');

    const personas = [
        { id: 'group_governance', name: 'Governance Team' },
        { id: 'user_marketing_lead', name: 'Marketing Lead' },
        { id: 'group_finance_admins', name: 'Finance Admins' },
        { id: 'group_data_scientists', name: 'Data Scientists' },
        { id: 'group_legal_compliance', name: 'Legal Compliance' },
    ];

    const { data: requests = [], isLoading } = useQuery({
        queryKey: ['requests'],
        queryFn: getRequests
    });

    const config = ConfigService.getConfig();
    const isProduction = import.meta.env.PROD;
    const isSimulationMode = (!isProduction || (window as any).ACS_DEMO_MODE) && config.enableSimulationMode;

    const approveMutation = useMutation({
        mutationFn: async ({ reqId, action, reason }: any) =>
            await approveRequest(reqId, activePersona, reason, action, isSimulationMode),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['requests'] })
    });

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
        <div className="approver-dashboard animate-fade-in space-y-6 p-4">
            {/* Simulation Mode Banner */}
            {isSimulationMode && (
                <Card className="border border-yellow-500/50 bg-yellow-500/5">
                    <CardContent className="py-3 flex items-center gap-4">
                        <Badge className="bg-yellow-500 text-black text-xs font-bold">SIMULATION</Badge>
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <Users size={14} />
                            <span>Viewing as:</span>
                        </div>
                        <Select value={activePersona} onValueChange={handlePersonaChange}>
                            <SelectTrigger className="w-[200px] h-8 text-sm bg-[var(--bg-tertiary)] border-[var(--glass-border)]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[var(--bg-secondary)] border-[var(--glass-border)]">
                                {personas.map(p => (
                                    <SelectItem key={p.id} value={p.id} className="text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
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
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <AlertCircle size={18} className="text-[var(--accent-color)]" />
                    Action Required
                    <Badge className={statusColors.PENDING}>{pendingForMe.length}</Badge>
                </h2>
                {isLoading && <div className="text-sm text-[var(--text-secondary)] p-4">Loading requests...</div>}
                {!isLoading && pendingForMe.length === 0 && (
                    <Card className="bg-[var(--bg-secondary)] border-[var(--glass-border)]">
                        <CardContent className="py-8 flex flex-col items-center gap-2 text-[var(--text-secondary)]">
                            <Check size={32} className="text-green-500 opacity-50" />
                            <p className="text-sm">You're all caught up!</p>
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
                <DialogContent className="bg-[var(--bg-secondary)] border-[var(--glass-border)] text-[var(--text-primary)]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-400">
                            <AlertCircle size={18} /> Deny Request
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-[var(--text-secondary)]">Please provide a reason for denying this request.</p>
                    <Textarea
                        placeholder="Reason for denial..."
                        value={denialState.reason}
                        onChange={(e) => setDenialState(s => ({ ...s, reason: e.target.value }))}
                        className="bg-[var(--bg-tertiary)] border-[var(--glass-border)] text-[var(--text-primary)]"
                        autoFocus
                    />
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDenialState({ reqId: null, reason: '' })}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDenial}
                            disabled={!denialState.reason.trim()}
                        >
                            Confirm Denial
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const RequestCard = ({ req, isActionable, onApprove, onDeny, isHistory }: any) => {
    const states = Object.values(req.approvalState || {});
    const approved = states.filter((s: any) => s === 'APPROVED').length;
    const total = states.length;
    const progressPercent = total > 0 ? (approved / total) * 100 : 0;

    return (
        <Card className={cn(
            "bg-[var(--bg-secondary)] border-[var(--glass-border)] transition-all",
            isHistory && "opacity-80"
        )}>
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0">
                <span className="text-xs text-[var(--text-secondary)]">
                    {new Date(req.timestamp).toLocaleString()}
                </span>
                {isHistory ? (
                    <Badge className={cn("text-xs", statusColors[req.status] || statusColors.PENDING)}>
                        {req.status}
                    </Badge>
                ) : (
                    <span className="text-xs text-[var(--text-secondary)]">{approved}/{total} Approvals</span>
                )}
            </CardHeader>

            {!isHistory && (
                <div className="px-4 pb-2">
                    <div className="h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-[var(--accent-color)] transition-all"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            )}

            <CardContent className="px-4 pb-3 space-y-2">
                <div>
                    <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Resources</p>
                    <div className="flex flex-wrap gap-1">
                        {req.requestedObjects?.map((obj: any) => (
                            <Badge key={obj.id} variant="secondary" className="text-xs bg-[var(--bg-tertiary)] text-[var(--text-primary)]">
                                {obj.name}
                            </Badge>
                        ))}
                    </div>
                </div>
                {req.justification && (
                    <p className="text-xs text-[var(--text-secondary)] italic">"{req.justification}"</p>
                )}
                {!isHistory && (
                    <div className="space-y-1">
                        {Object.entries(req.approvalState || {}).map(([approver, status]: [string, any]) => (
                            <div key={approver} className="flex items-center gap-2 text-xs">
                                <div className={cn("w-2 h-2 rounded-full", {
                                    'bg-green-500': status === 'APPROVED',
                                    'bg-yellow-500': status === 'PENDING',
                                    'bg-red-500': status === 'DENIED',
                                })} />
                                <span className="text-[var(--text-secondary)]">{approver}</span>
                                <span className={cn("ml-auto", {
                                    'text-green-400': status === 'APPROVED',
                                    'text-yellow-400': status === 'PENDING',
                                    'text-red-400': status === 'DENIED',
                                })}>{status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            {isActionable && (
                <CardFooter className="px-4 pb-3 pt-0 flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={onDeny} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                        <X size={14} className="mr-1" /> Deny
                    </Button>
                    <Button size="sm" onClick={onApprove} className="bg-[var(--accent-color)] text-[var(--bg-primary)] hover:bg-[var(--accent-hover)]">
                        <Check size={14} className="mr-1" /> Approve
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
};

export default ApproverDashboard;
