import { Shield, Globe, Lock, Database, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderSelectionProps {
    configMode: string;
    onChangeProvider: (provider: string) => void;
    onLogin: (provider: string) => void;
}

export const ProviderSelection = ({ configMode, onChangeProvider, onLogin }: ProviderSelectionProps) => {
    return (
        <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-6 text-center">Authentication Methods</div>
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => {
                        onChangeProvider('MOCK');
                        onLogin('MOCK');
                    }}
                    data-testid="mock-login-button"
                    className={cn(
                        "p-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-500 border group",
                        configMode === 'MOCK' ? "bg-primary/10 border-primary/40 shadow-inner" : "bg-white/5 border-white/5 hover:bg-white/10"
                    )}
                >
                    <Users size={24} className={configMode === 'MOCK' ? "text-primary" : "text-muted-foreground group-hover:text-primary/70 transition-colors"} />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-center leading-tight">Mock Ident</span>
                </button>
                <button
                    onClick={() => onLogin('OAUTH')}
                    data-testid="oauth-login-button"
                    className="p-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-500 border border-white/5 bg-white/5 hover:bg-white/10 group"
                >
                    <Globe size={24} className="text-muted-foreground group-hover:text-blue-400/70 transition-colors" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-center leading-tight">OAuth 2.0</span>
                </button>
                <button
                    onClick={() => onLogin('SAML')}
                    data-testid="saml-login-button"
                    className="p-5 rounded-2xl flex flex-col items-center gap-3 transition-all duration-500 border border-white/5 bg-white/5 hover:bg-white/10 group"
                >
                    <Lock size={24} className="text-muted-foreground group-hover:text-amber-400/70 transition-colors" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-center leading-tight">SAML SSO</span>
                </button>
                <button
                    onClick={() => onLogin('DATABRICKS_WORKSPACE')}
                    data-testid="databricks-login-button"
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
    );
};
