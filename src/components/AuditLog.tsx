import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, FileText, Search } from 'lucide-react';
import { getRequests } from '../services/mockData';

import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    APPROVED: 'bg-green-500/20 text-green-400 border-green-500/40',
    DENIED: 'bg-red-500/20 text-red-400 border-red-500/40',
    EXPIRED: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
};

const AuditLog = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        getRequests().then(requests => {
            const allEvents: any[] = [];
            requests.forEach(req => {
                const objectDetails = req.requestedObjects.map(obj =>
                    `${obj.fullPath || obj.name} (${req.permissions.join(', ')})`
                ).join('; ');

                let timeInfo = "Permanent";
                if (req.timeConstraint) {
                    if (req.timeConstraint.type === 'DURATION') timeInfo = `${req.timeConstraint.value} Hours`;
                    if (req.timeConstraint.type === 'RANGE') timeInfo = `${req.timeConstraint.start} to ${req.timeConstraint.end}`;
                }

                allEvents.push({
                    id: `${req.id}_created`,
                    timestamp: req.timestamp,
                    type: 'REQUEST_CREATED',
                    actor: req.requesterId,
                    details: `Requested access for ${req.principals.map(p => p.name).join(', ')}. Target: ${objectDetails}. Time: ${timeInfo}.${req.justification ? ` "${req.justification}"` : ''}`,
                    status: 'PENDING',
                    originalRequest: req
                });

                req.approvalData.forEach((approval, idx) => {
                    allEvents.push({
                        id: `${req.id}_decision_${idx}`,
                        timestamp: approval.timestamp,
                        type: `REQUEST_${approval.decision}`,
                        actor: approval.approverId,
                        details: `Decision: "${approval.message}"`,
                        status: approval.decision === 'APPROVE' ? 'APPROVED' : (approval.decision === 'REVOKE' ? 'EXPIRED' : 'DENIED'),
                        originalRequest: req
                    });
                });
            });

            allEvents.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
            setEvents(allEvents);
        });
    }, []);

    const getEventIcon = (type: string) => {
        if (type === 'REQUEST_CREATED') return <Clock size={14} className="text-yellow-400" />;
        if (type === 'REQUEST_APPROVED') return <CheckCircle size={14} className="text-green-400" />;
        if (type.includes('DENIED') || type.includes('REVOKE')) return <XCircle size={14} className="text-red-400" />;
        return <FileText size={14} className="text-[var(--text-secondary)]" />;
    };

    const filtered = events.filter(e =>
        !search || e.actor?.toLowerCase().includes(search.toLowerCase()) ||
        e.type?.toLowerCase().includes(search.toLowerCase()) ||
        e.details?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="audit-log animate-in fade-in slide-in-from-bottom-2 duration-700 space-y-8 p-2 max-w-6xl mx-auto">
            <div className="flex items-center justify-between gap-6 pb-2 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-1.5 h-8 bg-primary/40 rounded-full" />
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground/90">System Audit Log</h2>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium mt-0.5">Historical Activity & Decision Tracking</p>
                    </div>
                </div>
                <div className="relative w-80">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                    <Input
                        placeholder="Filter by actor, event, or details..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-12 h-11 bg-black/20 border-white/5 focus:border-primary/50 text-sm transition-all shadow-inner"
                    />
                </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent bg-white/[0.02]">
                            <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest py-4 px-6">Timestamp</TableHead>
                            <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest py-4 px-6">Event Type</TableHead>
                            <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest py-4 px-6">Actor</TableHead>
                            <TableHead className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest py-4 px-6">Brief Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-20">
                                    <div className="flex flex-col items-center gap-3 opacity-40">
                                        <Search size={40} />
                                        <p className="text-sm font-medium">No matching audit events found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(event => (
                                <TableRow
                                    key={event.id}
                                    onClick={() => setSelectedEvent(event)}
                                    className="cursor-pointer border-white/[0.03] hover:bg-white/[0.03] transition-all duration-200 group"
                                >
                                    <TableCell className="text-[11px] font-mono text-muted-foreground py-4 px-6 group-hover:text-foreground/70 transition-colors">
                                        {new Date(event.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-md bg-white/[0.03] shadow-inner group-hover:scale-110 transition-transform">
                                                {getEventIcon(event.type)}
                                            </div>
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 group-hover:text-foreground">{event.type}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <Badge variant="outline" className="text-[10px] font-semibold border-white/10 bg-white/[0.02] px-2 py-0.5">
                                            {event.actor}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground py-4 px-6 max-w-sm truncate group-hover:text-foreground/60 transition-colors leading-relaxed">
                                        {event.details}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Event Detail Dialog */}
            <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
                <DialogContent className="bg-background/95 backdrop-blur-2xl border-white/10 shadow-3xl max-w-xl p-0 overflow-hidden">
                    <DialogHeader className="p-8 pb-6 border-b border-white/5 bg-white/[0.01]">
                        <DialogTitle className="flex flex-col gap-1.5">
                            <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary/70">Audit Record Detail</span>
                            <span className="text-2xl font-bold tracking-tight text-foreground/90">Request #{selectedEvent?.originalRequest?.id?.substring(0, 8)}</span>
                        </DialogTitle>
                    </DialogHeader>
                    {selectedEvent && (
                        <div className="p-8 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Final Status</p>
                                    <Badge className={cn("text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 shadow-lg", statusColors[selectedEvent.originalRequest.status])}>
                                        {selectedEvent.originalRequest.status}
                                    </Badge>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Created Date</p>
                                    <p className="text-sm font-semibold tabular-nums text-foreground/80">
                                        {new Date(selectedEvent.originalRequest.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-80">Requester</p>
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 font-bold tracking-tight text-sm">
                                        {selectedEvent.originalRequest.requesterId}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-80">Recipient Principals</p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {selectedEvent.originalRequest.principals?.map((p: any) => (
                                            <Badge key={p.id} className="bg-white/5 border-white/5 font-semibold text-[11px] px-2 py-0.5">
                                                {p.name}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Separator className="opacity-[0.03]" />

                            <div className="space-y-4">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-80">Access Targets & Permissions</p>
                                <div className="space-y-2.5">
                                    {selectedEvent.originalRequest.requestedObjects?.map((obj: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5 transition-colors hover:bg-white/[0.04]">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 rounded-lg bg-blue-500/10 shadow-lg">
                                                    <FileText size={18} className="text-blue-400/70" />
                                                </div>
                                                <span className="font-bold text-sm tracking-tight text-foreground/90">{obj.fullPath || obj.name}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 justify-end max-w-[50%]">
                                                {selectedEvent.originalRequest.permissions?.map((p: string) => (
                                                    <Badge key={p} variant="ghost" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 h-5 border-none">
                                                        {p}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedEvent.originalRequest.justification && (
                                <div className="space-y-3 p-5 rounded-2xl bg-amber-500/[0.02] border border-amber-500/10 shadow-[inner_0_0_20px_rgba(245,158,11,0.02)]">
                                    <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">Business Justification</p>
                                    <p className="text-sm font-medium italic text-amber-100/70 leading-relaxed">"{selectedEvent.originalRequest.justification}"</p>
                                </div>
                            )}

                            <Separator className="opacity-[0.03]" />

                            <div className="space-y-6">
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-80">Approval Timeline</p>
                                <div className="space-y-0 pl-1 relative">
                                    {/* Vertical Line */}
                                    <div className="absolute left-[5px] top-2 bottom-2 w-px bg-white/5" />

                                    <div className="flex items-start gap-4 pb-8 group relative z-10">
                                        <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-primary/40 group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(88,166,255,0.3)]" />
                                        <div className="space-y-1">
                                            <strong className="text-xs font-bold tracking-tight uppercase opacity-90">Request Initialized</strong>
                                            <p className="text-[11px] font-medium text-muted-foreground/60">{new Date(selectedEvent.originalRequest.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {selectedEvent.originalRequest.approvalData?.map((ad: any, i: number) => (
                                        <div key={i} className="flex items-start gap-4 pb-8 group relative z-10 last:pb-0">
                                            <div className={cn("w-2.5 h-2.5 mt-1.5 rounded-full group-hover:scale-125 transition-transform shadow-lg", {
                                                'bg-green-500 shadow-green-500/20': ad.decision === 'APPROVE',
                                                'bg-red-500 shadow-red-500/20': ad.decision === 'DENY',
                                                'bg-gray-500 shadow-gray-500/20': ad.decision === 'REVOKE',
                                            })} />
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <strong className={cn("text-xs font-black uppercase tracking-widest", {
                                                        'text-green-400': ad.decision === 'APPROVE',
                                                        'text-red-400': ad.decision === 'DENY',
                                                        'text-gray-400': ad.decision === 'REVOKE',
                                                    })}>{ad.decision}</strong>
                                                    <span className="text-[10px] font-semibold text-muted-foreground opacity-40 italic">by</span>
                                                    <span className="text-xs font-bold text-foreground/80">{ad.approverId}</span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                                                    <p className="text-[13px] font-medium text-muted-foreground italic">"{ad.message}"</p>
                                                </div>
                                                <p className="text-[10px] font-mono text-muted-foreground/40">{new Date(ad.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AuditLog;
