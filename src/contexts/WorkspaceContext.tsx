import React, { createContext, useContext, useState, ReactNode } from 'react';

export type WorkspaceId =
  | 'home'
  | 'recycling'
  | 'reseller'
  | 'auction'
  | 'website'
  | 'accounting'
  | 'inventory'
  | 'parties'
  | 'system';

export interface Workspace {
  id: WorkspaceId;
  name: string;
  icon: string;
  color: string;
  description: string;
  enabled: boolean;
}

export const WORKSPACES: Workspace[] = [
  { id: 'home', name: 'Home', icon: 'Home', color: 'gray', description: 'App Launcher', enabled: true },
  { id: 'recycling', name: 'Recycling', icon: 'Recycle', color: 'green', description: 'Dismantling & Classification', enabled: true },
  { id: 'reseller', name: 'Reseller', icon: 'Store', color: 'blue', description: 'Fixed-price Selling', enabled: true },
  { id: 'auction', name: 'Auction', icon: 'Gavel', color: 'purple', description: 'Live & Timed Sales', enabled: true },
  { id: 'website', name: 'Website', icon: 'Globe', color: 'indigo', description: 'CMS & Storefront', enabled: true },
  { id: 'accounting', name: 'Accounting', icon: 'Calculator', color: 'emerald', description: 'GL, Ledgers, Taxes', enabled: true },
  { id: 'inventory', name: 'Inventory', icon: 'Package', color: 'orange', description: 'Unified Stock Authority', enabled: true },
  { id: 'parties', name: 'Parties', icon: 'Users', color: 'cyan', description: 'People & Companies', enabled: true },
  { id: 'system', name: 'System', icon: 'Settings', color: 'slate', description: 'Configuration & Admin', enabled: true },
];

interface WorkspaceContextType {
  currentWorkspace: WorkspaceId;
  setCurrentWorkspace: (workspace: WorkspaceId) => void;
  getWorkspace: (id: WorkspaceId) => Workspace | undefined;
  enabledWorkspaces: Workspace[];
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceId>('home');

  const getWorkspace = (id: WorkspaceId) => {
    return WORKSPACES.find(w => w.id === id);
  };

  const enabledWorkspaces = WORKSPACES.filter(w => w.enabled);

  return (
    <WorkspaceContext.Provider value={{
      currentWorkspace,
      setCurrentWorkspace,
      getWorkspace,
      enabledWorkspaces
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
