'use client';

import React, { ReactNode } from 'react';
import { AuthContext, useAuthProvider } from '@/hooks/useAuth';

const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export default AuthProvider;

