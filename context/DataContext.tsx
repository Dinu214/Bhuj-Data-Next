'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useDatabase } from '@/hooks/useDatabase';

type DataContextType = ReturnType<typeof useDatabase>;

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const db = useDatabase();
  return <DataContext.Provider value={db}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

