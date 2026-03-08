import React from 'react';
import { Search, User, Users, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface PrincipalSelectorProps {
    identities: any[];
    selectedPrincipals: string[];
    onTogglePrincipal: (id: string) => void;
    searchTerm: string;
    onSearchChange: (value: string) => void;
}

export const PrincipalSelector: React.FC<PrincipalSelectorProps> = ({
    identities,
    selectedPrincipals,
    onTogglePrincipal,
    searchTerm,
    onSearchChange
}) => {
    return (
        <Card className="border-white/5 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden">
            <CardHeader className="pb-4 bg-white/[0.01] border-b border-white/5">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-base font-bold tracking-tight">1. Select Principals</CardTitle>
                        <CardDescription className="text-xs">Identities requiring access</CardDescription>
                    </div>
                    <div className="relative w-40 sm:w-56">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" />
                        <Input
                            placeholder="Filter idents..."
                            className="h-8 pl-9 text-xs bg-white/5 border-white/5 focus:bg-white/10 transition-all rounded-lg"
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="space-y-0.5 max-h-[380px] overflow-y-auto custom-scrollbar p-2">
                    {identities
                        .filter(p => !searchTerm ||
                            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
                        )
                        .map(principal => (
                            <div
                                key={principal.id}
                                className={cn(
                                    "flex items-center gap-4 p-3 rounded-xl transition-all duration-500 cursor-pointer border group relative overflow-hidden",
                                    selectedPrincipals.includes(principal.id)
                                        ? "bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(88,166,255,0.08)]"
                                        : "hover:bg-white/[0.04] border-transparent"
                                )}
                                onClick={() => onTogglePrincipal(principal.id)}
                            >
                                {selectedPrincipals.includes(principal.id) && (
                                    <div className="absolute inset-y-0 left-0 w-1 bg-primary animate-pulse shadow-[0_0_10px_rgba(88,166,255,0.8)]" />
                                )}

                                <div className={cn(
                                    "p-2.5 rounded-xl shadow-lg transition-all duration-500 flex-shrink-0",
                                    selectedPrincipals.includes(principal.id)
                                        ? "bg-primary text-primary-foreground shadow-primary/20 scale-110"
                                        : "bg-white/5 text-muted-foreground group-hover:text-foreground/70"
                                )}>
                                    {principal.type === 'USER' && <User size={16} />}
                                    {principal.type === 'GROUP' && <Users size={16} />}
                                    {principal.type === 'SERVICE_PRINCIPAL' && <Lock size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-bold text-foreground/90 tracking-tight truncate">{principal.name}</div>
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.1em] opacity-40 leading-none">
                                            {principal.type.replace('_', ' ')}
                                        </div>
                                        {principal.email && (
                                            <div className="text-[10px] text-muted-foreground/60 truncate ml-2">
                                                {principal.email}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Checkbox
                                    checked={selectedPrincipals.includes(principal.id)}
                                    className="h-5 w-5 border-white/10 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-500"
                                />
                            </div>
                        ))}
                </div>
            </CardContent>
        </Card>
    );
};
