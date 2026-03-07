import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthProvider';
import { ConfigService } from '../services/config/ConfigService';
import { Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProviderSelection } from './login/ProviderSelection';
import { PersonaSelection } from './login/PersonaSelection';
import { CredentialForm } from './login/CredentialForm';

const Login = () => {
    const { login, loading, user } = useAuth();
    const [activeProvider, setActiveProvider] = useState<string | null>(null);
    const [showUserSelection, setShowUserSelection] = useState(false);
    const [showCredentials, setShowCredentials] = useState(false);
    const [credentials, setCredentials] = useState({ username: '', password: '', token: '', type: 'PAT' });
    const [configMode, setConfigMode] = useState('MOCK');

    useEffect(() => {
        // Automatically trigger mock login if in MOCK mode and no user is set
        if (configMode === 'MOCK' && !user && !activeProvider) {
            handleLogin('MOCK');
        }
    }, [configMode, user]);

    const handleLogin = async (provider: string, creds?: any) => {
        setActiveProvider(provider);
        try {
            const loggedUser = await login(provider, creds || (provider === activeProvider ? credentials : undefined));
            console.log(`[Login] Logged in user:`, loggedUser);
            if (loggedUser?.requiresUserSelection) {
                setShowUserSelection(true);
            } else if (loggedUser?.requiresCredentials) {
                setShowCredentials(true);
            } else {
                setShowCredentials(false);
            }
        } catch (error) {
            console.error(`[Login] Login error:`, error);
            setActiveProvider(null);
        }
    };

    const handleUserSelect = async (userId: string) => {
        try {
            const selectedUser = user?.availableUsers?.find(u => u.id === userId);
            if (!selectedUser) throw new Error(`User ${userId} not found`);

            await login('MOCK', selectedUser);
            setShowUserSelection(false);
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

    // Show loading state
    if (activeProvider && loading && !showCredentials) {
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
        return <PersonaSelection availableUsers={user.availableUsers} onSelectUser={handleUserSelect} />;
    }

    // Main login screen
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
                    <ProviderSelection configMode={configMode} onChangeProvider={changeProvider} onLogin={handleLogin} />
                ) : showCredentials ? (
                    <CredentialForm
                        loading={loading}
                        credentials={credentials}
                        setCredentials={setCredentials}
                        onSubmit={() => handleLogin(activeProvider)}
                        onCancel={() => { setShowCredentials(false); setActiveProvider(null); }}
                    />
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
