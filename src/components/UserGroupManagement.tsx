import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Shield, ChevronRight, Search, Plus, X, Check,
    UserCog, GroupIcon, Fingerprint, Crown, ShieldCheck,
    BookUser, UserCheck, AlertCircle, Info, Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { MOCK_IDENTITIES, MOCK_USERS } from '../services/mockData';
import { PERSONA_GROUP_MAP, PERSONA_LABELS, type Persona } from '../services/persona/PersonaService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MockUser {
    id: string;
    name: string;
    email: string;
    type: string;
    initials: string;
    role: string;
    groups: string[];
    description: string;
}

interface MockGroup {
    id: string;
    name: string;
    type: string;
}

// Personas that can be assigned via group membership (not "APPROVER" — that's data-object-based)
const ASSIGNABLE_PERSONAS: { value: Persona; label: string; description: string; color: string }[] = [
    {
        value: 'PLATFORM_ADMIN',
        label: 'Platform Admin',
        description: 'Full access: all tabs, Settings, User & Group Management',
        color: 'text-red-400',
    },
    {
        value: 'SECURITY_ADMIN',
        label: 'Security Admin',
        description: 'Access to Audit Log, Data Approvers, and User Management',
        color: 'text-amber-400',
    },
    {
        value: 'ACCESS_AUDITOR',
        label: 'Access Auditor',
        description: 'Read-only access to Audit Log',
        color: 'text-blue-400',
    },
];

// Build a reverse map: persona → group IDs
const personaToGroupIds: Record<Persona, string[]> = Object.entries(PERSONA_GROUP_MAP).reduce(
    (acc, [groupId, persona]) => {
        if (!acc[persona]) acc[persona] = [];
        acc[persona].push(groupId);
        return acc;
    },
    {} as Record<Persona, string[]>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PERSONA_ICON_MAP: Record<string, React.ReactNode> = {
    PLATFORM_ADMIN: <Crown size={14} />,
    SECURITY_ADMIN: <ShieldCheck size={14} />,
    ACCESS_AUDITOR: <BookUser size={14} />,
    APPROVER: <UserCheck size={14} />,
    USER: <Users size={14} />,
};

const PERSONA_BADGE_CLASS: Record<string, string> = {
    PLATFORM_ADMIN: 'bg-red-500/10 text-red-400 border-red-500/20',
    SECURITY_ADMIN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    ACCESS_AUDITOR: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    APPROVER: 'bg-green-500/10 text-green-400 border-green-500/20',
    USER: 'bg-white/5 text-muted-foreground border-white/10',
};

function userPersonaFromGroups(groups: string[]): Persona {
    const ranks: Record<Persona, number> = {
        PLATFORM_ADMIN: 5, SECURITY_ADMIN: 4, ACCESS_AUDITOR: 3, APPROVER: 2, USER: 1,
    };
    let highest: Persona = 'USER';
    for (const g of groups) {
        const p = PERSONA_GROUP_MAP[g];
        if (p && ranks[p] > ranks[highest]) highest = p;
    }
    return highest;
}

// ─── Sub-tab: Users ───────────────────────────────────────────────────────────

const UsersTab: React.FC<{
    users: MockUser[];
    groups: MockGroup[];
    onUpdateMembership: (userId: string, groups: string[]) => void;
}> = ({ users, groups, onUpdateMembership }) => {
    const [search, setSearch] = useState('');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    const filtered = useMemo(() =>
        users.filter(u =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        ), [users, search]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search users..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 h-9 text-sm"
                />
            </div>

            <div className="space-y-2">
                {filtered.map(user => {
                    const persona = userPersonaFromGroups(user.groups);
                    const isExpanded = expandedUser === user.id;

                    return (
                        <div key={user.id} className={`rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-primary/30 bg-primary/[0.03]' : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'}`}>
                            {/* Row */}
                            <div
                                className="flex items-center gap-4 p-4 cursor-pointer"
                                onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                            >
                                <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary shrink-0">
                                    {user.initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge className={`text-[10px] flex items-center gap-1 border px-2 py-0.5 ${PERSONA_BADGE_CLASS[persona]}`}>
                                        {PERSONA_ICON_MAP[persona]}
                                        {PERSONA_LABELS[persona]}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground opacity-50">{user.groups.length} groups</span>
                                    <ChevronRight size={14} className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                            </div>

                            {/* Expanded: group membership editor */}
                            {isExpanded && (
                                <div className="px-4 pb-4 border-t border-white/5 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Group Membership</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {groups.map(group => {
                                            const isMember = user.groups.includes(group.id);
                                            const grantedPersona = PERSONA_GROUP_MAP[group.id];
                                            return (
                                                <div
                                                    key={group.id}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isMember ? 'border-primary/30 bg-primary/5' : 'border-white/5 hover:bg-white/5'}`}
                                                    onClick={() => {
                                                        const next = isMember
                                                            ? user.groups.filter(g => g !== group.id)
                                                            : [...user.groups, group.id];
                                                        onUpdateMembership(user.id, next);
                                                    }}
                                                >
                                                    <Checkbox checked={isMember} className="pointer-events-none shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium truncate">{group.name}</p>
                                                        {grantedPersona && (
                                                            <p className="text-[10px] text-muted-foreground opacity-60">
                                                                Grants: {PERSONA_LABELS[grantedPersona]}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground opacity-50 text-sm">
                        No users match your search.
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Sub-tab: Groups ──────────────────────────────────────────────────────────

const GroupsTab: React.FC<{
    groups: MockGroup[];
    users: MockUser[];
    onUpdateMembership: (userId: string, groups: string[]) => void;
}> = ({ groups, users, onUpdateMembership }) => {
    const [search, setSearch] = useState('');
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    const filtered = useMemo(() =>
        groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase())),
        [groups, search]
    );

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search groups..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10 h-9 text-sm"
                />
            </div>

            <div className="space-y-2">
                {filtered.map(group => {
                    const members = users.filter(u => u.groups.includes(group.id));
                    const grantedPersona = PERSONA_GROUP_MAP[group.id];
                    const isExpanded = expandedGroup === group.id;

                    return (
                        <div key={group.id} className={`rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-primary/30 bg-primary/[0.03]' : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'}`}>
                            {/* Row */}
                            <div
                                className="flex items-center gap-4 p-4 cursor-pointer"
                                onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                            >
                                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground shrink-0">
                                    <Shield size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{group.name}</p>
                                    <p className="text-[10px] font-mono text-muted-foreground opacity-50 truncate">{group.id}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {grantedPersona && (
                                        <Badge className={`text-[10px] flex items-center gap-1 border px-2 py-0.5 ${PERSONA_BADGE_CLASS[grantedPersona]}`}>
                                            {PERSONA_ICON_MAP[grantedPersona]}
                                            {PERSONA_LABELS[grantedPersona]}
                                        </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground opacity-50">{members.length} members</span>
                                    <ChevronRight size={14} className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </div>
                            </div>

                            {/* Expanded: member editor */}
                            {isExpanded && (
                                <div className="px-4 pb-4 border-t border-white/5 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Members</p>
                                    <div className="space-y-2">
                                        {users.map(user => {
                                            const isMember = user.groups.includes(group.id);
                                            return (
                                                <div
                                                    key={user.id}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isMember ? 'border-primary/30 bg-primary/5' : 'border-white/5 hover:bg-white/5'}`}
                                                    onClick={() => {
                                                        const next = isMember
                                                            ? user.groups.filter(g => g !== group.id)
                                                            : [...user.groups, group.id];
                                                        onUpdateMembership(user.id, next);
                                                    }}
                                                >
                                                    <Checkbox checked={isMember} className="pointer-events-none shrink-0" />
                                                    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary shrink-0">
                                                        {user.initials}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium truncate">{user.name}</p>
                                                        <p className="text-[10px] text-muted-foreground opacity-60 truncate">{user.email}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground opacity-50 text-sm">
                        No groups match your search.
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Sub-tab: Persona Assignments ─────────────────────────────────────────────

const PersonaAssignmentsTab: React.FC<{
    groups: MockGroup[];
    users: MockUser[];
    personaGroupMap: Record<string, Persona>;
    onAssignGroupToPersona: (groupId: string, persona: Persona | null) => void;
}> = ({ groups, users, personaGroupMap, onAssignGroupToPersona }) => {
    const [selected, setSelected] = useState<Persona>('SECURITY_ADMIN');

    const currentGroups = useMemo(() =>
        groups.filter(g => personaGroupMap[g.id] === selected),
        [groups, personaGroupMap, selected]
    );

    const availableGroups = useMemo(() =>
        groups.filter(g => !personaGroupMap[g.id]),
        [groups, personaGroupMap]
    );

    const persona = ASSIGNABLE_PERSONAS.find(p => p.value === selected)!;

    const membersOfGroup = (groupId: string) => users.filter(u => u.groups.includes(groupId));

    return (
        <div className="space-y-6">
            {/* Persona selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ASSIGNABLE_PERSONAS.map(p => (
                    <button
                        key={p.value}
                        onClick={() => setSelected(p.value)}
                        className={`text-left p-4 rounded-xl border transition-all duration-200 ${selected === p.value
                            ? 'border-primary/40 bg-primary/5 shadow-[inset_0_0_20px_rgba(88,166,255,0.05)]'
                            : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]'
                            }`}
                    >
                        <div className={`flex items-center gap-2 font-bold text-sm mb-1 ${p.color}`}>
                            {PERSONA_ICON_MAP[p.value]}
                            {p.label}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>
                        <div className="mt-2 text-[10px] font-bold text-muted-foreground opacity-40">
                            {personaToGroupIds[p.value]?.length ?? 0} granting group{(personaToGroupIds[p.value]?.length ?? 0) !== 1 ? 's' : ''}
                        </div>
                    </button>
                ))}
            </div>

            {/* Info callout */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-sm">
                <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
                <div className="text-muted-foreground">
                    <span className="font-semibold text-blue-400">Note: </span>
                    The <span className="font-semibold text-foreground">Approver</span> persona is granted dynamically when a group or individual is assigned as an approver of a data object — not managed here.
                    Use the <span className="font-semibold text-foreground">Data Approvers</span> tab to configure those assignments.
                </div>
            </div>

            {/* Currently assigned groups */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Groups Granting {persona.label}
                    </h4>
                    <Badge className={`text-[10px] border px-2 ${PERSONA_BADGE_CLASS[selected]}`}>
                        {currentGroups.length} group{currentGroups.length !== 1 ? 's' : ''}
                    </Badge>
                </div>

                <div className="space-y-2 mb-4">
                    {currentGroups.length === 0 && (
                        <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-sm text-muted-foreground opacity-50">
                            No groups assigned to this persona yet.
                        </div>
                    )}
                    {currentGroups.map(group => {
                        const members = membersOfGroup(group.id);
                        return (
                            <div key={group.id} className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/[0.03]">
                                <Shield size={14} className="text-primary shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{group.name}</p>
                                    <p className="text-[10px] font-mono text-muted-foreground opacity-50">{group.id}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-muted-foreground opacity-60">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                                        onClick={() => onAssignGroupToPersona(group.id, null)}
                                        title="Remove persona assignment"
                                    >
                                        <X size={12} />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Add group from unassigned */}
                {availableGroups.length > 0 && (
                    <div>
                        <h5 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                            Add Unassigned Group
                        </h5>
                        <div className="space-y-2">
                            {availableGroups.map(group => (
                                <div key={group.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/5 hover:bg-white/[0.03] transition-all">
                                    <Shield size={14} className="text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{group.name}</p>
                                        <p className="text-[10px] font-mono text-muted-foreground opacity-50">{group.id}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-primary hover:bg-primary/10 shrink-0"
                                        onClick={() => onAssignGroupToPersona(group.id, selected)}
                                    >
                                        <Plus size={12} className="mr-1" />
                                        Assign
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Root Component ───────────────────────────────────────────────────────────

const UserGroupManagement: React.FC = () => {
    const [users, setUsers] = useState<MockUser[]>([...MOCK_USERS]);
    const [groups] = useState<MockGroup[]>(MOCK_IDENTITIES.groups);
    const [personaMap, setPersonaMap] = useState<Record<string, Persona>>({ ...PERSONA_GROUP_MAP });
    const [dirtyUsers, setDirtyUsers] = useState(false);
    const [dirtyPersonas, setDirtyPersonas] = useState(false);

    const handleUpdateMembership = (userId: string, newGroups: string[]) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, groups: newGroups } : u));
        setDirtyUsers(true);
    };

    const handleAssignGroupToPersona = (groupId: string, persona: Persona | null) => {
        setPersonaMap(prev => {
            const next = { ...prev };
            if (persona === null) {
                delete next[groupId];
            } else {
                next[groupId] = persona;
            }
            return next;
        });
        setDirtyPersonas(true);
    };

    const handleSave = () => {
        // In a real app this would call an API. In mock mode we just show success.
        setDirtyUsers(false);
        setDirtyPersonas(false);
        toast.success('Changes saved successfully.', {
            description: 'User memberships and persona assignments have been updated.',
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 px-1">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1 px-2 rounded-md bg-primary/20 border border-primary/20">
                            <UserCog size={12} className="text-primary" />
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/70 italic">
                            Identity Management
                        </span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tighter text-foreground/90 uppercase">
                        Users &amp; Groups
                    </h2>
                    <p className="text-muted-foreground text-xs font-medium opacity-50 tracking-wider">
                        MANAGE GROUP MEMBERSHIP AND PERSONA ASSIGNMENTS
                    </p>
                </div>

                {(dirtyUsers || dirtyPersonas) && (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-amber-400">
                            <AlertCircle size={14} />
                            Unsaved changes
                        </div>
                        <Button
                            onClick={handleSave}
                            className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-primary/20"
                        >
                            <Save size={14} className="mr-2" />
                            Save Changes
                        </Button>
                    </div>
                )}
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Users', value: users.length, icon: <Users size={18} /> },
                    { label: 'Total Groups', value: groups.length, icon: <Fingerprint size={18} /> },
                    { label: 'Persona Grants', value: Object.keys(personaMap).length, icon: <Shield size={18} /> },
                ].map(stat => (
                    <div key={stat.label} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/10 text-primary">
                            {stat.icon}
                        </div>
                        <div>
                            <div className="text-2xl font-black text-foreground/90 tracking-tighter">{stat.value}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50">{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main tab panel */}
            <Card className="border-border/50 bg-background/50 shadow-2xl overflow-hidden">
                <Tabs defaultValue="users">
                    <CardHeader className="py-0 px-0 border-b border-border/50">
                        <TabsList className="w-full rounded-none border-0 bg-transparent h-auto p-0 gap-0 justify-start">
                            {[
                                { value: 'users', label: 'Users', icon: <Users size={14} /> },
                                { value: 'groups', label: 'Groups', icon: <Shield size={14} /> },
                                { value: 'personas', label: 'Persona Assignments', icon: <Crown size={14} /> },
                            ].map(tab => (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    className="rounded-none border-b-2 border-transparent px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-primary/5 transition-all flex items-center gap-2"
                                >
                                    {tab.icon}
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </CardHeader>

                    <CardContent className="p-6">
                        <TabsContent value="users" className="mt-0 focus-visible:outline-none">
                            <UsersTab users={users} groups={groups} onUpdateMembership={handleUpdateMembership} />
                        </TabsContent>
                        <TabsContent value="groups" className="mt-0 focus-visible:outline-none">
                            <GroupsTab groups={groups} users={users} onUpdateMembership={handleUpdateMembership} />
                        </TabsContent>
                        <TabsContent value="personas" className="mt-0 focus-visible:outline-none">
                            <PersonaAssignmentsTab
                                groups={groups}
                                users={users}
                                personaGroupMap={personaMap}
                                onAssignGroupToPersona={handleAssignGroupToPersona}
                            />
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    );
};

export default UserGroupManagement;
