import { StorageService } from '../services/storage/StorageService';
import { ConfigService } from '../services/config/ConfigService';
import CatalogTree from './CatalogTree';

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const Sidebar = ({
    catalogs,
    selectedIds,
    onToggleSelection,
    workspaces,
    selectedWorkspaceId,
    onWorkspaceChange,
    loadingWorkspaces,
    workspaceError,
    width = '300px'
}) => {
    return (
        <aside className="h-full flex flex-col overflow-hidden bg-background/40 backdrop-blur-xl border-r border-white/5 shadow-2xl" style={{ width, borderRadius: 0 }}>
            {(() => {
                const config = ConfigService.getConfig();
                if (config.ucAuthType === 'ACCOUNT') {
                    return (
                        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-3 block opacity-70">
                                Active Workspace
                            </label>
                            <Select
                                value={selectedWorkspaceId}
                                onValueChange={onWorkspaceChange}
                                disabled={loadingWorkspaces || !!workspaceError}
                            >
                                <SelectTrigger className="w-full bg-background/40 border-white/5 hover:bg-white/[0.05] transition-colors h-10">
                                    <SelectValue placeholder={loadingWorkspaces ? "Loading..." : "Select Workspace"} />
                                </SelectTrigger>
                                <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10">
                                    <SelectGroup>
                                        <SelectLabel className="text-xs uppercase tracking-widest opacity-50">Workspaces</SelectLabel>
                                        {workspaceError ? (
                                            <div className="p-2 text-xs text-destructive">Error: {workspaceError}</div>
                                        ) : workspaces.length > 0 ? (
                                            workspaces.map(ws => (
                                                <SelectItem key={ws.id} value={ws.id} className="text-sm">
                                                    {ws.name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-2 text-xs text-muted-foreground">No workspaces found</div>
                                        )}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    );
                }
                return null;
            })()}

            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01] flex-shrink-0">
                <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                    Data Catalog
                </h3>
            </div>
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden h-full">
                <CatalogTree
                    nodes={catalogs}
                    selectedIds={selectedIds}
                    onToggleSelection={onToggleSelection}
                />
            </div>
        </aside>
    );
};

export default Sidebar;
