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
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 sticky top-0 z-50 shadow-sm">
      {/* Logo & Company */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center hover:shadow-md transition-shadow"
          title="Home"
        >
          <span className="text-white font-bold text-sm">SP</span>
        </button>
      </div>

      {/* Current App / App Switcher */}
      <div className="relative">
        <button
          onClick={() => setShowAppMenu(!showAppMenu)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors min-w-[140px]"
        >
          {currentEngine ? (
            <>
              {React.createElement(getIcon(currentEngine.icon), {
                className: 'w-4 h-4 text-blue-600'
              })}
              <span className="font-medium text-gray-900">{currentEngine.title}</span>
            </>
          ) : (
            <>
              <Home className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-900">Home</span>
            </>
          )}
          <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" />
        </button>

        {showAppMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowAppMenu(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase">Quick Switch</span>
                <button
                  onClick={() => {
                    navigate('/');
                    setShowAppMenu(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <button
                  onClick={() => {
                    navigate('/');
                    setShowAppMenu(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 ${
                    !currentEngine ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">Home</div>
                    <div className="text-xs text-gray-500 truncate">App launcher</div>
                  </div>
                </button>

                {recentApps.map((engine) => {
                  const Icon = getIcon(engine.icon);
                  return (
                    <button
                      key={engine.key}
                      onClick={() => {
                        if (engine.workspace_route) {
                          navigate(engine.workspace_route);
                        }
                        setShowAppMenu(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 ${
                        currentEngine?.key === engine.key ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900">{engine.title}</div>
                        {engine.description && (
                          <div className="text-xs text-gray-500 truncate">{engine.description}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Apps Grid Button */}
      <button
        onClick={() => navigate('/')}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="All Applications"
      >
        <LayoutGrid className="w-5 h-5 text-gray-600" />
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
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute top-full right-0 mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
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
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
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
              <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-200">
                  <div className="font-medium text-gray-900 truncate">{user?.email}</div>
                  <div className="text-sm text-gray-500 truncate">{selectedCompany?.name || 'No company'}</div>
                </div>
                <button
                  onClick={() => {
                    navigate('/settings');
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
