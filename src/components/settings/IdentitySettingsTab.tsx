import React from 'react';
import { Shield, Globe, Lock, RefreshCw, AlertCircle, Info, Users, KeyRound } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface IdentitySettingsTabProps {
    config: any;
    setConfig: (config: any) => void;
}
import { SecretField, Field, Section } from './SettingsComponents';

const IdentitySettingsTab: React.FC<IdentitySettingsTabProps> = ({ config, setConfig }) => {
    const idpType = config.identityType || 'MOCK';
    const isAuthProvider = !['MOCK', 'DATABRICKS'].includes(idpType);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* Provider selector */}
            <div className="space-y-1.5">
                <Label className="text-sm font-medium">Identity Provider</Label>
                <p className="text-xs text-muted-foreground">
                    Select the system that supplies the list of users and groups for this application.
                </p>
                <Select
                    value={idpType}
                    onValueChange={v => setConfig({ ...config, identityType: v })}
                >
                    <SelectTrigger className="w-full max-w-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="MOCK">
                            <span className="flex items-center gap-2"><Shield size={14} /> Mock (Development)</span>
                        </SelectItem>
                        <SelectItem value="DATABRICKS">
                            <span className="flex items-center gap-2"><Globe size={14} /> Databricks / Unity Catalog</span>
                        </SelectItem>
                        <SelectItem value="AZURE">
                            <span className="flex items-center gap-2"><Lock size={14} /> Microsoft Azure Entra ID (AD)</span>
                        </SelectItem>
                        <SelectItem value="OAUTH">
                            <span className="flex items-center gap-2"><KeyRound size={14} /> Generic OAuth 2.0 / OIDC</span>
                        </SelectItem>
                        <SelectItem value="SAML">
                            <span className="flex items-center gap-2"><Shield size={14} /> SAML 2.0 (SSO)</span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* ── MOCK ────────────────────────────────────────── */}
            {idpType === 'MOCK' && (
                <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                    <Info size={16} className="mt-0.5 shrink-0 text-primary" />
                    <div>
                        <p className="font-medium text-foreground">Mock Identity Provider (Development Only)</p>
                        <p className="mt-1 text-xs">
                            Uses built-in mock users and groups. No external configuration is needed. Switch to a real provider when deploying to production.
                        </p>
                    </div>
                </div>
            )}

            {/* ── DATABRICKS ──────────────────────────────────── */}
            {idpType === 'DATABRICKS' && (
                <Section
                    icon={<Globe size={16} />}
                    title="Databricks / Unity Catalog Identity"
                    description="Users and groups are read from the connected Databricks workspace or account. Configure the workspace connection in the Unity Catalog tab."
                    badge="No extra config needed"
                >
                    <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
                        <AlertCircle size={14} className="mt-0.5 shrink-0 text-primary" />
                        <p>Requires a valid Unity Catalog workspace connection. Verify the connection in the <strong className="text-foreground">Unity Catalog</strong> settings tab.</p>
                    </div>
                </Section>
            )}

            {/* ── AZURE AD ────────────────────────────────────── */}
            {idpType === 'AZURE' && (
                <Section icon={<Lock size={16} />} title="Microsoft Azure Entra ID" description="Authenticate users and sync groups via Azure AD (Microsoft Entra ID).">
                    <Field label="Directory (Tenant) ID">
                        <Input
                            value={config.azureTenantId || ''}
                            placeholder="00000000-0000-0000-0000-000000000000"
                            onChange={e => setConfig({ ...config, azureTenantId: e.target.value })}
                        />
                    </Field>
                    <Field label="Application (Client) ID">
                        <Input
                            value={config.oauthClientId || ''}
                            placeholder="00000000-0000-0000-0000-000000000000"
                            onChange={e => setConfig({ ...config, oauthClientId: e.target.value })}
                        />
                    </Field>
                    <SecretField
                        label="Client Secret"
                        sourceKey="oauthClientSecretSource"
                        plainKey="oauthClientSecret"
                        vaultKeyKey="oauthClientSecretVaultKey"
                        vaultPath={config.vaultSecretPath}
                        placeholder="Client Secret Value..."
                        config={config}
                        setConfig={setConfig}
                    />
                    {config.azureTenantId && (
                        <div className="rounded-md bg-muted/30 border border-border/50 p-3 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Computed Endpoints</p>
                            <p className="font-mono text-xs text-muted-foreground break-all">
                                Auth: https://login.microsoftonline.com/{config.azureTenantId}/oauth2/v2.0/authorize
                            </p>
                            <p className="font-mono text-xs text-muted-foreground break-all">
                                Token: https://login.microsoftonline.com/{config.azureTenantId}/oauth2/v2.0/token
                            </p>
                        </div>
                    )}
                </Section>
            )}

            {/* ── OAUTH / OIDC ─────────────────────────────────── */}
            {idpType === 'OAUTH' && (
                <Section icon={<KeyRound size={16} />} title="OAuth 2.0 / OIDC" description="Configure a generic OpenID Connect or OAuth 2.0 identity provider.">
                    <Field label="Client ID">
                        <Input
                            value={config.oauthClientId || ''}
                            onChange={e => setConfig({ ...config, oauthClientId: e.target.value })}
                        />
                    </Field>
                    <SecretField
                        label="Client Secret"
                        sourceKey="oauthClientSecretSource"
                        plainKey="oauthClientSecret"
                        vaultKeyKey="oauthClientSecretVaultKey"
                        vaultPath={config.vaultSecretPath}
                        config={config}
                        setConfig={setConfig}
                    />
                    <Field label="Authorization URL">
                        <Input
                            value={config.oauthAuthUrl || ''}
                            placeholder="https://idp.example.com/oauth2/authorize"
                            onChange={e => setConfig({ ...config, oauthAuthUrl: e.target.value })}
                        />
                    </Field>
                    <Field label="Token URL">
                        <Input
                            value={config.oauthTokenUrl || ''}
                            placeholder="https://idp.example.com/oauth2/token"
                            onChange={e => setConfig({ ...config, oauthTokenUrl: e.target.value })}
                        />
                    </Field>
                    <Field label="OIDC Discovery URL" hint="Optional — used to auto-populate Authorization and Token URLs.">
                        <Input
                            value={config.oauthDiscoveryUrl || ''}
                            placeholder="https://idp.example.com/.well-known/openid-configuration"
                            onChange={e => setConfig({ ...config, oauthDiscoveryUrl: e.target.value })}
                        />
                    </Field>
                </Section>
            )}

            {/* ── SAML 2.0 ────────────────────────────────────── */}
            {idpType === 'SAML' && (
                <Section icon={<Shield size={16} />} title="SAML 2.0 (SSO)" description="Configure SAML 2.0 Single Sign-On with an x.509 certificate.">
                    <Field label="Identity Provider SSO URL">
                        <Input
                            value={config.samlSsoUrl || ''}
                            placeholder="https://idp.example.com/saml/sso"
                            onChange={e => setConfig({ ...config, samlSsoUrl: e.target.value })}
                        />
                    </Field>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">x.509 Certificate (PEM)</Label>
                            <Select
                                value={config.samlCertSource || 'PLAIN'}
                                onValueChange={v => setConfig({ ...config, samlCertSource: v })}
                            >
                                <SelectTrigger className="h-7 w-auto text-xs px-2 gap-1 border-dashed">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PLAIN">Plain Text</SelectItem>
                                    <SelectItem value="VAULTED">Vaulted Secret</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {config.samlCertSource === 'VAULTED' ? (
                            <div className="pl-3 border-l-2 border-primary/40 space-y-2">
                                <Input
                                    value={config.samlCertVaultKey || ''}
                                    placeholder="saml_cert"
                                    onChange={e => setConfig({ ...config, samlCertVaultKey: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Resolving from vault path: <code className="text-xs">{config.vaultSecretPath || 'not configured'}</code>
                                </p>
                            </div>
                        ) : (
                            <Textarea
                                value={config.samlCert || ''}
                                onChange={e => setConfig({ ...config, samlCert: e.target.value })}
                                placeholder={'-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'}
                                className="font-mono text-xs min-h-[120px]"
                            />
                        )}
                    </div>
                </Section>
            )}

            {/* ── USER SYNC (SCIM) ─────────────────────────────── */}
            {/* Shown for all external providers; Databricks has its own native sync, Mock has no sync */}
            {isAuthProvider && (
                <>
                    <Separator />

                    <Section
                        icon={<RefreshCw size={16} />}
                        title="User &amp; Group Synchronization (SCIM 2.0)"
                        description="Automatically provision and sync users and groups from your identity provider into the application. SCIM 2.0 runs on a schedule or on-demand."
                    >
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="scim-enabled" className="text-sm font-medium">Enable SCIM Sync</Label>
                                <p className="text-xs text-muted-foreground">
                                    When enabled, users and groups are kept in sync with your IDP automatically.
                                </p>
                            </div>
                            <Switch
                                id="scim-enabled"
                                checked={config.scimEnabled || false}
                                onCheckedChange={checked => setConfig({ ...config, scimEnabled: checked })}
                            />
                        </div>

                        {config.scimEnabled && (
                            <div className="space-y-4 animate-in fade-in duration-300 pt-2">
                                <Field
                                    label="SCIM Endpoint URL"
                                    hint="The SCIM 2.0 base URL provided by your identity provider."
                                >
                                    <Input
                                        value={config.scimUrl || ''}
                                        placeholder="https://api.my-idp.com/scim/v2"
                                        onChange={e => setConfig({ ...config, scimUrl: e.target.value })}
                                    />
                                </Field>
                                <SecretField
                                    label="SCIM Bearer Token"
                                    description="The token used to authenticate SCIM API calls to your IDP."
                                    sourceKey="scimTokenSource"
                                    plainKey="scimToken"
                                    vaultKeyKey="scimTokenVaultKey"
                                    vaultPath={config.vaultSecretPath}
                                    placeholder="Bearer token..."
                                    config={config}
                                    setConfig={setConfig}
                                />
                                <Field
                                    label="Sync Interval"
                                    hint="How often to pull updates from the SCIM endpoint (in minutes)."
                                >
                                    <Input
                                        type="number"
                                        min={5}
                                        value={config.scimSyncInterval || 60}
                                        onChange={e => setConfig({ ...config, scimSyncInterval: parseInt(e.target.value) || 60 })}
                                        className="w-32"
                                    />
                                </Field>
                            </div>
                        )}
                    </Section>

                    {/* Group-to-Persona mapping note */}
                    <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/50 p-4 text-xs text-muted-foreground">
                        <Users size={14} className="mt-0.5 shrink-0 text-primary" />
                        <p>
                            Once users and groups are synced, use the <strong className="text-foreground">Users &amp; Groups</strong> tab to assign groups to application personas (Platform Admin, Security Admin, Access Auditor).
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default IdentitySettingsTab;
