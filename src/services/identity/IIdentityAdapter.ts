export interface IdentityUser {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    role?: string;
    type?: string;
    initials?: string;
    provider?: string;
    groups?: string[];
    [key: string]: any;
}

export interface IdentityResponse {
    users: IdentityUser[];
    groups: IdentityUser[];
    servicePrincipals: IdentityUser[];
}

/**
 * Interface for Identity Adapters
 */
export interface IIdentityAdapter {
    name: string;
    type: string;

    /**
     * Fetch all identities (users, groups, service principals)
     * @param config - The global app configuration
     * @returns All identities
     */
    fetchIdentities(config: any): Promise<IdentityResponse>;

    /**
     * Get current authenticated user
     * @param config - The global app configuration
     * @returns Current user or null
     */
    getCurrentUser(config: any): Promise<IdentityUser | null>;

    /**
     * Login with specified provider
     * @param provider - Provider name (e.g., 'google', 'microsoft')
     * @param config - The global app configuration
     * @returns User object
     */
    login?(provider: string, config: any): Promise<IdentityUser>;

    /**
     * Logout current user
     * @param config - The global app configuration
     */
    logout?(config: any): Promise<void>;
}
