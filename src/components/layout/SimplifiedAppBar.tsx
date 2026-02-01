import { Package, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCompany } from '../../contexts/CompanyContext';
import { useEngines } from '../../hooks/useEngines';
import { WORKSPACES, getWorkspacePages, WorkspaceConfig, PageConfig } from '../../config/workspaces';
import { filterPagesByRoleAndEngine } from '../../lib/engineHelpers';

interface SimplifiedAppBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function SimplifiedAppBar({ currentPage, onNavigate }: SimplifiedAppBarProps) {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const moduleMenuRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const appSwitcherRef = useRef<HTMLDivElement>(null);
  const { userRole, isSuperAdmin } = useAuth();
  const { selectedCompany } = useCompany();
  const { engines, isEnabled, loading: enginesLoading } = useEngines();

  const filteredWorkspaces = WORKSPACES.filter(workspace => {
    if (workspace.requiredEngine && !isEnabled(workspace.requiredEngine)) {
      return false;
    }

    if (!workspace.requiredRoles) return true;
    if (isSuperAdmin) return true;
    if (!userRole) return false;
    return workspace.requiredRoles.includes(userRole);
  });

  const getFilteredPages = (workspace: WorkspaceConfig): PageConfig[] => {
    const allPages = getWorkspacePages(workspace);
    return filterPagesByRoleAndEngine(allPages, userRole, isSuperAdmin, engines);
  };

  const getCurrentWorkspace = (): WorkspaceConfig | null => {
    for (const workspace of WORKSPACES) {
      const pages = getFilteredPages(workspace);
      if (pages.some(p => p.page === currentPage)) {
        return workspace;
      }
    }
    return null;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      let clickedInsideModule = false;
      moduleMenuRefs.current.forEach((ref) => {
        if (ref && ref.contains(event.target as Node)) {
          clickedInsideModule = true;
        }
      });

      if (!clickedInsideModule) {
        setActiveModule(null);
      }

      if (appSwitcherRef.current && !appSwitcherRef.current.contains(event.target as Node)) {
        setShowAppSwitcher(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleWorkspaceClick = (workspaceId: string) => {
    const workspace = WORKSPACES.find(w => w.id === workspaceId);
    if (workspace) {
      const pages = getFilteredPages(workspace);
      if (pages.length === 1) {
        handlePageClick(pages[0].page);
      } else if (activeModule === workspaceId) {
        setActiveModule(null);
      } else {
        setActiveModule(workspaceId);
      }
    }
  };

  const handlePageClick = (page: string) => {
    onNavigate(page);
    setActiveModule(null);
    setShowAppSwitcher(false);
  };

  const currentWorkspace = getCurrentWorkspace();

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center h-14 px-4">
        <div className="flex items-center gap-4 mr-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">Stock Pro</span>
          </div>
        </div>

        <nav className="flex items-center gap-1 flex-1">
          {filteredWorkspaces.map((workspace) => {
            const Icon = workspace.icon;
            const isActive = currentWorkspace?.id === workspace.id;
            const pages = getFilteredPages(workspace);

            return (
              <div
                key={workspace.id}
                className="relative"
                ref={(el) => {
                  if (el) {
                    moduleMenuRefs.current.set(workspace.id, el);
                  } else {
                    moduleMenuRefs.current.delete(workspace.id);
                  }
                }}
              >
                <button
                  onClick={() => handleWorkspaceClick(workspace.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{workspace.name}</span>
                </button>

                {activeModule === workspace.id && pages.length > 1 && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                    {pages.map((page) => {
                      const isPageActive = currentPage === page.page;
                      return (
                        <button
                          key={page.page}
                          onClick={() => handlePageClick(page.page)}
                          className={`w-full px-4 py-2 text-left text-sm transition ${
                            isPageActive
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {page.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition border border-slate-200"
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden md:inline px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
