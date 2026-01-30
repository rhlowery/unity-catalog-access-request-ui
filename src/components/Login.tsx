import { useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import { Shield, Globe, Key, Lock, Loader2 } from 'lucide-react';
import './Login.css';

const Login = () => {
    const { login, loading } = useAuth();
    const [activeProvider, setActiveProvider] = useState<string | null>(null);

    const handleLogin = (provider: string) => {
        setActiveProvider(provider);
        login(provider);
    };

    if (activeProvider && loading) {
        return (
            <div className="login-container flex-center">
                <div className="glass-panel loading-card flex-center">
                    <Loader2 size={48} className="spin-icon text-muted" />
                    <p>Authenticating with {activeProvider.toLowerCase()}...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container flex-center">
            <div className="glass-panel login-card animate-fade-in">
                <div className="login-header">
                    <div className="logo-circle">
                        <Shield size={32} color="white" />
                    </div>
                    <h1>Access Control Service</h1>
                    <p className="text-secondary">Enterprise Data Governance</p>
                </div>

                <div className="login-body">
                    <p className="login-label">Sign in with your organization</p>

                    <button className="sso-btn sso-google" onClick={() => handleLogin('GOOGLE')}>
                        <Globe size={18} />
                        <span>Sign in with Google Workspace</span>
                    </button>

                    <button className="sso-btn sso-microsoft" onClick={() => handleLogin('MICROSOFT')}>
                        <Key size={18} />
                        <span>Sign in with Microsoft Entra ID</span>
                    </button>

                    <button className="sso-btn sso-saml" onClick={() => handleLogin('SAML')}>
                        <Lock size={18} />
                        <span>SSO via SAML (Okta/Ping)</span>
                    </button>

                    <button className="sso-btn" style={{ background: '#333', border: '1px solid #555', marginTop: '8px' }} onClick={() => handleLogin('ADMIN')}>
                        <Shield size={18} />
                        <span>Sign in as Security Admin</span>
                    </button>
                </div>

                <div className="login-footer">
                    <p className="text-secondary text-xs">
                        Protected by Enterprise Grade Security. <br />
                        By signing in you agree to our Acceptable Use Policy.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
