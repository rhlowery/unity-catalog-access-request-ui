import React from 'react';
import { Globe, AlertTriangle, Info, Database, ShieldCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface UnityCatalogSettingsTabProps {
    config: any;
    setConfig: (config: any) => void;
}
import { SecretField, Field, Section } from './SettingsComponents';

const UnityCatalogSettingsTab: React.FC<UnityCatalogSettingsTabProps> = ({ config, setConfig }) => {
    const authType = config.ucAuthType || 'MOCK';
    const isMock = authType === 'MOCK';

    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* Connection type selector */}
            <div className="space-y-1.5">
                <Label className="text-sm font-medium">Connection Type</Label>
                <p className="text-xs text-muted-foreground">
                    How this application connects to the Databricks Unity Catalog workspace or account.
                </p>
                <Select
                    value={authType}
                    onValueChange={val => setConfig({
                        ...config,
                        ucAuthType: val,
                        ucHost: val === 'ACCOUNT' ? 'accounts.cloud.databricks.com' : (val === 'MOCK' ? '' : config.ucHost || '')
                    })}
                >
                    <SelectTrigger className="w-full max-w-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="MOCK">Mock (Development)</SelectItem>
                        <SelectItem value="WORKSPACE">Databricks Single Workspace</SelectItem>
                        <SelectItem value="UC_OSS">Unity Catalog OSS (Open Source)</SelectItem>
                        <SelectItem value="ACCOUNT">Databricks Account (Unified Login)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Mock info callout */}
            {isMock && (
                <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                    <Info size={16} className="mt-0.5 shrink-0 text-primary" />
                    <div>
                        <p className="font-medium text-foreground">Mock Connection (Development Only)</p>
                        <p className="mt-1 text-xs">
                            Uses built-in mock catalog data. No workspace connection is needed. Switch to a real connection type when deploying to production.
                        </p>
                    </div>
                </div>
            )}

            {/* All real connection types */}
            {!isMock && (
                <>
                    {/* Schema target */}
                    <Section
                        icon={<Database size={16} />}
                        title="Schema &amp; Table Configuration"
                        description="The catalog and schema where the application will store access requests, approvals, and audit records."
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Catalog Name">
                                <Input
                                    value={config.ucCatalog || ''}
                                    placeholder="default"
                                    onChange={e => setConfig({ ...config, ucCatalog: e.target.value })}
                                />
                            </Field>
                            <Field label="Schema Name">
                                <Input
                                    value={config.ucSchema || ''}
                                    placeholder="acs"
                                    onChange={e => setConfig({ ...config, ucSchema: e.target.value })}
                                />
                            </Field>
                        </div>
                        <Field
                            label="Table Names (comma-separated)"
                            hint="Tables to create in the schema. Used by the storage and audit services."
                        >
                            <Input
                                value={config.ucTables || ''}
                                placeholder="requests,approvals,audit_log"
                                className="font-mono"
                                onChange={e => setConfig({ ...config, ucTables: e.target.value })}
                            />
                        </Field>
                    </Section>

                    {/* Workspace / Account connection */}
                    <Section
                        icon={<ShieldCheck size={16} />}
                        title={authType === 'ACCOUNT' ? 'Account Connection (M2M OAuth)' : 'Workspace Connection (M2M OAuth)'}
                        description="Service principal credentials for the OAuth 2.0 Client Credentials (machine-to-machine) flow used to obtain short-lived access tokens."
                    >
                        {authType === 'ACCOUNT' && (
                            <Field label="Databricks Account ID">
                                <Input
                                    value={config.ucAccountId || ''}
                                    placeholder="00000000-0000-0000-0000-000000000000"
                                    onChange={e => setConfig({ ...config, ucAccountId: e.target.value })}
                                />
                            </Field>
                        )}

                        <Field label={authType === 'ACCOUNT' ? 'Host URL (Account Console)' : 'Host URL (Workspace)'}>
                            <Input
                                value={config.ucHost || ''}
                                placeholder={
                                    authType === 'ACCOUNT'
                                        ? 'accounts.cloud.databricks.com'
                                        : 'https://<workspace-id>.cloud.databricks.com'
                                }
                                onChange={e => setConfig({ ...config, ucHost: e.target.value })}
                            />
                        </Field>

                        <Field label="Service Principal Client ID">
                            <Input
                                value={config.ucClientId || ''}
                                placeholder="00000000-0000-0000-0000-000000000000"
                                onChange={e => setConfig({ ...config, ucClientId: e.target.value })}
                            />
                        </Field>

                        <SecretField
                            label="Service Principal Client Secret"
                            description="The OAuth client secret for the service principal."
                            sourceKey="ucClientSecretSource"
                            plainKey="ucClientSecret"
                            vaultKeyKey="ucClientSecretVaultKey"
                            vaultPath={config.vaultSecretPath}
                            placeholder="Client secret..."
                            config={config}
                            setConfig={setConfig}
                        />
                    </Section>

                    {/* Warning footer */}
                    <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-muted-foreground">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                        <div className="space-y-1">
                            <p>Uses <strong className="text-foreground">OAuth 2.0 Client Credentials</strong> (M2M) to fetch a short-lived access token at runtime.</p>
                            <p className="text-amber-500/80">Credentials are stored locally in this demo build. Use the <strong className="text-foreground">Secrets</strong> tab to configure a vault provider for production deployments.</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default UnityCatalogSettingsTab;
