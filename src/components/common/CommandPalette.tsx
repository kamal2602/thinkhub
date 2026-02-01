import { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, Clock, Star, Settings, FileText, Package, Users, TrendingUp } from 'lucide-react';
import { useEngines } from '../../hooks/useEngines';
import { WORKSPACES, getWorkspacePages } from '../../config/workspaces';
import { useAuth } from '../../contexts/AuthContext';
import { filterPagesByRoleAndEngine } from '../../lib/engineHelpers';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: any;
  action: () => void;
  keywords?: string[];
  category: 'navigation' | 'actions' | 'recent';
}

export function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { engines, isEnabled } = useEngines();
  const { userRole, isSuperAdmin } = useAuth();

  const commands: CommandItem[] = WORKSPACES.flatMap(workspace => {
    if (workspace.requiredEngine && !isEnabled(workspace.requiredEngine)) {
      return [];
    }

    if (workspace.requiredRoles && !isSuperAdmin && userRole) {
      if (!workspace.requiredRoles.includes(userRole)) {
        return [];
      }
    }

    const allPages = getWorkspacePages(workspace);
    const filteredPages = filterPagesByRoleAndEngine(allPages, userRole, isSuperAdmin, engines);

    return filteredPages.map(page => ({
      id: `nav-${page.page}`,
      label: page.name,
      description: `${workspace.name} → ${page.name}`,
      icon: workspace.icon,
      action: () => onNavigate(`/${page.page}`),
      keywords: [workspace.name.toLowerCase(), page.name.toLowerCase(), page.page],
      category: 'navigation' as const,
    }));
  });

  const filteredCommands = search
    ? commands.filter((cmd) => {
        const searchLower = search.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(searchLower) ||
          cmd.description?.toLowerCase().includes(searchLower) ||
          cmd.keywords?.some((k) => k.toLowerCase().includes(searchLower))
        );
      })
    : commands;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            handleClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  const handleClose = () => {
    setSearch('');
    setSelectedIndex(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for commands or navigate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-lg outline-none"
          />
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">Esc</kbd>
            <span>to close</span>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No commands found</p>
            </div>
          ) : (
            <div className="py-2">
              {filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      handleClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                      selectedIndex === index
                        ? 'bg-blue-50 border-l-4 border-blue-600'
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      selectedIndex === index ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{cmd.label}</p>
                      {cmd.description && (
                        <p className="text-sm text-gray-500 truncate">{cmd.description}</p>
                      )}
                    </div>
                    {selectedIndex === index && (
                      <ArrowRight className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white rounded border border-gray-300">↑</kbd>
              <kbd className="px-2 py-1 bg-white rounded border border-gray-300">↓</kbd>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white rounded border border-gray-300">Enter</kbd>
              <span>to select</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
