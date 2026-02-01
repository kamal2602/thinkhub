import { useEffect, useState } from 'react';
import { Globe, AlertCircle, Home } from 'lucide-react';
import { websiteService, Page, NavigationMenu, NavigationItem, WebsiteSettings } from '../services/websiteService';

interface PublicSitePageProps {
  companyId: string;
  slug: string;
}

export function PublicSitePage({ companyId, slug }: PublicSitePageProps) {
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page | null>(null);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);
  const [headerMenu, setHeaderMenu] = useState<NavigationItem[]>([]);
  const [footerMenu, setFooterMenu] = useState<NavigationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPublicPage();
  }, [companyId, slug]);

  const loadPublicPage = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if website engine is enabled by trying to fetch settings
      const settingsData = await websiteService.getPublicWebsiteSettings(companyId);

      if (!settingsData) {
        setError('Website not available');
        setLoading(false);
        return;
      }

      setSettings(settingsData);

      // Fetch the published page
      const pageData = await websiteService.getPublishedPage(companyId, slug);

      if (!pageData) {
        setError('Page not found');
        setLoading(false);
        return;
      }

      setPage(pageData);

      // Fetch navigation menus
      const menus = await websiteService.getPublicMenus(companyId);

      // Load header menu
      const headerMenuData = menus.find((m) => m.location === 'header');
      if (headerMenuData) {
        const items = await websiteService.getPublicNavigationItems(headerMenuData.id);
        setHeaderMenu(items);
      }

      // Load footer menu
      const footerMenuData = menus.find((m) => m.location === 'footer');
      if (footerMenuData) {
        const items = await websiteService.getPublicNavigationItems(footerMenuData.id);
        setFooterMenu(items);
      }
    } catch (err) {
      console.error('Error loading public page:', err);
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: any) => {
    if (typeof content === 'string') {
      // If content is a string, render as HTML
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }

    if (Array.isArray(content)) {
      // If content is an array of blocks
      return (
        <div className="space-y-4">
          {content.map((block: any, index: number) => (
            <div key={index}>{JSON.stringify(block)}</div>
          ))}
        </div>
      );
    }

    // Fallback to JSON string
    return <pre className="whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>;
  };

  const getNavItemUrl = (item: NavigationItem) => {
    if (item.external_url) {
      return item.external_url;
    }
    return `/site/${companyId}/${item.target_slug}`;
  };

  const isExternalLink = (item: NavigationItem) => {
    return Boolean(item.external_url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {error === 'Page not found' ? '404 - Page Not Found' : 'Website Unavailable'}
          </h1>
          <p className="text-gray-600 mb-6">
            {error === 'Page not found'
              ? "The page you're looking for doesn't exist or hasn't been published yet."
              : 'This website is currently unavailable.'}
          </p>
          <a
            href={`/site/${companyId}/home`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Home Page
          </a>
        </div>
      </div>
    );
  }

  const themeColor = settings?.theme_color || '#3b82f6';

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Custom CSS */}
      {settings?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: settings.custom_css }} />
      )}

      {/* Header HTML */}
      {settings?.header_html && (
        <div dangerouslySetInnerHTML={{ __html: settings.header_html }} />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo / Site Name */}
            <div className="flex items-center gap-3">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.site_name || 'Logo'}
                  className="h-8 object-contain"
                />
              ) : (
                <Globe className="h-8 w-8" style={{ color: themeColor }} />
              )}
              {settings?.site_name && (
                <span className="text-xl font-bold text-gray-900">{settings.site_name}</span>
              )}
            </div>

            {/* Navigation */}
            {headerMenu.length > 0 && (
              <nav className="hidden md:flex items-center gap-6">
                {headerMenu.map((item) => (
                  <a
                    key={item.id}
                    href={getNavItemUrl(item)}
                    target={isExternalLink(item) ? '_blank' : undefined}
                    rel={isExternalLink(item) ? 'noopener noreferrer' : undefined}
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    style={{
                      color: slug === item.target_slug ? themeColor : undefined,
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Page Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-6">{page.title}</h1>

          {/* Page Meta Description */}
          {page.meta_description && (
            <p className="text-xl text-gray-600 mb-8">{page.meta_description}</p>
          )}

          {/* Page Content */}
          <div className="prose prose-lg max-w-none">
            {renderContent(page.content)}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Footer Navigation */}
          {footerMenu.length > 0 && (
            <nav className="flex flex-wrap items-center justify-center gap-6 mb-6">
              {footerMenu.map((item) => (
                <a
                  key={item.id}
                  href={getNavItemUrl(item)}
                  target={isExternalLink(item) ? '_blank' : undefined}
                  rel={isExternalLink(item) ? 'noopener noreferrer' : undefined}
                  className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}

          {/* Footer Text */}
          {settings?.footer_text && (
            <div className="text-center text-sm text-gray-600">
              {settings.footer_text}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
