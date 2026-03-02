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
        <div className="audit-log animate-fade-in space-y-4 p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">System Audit Log</h2>
                <div className="relative w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <Input
                        placeholder="Filter events..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 h-8 text-sm bg-[var(--bg-tertiary)] border-[var(--glass-border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                    />
                </div>
            </div>

            <div className="rounded-lg border border-[var(--glass-border)] bg-[var(--bg-secondary)] overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-[var(--glass-border)] hover:bg-transparent">
                            <TableHead className="text-[var(--text-secondary)] text-xs w-40">Timestamp</TableHead>
                            <TableHead className="text-[var(--text-secondary)] text-xs w-48">Event</TableHead>
                            <TableHead className="text-[var(--text-secondary)] text-xs w-36">Actor</TableHead>
                            <TableHead className="text-[var(--text-secondary)] text-xs">Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-[var(--text-secondary)] py-8 text-sm">
                                    No audit events found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(event => (
                                <TableRow
                                    key={event.id}
                                    onClick={() => setSelectedEvent(event)}
                                    className="cursor-pointer border-[var(--glass-border)] hover:bg-[var(--bg-tertiary)] transition-colors"
                                >
                                    <TableCell className="text-xs text-[var(--text-secondary)] py-2.5">
                                        {new Date(event.timestamp).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="py-2.5">
                                        <div className="flex items-center gap-1.5">
                                            {getEventIcon(event.type)}
                                            <span className="text-xs text-[var(--text-primary)]">{event.type}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-[var(--text-primary)] py-2.5">{event.actor}</TableCell>
                                    <TableCell className="text-xs text-[var(--text-secondary)] py-2.5 max-w-xs truncate">
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
                <DialogContent className="bg-[var(--bg-secondary)] border-[var(--glass-border)] text-[var(--text-primary)] max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-semibold">
                            Request #{selectedEvent?.originalRequest?.id}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedEvent && (
                        <div className="space-y-4 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-secondary)]">Status</span>
                                <Badge className={cn("text-xs", statusColors[selectedEvent.originalRequest.status])}>
                                    {selectedEvent.originalRequest.status}
                                </Badge>
                            </div>
                            <Separator className="bg-[var(--glass-border)]" />
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-[var(--text-secondary)] mb-0.5">Requester</p>
                                    <p>{selectedEvent.originalRequest.requesterId}</p>
                                </div>
                                <div>
                                    <p className="text-[var(--text-secondary)] mb-0.5">Principals</p>
                                    <p>{selectedEvent.originalRequest.principals?.map((p: any) => p.name).join(', ')}</p>
                                </div>
                            </div>
                            <Separator className="bg-[var(--glass-border)]" />
                            <div>
                                <p className="text-[var(--text-secondary)] mb-1 text-xs">Access Target</p>
                                <ul className="space-y-1">
                                    {selectedEvent.originalRequest.requestedObjects?.map((obj: any, i: number) => (
                                        <li key={i} className="text-xs">
                                            <span className="text-[var(--text-primary)]">{obj.fullPath || obj.name}</span>
                                            <span className="text-[var(--text-secondary)] ml-2">
                                                ({selectedEvent.originalRequest.permissions?.join(', ')})
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {selectedEvent.originalRequest.justification && (
                                <div>
                                    <p className="text-[var(--text-secondary)] mb-0.5 text-xs">Justification</p>
                                    <p className="text-xs italic">"{selectedEvent.originalRequest.justification}"</p>
                                </div>
                            )}
                            <Separator className="bg-[var(--glass-border)]" />
                            <div>
                                <p className="text-[var(--text-secondary)] mb-2 text-xs">Approval Timeline</p>
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2 text-xs">
                                        <div className="w-2 h-2 mt-1 rounded-full bg-[var(--accent-color)] shrink-0" />
                                        <div>
                                            <strong>Request Created</strong>
                                            <p className="text-[var(--text-secondary)]">{new Date(selectedEvent.originalRequest.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {selectedEvent.originalRequest.approvalData?.map((ad: any, i: number) => (
                                        <div key={i} className="flex items-start gap-2 text-xs">
                                            <div className={cn("w-2 h-2 mt-1 rounded-full shrink-0", {
                                                'bg-green-500': ad.decision === 'APPROVE',
                                                'bg-red-500': ad.decision === 'DENY',
                                                'bg-gray-500': ad.decision === 'REVOKE',
                                            })} />
                                            <div>
                                                <strong>{ad.decision} by {ad.approverId}</strong>
                                                <p className="text-[var(--text-secondary)]">"{ad.message}"</p>
                                                <p className="text-[var(--text-secondary)]">{new Date(ad.timestamp).toLocaleString()}</p>
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
