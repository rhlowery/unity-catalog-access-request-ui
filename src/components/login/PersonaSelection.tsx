import { Shield, Users, UserCheck, Crown, ShieldCheck } from 'lucide-react';

interface PersonaSelectionProps {
    availableUsers: any[];
    onSelectUser: (userId: string) => void;
}

export const PersonaSelection = ({ availableUsers, onSelectUser }: PersonaSelectionProps) => {
    const getUserIcon = (role: string) => {
        switch (role) {
            case 'STANDARD_USER': return <Users size={20} />;
            case 'FINANCE_APPROVER': return <UserCheck size={20} />;
            case 'MARKETING_APPROVER': return <Crown size={20} />;
            case 'SECURITY_ADMIN': return <ShieldCheck size={20} />;
            default: return <Users size={20} />;
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'STANDARD_USER': return '#3b82f6';
            case 'FINANCE_APPROVER': return '#10b981';
            case 'MARKETING_APPROVER': return '#f59e0b';
            case 'SECURITY_ADMIN': return '#ef4444';
            default: return '#6b7280';
        }
    };

    return (
        <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-4xl p-8 bg-white/[0.03] border border-white/10 rounded-3xl backdrop-blur-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6 shadow-2xl shadow-primary/20">
                        <Shield size={32} className="text-primary" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter text-foreground mb-2">Select User Role</h1>
                    <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] font-medium">Mock Identity Provider Simulation</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    {availableUsers.map((mockUser) => (
                        <div
                            key={mockUser.id}
                            data-testid={`mock-user-${mockUser.id}`}
                            className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/50 hover:bg-white/[0.05] transition-all duration-500 cursor-pointer overflow-hidden shadow-lg"
                            onClick={() => onSelectUser(mockUser.id)}
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg text-white"
                                style={{ backgroundColor: getRoleBadgeColor(mockUser.role) }}
                            >
                                {getUserIcon(mockUser.role)}
                            </div>
                            <div className="font-bold text-lg leading-tight mb-1">{mockUser.name}</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-primary/80 mb-3">{mockUser.role.replace('_', ' ')}</div>
                            <div className="text-xs text-muted-foreground truncate mb-4">{mockUser.email}</div>
                            <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                                <Users size={12} className="text-muted-foreground" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{mockUser.groups.length} Groups</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col items-center gap-6">
                    <div className="max-w-2xl text-center p-6 bg-white/5 rounded-2xl border border-white/5 italic text-sm text-muted-foreground leading-relaxed shadow-inner">
                        "This simulation mode allows you to test the Unity Catalog Access Request workflow from different persona perspectives. Each user belongs to specific organizational groups that determine their approval authority."
                    </div>
                </div>
            </div>
        </div>
    );
};
