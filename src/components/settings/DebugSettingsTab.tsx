import React, { useState } from 'react';
import { Bug, Eye, Database, ShieldCheck, Trash2, Terminal, AlertTriangle, Monitor } from 'lucide-react';
import { ObservabilityService } from '../../services/ObservabilityService';
import ErrorTestPanel from '../ErrorTestPanel';
import { Section, Field } from './SettingsComponents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '../../context/AuthProvider';
import { MOCK_USERS } from '../../services/mockData';

interface DebugSettingsTabProps {
    config: any;
    setConfig: (config: any) => void;
}

const DebugSettingsTab: React.FC<DebugSettingsTabProps> = ({ config, setConfig }) => {
    const { login } = useAuth();
    const [recentErrors, setRecentErrors] = useState(ObservabilityService.getRecentErrors());

    const clearErrors = () => {
        ObservabilityService.clearErrorLog();
        setRecentErrors([]);
    };

    const logToConsole = () => {
        const errors = ObservabilityService.getRecentErrors();
        console.log('Recent errors:', errors);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Error Injection Panel */}
            <ErrorTestPanel />

            {/* Governance Simulator */}
            <Section
                title="Governance Simulation"
                description="Simulate different access control scenarios for testing purposes."
                icon={<ShieldCheck size={18} />}
            >
                <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/40">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium">Enable Persona Simulation</Label>
                                {config.enableSimulationMode && (
                                    <Badge variant="secondary" className="h-4 text-[10px] px-1 bg-primary/20 text-primary border-primary/20">Active</Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">Allows switching between Platform Admin, Security Admin, etc., for demos.</p>
                        </div>
                        <Switch
                            checked={config.enableSimulationMode}
                            onCheckedChange={checked => setConfig({ ...config, enableSimulationMode: checked })}
                        />
                    </div>

                    {config.enableSimulationMode && (
                        <div className="pt-4 border-t border-border/40 space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Switch Persona</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'user_platform_admin', name: 'Platform Admin', group: 'group_platform_admins' },
                                    { id: 'user_security_admin', name: 'Security Admin', group: 'group_security' },
                                    { id: 'user_finance_approver', name: 'Finance Approver', group: 'group_finance_admins' },
                                    { id: 'user_standard', name: 'Standard User', group: 'group_finance_analysts' }
                                ].map(persona => (
                                    <Button
                                        key={persona.id}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-[10px] justify-start px-3 gap-2"
                                        data-testid={`switch-to-${persona.group}`}
                                        onClick={() => {
                                            const user = MOCK_USERS.find(u => u.id === persona.id);
                                            if (user) {
                                                login('MOCK', { ...user, provider: 'mock' });
                                            }
                                        }}
                                    >
                                        <ShieldCheck size={12} className="text-primary" />
                                        {persona.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Section>

            {/* Observability Tools */}
            <Section
                title="Observability Tools"
                description="Monitor application health and persistent error logs."
                icon={<Eye size={18} />}
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 gap-2" onClick={logToConsole}>
                            <Terminal size={14} />
                            Log to Console
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-2 text-destructive border-destructive/20 hover:bg-destructive/10" onClick={clearErrors}>
                            <Trash2 size={14} />
                            Clear Error Log
                        </Button>
                    </div>

                    <div className="rounded-lg bg-black/40 border border-border/40 overflow-hidden">
                        <div className="p-2 border-b border-border/40 bg-muted/40 flex items-center justify-between">
                            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Stored Error Log</Label>
                            <Badge variant="outline" className="text-[10px] h-4">{recentErrors.length} Errors</Badge>
                        </div>
                        <div className="p-4 max-h-[300px] overflow-y-auto font-mono text-[11px] space-y-3">
                            {recentErrors.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground opacity-40">
                                    <Monitor size={32} className="mb-2" />
                                    <p>No recent errors observed</p>
                                </div>
                            ) : (
                                recentErrors.map((error: any) => (
                                    <div key={error.id} className="p-3 rounded-md bg-destructive/5 border border-destructive/20 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-destructive font-bold">{error.error?.message || 'Error'}</span>
                                            <span className="text-muted-foreground text-[9px]">{new Date(error.timestamp).toLocaleString()}</span>
                                        </div>
                                        <div className="text-[10px] opacity-70">
                                            <p><span className="text-muted-foreground">ID:</span> {error.id}</p>
                                            <p><span className="text-muted-foreground">URL:</span> {error.url}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </Section>

            {/* Credential Safety Callout */}
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" />
                <div>
                    <p className="font-medium text-foreground">Debug Mode Best Practices</p>
                    <p className="mt-1 text-xs px-0">
                        Debug tools are intended for local development and non-production testing. Simulation mode allows bypassing normal authorization checks for UI testing purposes.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DebugSettingsTab;
