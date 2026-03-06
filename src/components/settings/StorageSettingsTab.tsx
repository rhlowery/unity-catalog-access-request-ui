import React from 'react';
import { Database, Server, GitBranch, Info, HardDrive } from 'lucide-react';
import { Field, Section, SecretField } from './SettingsComponents';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface StorageSettingsTabProps {
    config: any;
    setConfig: (config: any) => void;
}

const StorageSettingsTab: React.FC<StorageSettingsTabProps> = ({ config, setConfig }) => {
    const storageType = config.type || 'MOCK';

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Storage Type Selector */}
            <Field
                label="Active Storage Backend"
                hint="Select where the application stores its configuration and request data."
            >
                <Select
                    value={storageType}
                    onValueChange={val => setConfig({ ...config, type: val })}
                >
                    <SelectTrigger className="w-full max-w-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="MOCK">Mock (Volatile)</SelectItem>
                        <SelectItem value="LOCAL">Local Browser Storage</SelectItem>
                        <SelectItem value="UNITY_CATALOG">Unity Catalog Table</SelectItem>
                        <SelectItem value="RDBMS">Relational Database (SQL)</SelectItem>
                        <SelectItem value="GIT">Git Repository (GitOps)</SelectItem>
                    </SelectContent>
                </Select>
            </Field>

            {/* Mock/Local Info */}
            {(storageType === 'MOCK' || storageType === 'LOCAL') && (
                <div className="flex items-start gap-3 rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground transition-all">
                    <Info size={16} className="mt-0.5 shrink-0 text-primary" />
                    <div>
                        <p className="font-medium text-foreground">
                            {storageType === 'MOCK' ? 'Mock Storage' : 'Browser Storage'}
                        </p>
                        <p className="mt-1 text-xs px-0">
                            {storageType === 'MOCK'
                                ? 'Data is stored in memory and lost on page refresh. Ideal for quick testing.'
                                : 'Data is stored in your browser\'s local storage. Not suitable for multi-user production environments.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Unity Catalog Storage Config */}
            {storageType === 'UNITY_CATALOG' && (
                <Section
                    title="Unity Catalog Table Storage"
                    description="Store application data in a managed Unity Catalog table."
                    icon={<Database size={18} />}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Catalog">
                            <Input
                                value={config.ucCatalog || ''}
                                onChange={e => setConfig({ ...config, ucCatalog: e.target.value })}
                                placeholder="main"
                            />
                        </Field>
                        <Field label="Schema">
                            <Input
                                value={config.ucSchema || ''}
                                onChange={e => setConfig({ ...config, ucSchema: e.target.value })}
                                placeholder="default"
                            />
                        </Field>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Requests Table">
                            <Input
                                value={config.ucTable || ''}
                                onChange={e => setConfig({ ...config, ucTable: e.target.value })}
                                placeholder="access_requests"
                            />
                        </Field>
                        <Field label="Approver Policies Table">
                            <Input
                                value={config.ucApproversTable || ''}
                                onChange={e => setConfig({ ...config, ucApproversTable: e.target.value })}
                                placeholder="approver_policies"
                            />
                        </Field>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Audit Log Table">
                            <Input
                                value={config.ucAuditTable || ''}
                                onChange={e => setConfig({ ...config, ucAuditTable: e.target.value })}
                                placeholder="audit_log"
                            />
                        </Field>
                        <Field label="SQL Warehouse ID" hint="Required for executing SQL queries against the storage table.">
                            <Input
                                value={config.ucWarehouseId || ''}
                                onChange={e => setConfig({ ...config, ucWarehouseId: e.target.value })}
                                placeholder="0123-456789-abcd012"
                            />
                        </Field>
                    </div>
                </Section>
            )}

            {/* RDBMS Storage Config */}
            {storageType === 'RDBMS' && (
                <Section
                    title="Relational Database Storage"
                    description="Connect to an external SQL database for persistent storage."
                    icon={<Server size={18} />}
                >
                    <div className="space-y-4">
                        <Field label="Connection String">
                            <Input
                                value={config.rdbmsConn || ''}
                                onChange={e => setConfig({ ...config, rdbmsConn: e.target.value })}
                                placeholder="jdbc:postgresql://localhost:5432/db"
                            />
                        </Field>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Username">
                                <Input
                                    value={config.rdbmsUser || ''}
                                    onChange={e => setConfig({ ...config, rdbmsUser: e.target.value })}
                                    placeholder="db_user"
                                />
                            </Field>
                            <SecretField
                                label="Password"
                                sourceKey="rdbmsPasswordSource"
                                plainKey="rdbmsPassword"
                                vaultKeyKey="rdbmsPasswordVaultKey"
                                vaultPath={config.vaultSecretPath}
                                config={config}
                                setConfig={setConfig}
                            />
                        </div>
                    </div>
                </Section>
            )}

            {/* Git Storage Config */}
            {storageType === 'GIT' && (
                <Section
                    title="Git-Based Storage (GitOps)"
                    description="Store and version configuration files in a Git repository."
                    icon={<GitBranch size={18} />}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Git Provider">
                                <Select
                                    value={config.gitProvider || 'GITHUB'}
                                    onValueChange={v => {
                                        setConfig({
                                            ...config,
                                            gitProvider: v,
                                            gitHost: v === 'GITHUB' ? 'github.com' : (v === 'GITLAB' ? 'gitlab.com' : config.gitHost)
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GITHUB">GitHub</SelectItem>
                                        <SelectItem value="GITLAB">GitLab Cloud</SelectItem>
                                        <SelectItem value="GITLAB_SELF_HOSTED">GitLab Self-Hosted</SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>
                            {config.gitProvider === 'GITLAB_SELF_HOSTED' && (
                                <Field label="Instance URL">
                                    <Input
                                        value={config.gitHost || ''}
                                        onChange={e => setConfig({ ...config, gitHost: e.target.value })}
                                        placeholder="gitlab.company.com"
                                    />
                                </Field>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Project Path (owner/repo)">
                                <Input
                                    value={config.gitRepo || ''}
                                    onChange={e => setConfig({ ...config, gitRepo: e.target.value })}
                                    placeholder="org/repo"
                                />
                            </Field>
                            <Field label="Branch">
                                <Input
                                    value={config.gitBranch || ''}
                                    onChange={e => setConfig({ ...config, gitBranch: e.target.value })}
                                    placeholder="main"
                                />
                            </Field>
                        </div>

                        <SecretField
                            label="Access Token"
                            description="Personal Access Token with repository read/write permissions."
                            sourceKey="gitTokenSource"
                            plainKey="gitToken"
                            vaultKeyKey="gitTokenVaultKey"
                            vaultPath={config.vaultSecretPath}
                            placeholder="ghp_... / glpat_..."
                            config={config}
                            setConfig={setConfig}
                        />
                    </div>
                </Section>
            )}
        </div>
    );
};

export default StorageSettingsTab;
