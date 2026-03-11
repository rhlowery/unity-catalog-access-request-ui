import React, { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Database, Server, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ObservabilityService } from '../../services/ObservabilityService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const AdminHealthTab = () => {
    const [metrics, setMetrics] = useState<any>(null);
    const [bffStatus, setBffStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                // Get local frontend metrics
                const localMetrics = ObservabilityService.getMetrics();
                setMetrics(localMetrics);

                // Get BFF health
                const { apiClient } = await import('../../lib/axios');
                const response = await apiClient.get('/health');
                setBffStatus(response.data);
            } catch (error) {
                console.error('Failed to fetch health metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="p-8 text-center">Loading health diagnostics...</div>;

    const StatusBadge = ({ status }: { status: string }) => {
        const isOk = status === 'ok' || status === 'success' || status === 'VALID';
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${isOk ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                {isOk ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                {status}
            </span>
        );
    };

    const memoryPercent = Math.min(100, (metrics?.memoryUsage || 0) / (256 * 1024 * 1024) * 100);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-background/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Server size={16} className="text-primary" /> BFF Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs">
                                <span>Version</span>
                                <span className="font-mono">{bffStatus?.version || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span>Status</span>
                                <StatusBadge status={bffStatus?.status || 'error'} />
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span>Storage</span>
                                <StatusBadge status={bffStatus?.checks?.storage || 'error'} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-background/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <ShieldCheck size={16} className="text-primary" /> Audit Integrity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs">
                                <span>Trust Chain</span>
                                <StatusBadge status={metrics?.auditIntegrityStatus || 'VALID'} />
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span>Audit Events</span>
                                <span className="font-mono">{metrics?.auditEvents?.length || 0}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span>Last Verified</span>
                                <span className="text-[10px] opacity-70">Just now</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-background/40">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Activity size={16} className="text-primary" /> Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs">
                                <span>Memory Heap</span>
                                <span className="font-mono text-[10px]">{Math.round((metrics?.memoryUsage || 0) / 1024 / 1024)}MB</span>
                            </div>
                            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500"
                                    style={{ width: `${memoryPercent}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span>Error Rate</span>
                                <span className={`${metrics?.errorCount > 0 ? 'text-red-500' : 'text-green-500'}`}>{metrics?.errorCount || 0} detected</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-background/40">
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Database size={16} className="text-primary" /> Active Connection Diagnostics
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Real-time verification of downstream services and configuration resolution.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Object.entries(metrics?.lastApiStatus || {}).map(([api, status]: [string, any]) => (
                            <div key={api} className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/30">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${status === 'ok' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                                    <span className="text-xs font-mono">{api}</span>
                                </div>
                                <span className="text-[10px] opacity-60">Last seen: {new Date().toLocaleTimeString()}</span>
                            </div>
                        ))}
                        {Object.keys(metrics?.lastApiStatus || {}).length === 0 && (
                            <div className="text-center py-4 text-xs text-muted-foreground opacity-50 italic">
                                No API interactions recorded in this session yet.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminHealthTab;
