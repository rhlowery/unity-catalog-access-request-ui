import React from 'react';
import { Eye, Edit3, Database, Zap, Play, Cpu, Terminal, HardDrive, Lock, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PERMISSIONS } from '../../services/mockData';

interface PermissionSelectorProps {
    selectedPermissions: string[];
    onTogglePermission: (perm: string) => void;
}

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

export const PermissionSelector: React.FC<PermissionSelectorProps> = ({
    selectedPermissions,
    onTogglePermission
}) => {
    return (
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
                            data-testid={`permission-toggle-${perm}`}
                            className={cn(
                                "flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 cursor-pointer group relative overflow-hidden",
                                selectedPermissions.includes(perm)
                                    ? "border-primary/40 bg-primary/10 shadow-[inner_0_0_12px_rgba(88,166,255,0.05)]"
                                    : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                            )}
                            onClick={() => onTogglePermission(perm)}
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
    );
};
