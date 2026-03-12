export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  type?: string;
  initials?: string;
  provider?: string;
  groups?: string[];
  permissions?: string[];
  // Mock identity specific properties
  requiresUserSelection?: boolean;
  availableUsers?: Array<{
    id: string;
    name: string;
    email: string;
    type: string;
    initials: string;
    provider?: string;
    groups: string[];
    role: string;
    description: string;
  }>;
  requiresCredentials?: boolean;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (provider: string, credentials?: any) => Promise<User>;
  logout: () => void;
  sessionExpiring?: (data: { session: any; minutesUntilExpiry: number; message: string }) => void;
  sessionExpired?: (data: { session: any; message: string }) => void;
}
