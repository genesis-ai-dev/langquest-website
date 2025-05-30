'use client';

import { createContext, useContext } from 'react';

type AuthContextType = {
  user: null;
  session: null;
  isLoading: false;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: false,
  signOut: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: null,
        session: null,
        isLoading: false,
        signOut: async () => (window.location.href = '/')
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
