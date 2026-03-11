import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Reusable secret source picker + input
interface SecretFieldProps {
    label: string;
    description?: string;
    sourceKey: string;
    plainKey: string;
    vaultKeyKey: string;
    vaultPath: string;
    placeholder?: string;
    config: any;
    setConfig: (c: any) => void;
}

export const SecretField: React.FC<SecretFieldProps> = ({
    label, description, sourceKey, plainKey, vaultKeyKey, vaultPath, placeholder = 'Secret value...', config, setConfig
}) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{label}</Label>
            <Select
                value={config[sourceKey] || 'PLAIN'}
                onValueChange={v => setConfig({ ...config, [sourceKey]: v })}
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
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {config[sourceKey] === 'VAULTED' ? (
            <div className="pl-3 border-l-2 border-primary/40 space-y-2">
                <Input
                    value={config[vaultKeyKey] || ''}
                    placeholder="vault_json_key"
                    onChange={e => setConfig({ ...config, [vaultKeyKey]: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                    Resolving from vault path: <code className="text-xs">{vaultPath || 'not configured'}</code>
                </p>
            </div>
        ) : (
            <Input
                type="password"
                value={config[plainKey] || ''}
                placeholder={placeholder}
                onChange={e => setConfig({ ...config, [plainKey]: e.target.value })}
            />
        )}
    </div>
);

// Labelled field wrapper
export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div className="space-y-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {children}
    </div>
);

// Section card wrapper
export const Section: React.FC<{ title: string; description?: string; icon: React.ReactNode; badge?: string; children: React.ReactNode }> = ({
    title, description, icon, badge, children
}) => (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-5 space-y-4 animate-in fade-in duration-300">
        <div className="flex items-start gap-3">
            <div className="mt-0.5 text-primary">{icon}</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{title}</h4>
                    {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
                </div>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
        </div>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);
