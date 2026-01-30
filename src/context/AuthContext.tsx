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
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (provider: string) => Promise<User>;
  logout: () => void;
}
