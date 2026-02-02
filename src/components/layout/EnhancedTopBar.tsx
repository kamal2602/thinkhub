import React, { useState, useEffect } from 'react';
import { Search, Bell, ChevronDown, LogOut, User, Settings, LayoutGrid, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';

export function EnhancedTopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { selectedCompany } = useCompany();
  const [showAppMenu, setShowAppMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [engines, setEngines] = useState<Engine[]>([]);
  const [currentEngine, setCurrentEngine] = useState<Engine | null>(null);

  useEffect(() => {
    loadEngines();
  }, [selectedCompany]);

  useEffect(() => {
    detectCurrentEngine();
  }, [location.pathname, engines]);

  const loadEngines = async () => {
    if (!selectedCompany) return;

    try {
      const enabledEngines = await engineRegistryService.getEnabledEngines(
        selectedCompany.id
      );
      setEngines(enabledEngines);
    } catch (error) {
      console.error('Error loading engines:', error);
    }
  };

  const detectCurrentEngine = () => {
    if (location.pathname === '/' || location.pathname === '/dashboard') {
      setCurrentEngine(null);
      return;
    }

    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) {
      setCurrentEngine(null);
      return;
    }

    const currentPath = `/${pathSegments[0]}`;
    const engine = engines.find(e => e.workspace_route === currentPath);
    setCurrentEngine(engine || null);
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent || Icons.Package;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const recentApps = engines.slice(0, 5);

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 sticky top-0 z-50 shadow-sm">
      {/* Logo & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="ThinkHub - Home"
        >
          <img
            src="/logo_without_text-1.png"
            alt="ThinkHub"
            className="w-10 h-10 rounded-lg"
          />
          <span className="text-xl font-bold bg-gradient-to-r from-rose-500 to-teal-600 bg-clip-text text-transparent">
            ThinkHub
          </span>
        </button>
      </div>

      {/* Apps Grid Button */}
      <button
        onClick={() => navigate('/')}
        className="p-2.5 rounded-lg hover:bg-rose-50 transition-colors group"
        title="All Applications"
      >
        <LayoutGrid className="w-5 h-5 text-gray-600 group-hover:text-rose-600 transition-colors" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm bg-gray-50"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-lg hover:bg-teal-50 transition-colors group"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-colors" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Notifications</h3>
                </div>
                <div className="p-8 text-center text-sm text-gray-500">
                  No new notifications
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-rose-400 to-teal-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="font-medium text-gray-900 truncate">{user?.email}</div>
                  <div className="text-sm text-gray-500 truncate">{selectedCompany?.name || 'No company'}</div>
                </div>
                <button
                  onClick={() => {
                    navigate('/settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 transition-colors"
                >
                  <Settings className="w-4 h-4 text-teal-600" />
                  Settings
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2.5 text-left hover:bg-rose-50 flex items-center gap-2 text-sm text-rose-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
