import { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../services/storage/StorageService';
import {
    computePersona,
    getCapabilities,
    type Persona,
    type PersonaCapabilities,
} from '../services/persona/PersonaService';

interface UsePersonaResult extends PersonaCapabilities {
    loading: boolean;
}

/**
 * Resolves the current user's effective persona and derived capabilities.
 *
 * Persona is computed from:
 *  1. The user's group memberships (from the auth context)
 *  2. Groups/individuals stored as approvers in the active storage backend
 *
 * This hook re-evaluates whenever the user object changes.
 */
export function usePersona(user: any): UsePersonaResult {
    const [approverGroups, setApproverGroups] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const loadApprovers = async () => {
            try {
                const approvers = await StorageService.getApprovers();
                if (!cancelled) {
                    // Flatten all assigned approver groups/individuals across all objects
                    const allApprovers = Object.values(approvers).flat();
                    setApproverGroups([...new Set(allApprovers)]);
                }
            } catch {
                // If backend is unavailable, degrade gracefully — no approver elevation
                if (!cancelled) setApproverGroups([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (user) {
            loadApprovers();
        } else {
            setApproverGroups([]);
            setLoading(false);
        }

        return () => {
            cancelled = true;
        };
    }, [user]);

    const capabilities = useMemo<PersonaCapabilities>(() => {
        if (!user) {
            return {
                persona: 'USER' as Persona,
                canViewApprover: false,
                canViewAuditLog: false,
                canViewDataApprovers: false,
                canAccessSettings: false,
                canViewUserGroupManagement: false,
            };
        }

        const userGroups: string[] = user.groups ?? [];

        // Individual approver: the user's own ID appears directly in any approver list
        const isIndividualApprover = approverGroups.includes(user.id) ||
            approverGroups.includes(user.email);

        const persona = computePersona(userGroups, approverGroups, isIndividualApprover);

        // Pass isApprover so Security Admins / Access Auditors who are ALSO approvers
        // still get the Approver tab
        const isApprover =
            userGroups.some(g => approverGroups.includes(g)) || isIndividualApprover;

        return getCapabilities(persona, isApprover);
    }, [user, approverGroups]);

    return { ...capabilities, loading };
}
