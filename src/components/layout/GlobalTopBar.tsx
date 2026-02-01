import React, { useState } from 'react';
import { Search, Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useWorkspace, WORKSPACES } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';

export function GlobalTopBar() {
  const { currentWorkspace, setCurrentWorkspace, getWorkspace } = useWorkspace();
  const { user, signOut } = useAuth();
  const { selectedCompany } = useCompany();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const workspace = getWorkspace(currentWorkspace);

  const handleWorkspaceChange = (workspaceId: string) => {
    setCurrentWorkspace(workspaceId as any);
    setShowWorkspaceMenu(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">SP</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-gray-900">{workspace?.name}</span>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showWorkspaceMenu && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Workspaces</div>
              {WORKSPACES.filter(w => w.enabled).map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleWorkspaceChange(ws.id)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-3 ${
                    ws.id === currentWorkspace ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-${ws.color}-100 flex items-center justify-center`}>
                    <span className={`text-${ws.color}-600 text-sm`}>
                      {ws.icon.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">{ws.name}</div>
                    <div className="text-xs text-gray-500">{ws.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {showNotifications && (
            <div className="absolute top-full right-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Notifications</h3>
              </div>
              <div className="p-4 text-center text-sm text-gray-500">
                No new notifications
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showProfileMenu && (
            <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-200">
                <div className="font-medium text-gray-900">{user?.email}</div>
                <div className="text-sm text-gray-500">{selectedCompany?.name || 'No company'}</div>
              </div>
              <button
                onClick={() => {
                  setCurrentWorkspace('system');
                  setShowProfileMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
