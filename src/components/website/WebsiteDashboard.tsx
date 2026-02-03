import { useEffect, useState } from 'react';
import { Globe, FileText, Menu, Settings, Eye, Edit3, ExternalLink } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { websiteService, Page, NavigationMenu } from '../../services/websiteService';
import { useToast } from '../../contexts/ToastContext';

export function WebsiteDashboard() {
  const { currentCompany } = useCompany();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
  });
  const [recentPages, setRecentPages] = useState<Page[]>([]);
  const [menus, setMenus] = useState<NavigationMenu[]>([]);

  useEffect(() => {
    if (currentCompany) {
      loadDashboardData();
    }
  }, [currentCompany]);

  const loadDashboardData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const [statsData, pagesData, menusData] = await Promise.allSettled([
        websiteService.getPageStats(currentCompany.id),
        websiteService.getPages(currentCompany.id),
        websiteService.getMenus(currentCompany.id),
      ]);

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      } else {
        console.error('Failed to load stats:', statsData.reason);
      }

      if (pagesData.status === 'fulfilled') {
        setRecentPages(pagesData.value.slice(0, 5));
      } else {
        console.error('Failed to load pages:', pagesData.reason);
      }

      if (menusData.status === 'fulfilled') {
        setMenus(menusData.value);
      } else {
        console.error('Failed to load menus:', menusData.reason);
      }
    } catch (error) {
      addToast('Failed to load website dashboard', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPublicUrl = (slug: string) => {
    return `/site/${currentCompany?.id}/${slug}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading website dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website</h1>
          <p className="text-gray-600 mt-1">Manage your public website content</p>
        </div>
        <Globe className="h-8 w-8 text-teal-600" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pages</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.published}</p>
            </div>
            <Eye className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Drafts</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.draft}</p>
            </div>
            <Edit3 className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Pages */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Pages</h2>
          </div>
          <div className="p-6">
            {recentPages.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No pages yet</p>
                <p className="text-sm text-gray-500 mt-1">Create your first page to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPages.map((page) => (
                  <div key={page.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{page.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500">/{page.slug}</p>
                        {page.status === 'published' ? (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">
                            Draft
                          </span>
                        )}
                      </div>
                    </div>
                    {page.status === 'published' && (
                      <a
                        href={getPublicUrl(page.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 p-2 text-gray-400 hover:text-teal-600 transition-colors"
                        title="View page"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menus */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Navigation Menus</h2>
          </div>
          <div className="p-6">
            {menus.length === 0 ? (
              <div className="text-center py-8">
                <Menu className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No menus yet</p>
                <p className="text-sm text-gray-500 mt-1">Create a menu to organize your pages</p>
              </div>
            ) : (
              <div className="space-y-3">
                {menus.map((menu) => (
                  <div key={menu.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{menu.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{menu.location}</p>
                    </div>
                    <div>
                      {menu.is_active ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Ready to build your website?</h3>
            <p className="mt-1 text-teal-100">Create pages, set up navigation, and publish your site</p>
          </div>
          <Settings className="h-8 w-8 text-teal-100" />
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => window.location.hash = '#/website-pages'}
            className="px-4 py-2 bg-white text-teal-600 rounded-lg font-medium hover:bg-teal-50 transition-colors"
          >
            Manage Pages
          </button>
          <button
            onClick={() => window.location.hash = '#/website-menus'}
            className="px-4 py-2 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 transition-colors"
          >
            Manage Menus
          </button>
          <button
            onClick={() => window.location.hash = '#/website-settings'}
            className="px-4 py-2 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 transition-colors"
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
