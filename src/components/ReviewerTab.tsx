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
            <div className="empty-state">
                <Shield size={48} className="text-secondary" />
                <h3>No Object Selected</h3>
                <p className="text-secondary">Select an object from the tree to review its access.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="p-4">Loading access details...</div>;
    }

    return (
        <div className="reviewer-tab animate-fade-in">
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={20} />
                    Current Access: {selectedObject.name}
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {selectedObject.type} • {selectedObject.id}
                </div>
            </div>

            <div className="p-4">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--glass-border)', textAlign: 'left' }}>
                            <th style={{ padding: '8px', color: 'var(--text-muted)' }}>Principal</th>
                            <th style={{ padding: '8px', color: 'var(--text-muted)' }}>Permission</th>
                            <th style={{ padding: '8px', color: 'var(--text-muted)' }}>Status</th>
                            <th style={{ padding: '8px', color: 'var(--text-muted)' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {comparison.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <td style={{ padding: '10px' }}>
                                    <div style={{ fontWeight: 500 }}>{(item.principal as any).name || item.principal}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{(item.principal as any).type || ''}</div>
                                </td>
                                <td style={{ padding: '10px' }}>
                                    <code>{item.permission}</code>
                                </td>
                                <td style={{ padding: '10px' }}>
                                    {item.status === 'SYNCED' && (
                                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}>
                                            <CheckCircle size={14} /> Synced
                                        </span>
                                    )}
                                    {item.status === 'NOT_APPLIED' && (
                                        <div className="tooltip-container">
                                            <span className="badge badge-warning" style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                color: '#eab308', background: 'rgba(234, 179, 8, 0.1)',
                                                padding: '4px 8px', borderRadius: '4px', cursor: 'help'
                                            }}>
                                                <AlertTriangle size={14} /> Not Applied
                                            </span>
                                            <div className="tooltip-content">
                                                This grant is approved in the Configured Storage (requests) but does not exist in Unity Catalog.
                                                It may need to be provisioned.
                                            </div>
                                        </div>
                                    )}
                                    {item.status === 'NOT_RECORDED' && (
                                        <div className="tooltip-container">
                                            <span className="badge badge-danger" style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)',
                                                padding: '4px 8px', borderRadius: '4px', cursor: 'help'
                                            }}>
                                                <XCircle size={14} /> Not Recorded
                                            </span>
                                            <div className="tooltip-content">
                                                This grant exists in Unity Catalog but is not recorded in the Configured Storage (no approved request found).
                                                It might be a drift or legacy access.
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '10px' }}>
                                    {item.status === 'NOT_APPLIED' && (
                                        <button className="btn btn-small btn-primary">Provision</button>
                                    )}
                                    {item.status === 'NOT_RECORDED' && (
                                        <button className="btn btn-small btn-danger">Revoke</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {comparison.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
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
