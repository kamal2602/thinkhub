import { Search, Plus, Filter, ChevronDown, Command } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface SearchBarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface QuickAction {
  label: string;
  page: string;
  keywords: string[];
}

export function SearchBar({ currentPage, onNavigate }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  const quickActions: QuickAction[] = [
    { label: 'Create Purchase Order', page: 'purchases', keywords: ['po', 'purchase', 'order', 'buy'] },
    { label: 'Receive Items', page: 'smart-receiving', keywords: ['receive', 'receiving', 'scan', 'intake'] },
    { label: 'Process Asset', page: 'processing', keywords: ['process', 'test', 'repair', 'refurb'] },
    { label: 'Create Sales Invoice', page: 'sales', keywords: ['invoice', 'sell', 'sale', 'bill'] },
    { label: 'Add Customer', page: 'customers', keywords: ['customer', 'client', 'account'] },
    { label: 'Add Supplier', page: 'suppliers', keywords: ['supplier', 'vendor'] },
    { label: 'View Inventory', page: 'saleable-inventory', keywords: ['inventory', 'stock', 'items'] },
    { label: 'View Components', page: 'harvested-components', keywords: ['components', 'parts', 'harvest'] },
    { label: 'View Reports', page: 'reports', keywords: ['report', 'analytics', 'stats'] },
    { label: 'ITAD Projects', page: 'itad-projects', keywords: ['itad', 'project', 'disposal', 'compliance'] },
  ];

  const recentPages: { label: string; page: string }[] = [
    { label: 'Processing Dashboard', page: 'processing' },
    { label: 'Purchase Orders', page: 'purchases' },
    { label: 'Ready to Sell', page: 'saleable-inventory' },
  ];

  const createActions = [
    { label: 'Purchase Order', page: 'purchases' },
    { label: 'Sales Invoice', page: 'sales' },
    { label: 'ITAD Project', page: 'itad-projects' },
    { label: 'Customer', page: 'customers' },
    { label: 'Supplier', page: 'suppliers' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsSearchFocused(true);
        const searchInput = searchRef.current?.querySelector('input');
        searchInput?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredActions = searchQuery
    ? quickActions.filter((action) =>
        action.keywords.some((keyword) =>
          keyword.toLowerCase().includes(searchQuery.toLowerCase())
        ) || action.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentPages;

  const handleActionClick = (page: string) => {
    onNavigate(page);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-3">
        <div ref={searchRef} className="flex-1 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search or jump to... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded">
                <Command className="w-3 h-3 inline" />K
              </kbd>
            </div>
          </div>

          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
              {searchQuery && (
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Quick Actions
                </div>
              )}
              {!searchQuery && (
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Recent
                </div>
              )}

              {filteredActions.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No results found for "{searchQuery}"
                </div>
              )}

              {filteredActions.map((action) => (
                <button
                  key={action.page}
                  onClick={() => handleActionClick(action.page)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition flex items-center justify-between group"
                >
                  <span className="text-gray-700 group-hover:text-gray-900">{action.label}</span>
                  <span className="text-xs text-gray-400 group-hover:text-gray-600">Jump to</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={createMenuRef}>
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>

          {showCreateMenu && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                New
              </div>
              {createActions.map((action) => (
                <button
                  key={action.page}
                  onClick={() => {
                    handleActionClick(action.page);
                    setShowCreateMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <Plus className="w-4 h-4 inline mr-2 text-gray-400" />
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
