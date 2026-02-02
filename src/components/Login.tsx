import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthProvider';
import { StorageService } from '../services/storage/StorageService';
import { Shield, Globe, Key, Lock, Loader2, Users, UserCheck, Crown, ShieldCheck, Settings, Database } from 'lucide-react';
import { selectMockUser, getCurrentMockUser } from '../services/identity/adapters/MockIdentityAdapter';
import './Login.css';

const Login = () => {
    console.log('[Login] Component rendering...');
    const { login, loading, user } = useAuth();
    const [activeProvider, setActiveProvider] = useState<string | null>(null);
    const [showUserSelection, setShowUserSelection] = useState(false);
    const [showEmergencyReset, setShowEmergencyReset] = useState(false);
    const [configMode, setConfigMode] = useState('MOCK');
    const [resetKey, setResetKey] = useState(['', '', '', '', '']);

    const EMERGENCY_RESET_KEY = '0000-0000-0000-0000';

    // Debug logs
    useEffect(() => {
        console.log('[Login] Debug - Active provider:', activeProvider);
        console.log('[Login] Debug - Show user Selection:', showUserSelection);
        console.log('[Login] Debug - Config mode:', configMode);
    }, [activeProvider, showUserSelection, configMode]);

    useEffect(() => {
        // Load current config to show correct provider interface
        const config = StorageService.getConfig();
        const mode = config.identityType || 'MOCK';
        setConfigMode(mode);
        console.log(`[Login] Current identity mode: ${mode}`);
        console.log(`[Login] Config:`, config);
    }, []);

    useEffect(() => {
        // Check if we need to show user selection after login
        if (user?.requiresUserSelection && user?.availableUsers) {
            setShowUserSelection(true);
        }
    }, [user]);

    const handleLogin = async (provider: string) => {
        console.log(`[Login] Attempting login with provider: ${provider}`);
        setActiveProvider(provider);
        
        try {
            const loggedUser = await login(provider);
            console.log(`[Login] Login response:`, loggedUser);
            
            // Check if this is mock provider with user selection
            if (loggedUser?.requiresUserSelection) {
                console.log(`[Login] Mock provider requires user selection - setting showUserSelection to true`);
                setShowUserSelection(true);
            } else {
                console.log(`[Login] Login successful for user: ${loggedUser?.name}`);
            }
        } catch (error) {
            console.error(`[Login] Login error:`, error);
            setActiveProvider(null);
        }
    };

    const handleUserSelect = async (userId: string) => {
        console.log(`[Login] User selected: ${userId}`);
        try {
            const selectedUser = await selectMockUser(userId);
            console.log(`[Login] Selected user:`, selectedUser);
            setShowUserSelection(false);
            // The user is now stored in localStorage, AuthProvider should pick it up
            window.location.reload();
        } catch (error) {
            console.error(`[Login] Error selecting user:`, error);
        }
    };

    const handleBackToProviders = () => {
        setShowUserSelection(false);
        setActiveProvider(null);
    };

    const changeProvider = (providerType: string) => {
        console.log(`[Login] Changing provider to: ${providerType}`);
        const config = StorageService.getConfig();
        const updatedConfig = { ...config, identityType: providerType };
        console.log(`[Login] Saving config:`, updatedConfig);
        StorageService.saveConfig(updatedConfig);
        setConfigMode(providerType);
        console.log(`[Login] Provider change complete`);
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
            case 'STANDARD_USER': return '#3b82f6'; // blue
            case 'FINANCE_APPROVER': return '#10b981'; // green
            case 'MARKETING_APPROVER': return '#f59e0b'; // amber
            case 'SECURITY_ADMIN': return '#ef4444'; // red
            default: return '#6b7280'; // gray
        }
    };

    const getProviderConfig = (type: string) => {
        const config = StorageService.getConfig();
        return config.identityType === type;
    };

    const ProviderSelector = () => (
        <div className="provider-selector">
            <h3>Select Identity Provider</h3>
            <div className="provider-grid">
                <div 
                    className={`provider-card ${configMode === 'MOCK' ? 'active' : ''}`}
                    onClick={() => changeProvider('MOCK')}
                >
                    <Users size={24} />
                    <h4>Mock Identity</h4>
                    <p>Role-based user simulation for testing and demos</p>
                </div>
                
                <div 
                    className={`provider-card ${configMode === 'OAUTH' ? 'active' : ''}`}
                    onClick={() => changeProvider('OAUTH')}
                >
                    <Globe size={24} />
                    <h4>OAuth 2.0</h4>
                    <p>Google Workspace, Microsoft Entra ID, SSO providers</p>
                </div>
                
                <div 
                    className={`provider-card ${configMode === 'SAML' ? 'active' : ''}`}
                    onClick={() => changeProvider('SAML')}
                >
                    <Lock size={24} />
                    <h4>SAML SSO</h4>
                    <p>Enterprise SSO via Okta, Ping, ADFS</p>
                </div>
                
                <div 
                    className={`provider-card ${configMode === 'DATABRICKS' ? 'active' : ''}`}
                    onClick={() => changeProvider('DATABRICKS')}
                >
                    <Database size={24} />
                    <h4>Databricks UC</h4>
                    <p>Unity Catalog identity with SCIM integration</p>
                </div>
            </div>
        </div>
    );

    const MockLoginScreen = () => (
        <div className="login-container flex-center">
            <div className="glass-panel login-card animate-fade-in">
                <div className="login-header">
                    <div className="logo-circle">
                        <Shield size={32} color="white" />
                    </div>
                    <h1>Access Control System</h1>
                    <p className="text-secondary">Mock Identity Provider - Role Selection</p>
                </div>

                <div className="login-body">
                    <div className="mock-tabs">
                        <div className="mock-tab-panel">
                            <div className="mock-tab-header">
                                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                                    Select User Role
                                </h3>
                                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Choose a role to simulate different access levels and permissions
                                </p>
                            </div>
                            
                            <div className="mock-user-grid">
                                {(user?.availableUsers || [
                                    { id: 'user_standard', name: 'Alex Analyst', role: 'STANDARD_USER', email: 'alex@company.com', groups: ['group_all_users', 'group_finance_analysts'], description: 'Standard user with basic access to finance data' },
                                    { id: 'user_finance_approver', name: 'Sarah Finance', role: 'FINANCE_APPROVER', email: 'sarah.f@company.com', groups: ['group_all_users', 'group_finance_admins', 'group_finance_analysts'], description: 'Finance approver with elevated permissions for financial data' },
                                    { id: 'user_marketing_approver', name: 'Mike Marketing', role: 'MARKETING_APPROVER', email: 'mike.m@company.com', groups: ['group_all_users', 'group_marketing_admins', 'group_marketing_analysts'], description: 'Marketing approver with permissions for marketing data and campaigns' },
                                    { id: 'user_security_admin', name: 'Jane Security', role: 'SECURITY_ADMIN', email: 'jane.s@company.com', groups: ['group_all_users', 'group_security', 'group_platform_admins', 'group_audit_admins'], description: 'Security admin with full system access and audit capabilities' }
                                ]).map((mockUser) => (
                                    <div 
                                        key={mockUser.id}
                                        className={`mock-user-tab ${showUserSelection ? '' : 'active'}`}
                                        onClick={() => handleUserSelect(mockUser.id)}
                                    >
                                        <div className="mock-user-avatar" style={{ backgroundColor: getRoleBadgeColor(mockUser.role) }}>
                                            {getUserIcon(mockUser.role)}
                                        </div>
                                        <div className="mock-user-info">
                                            <div className="mock-user-name">{mockUser.name}</div>
                                            <div className="mock-user-role">{mockUser.role.replace('_', ' ')}</div>
                                            <div className="mock-user-email">{mockUser.email}</div>
                                            <div className="mock-user-groups">
                                                <small>Groups: {mockUser.groups.length}</small>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mock-details-panel">
                                {showUserSelection && user?.availableUsers && (
                                    <div className="mock-details-content">
                                        <h4>User Roles Available:</h4>
                                        <ul>
                                            {user.availableUsers.map(mockUser => (
                                                <li key={mockUser.id}>
                                                    <strong>{mockUser.name}</strong> - {mockUser.description}
                                                </li>
                                            ))}
                                        </ul>
                                        <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            <strong>Click a user card above to select and continue</strong>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {!showUserSelection && (
                        <div className="mock-back-panel">
                            <button className="btn btn-ghost" onClick={() => setShowUserSelection(true)} style={{ width: '100%', marginTop: '12px' }}>
                                Select User Role
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const OAuthLoginScreen = () => (
        <div className="login-container flex-center">
            <div className="glass-panel login-card animate-fade-in">
                <div className="login-header">
                    <div className="logo-circle">
                        <Globe size={32} color="white" />
                    </div>
                    <h1>Access Control System</h1>
                    <p className="text-secondary">OAuth 2.0 Single Sign-On</p>
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

                    <button className="sso-btn" style={{ background: '#6366f1', border: '1px solid #4f46e5', marginTop: '8px' }} onClick={() => handleLogin('GENERIC_OAUTH')}>
                        <Globe size={18} />
                        <span>Other OAuth Provider</span>
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

    const SAMLLoginScreen = () => (
        <div className="login-container flex-center">
            <div className="glass-panel login-card animate-fade-in">
                <div className="login-header">
                    <div className="logo-circle">
                        <Lock size={32} color="white" />
                    </div>
                    <h1>Access Control System</h1>
                    <p className="text-secondary">SAML SSO Authentication</p>
                </div>

                <div className="login-body">
                    <p className="login-label">Enterprise Single Sign-On</p>

                    <button className="sso-btn sso-saml" onClick={() => handleLogin('SAML')}>
                        <Lock size={18} />
                        <span>Continue with SAML SSO</span>
                    </button>

                    <div className="saml-config">
                        <p className="text-secondary text-sm">
                            Configure your SAML provider in settings:
                        </p>
                        <div className="config-item">
                            <label>Identity Provider URL:</label>
                            <input type="text" placeholder="https://your-company.okta.com" />
                        </div>
                    </div>
                </div>

                <div className="login-footer">
                    <p className="text-secondary text-xs">
                        Contact your IT administrator for SAML configuration details.
                    </p>
                </div>
            </div>
        </div>
    );

    const DatabricksLoginScreen = () => (
        <div className="login-container flex-center">
            <div className="glass-panel login-card animate-fade-in">
                <div className="login-header">
                    <div className="logo-circle" style={{ background: '#ff3621' }}>
                        <Database size={32} color="white" />
                    </div>
                    <h1>Access Control System</h1>
                    <p className="text-secondary">Databricks Unity Catalog</p>
                </div>

                <div className="login-body">
                    <p className="login-label">Sign in with your Databricks account</p>

                    <div className="databricks-login">
                        <input type="text" placeholder="Workspace URL" className="db-input" />
                        <input type="email" placeholder="Email" className="db-input" />
                        <input type="password" placeholder="Password" className="db-input" />
                        <button className="sso-btn" style={{ background: '#ff3621', border: '1px solid #e02520' }} onClick={() => handleLogin('DATABRICKS')}>
                            <Database size={18} />
                            <span>Sign in to Databricks</span>
                        </button>
                    </div>

                    <div className="databricks-options">
                        <button className="btn btn-ghost" onClick={() => handleLogin('DATABRICKS_TOKEN')}>
                            Use Personal Access Token
                        </button>
                    </div>
                </div>

                <div className="login-footer">
                    <p className="text-secondary text-xs">
                        Powered by Databricks Unity Catalog Identity
                    </p>
                </div>
            </div>
        </div>
    );

    // Show loading state
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

    // Show user selection for mock provider
    if (showUserSelection && user?.availableUsers) {
        return <MockLoginScreen />;
    }

    // Show mock login directly if mock is default/selected, otherwise show provider selection
    if (!activeProvider) {
        console.log('[Login] No active provider, showing appropriate screen');
        
        // If mock is default/selected, show mock login directly
        if (configMode === 'MOCK' || !configMode) {
            console.log('[Login] Showing mock login screen directly');
            return <MockLoginScreen />;
        }
        
        // Otherwise show provider selection
        console.log('[Login] Showing provider selection screen');
        return (
            <div className="login-container flex-center">
                <div className="glass-panel login-card animate-fade-in">
                    <div className="login-header">
                        <div className="logo-circle">
                            <Shield size={32} color="white" />
                        </div>
                        <h1>Access Control System</h1>
                        <p className="text-secondary">Unity Catalog Access Requests</p>
                    </div>

                    <div className="login-body">
                        <h3>Select Identity Provider</h3>
                        <div className="provider-grid">
                            <div 
                                className={`provider-card ${configMode === 'MOCK' ? 'active' : ''}`}
                                onClick={() => changeProvider('MOCK')}
                            >
                                <Users size={24} />
                                <h4>Mock Identity</h4>
                                <p>Role-based user simulation for testing and demos</p>
                            </div>
                            
                            <div 
                                className={`provider-card ${configMode === 'OAUTH' ? 'active' : ''}`}
                                onClick={() => changeProvider('OAUTH')}
                            >
                                <Globe size={24} />
                                <h4>OAuth 2.0</h4>
                                <p>Google Workspace, Microsoft Entra ID, SSO providers</p>
                            </div>
                            
                            <div 
                                className={`provider-card ${configMode === 'SAML' ? 'active' : ''}`}
                                onClick={() => changeProvider('SAML')}
                            >
                                <Lock size={24} />
                                <h4>SAML SSO</h4>
                                <p>Enterprise SSO via Okta, Ping, ADFS</p>
                            </div>
                            
                            <div 
                                className={`provider-card ${configMode === 'DATABRICKS' ? 'active' : ''}`}
                                onClick={() => changeProvider('DATABRICKS')}
                            >
                                <Database size={24} />
                                <h4>Databricks UC</h4>
                                <p>Unity Catalog identity with SCIM integration</p>
                            </div>
                        </div>
                    </div>

                    <div className="login-footer">
                        <p className="text-secondary text-xs">
                            <strong>Current Provider:</strong> {configMode || 'DEFAULT'} <br />
                            {configMode === 'MOCK' && (
                                <button className="btn btn-ghost" onClick={() => setShowUserSelection(true)} style={{ marginTop: '8px' }}>
                                    Switch User Role
                                </button>
                            )}
                            {!configMode && (
                                <small style={{ color: 'var(--text-muted)' }}>
                                    👆 Configure identity provider in settings
                                </small>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Show provider-specific login screen (non-mock)
    if (activeProvider && !showUserSelection) {
        switch (configMode) {
            case 'OAUTH':
                return <OAuthLoginScreen />;
            case 'SAML':
                return <SAMLLoginScreen />;
            case 'DATABRICKS':
                return <DatabricksLoginScreen />;
            default:
                return <OAuthLoginScreen />;
        }
    }
};

export default Login;