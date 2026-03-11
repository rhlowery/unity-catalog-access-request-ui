import React from 'react';
import { ShieldCheck, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewModeTabs, UserControls } from '@/components/OptimizedComponents';
import { ModeToggle } from '../ModeToggle';

interface AppHeaderProps {
    isSidebarCollapsed: boolean;
    isMobile: boolean;
    sidebarWidth: number;
    handleToggle: () => void;
    viewMode: string;
    setViewMode: (mode: string) => void;
    pendingCount: number;
    errorCount: number;
    user: any;
    persona: any;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    isSidebarCollapsed,
    isMobile,
    sidebarWidth,
    handleToggle,
    viewMode,
    setViewMode,
    pendingCount,
    errorCount,
    user,
    persona
}) => {
    return (
        <header className="flex items-center h-16 border-b border-white/5 bg-background/60 backdrop-blur-xl sticky top-0 z-50">
            <div
                className="flex items-center px-8 shrink-0 transition-all duration-200 overflow-hidden"
                style={{ width: isSidebarCollapsed ? (isMobile ? 80 : 0) : sidebarWidth }}
            >
                <div className="flex items-center min-w-max">
                    {isMobile && (
                        <Button variant="ghost" size="icon" onClick={handleToggle} title="Toggle Sidebar" className="mr-2">
                            <Menu size={20} />
                        </Button>
                    )}
                    <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 shadow-lg shadow-primary/5">
                        <ShieldCheck size={24} className="text-primary" />
                    </div>
                    {(!isSidebarCollapsed || isMobile) && (
                        <h1 className="ml-4 text-lg font-extrabold tracking-tight text-foreground drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                            Access Control System
                        </h1>
                    )}
                </div>
            </div>

            <div className="flex-1 flex items-center h-full px-2 sm:px-8 gap-4 overflow-hidden">
                <div className="flex-1 flex justify-center sm:justify-start lg:justify-center overflow-x-auto hide-scrollbar">
                    <ViewModeTabs
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        pendingCount={pendingCount}
                        errorCount={errorCount}
                        user={user}
                        canViewApprover={persona.canViewApprover}
                        canViewDataApprovers={persona.canViewDataApprovers}
                        canViewAuditLog={persona.canViewAuditLog}
                        canViewUserGroupManagement={persona.canViewUserGroupManagement}
                    />
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <ModeToggle />
                    <UserControls user={user} logout={persona.logout} persona={persona.persona} />
                </div>
            </div>
        </header>
    );
};
