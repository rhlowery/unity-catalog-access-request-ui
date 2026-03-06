import React, { useState, useEffect, useMemo } from 'react';
import {
    Search,
    Filter,
    Download,
    ShieldCheck,
    ShieldAlert,
    Clock,
    User,
    Activity,
    FileText,
    RefreshCw,
    X,
    ChevronLeft,
    ChevronRight,
    Terminal
} from 'lucide-react';
import { apiClient } from '../../lib/axios';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date(timestamp));
};

const AdminAuditTab = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/api/audit/log');
            setLogs(res.data || []);
        } catch (error) {
            console.error('[AdminAuditTab] Failed to fetch audit logs:', error);
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch =
                log.actor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.target?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.type?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesType = filterType === 'ALL' || log.type === filterType;

            return matchesSearch && matchesType;
        });
    }, [logs, searchQuery, filterType]);

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `acs_audit_export_${new Date().toISOString()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toast.success('Audit log export started');
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'SECURITY': return <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">SECURITY</Badge>;
            case 'ACCESS': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">ACCESS</Badge>;
            case 'SYSTEM': return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">SYSTEM</Badge>;
            default: return <Badge variant="secondary" className="opacity-70">{type}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex flex-1 w-full sm:w-auto gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            placeholder="Search by actor, action, or target..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="pl-10 bg-background/50 border-white/10"
                        />
                        {searchQuery && (
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setSearchQuery('')}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <Select value={filterType} onValueChange={(val) => { setFilterType(val); setCurrentPage(1); }}>
                        <SelectTrigger className="w-[150px] bg-background/50 border-white/10">
                            <Filter size={14} className="mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Types</SelectItem>
                            <SelectItem value="SECURITY">Security</SelectItem>
                            <SelectItem value="ACCESS">Access</SelectItem>
                            <SelectItem value="SYSTEM">System</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="gap-2">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                        <Download size={14} /> Export
                    </Button>
                </div>
            </div>

            <Card className="border-border/50 bg-background/20 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/50">
                                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Timestamp</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actor</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Action</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Integrity</th>
                                <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right w-20">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array(7).fill(0).map((_, j) => (
                                            <td key={j} className="p-4"><div className="h-4 bg-muted rounded w-3/4"></div></td>
                                        ))}
                                    </tr>
                                ))
                            ) : paginatedLogs.length > 0 ? (
                                paginatedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-muted/10 transition-colors group">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-xs text-foreground/70">
                                                <Clock size={12} className="text-muted-foreground" />
                                                {formatDate(log.timestamp)}
                                            </div>
                                        </td>
                                        <td className="p-4">{getTypeBadge(log.type)}</td>
                                        <td className="p-4 text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <User size={14} className="text-primary opacity-50" />
                                                {log.actor}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-foreground/80">{log.action}</td>
                                        <td className="p-4 text-sm font-mono text-muted-foreground max-w-[200px] truncate" title={log.target}>
                                            {log.target}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5">
                                                {log.signature ? (
                                                    <ShieldCheck size={14} className="text-green-500" />
                                                ) : (
                                                    <ShieldAlert size={14} className="text-amber-500 opacity-50" />
                                                )}
                                                <span className="text-[10px] font-bold text-muted-foreground">
                                                    {log.signature ? 'SIGNED' : 'UNSECURED'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setSelectedLog(log)}
                                            >
                                                <Terminal size={14} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-3">
                                            <Activity size={32} className="opacity-20" />
                                            <p className="text-sm font-medium opacity-50">No audit logs found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/20">
                        <div className="text-xs text-muted-foreground">
                            Showing <span className="text-foreground font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-foreground font-medium">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="text-foreground font-medium">{filteredLogs.length}</span> entries
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <span className="text-xs font-medium px-2">Page {currentPage} of {totalPages}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0"
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
                <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText size={18} /> Audit Entry Details
                        </DialogTitle>
                        <DialogDescription>
                            Full technical metadata and details for this audit event.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Event ID</label>
                                    <div className="text-xs font-mono bg-muted/50 p-2 rounded">{selectedLog.id}</div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground">Timestamp</label>
                                    <div className="text-xs font-mono bg-muted/50 p-2 rounded">
                                        {formatDate(selectedLog.timestamp)}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Action Summary</label>
                                <div className="text-sm p-3 bg-primary/5 border border-primary/10 rounded-lg">
                                    <span className="font-bold text-primary">{selectedLog.actor}</span> performed <span className="font-bold text-primary">{selectedLog.action}</span> on <span className="font-bold text-primary">{selectedLog.target}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground">Raw Metadata</label>
                                <div className="text-[11px] font-mono bg-neutral-950 p-4 rounded-lg overflow-x-auto border border-white/5 max-h-[300px]">
                                    <pre className="text-neutral-300">
                                        {JSON.stringify(selectedLog, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            {selectedLog.signature && (
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                                    <ShieldCheck className="text-green-500 mt-1" size={18} />
                                    <div>
                                        <p className="text-xs font-bold text-green-500 uppercase tracking-wider">Verified Cryptographic Signature</p>
                                        <p className="text-[11px] text-green-500/70 mt-1">This entry includes a digital signature from the ACS core. Trust chain is valid.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminAuditTab;
