import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Info, Shield, AlertTriangle } from 'lucide-react';
import { StorageService } from '../services/storage/StorageService';
import { CatalogService } from '../services/catalog/CatalogService';

interface ReviewerTabProps {
    selectedObject: any;
}

const ReviewerTab = ({ selectedObject }: ReviewerTabProps) => {
    const { data: configured = [], isLoading: loadingConfigured } = useQuery({
        queryKey: ['configuredGrants', typeof selectedObject === 'object' ? selectedObject?.id : selectedObject],
        queryFn: () => StorageService.getGrants(selectedObject),
        enabled: !!selectedObject
    });

    const { data: live = [], isLoading: loadingLive } = useQuery({
        queryKey: ['liveGrants', typeof selectedObject === 'object' ? selectedObject?.id : selectedObject],
        queryFn: () => CatalogService.getLiveGrants(selectedObject),
        enabled: !!selectedObject
    });

    const loading = loadingConfigured || loadingLive;

    const comparison = useMemo(() => {
        if (!selectedObject || loading) return [];

        // Match grants logic
        const allItems = [];

        // 1. Process Configured Grants
        configured.forEach(cg => {
            cg.permissions.forEach(perm => {
                const matchIndex = live.findIndex((lg: any) =>
                    ((lg.principal as any)?.id || lg.principal) === ((cg.principal as any)?.id || cg.principal) &&
                    lg.permissions.includes(perm)
                );

                if (matchIndex !== -1) {
                    allItems.push({
                        principal: cg.principal,
                        permission: perm,
                        status: 'SYNCED',
                        source: 'BOTH'
                    });
                } else {
                    allItems.push({
                        principal: cg.principal,
                        permission: perm,
                        status: 'NOT_APPLIED',
                        source: 'CONFIGURED'
                    });
                }
            });
        });

        // 2. Process Live Grants (Find "Not Recorded")
        live.forEach(lg => {
            lg.permissions.forEach(perm => {
                const existsInConfigured = configured.some((cg: any) =>
                    ((cg.principal as any)?.id || cg.principal) === ((lg.principal as any)?.id || lg.principal) &&
                    cg.permissions.includes(perm)
                );

                if (!existsInConfigured) {
                    allItems.push({
                        principal: lg.principal,
                        permission: perm,
                        status: 'NOT_RECORDED',
                        source: 'LIVE'
                    });
                }
            });
        });

        // Sort by status priority (Not Recorded > Not Applied > Synced)
        allItems.sort((a, b) => {
            const priority = { 'NOT_RECORDED': 1, 'NOT_APPLIED': 2, 'SYNCED': 3 };
            return priority[a.status] - priority[b.status];
        });

        return allItems;
    }, [selectedObject, configured, live, loading]);



    if (!selectedObject) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-muted p-6 rounded-full mb-6">
                    <Shield size={64} className="text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-2">No Object Selected</h3>
                <p className="text-muted-foreground max-w-xs mx-auto">
                    Select an object from the tree to review its access.
                </p>
            </div>
        );
    }

    if (loading) {
        return <div className="p-4">Loading access details...</div>;
    }

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500">
            <div className="p-6 border-b border-white/10 bg-white/5">
                <h2 className="text-xl font-bold flex items-center gap-3 tracking-tight">
                    <Shield size={24} className="text-primary" />
                    Current Access: <span className="text-muted-foreground">{selectedObject.name}</span>
                </h2>
                <div className="mt-1 text-xs text-muted-foreground uppercase tracking-widest font-medium">
                    {selectedObject.type} • {selectedObject.id}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-left">
                            <th className="pb-4 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Principal</th>
                            <th className="pb-4 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Permission</th>
                            <th className="pb-4 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Status</th>
                            <th className="pb-4 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {comparison.map((item, idx) => (
                            <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 px-2">
                                    <div className="font-semibold text-sm">{(item.principal as any).name || item.principal}</div>
                                    <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{(item.principal as any).type || ''}</div>
                                </td>
                                <td className="py-4 px-2">
                                    <code className="text-xs bg-muted/50 px-2 py-1 rounded border border-white/5 font-mono text-primary/80">
                                        {item.permission}
                                    </code>
                                </td>
                                <td className="py-4 px-2">
                                    {item.status === 'SYNCED' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            <CheckCircle size={12} /> Synced
                                        </span>
                                    )}
                                    {item.status === 'NOT_APPLIED' && (
                                        <div className="relative group/tooltip inline-block">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 cursor-help">
                                                <AlertTriangle size={12} /> Not Applied
                                            </span>
                                            <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-card border border-border shadow-2xl rounded-lg text-xs leading-relaxed text-muted-foreground backdrop-blur-xl">
                                                <div className="font-bold text-foreground mb-1 uppercase tracking-wider text-[10px]">Sync Warning</div>
                                                This grant is approved in Configured Storage but does not exist in Unity Catalog. Provisioning required.
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-card"></div>
                                            </div>
                                        </div>
                                    )}
                                    {item.status === 'NOT_RECORDED' && (
                                        <div className="relative group/tooltip inline-block">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20 cursor-help">
                                                <XCircle size={12} /> Not Recorded
                                            </span>
                                            <div className="invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-card border border-border shadow-2xl rounded-lg text-xs leading-relaxed text-muted-foreground backdrop-blur-xl">
                                                <div className="font-bold text-destructive mb-1 uppercase tracking-wider text-[10px]">Governance Drift</div>
                                                This grant exists in Unity Catalog but is not recorded in Configured Storage. It may be legacy or unauthorized.
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-card"></div>
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td className="py-4 px-2">
                                    {item.status === 'NOT_APPLIED' && (
                                        <button className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                                            Provision
                                        </button>
                                    )}
                                    {item.status === 'NOT_RECORDED' && (
                                        <button className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest rounded bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity">
                                            Revoke
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {comparison.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-20 text-muted-foreground italic text-sm">
                                    No access grants found for this object.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReviewerTab;
