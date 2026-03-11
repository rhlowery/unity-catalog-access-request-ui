import React from 'react';
import { Lock, ShieldCheck, Database, KeyRound, Info, ExternalLink } from 'lucide-react';
import { Field, Section } from './SettingsComponents';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface SecretsSettingsTabProps {
    config: any;
    setConfig: (config: any) => void;
    setIsMockVaultModalOpen: (isOpen: boolean) => void;
}

const SecretsSettingsTab: React.FC<SecretsSettingsTabProps> = ({ config, setConfig, setIsMockVaultModalOpen }) => {
    const provider = config.globalSecretProvider || 'PLAIN';

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Secret Provider Selector */}
            <Field
                label="Global Secret Provider"
                hint="Choose how sensitive information (like Client Secrets) is retrieved across the application."
            >
                <Select
                    value={provider}
                    onValueChange={val => setConfig({ ...config, globalSecretProvider: val })}
                >
                    <SelectTrigger className="w-full max-w-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="PLAIN">Plain Text (In-App Configuration)</SelectItem>
                        <SelectItem value="VAULT">HashiCorp Vault (Production)</SelectItem>
                        <SelectItem value="MOCK_VAULT">Mock Vault (Local Development)</SelectItem>
                    </SelectContent>
                </Select>
            </Field>

            {/* Insecure warning for Plain Text */}
            {provider === 'PLAIN' && (
                <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 text-sm text-muted-foreground">
                    <Info size={16} className="mt-0.5 shrink-0 text-yellow-500" />
                    <div>
                        <p className="font-medium text-foreground text-yellow-500">Insecure Configuration</p>
                        <p className="mt-1 text-xs">
                            Secrets are entered directly in connection settings and stored as-is. This is not recommended for production environments. Use a vault provider for better security.
                        </p>
                    </div>
                </div>
            )}

            {/* Vault Configuration */}
            {provider === 'VAULT' && (
                <Section
                    title="HashiCorp Vault Connection"
                    description="Securely retrieve credentials from a production HashiCorp Vault instance."
                    icon={<ShieldCheck size={18} />}
                >
                    <div className="space-y-4">
                        <Field label="Vault Address">
                            <Input
                                value={config.vaultUrl || ''}
                                onChange={e => setConfig({ ...config, vaultUrl: e.target.value })}
                                placeholder="https://vault.mycompany.com:8200"
                            />
                        </Field>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Vault Token">
                                <Input
                                    type="password"
                                    value={config.vaultToken || ''}
                                    onChange={e => setConfig({ ...config, vaultToken: e.target.value })}
                                    placeholder="hvs.xxxxxxxx..."
                                />
                            </Field>
                            <Field label="Namespace (Optional)">
                                <Input
                                    value={config.vaultNamespace || ''}
                                    onChange={e => setConfig({ ...config, vaultNamespace: e.target.value })}
                                    placeholder="admin/my-namespace"
                                />
                            </Field>
                        </div>
                        <Field label="Secret Store Path">
                            <Input
                                value={config.vaultSecretPath || ''}
                                onChange={e => setConfig({ ...config, vaultSecretPath: e.target.value })}
                                placeholder="secret/data/uc-access-app"
                            />
                        </Field>
                    </div>
                </Section>
            )}

            {/* Mock Vault Management */}
            {provider === 'MOCK_VAULT' && (
                <Section
                    title="Mock Vault Management"
                    description="Simulate a vault environment for local development using browser session storage."
                    icon={<Database size={18} />}
                >
                    <div className="space-y-4">
                        <Field label="Secret Store Path (Mock)">
                            <Input
                                value={config.vaultSecretPath || ''}
                                onChange={e => setConfig({ ...config, vaultSecretPath: e.target.value })}
                                placeholder="secret/data/uc-access-app"
                            />
                        </Field>

                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/40">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Session Secrets</p>
                                <p className="text-xs text-muted-foreground">Manage key-value pairs stored in your current browser session.</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2"
                                onClick={() => setIsMockVaultModalOpen(true)}
                            >
                                <KeyRound size={14} />
                                Manage Mock Secrets
                            </Button>
                        </div>
                    </div>
                </Section>
            )}
        </div>
    );
};

export default SecretsSettingsTab;
