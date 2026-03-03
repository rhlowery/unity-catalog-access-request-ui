import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthProvider';
import { StorageService } from '../services/storage/StorageService';
import { ConfigService } from '../services/config/ConfigService';
import { Shield, Globe, Key, Lock, Loader2, Users, UserCheck, Crown, ShieldCheck, Settings, Database } from 'lucide-react';
import { selectMockUser } from '../services/identity/adapters/MockIdentityAdapter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Login = () => {
    const { login, loading, user } = useAuth();
    const [activeProvider, setActiveProvider] = useState<string | null>(null);
    const [showUserSelection, setShowUserSelection] = useState(false);
    const [configMode, setConfigMode] = useState('MOCK');

    useEffect(() => {
        // Automatically trigger mock login if in MOCK mode and no user is set
        if (configMode === 'MOCK' && !user && !activeProvider) {
            handleLogin('MOCK');
        }
    }, [configMode, user]);

    const handleLogin = async (provider: string) => {
        setActiveProvider(provider);
        try {
            const loggedUser = await login(provider);
            console.log(`[Login] Logged in user:`, loggedUser);
            if (loggedUser?.requiresUserSelection) {
                setShowUserSelection(true);
            }
        } catch (error) {
            console.error(`[Login] Login error:`, error);
            setActiveProvider(null);
        }
    };

    const handleUserSelect = async (userId: string) => {
        try {
            await selectMockUser(userId);
            setShowUserSelection(false);
            window.location.reload();
        } catch (error) {
            console.error(`[Login] Error selecting user:`, error);
        }
    };

    const changeProvider = (providerType: string) => {
        const config = ConfigService.getConfig();
        const updatedConfig = { ...config, identityType: providerType };
        ConfigService.updateConfig(updatedConfig);
        setConfigMode(providerType);
    };

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

    // Show loading state
    if (activeProvider && loading) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md p-10 flex flex-col items-center gap-6 bg-white/[0.03] border border-white/10 rounded-3xl backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in duration-500">
                    <Loader2 size={64} className="animate-spin text-primary/50" />
                    <p className="text-lg font-medium tracking-tight text-muted-foreground">
                        Authenticating with <span className="text-foreground capitalize">{activeProvider.toLowerCase()}</span>...
                    </p>
                </div>
            </div>
        );
    }

    // Show user selection for mock provider
    if (showUserSelection && user?.availableUsers) {
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
                        {(user?.availableUsers || []).map((mockUser) => (
                            <div
                                key={mockUser.id}
                                className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary/50 hover:bg-white/[0.05] transition-all duration-500 cursor-pointer overflow-hidden shadow-lg"
                                onClick={() => handleUserSelect(mockUser.id)}
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
    }

    // Show provider selection or specific provider screen
    return (
        <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md p-10 bg-white/[0.03] border border-white/10 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mb-8 rotate-3 hover:rotate-0 transition-transform duration-500 shadow-2xl shadow-primary/20 border border-primary/20">
                        <Shield size={42} className="text-primary" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter text-foreground mb-3">Unity Catalog ACS</h1>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] leading-none">Security Governance Platform</p>
                </div>

                {!activeProvider ? (
                    <div className="space-y-4">
                        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-6 text-center">Authentication Methods</div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    changeProvider('MOCK');
                                    handleLogin('MOCK');
                                }}
                                className={cn(
                                    "p-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-500 border group",
                                    configMode === 'MOCK' ? "bg-primary/10 border-primary/40 shadow-inner" : "bg-white/5 border-white/5 hover:bg-white/10"
                                )}
                            >
                                <Users size={24} className={configMode === 'MOCK' ? "text-primary" : "text-muted-foreground group-hover:text-primary/70 transition-colors"} />
                                <span className="text-[11px] font-bold uppercase tracking-widest text-center leading-tight">Mock Ident</span>
                            </button>
                            <button
                                onClick={() => handleLogin('OAUTH')}
                                className="p-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-500 border border-white/5 bg-white/5 hover:bg-white/10 group"
                            >
                                <Globe size={24} className="text-muted-foreground group-hover:text-blue-400/70 transition-colors" />
                                <span className="text-[11px] font-bold uppercase tracking-widest text-center leading-tight">OAuth 2.0</span>
                            </button>
                            <button
                                onClick={() => handleLogin('SAML')}
                                className="p-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-500 border border-white/5 bg-white/5 hover:bg-white/10 group"
                            >
                                <Lock size={24} className="text-muted-foreground group-hover:text-amber-400/70 transition-colors" />
                                <span className="text-[11px] font-bold uppercase tracking-widest text-center leading-tight">SAML SSO</span>
                            </button>
                            <button
                                onClick={() => handleLogin('DATABRICKS')}
                                className="p-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-500 border border-white/5 bg-white/5 hover:bg-white/10 group"
                            >
                                <Database size={24} className="text-muted-foreground group-hover:text-red-400/70 transition-colors" />
                                <span className="text-[11px] font-bold uppercase tracking-widest text-center leading-tight">Databricks</span>
                            </button>
                        </div>

                        <div className="pt-8 border-t border-white/5 flex flex-col items-center gap-2 text-center">
                            <p className="text-[10px] text-muted-foreground leading-relaxed max-w-[240px]">
                                Protected by Enterprise Grade Security. <br />
                                By signing in you agree to our <span className="underline cursor-pointer hover:text-primary transition-colors">Acceptable Use Policy</span>.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">{activeProvider} Login</div>
                            <p className="text-[10px] text-muted-foreground italic">Redirecting to organization SSO...</p>
                        </div>
                        <Button
                            variant="ghost"
                            className="w-full text-xs text-muted-foreground hover:bg-white/5"
                            onClick={() => setActiveProvider(null)}
                        >
                            Back to Methods
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;