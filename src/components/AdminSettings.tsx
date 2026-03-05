import React, { useState } from 'react';
import { Bug, Save, Lock, CheckCircle, Info } from 'lucide-react';
import { ConfigService } from '../services/config/ConfigService';
import { EventBus } from '../services/EventBus';
import { clearTokenCache } from '../services/UCIdentityService';

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import StorageSettingsTab from './settings/StorageSettingsTab';
import IdentitySettingsTab from './settings/IdentitySettingsTab';
import SecretsSettingsTab from './settings/SecretsSettingsTab';
import UnityCatalogSettingsTab from './settings/UnityCatalogSettingsTab';
import DebugSettingsTab from './settings/DebugSettingsTab';

const AdminSettings = () => {
    const [config, setConfig] = useState(ConfigService.getConfig());
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState('STORAGE');
    const [isMockVaultModalOpen, setIsMockVaultModalOpen] = useState(false);
    const [mockVaultJson, setMockVaultJson] = useState(() => {
        return localStorage.getItem('acs_mock_vault_secrets_v1') || '{}';
    });

    const handleSave = () => {
        ConfigService.updateConfig(config);
        clearTokenCache();
        setSaved(true);
        EventBus.dispatch('SETTINGS_UPDATED', { config });
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground text-sm">
                <Info size={18} className="mt-0.5 text-primary" />
                <p>Manage secondary storage backends, identity provider synchronization, and catalog connection credentials. Changes will take effect immediately upon saving.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto pb-1 -mx-1 px-1">
                    <TabsList className="w-max min-w-full justify-start bg-background/50 border border-border h-12 p-1 mb-6 flex-nowrap">
                        <TabsTrigger value="STORAGE" className="px-4 whitespace-nowrap">Storage</TabsTrigger>
                        <TabsTrigger value="IDENTITY" className="px-4 whitespace-nowrap">Identity</TabsTrigger>
                        <TabsTrigger value="SECRETS" className="px-4 whitespace-nowrap">Secrets</TabsTrigger>
                        <TabsTrigger value="UNITY_CATALOG" className="px-4 whitespace-nowrap">Unity Catalog</TabsTrigger>
                        {import.meta.env.DEV && (
                            <TabsTrigger value="DEBUG" className="px-4 gap-2 whitespace-nowrap">
                                <Bug size={14} /> Debug
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                <Card className="border-border/50 bg-card/30 backdrop-blur-sm min-h-[400px]">
                    <CardContent className="pt-6">
                        <TabsContent value="STORAGE" className="mt-0">
                            <StorageSettingsTab config={config} setConfig={setConfig} />
                        </TabsContent>
                        <TabsContent value="IDENTITY" className="mt-0">
                            <IdentitySettingsTab config={config} setConfig={setConfig} />
                        </TabsContent>
                        <TabsContent value="SECRETS" className="mt-0">
                            <SecretsSettingsTab config={config} setConfig={setConfig} setIsMockVaultModalOpen={setIsMockVaultModalOpen} />
                        </TabsContent>
                        <TabsContent value="UNITY_CATALOG" className="mt-0">
                            <UnityCatalogSettingsTab config={config} setConfig={setConfig} />
                        </TabsContent>
                        {import.meta.env.DEV && (
                            <TabsContent value="DEBUG" className="mt-0">
                                <DebugSettingsTab config={config} setConfig={setConfig} />
                            </TabsContent>
                        )}
                    </CardContent>
                    <CardFooter className="border-t border-border/50 bg-muted/20 px-6 py-4 flex justify-end">
                        <Button
                            size="lg"
                            onClick={handleSave}
                            className={`min-w-[200px] transition-all ${saved ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                            {saved ? (
                                <><CheckCircle size={18} className="mr-2" /> Configuration Saved</>
                            ) : (
                                <><Save size={18} className="mr-2" /> Save Configuration</>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </Tabs>

            <Dialog open={isMockVaultModalOpen} onOpenChange={setIsMockVaultModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock size={18} /> Manage Mock Vault Secrets
                        </DialogTitle>
                        <DialogDescription>
                            Edit the mock secrets in JSON format. The keys represent paths, and values are objects with key-value pairs.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            value={mockVaultJson}
                            onChange={e => setMockVaultJson(e.target.value)}
                            className="min-h-[300px] font-mono text-xs bg-muted/50"
                            placeholder='{ "secret/path": { "key": "value" } }'
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMockVaultModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => {
                            try {
                                JSON.parse(mockVaultJson);
                                localStorage.setItem('acs_mock_vault_secrets_v1', mockVaultJson);
                                setIsMockVaultModalOpen(false);
                            } catch {
                                alert("Invalid JSON format. Please correct it.");
                            }
                        }}>Save Mock Secrets</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminSettings;
