import React, { useState } from 'react';
import { Search, Bell, User, ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';

export function TopBar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const { user, signOut } = useAuth();
  const { selectedCompany } = useCompany();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header
      className="fixed left-0 right-0 top-0 bg-white border-b border-neutral-200 flex items-center justify-between px-6 animate-fade-in"
      style={{
        height: 'var(--topbar-height)',
        marginLeft: 'var(--sidebar-width)',
        zIndex: 'var(--z-sticky)',
      }}
    >
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-3 px-4 py-2 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors text-sm text-secondary w-96"
        >
          <Search size={18} />
          <span>Search or run a command...</span>
          <kbd className="ml-auto px-2 py-0.5 bg-white border border-neutral-200 rounded text-xs font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-neutral-50 rounded-lg transition-colors">
          <Bell size={20} className="text-neutral-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="h-8 w-px bg-neutral-200"></div>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-primary">
                {user?.email?.split('@')[0]}
              </div>
              {selectedCompany && (
                <div className="text-xs text-secondary">
                  {selectedCompany.name}
                </div>
              )}
            </div>
            <ChevronDown size={16} className="text-neutral-400" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0"
                style={{ zIndex: 'var(--z-dropdown)' }}
                onClick={() => setShowUserMenu(false)}
              />
              <div
                className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg py-2 animate-scale-in"
                style={{ zIndex: 'calc(var(--z-dropdown) + 1)' }}
              >
                <div className="px-4 py-2 border-b border-neutral-100">
                  <div className="text-sm font-medium text-primary">{user?.email}</div>
                  {selectedCompany && (
                    <div className="text-xs text-secondary mt-1">{selectedCompany.name}</div>
                  )}
                </div>

                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-50 transition-colors text-left"
                  onClick={() => {
                    setShowUserMenu(false);
                  }}
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </button>

                <div className="border-t border-neutral-100 mt-1 pt-1">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-50 transition-colors text-left text-red-600"
                    onClick={() => {
                      setShowUserMenu(false);
                      signOut();
                    }}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
