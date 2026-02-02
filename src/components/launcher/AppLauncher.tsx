import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Settings, PackageCheck, Boxes, ShoppingBag, ShoppingCart,
  Wallet, Recycle, Users, TrendingUp, Globe, DollarSign, Gavel,
  Search, LayoutGrid, AlertCircle
} from 'lucide-react';
import { engineRegistryService, Engine } from '../../services/engineRegistryService';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Package,
  Settings,
  PackageCheck,
  Boxes,
  ShoppingBag,
  ShoppingCart,
  Wallet,
  Recycle,
  Users,
  TrendingUp,
  Globe,
  DollarSign,
  Gavel,
  LayoutGrid
};

const AppTile: React.FC<{
  engine: Engine;
  onClick: () => void;
}> = ({ engine, onClick }) => {
  const Icon = iconMap[engine.icon] || LayoutGrid;
  const isEnabled = engine.is_enabled;

  return (
    <button
      onClick={onClick}
      disabled={!isEnabled}
      className={`
        group relative p-6 rounded-lg border-2 transition-all duration-200
        ${isEnabled
          ? 'bg-white border-gray-200 hover:border-blue-500 hover:shadow-lg cursor-pointer'
          : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
        }
      `}
    >
      <div className="flex flex-col items-center text-center space-y-3">
        <div className={`
          p-4 rounded-full transition-colors
          ${isEnabled
            ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
            : 'bg-gray-100 text-gray-400'
          }
        `}>
          <Icon className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className={`font-semibold text-lg ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
            {engine.title}
          </h3>
          <p className={`text-sm ${isEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
            {engine.description || 'No description available'}
          </p>
        </div>

        <div className="mt-2">
          {isEnabled ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Enabled
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
              Disabled
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export const AppLauncher: React.FC = () => {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [engines, setEngines] = useState<Engine[]>([]);
  const [filteredEngines, setFilteredEngines] = useState<Engine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngines();
  }, [currentCompany?.id]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEngines(engines);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = engines.filter(
        engine =>
          engine.title.toLowerCase().includes(query) ||
          engine.description?.toLowerCase().includes(query) ||
          engine.key.toLowerCase().includes(query)
      );
      setFilteredEngines(filtered);
    }
  }, [searchQuery, engines]);

  const loadEngines = async () => {
    if (!currentCompany?.id) return;

    try {
      setLoading(true);
      const installedEngines = await engineRegistryService.getInstalledEngines(currentCompany.id);
      setEngines(installedEngines);
      setFilteredEngines(installedEngines);
    } catch (error) {
      console.error('Error loading engines:', error);
      showToast('Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTileClick = (engine: Engine) => {
    if (!engine.is_enabled) {
      navigate('/apps', { state: { highlightEngine: engine.key } });
      showToast(`${engine.title} is disabled. Enable it in Apps to use it.`, 'info');
      return;
    }

    if (engine.workspace_route) {
      navigate(engine.workspace_route);
    } else {
      showToast(`${engine.title} does not have a workspace route configured`, 'warning');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Applications</h1>
          <p className="text-gray-600">Select an application to get started</p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredEngines.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try a different search term' : 'No applications are installed'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEngines.map((engine) => (
              <AppTile
                key={engine.id}
                engine={engine}
                onClick={() => handleTileClick(engine)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
