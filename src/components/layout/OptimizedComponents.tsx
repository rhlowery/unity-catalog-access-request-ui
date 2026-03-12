import React, { lazy, Suspense } from 'react';
import { LogOut, Activity, ShieldPlus, CheckCircle, FileText, Users, UserCog } from 'lucide-react';
import { PERSONA_LABELS } from '../../services/persona/PersonaService';

// Lazy load components that are not immediately needed
const AccessForm = lazy(() => import('../AccessForm'));
const ApproverDashboard = lazy(() => import('../ApproverDashboard'));
const ReviewerTab = lazy(() => import('../ReviewerTab'));
const AuditLog = lazy(() => import('../AuditLog'));
const DataApproversView = lazy(() => import('../DataApproversView'));
const UserGroupManagement = lazy(() => import('../UserGroupManagement'));

import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Loading fallback component
const ComponentLoader = () => (
  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
    Loading...
  </div>
);

const TAB_CLASS =
  'px-5 h-full rounded-lg flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[inset_0_0_12px_rgba(88,166,255,0.1)] transition-all duration-300 group';

interface ViewModeTabsProps {
  viewMode: string;
  setViewMode: (mode: string) => void;
  pendingCount: number;
  errorCount: number;
  user: any;
  /** Persona capabilities derived from usePersona hook, passed down from MainLayout */
  canViewApprover: boolean;
  canViewDataApprovers: boolean;
  canViewAuditLog: boolean;
  canViewUserGroupManagement: boolean;
}

const hasPermission = (user: any, permission: string) => {
  return user?.permissions?.includes(permission) || false;
};

// Memoized tab bar — capabilities are passed in so the hook lives only in MainLayout
const ViewModeTabs = React.memo(({
  viewMode,
  setViewMode,
  pendingCount,
  user,
  canViewApprover,
  canViewDataApprovers,
  canViewAuditLog,
  canViewUserGroupManagement,
}: ViewModeTabsProps) => {
  return (
    <Tabs value={viewMode} onValueChange={setViewMode} className="w-auto">
      <TabsList className="bg-white/5 backdrop-blur-2xl border border-white/10 h-12 p-1 gap-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-xl">
        {/* Always-visible tabs */}
        <TabsTrigger value="REVIEWER" className={TAB_CLASS}>
          <Activity size={14} className="opacity-50 group-data-[state=active]:opacity-100 group-data-[state=active]:text-primary transition-all" />
          Current Access
        </TabsTrigger>
        <TabsTrigger value="CHANGE_REQUEST" className={TAB_CLASS}>
          <ShieldPlus size={14} className="opacity-50 group-data-[state=active]:opacity-100 group-data-[state=active]:text-primary transition-all" />
          Access Request
        </TabsTrigger>

        {/* Approver tab: visible when persona is Approver or higher or has explicit permission */}
        {(canViewApprover || hasPermission(user, 'can_approve')) && (
          <TabsTrigger value="APPROVER" className={`relative ${TAB_CLASS}`}>
            <CheckCircle size={14} className="opacity-50 group-data-[state=active]:opacity-100 group-data-[state=active]:text-primary transition-all" />
            Approver
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 px-1 py-0 min-w-[1.1rem] h-[1.1rem] justify-center animate-pulse text-[9px] font-black border-none ring-2 ring-background">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        )}

        {/* Data Approvers tab: visible to Security Admin and Platform Admin or has explicit permission */}
        {(canViewDataApprovers || hasPermission(user, 'can_configure')) && (
          <TabsTrigger value="DATA_APPROVERS" className={`hidden md:flex ${TAB_CLASS}`}>
            <Users size={14} className="opacity-50 group-data-[state=active]:opacity-100 group-data-[state=active]:text-primary transition-all text-amber-500/80" />
            Data Approvers
          </TabsTrigger>
        )}

        {/* Audit Log tab: visible to Access Auditor, Security Admin, and Platform Admin or has explicit permission */}
        {(canViewAuditLog || hasPermission(user, 'can_audit')) && (
          <TabsTrigger value="AUDIT" className={TAB_CLASS}>
            <FileText size={14} className="opacity-50 group-data-[state=active]:opacity-100 group-data-[state=active]:text-primary transition-all" />
            Audit Log
          </TabsTrigger>
        )}

        {/* Users & Groups tab: visible to Security Admin and Platform Admin or has explicit permission */}
        {(canViewUserGroupManagement || hasPermission(user, 'can_manage_users')) && (
          <TabsTrigger value="USER_GROUPS" className={`hidden md:flex ${TAB_CLASS}`}>
            <UserCog size={14} className="opacity-50 group-data-[state=active]:opacity-100 group-data-[state=active]:text-primary transition-all text-violet-400/80" />
            Users &amp; Groups
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
});

interface UserControlsProps {
  user?: any;
  logout?: () => void;
  persona?: string;
}

const UserControls = React.memo(({ user, logout, persona }: UserControlsProps) => (
  <div className="flex items-center gap-5 pl-6 border-l border-white/10 ml-2">
    <div className="text-right hidden sm:block">
      <div className="text-sm font-semibold text-foreground/90 tracking-tight">{user?.name}</div>
      <div data-testid="persona-label" className="text-[10px] text-muted-foreground uppercase tracking-widest leading-tight">
        {persona ? PERSONA_LABELS[persona as keyof typeof PERSONA_LABELS] ?? user?.provider : user?.provider}
      </div>
      {user?.provider === 'mock' && (
        <div className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.2em] mt-0.5">Simulation Mode</div>
      )}
    </div>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className="h-10 w-10 border border-white/10 ring-2 ring-transparent ring-offset-2 ring-offset-background hover:ring-primary/50 transition-all cursor-pointer shadow-lg">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold border border-primary/20">
              {user?.initials || 'U'}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{user?.email || user?.name}</p>
          {persona && (
            <p className="text-xs text-muted-foreground">
              {PERSONA_LABELS[persona as keyof typeof PERSONA_LABELS]}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <Button
      variant="ghost"
      size="icon"
      onClick={logout}
      title="Sign Out"
      className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive group transition-all"
    >
      <LogOut size={18} className="transition-transform group-hover:scale-110 opacity-70 group-hover:opacity-100" />
    </Button>
  </div>
));

const ContentView = React.memo(({ viewMode, selectedObjects, onClearSelection, onSubmit }: any) => {
  const content = React.useMemo(() => {
    switch (viewMode) {
      case 'CHANGE_REQUEST':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <AccessForm
              selectedObjects={selectedObjects}
              onClearSelection={onClearSelection}
              onSubmit={onSubmit}
            />
          </Suspense>
        );
      case 'REVIEWER':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <ReviewerTab selectedObject={selectedObjects.length > 0 ? selectedObjects[selectedObjects.length - 1] : null} />
          </Suspense>
        );
      case 'APPROVER':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <ApproverDashboard />
          </Suspense>
        );
      case 'AUDIT':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <AuditLog />
          </Suspense>
        );
      case 'DATA_APPROVERS':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <DataApproversView selectedObjects={selectedObjects} />
          </Suspense>
        );
      case 'USER_GROUPS':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <UserGroupManagement />
          </Suspense>
        );
      default:
        return null;
    }
  }, [viewMode, selectedObjects, onClearSelection]);

  return content;
});

export { ViewModeTabs, UserControls, ContentView, ComponentLoader };