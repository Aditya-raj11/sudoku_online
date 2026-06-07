import React, { createContext, useContext } from 'react';
import { useMultiplayerSudoku } from '../hooks/useMultiplayerSudoku';

type MultiplayerContextType = ReturnType<typeof useMultiplayerSudoku>;

const MultiplayerContext = createContext<MultiplayerContextType | null>(null);

export const MultiplayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const multiplayer = useMultiplayerSudoku();
  return (
    <MultiplayerContext.Provider value={multiplayer}>
      {children}
    </MultiplayerContext.Provider>
  );
};

export function useMultiplayerContext(): MultiplayerContextType {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) {
    throw new Error('useMultiplayerContext must be used within a MultiplayerProvider');
  }
  return ctx;
}
