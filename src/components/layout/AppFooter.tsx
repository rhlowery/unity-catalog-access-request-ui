import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfigService } from '../../services/config/ConfigService';

interface AppFooterProps {
    canAccessSettings: boolean;
    setShowSettings: (show: boolean) => void;
}

export const AppFooter: React.FC<AppFooterProps> = ({ canAccessSettings, setShowSettings }) => {
    const config = ConfigService.getConfig();

    return (
        <footer className="py-3 px-8 border-t border-white/5 bg-background/40 flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">
            <div className="flex items-center gap-6">
                <span className="opacity-70">v2.4.0</span>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
                    <span className="opacity-70">Backend: Online</span>
                </div>
            </div>
            <div className="flex items-center gap-6">
                {(canAccessSettings || config.enableSimulationMode) && (
                    <Button
                        variant="ghost"
                        size="icon"
                        data-testid="settings-nav-item"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-all"
                        onClick={() => setShowSettings(true)}
                        title="Settings"
                    >
                        <Settings size={16} />
                    </Button>
                )}
                <span className="opacity-60">Unity Catalog Access Request UI</span>
            </div>
        </footer>
    );
};
