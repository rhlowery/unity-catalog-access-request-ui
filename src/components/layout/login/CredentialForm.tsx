import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CredentialFormProps {
    loading: boolean;
    credentials: any;
    setCredentials: (creds: any) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

export const CredentialForm = ({ loading, credentials, setCredentials, onSubmit, onCancel }: CredentialFormProps) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                <div className="text-center">
                    <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Databricks Authentication</div>
                    <p className="text-[10px] text-muted-foreground italic mb-4">Enter your credentials to continue</p>
                </div>

                <div className="space-y-3">
                    <div className="flex bg-white/5 rounded-xl p-1 mb-2">
                        <button
                            className={cn("flex-1 text-[10px] font-black uppercase py-2 rounded-lg transition-all", credentials.type === 'PAT' ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5")}
                            onClick={() => setCredentials({ ...credentials, type: 'PAT' })}
                        >
                            Access Token
                        </button>
                        <button
                            className={cn("flex-1 text-[10px] font-black uppercase py-2 rounded-lg transition-all", credentials.type === 'PWD' ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5")}
                            onClick={() => setCredentials({ ...credentials, type: 'PWD' })}
                        >
                            Password
                        </button>
                    </div>

                    {credentials.type === 'PWD' ? (
                        <>
                            <div className="space-y-1">
                                <div className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Username / Email</div>
                                <input
                                    type="text"
                                    data-testid="username-input"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50"
                                    placeholder="user@organization.com"
                                    value={credentials.username}
                                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <div className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Password</div>
                                <input
                                    type="password"
                                    data-testid="password-input"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50"
                                    placeholder="••••••••"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-1">
                            <div className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Personal Access Token</div>
                            <input
                                type="password"
                                data-testid="token-input"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 font-mono"
                                placeholder="dapi..."
                                value={credentials.token}
                                onChange={(e) => setCredentials({ ...credentials, token: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-3 pt-4">
                        <Button
                            className="w-full h-12 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                            onClick={onSubmit}
                            disabled={loading}
                            data-testid="login-submit-button"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : "Sign In to Console"}
                        </Button>
                    </div>
                </div>
            </div>
            <Button
                variant="ghost"
                className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-white/5"
                onClick={onCancel}
            >
                Cancel
            </Button>
        </div>
    );
};
