/**
 * PersonaService
 *
 * Computes the effective persona for a given user based on:
 *  - Group membership (resolved against the active security implementation)
 *  - Individual approver assignments (overlaid from the storage backend)
 *
 * Persona hierarchy (highest wins):
 *  PLATFORM_ADMIN  → All tabs + Settings dialog
 *  SECURITY_ADMIN  → Audit Log + Data Approvers tabs
 *  ACCESS_AUDITOR  → Audit Log tab only
 *  APPROVER        → Approver tab (member of an approver group or individually assigned)
 *  USER            → Current Access + Access Request tabs (default for everyone)
 */

export type Persona =
    | 'PLATFORM_ADMIN'
    | 'SECURITY_ADMIN'
    | 'ACCESS_AUDITOR'
    | 'APPROVER'
    | 'USER';

/**
 * Groups that grant a specific persona.
 * Security implementations (mock, local, SCIM, etc.) should only honour
 * group membership for the provider they control, but here we list the
 * logical group IDs that the app understands.
 */
export const PERSONA_GROUP_MAP: Record<string, Persona> = {
    // Platform Admins
    group_platform_admins: 'PLATFORM_ADMIN',

    // Security Admins
    group_security: 'SECURITY_ADMIN',

    // Access Auditors
    group_auditors: 'ACCESS_AUDITOR',
    group_audit_admins: 'ACCESS_AUDITOR',
    group_compliance_team: 'ACCESS_AUDITOR',
};

const PERSONA_RANK: Record<Persona, number> = {
    PLATFORM_ADMIN: 5,
    SECURITY_ADMIN: 4,
    ACCESS_AUDITOR: 3,
    APPROVER: 2,
    USER: 1,
};

/**
 * Returns the highest-ranking persona for a user given their groups plus
 * whether they are individually (or via group) assigned as an approver.
 */
export function computePersona(
    userGroups: string[],
    approverGroups: string[],
    isIndividualApprover: boolean
): Persona {
    let highest: Persona = 'USER';

    const bump = (candidate: Persona) => {
        if (PERSONA_RANK[candidate] > PERSONA_RANK[highest]) {
            highest = candidate;
        }
    };

    // 1. Check group-based persona grants
    for (const group of userGroups) {
        const mapped = PERSONA_GROUP_MAP[group];
        if (mapped) bump(mapped);
    }

    // 2. Approver: user belongs to a group that has been assigned as approver
    //    OR they were individually assigned
    const isGroupApprover = userGroups.some(g => approverGroups.includes(g));
    if (isGroupApprover || isIndividualApprover) {
        bump('APPROVER');
    }

    return highest;
}

/** Tab/capability gates derived from persona */
export interface PersonaCapabilities {
    persona: Persona;
    canViewApprover: boolean;
    canViewAuditLog: boolean;
    canViewDataApprovers: boolean;
    canAccessSettings: boolean;
    /** New: Users & Groups management tab — Platform Admin + Security Admin */
    canViewUserGroupManagement: boolean;
}

export function getCapabilities(
    persona: Persona,
    /** For APPROVER: still show the Approver tab even for lower-ranked personas */
    isApprover?: boolean
): PersonaCapabilities {
    const caps: PersonaCapabilities = {
        persona,
        canViewApprover: false,
        canViewAuditLog: false,
        canViewDataApprovers: false,
        canAccessSettings: false,
        canViewUserGroupManagement: false,
    };

    switch (persona) {
        case 'PLATFORM_ADMIN':
            caps.canViewApprover = true;
            caps.canViewAuditLog = true;
            caps.canViewDataApprovers = true;
            caps.canAccessSettings = true;
            caps.canViewUserGroupManagement = true;
            break;
        case 'SECURITY_ADMIN':
            caps.canViewAuditLog = true;
            caps.canViewDataApprovers = true;
            caps.canViewUserGroupManagement = true;
            // Security Admins can also see the approver tab if they happen to be approvers
            caps.canViewApprover = !!isApprover;
            break;
        case 'ACCESS_AUDITOR':
            caps.canViewAuditLog = true;
            caps.canViewApprover = !!isApprover;
            break;
        case 'APPROVER':
            caps.canViewApprover = true;
            break;
        case 'USER':
        default:
            break;
    }

    return caps;
}

/** Human-readable persona label */
export const PERSONA_LABELS: Record<Persona, string> = {
    PLATFORM_ADMIN: 'Platform Admin',
    SECURITY_ADMIN: 'Security Admin',
    ACCESS_AUDITOR: 'Access Auditor',
    APPROVER: 'Approver',
    USER: 'User',
};
