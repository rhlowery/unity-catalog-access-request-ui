import React, { useState, useEffect } from 'react';
import { ShieldAlert, Settings2, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { NodeIcon } from './CatalogTree';
import { getCatalogs, getIdentities } from '../services/mockData';
import { StorageService } from '../services/storage/StorageService';

const DataApproversView = ({ selectedObjects = [] }: any) => {
    const [objectApprovers, setObjectApprovers] = useState<Record<string, string[]>>({});
    const [catalogs, setCatalogs] = useState<any[]>([]);
    const [identities, setIdentities] = useState<any[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const [catData, idData, approversData] = await Promise.all([
                getCatalogs(),
                getIdentities(),
                StorageService.getApprovers()
            ]);
            setCatalogs(catData);
            setIdentities(idData.filter((i: any) => i.type === 'GROUP'));
            setObjectApprovers(approversData || {});
        };
        loadData();
    }, []);

    // Helper to find a node and build its ancestry path
    const getNodeAncestry = (targetId: string, nodes: any[] = catalogs, currentPath: any[] = []): any[] | null => {
        for (const node of nodes) {
            const newPath = [...currentPath, node];
            if (node.id === targetId) return newPath;
            if (node.children) {
                const found = getNodeAncestry(targetId, node.children, newPath);
                if (found) return found;
            }
        }
        return null;
    };

    if (!selectedObjects || selectedObjects.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center opacity-50 space-y-4 text-center px-8 border border-dashed rounded-xl border-white/10 py-32 bg-background/50 backdrop-blur-sm">
                <Settings2 size={48} className="text-muted-foreground" />
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-tight">Data Approvers</h3>
                    <p className="text-sm text-muted-foreground">Select one or more data objects from the main hierarchy sidebar to configure their required approvers.</p>
                </div>
            </div>
        );
    }

    const isMultiSelect = selectedObjects.length > 1;

    // Evaluate if ALL selected objects have an override
    const isOverridden = selectedObjects.every((obj: any) => objectApprovers[obj.id] !== undefined);

    const allEffectiveGroups = new Set<string>();
    let anyInherited = false;
    const ancestryMap = new Map<string, any[]>();

    selectedObjects.forEach((obj: any) => {
        const ancestry = getNodeAncestry(obj.id) || [obj];
        ancestryMap.set(obj.id, ancestry);

        let inheritedGroups: string[] = [];
        if (ancestry.length > 1) {
            for (let i = 0; i < ancestry.length - 1; i++) {
                const ancestorId = ancestry[i].id;
                if (objectApprovers[ancestorId]) {
                    inheritedGroups = objectApprovers[ancestorId];
                } else if (ancestry[i].owners) {
                    ancestry[i].owners.forEach((o: string) => {
                        if (!inheritedGroups.includes(o)) inheritedGroups.push(o);
                    });
                }
            }
        }

        if (inheritedGroups.length > 0) anyInherited = true;

        const isObjOverridden = objectApprovers[obj.id] !== undefined;
        const currentExplicitGroups = isObjOverridden ? objectApprovers[obj.id] : (obj.owners || []);

        const effective = isObjOverridden
            ? objectApprovers[obj.id]
            : Array.from(new Set([...inheritedGroups, ...currentExplicitGroups]));

        effective.forEach(g => allEffectiveGroups.add(g));
    });

    const effectiveGroups = Array.from(allEffectiveGroups);

    const handleToggleOverride = async (checked: boolean) => {
        const nextApprovers = { ...objectApprovers };

        selectedObjects.forEach((obj: any) => {
            if (checked) {
                const ancestry = ancestryMap.get(obj.id) || [obj];
                let inheritedGroups: string[] = [];
                if (ancestry.length > 1) {
                    for (let i = 0; i < ancestry.length - 1; i++) {
                        const ancestorId = ancestry[i].id;
                        if (objectApprovers[ancestorId]) {
                            inheritedGroups = objectApprovers[ancestorId];
                        } else if (ancestry[i].owners) {
                            ancestry[i].owners.forEach((o: string) => {
                                if (!inheritedGroups.includes(o)) inheritedGroups.push(o);
                            });
                        }
                    }
                }
                const isObjOverridden = objectApprovers[obj.id] !== undefined;
                const currentExplicitGroups = isObjOverridden ? objectApprovers[obj.id] : (obj.owners || []);
                const effective = isObjOverridden
                    ? objectApprovers[obj.id]
                    : Array.from(new Set([...inheritedGroups, ...currentExplicitGroups]));

                nextApprovers[obj.id] = [...effective];
            } else {
                delete nextApprovers[obj.id];
            }
        });

        setObjectApprovers(nextApprovers);
        await StorageService.saveApprovers(nextApprovers);
    };

    const handleToggleGroup = async (groupId: string) => {
        if (!isOverridden) return;

        const nextApprovers = { ...objectApprovers };
        const isCurrentlySelected = effectiveGroups.includes(groupId);

        selectedObjects.forEach((obj: any) => {
            const current = nextApprovers[obj.id] || [];
            if (isCurrentlySelected) {
                // Remove it from all
                nextApprovers[obj.id] = current.filter((id: string) => id !== groupId);
            } else {
                // Add it to all
                if (!current.includes(groupId)) {
                    nextApprovers[obj.id] = [...current, groupId];
                }
            }
        });

        setObjectApprovers(nextApprovers);
        await StorageService.saveApprovers(nextApprovers);
    };

    return (
        <Card className="flex flex-col border-border/50 bg-background/50 overflow-hidden relative shadow-2xl h-full">
            <CardHeader className="py-4 border-b border-border/50 bg-background/80">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShieldAlert size={16} className="text-primary" />
                    Approver Configuration
                    <Badge variant="outline" className="ml-auto bg-primary/10 text-primary border-primary/20">
                        {isMultiSelect ? `${selectedObjects.length} Nodes Active` : 'Active Node'}
                    </Badge>
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div>
                        {!isMultiSelect ? (
                            <>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-md bg-white/5 border border-white/10 text-primary">
                                        <NodeIcon type={selectedObjects[0].type} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold truncate">{selectedObjects[0].name}</h4>
                                        <p className="text-xs text-muted-foreground uppercase tracking-widest">{selectedObjects[0].type}</p>
                                    </div>
                                </div>
                                {ancestryMap.get(selectedObjects[0].id) && ancestryMap.get(selectedObjects[0].id)!.length > 1 && (
                                    <div className="text-[10px] text-muted-foreground mt-2 truncate max-w-full font-mono bg-white/5 p-1 px-2 rounded">
                                        {ancestryMap.get(selectedObjects[0].id)!.map(n => n.name).join(' / ')}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center gap-4 mb-2 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                                <div className="p-3 rounded-full bg-primary/10 text-primary">
                                    <Layers size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-lg font-bold truncate">Bulk Configuration</h4>
                                    <p className="text-sm text-muted-foreground">Editing {selectedObjects.length} objects simultaneously</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-4 shadow-inner">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1 pr-6">
                                <Label className="text-base font-medium flex items-center gap-2 text-foreground/90">
                                    Override Inherited Approvers
                                </Label>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Toggle this to stop inheriting approvers from parent objects and specifically customize them.
                                    {isMultiSelect ? " All selected objects will have their own explicit overrides." : " By default, child objects inherit all approvers from parents."}
                                </p>
                            </div>
                            <Checkbox
                                checked={isOverridden}
                                onCheckedChange={handleToggleOverride}
                            />
                        </div>
                    </div>

                    <div className="bg-white/[0.01] rounded-xl border border-white/5 p-4">
                        <div className="flex justify-between items-end mb-4">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                {isMultiSelect ? 'Aggregated Effective Approver Groups' : 'Required Approver Groups'}
                            </h5>
                        </div>

                        {!isOverridden && anyInherited && (
                            <div className="mb-4 p-3 rounded-md bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
                                <span className="font-semibold text-primary/80">Inheritance Active:</span> Below are the groups inherited from parent objects or default object owners. Enable Override to modify them.
                            </div>
                        )}

                        <div className="space-y-2">
                            {identities.map((group: any) => {
                                const isSelected = effectiveGroups.includes(group.id);

                                if (!isOverridden && !isSelected) return null;

                                return (
                                    <div
                                        key={group.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isOverridden ? 'hover:bg-white/5 cursor-pointer' : 'opacity-80'
                                            } ${isSelected ? 'border-primary/40 bg-primary/5' : 'border-white/5 bg-transparent'}`}
                                        onClick={() => handleToggleGroup(group.id)}
                                    >
                                        {isOverridden && (
                                            <Checkbox
                                                checked={isSelected}
                                                className="pointer-events-none"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{group.name}</p>
                                            <p className="text-[10px] text-muted-foreground opacity-60 font-mono">{group.id}</p>
                                        </div>
                                        {isSelected && !isOverridden && (
                                            <Badge variant="secondary" className="text-[10px] opacity-60">Inherited</Badge>
                                        )}
                                    </div>
                                );
                            })}

                            {effectiveGroups.length === 0 && (
                                <div className="text-center p-6 border border-dashed border-white/10 rounded-lg opacity-60 bg-background/20">
                                    <ShieldAlert className="mx-auto mb-2 opacity-50" size={24} />
                                    <p className="text-sm">No approvers required for {isMultiSelect ? 'these objects' : 'this object'}.</p>
                                    <p className="text-xs text-muted-foreground mt-1">This may allow auto-provisioning depending on instance settings.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default DataApproversView;
