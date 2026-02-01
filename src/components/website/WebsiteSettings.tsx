import { useEffect, useState } from 'react';
import { Settings, Save, Palette, Code, Type } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { websiteService, WebsiteSettings as WebsiteSettingsType } from '../../services/websiteService';
import { useToast } from '../../contexts/ToastContext';

export function WebsiteSettings() {
  const { currentCompany } = useCompany();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WebsiteSettingsType | null>(null);

  const [formData, setFormData] = useState({
    site_name: '',
    logo_url: '',
    theme_color: '#3b82f6',
    custom_css: '',
    footer_text: '',
    header_html: '',
  });

  useEffect(() => {
    if (currentCompany) {
      loadSettings();
    }
  }, [currentCompany]);

  const loadSettings = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const data = await websiteService.getWebsiteSettings(currentCompany.id);

      if (data) {
        setSettings(data);
        setFormData({
          site_name: data.site_name || '',
          logo_url: data.logo_url || '',
          theme_color: data.theme_color || '#3b82f6',
          custom_css: data.custom_css || '',
          footer_text: data.footer_text || '',
          header_html: data.header_html || '',
        });
      }
    } catch (error) {
      addToast('Failed to load settings', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    setSaving(true);
    try {
      await websiteService.updateWebsiteSettings(currentCompany.id, formData);
      addToast('Settings saved successfully', 'success');
      loadSettings();
    } catch (error: any) {
      addToast(error.message || 'Failed to save settings', 'error');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website Settings</h1>
          <p className="text-gray-600 mt-1">Configure your website appearance and branding</p>
        </div>
        <Settings className="h-8 w-8 text-teal-600" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Type className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Name
              </label>
              <input
                type="text"
                value={formData.site_name}
                onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="My Company Website"
              />
              <p className="text-xs text-gray-500 mt-1">
                Displayed in the browser tab and site header
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo URL
              </label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL to your company logo image
              </p>
            </div>

            {formData.logo_url && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Logo Preview</p>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 inline-block">
                  <img
                    src={formData.logo_url}
                    alt="Logo preview"
                    className="h-12 max-w-xs object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Palette className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Appearance</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Theme Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.theme_color}
                  onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                  className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.theme_color}
                  onChange={(e) => setFormData({ ...formData, theme_color: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
                  placeholder="#3b82f6"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Main color used for buttons, links, and accents
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Footer Text
              </label>
              <textarea
                value={formData.footer_text}
                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="© 2024 My Company. All rights reserved."
              />
              <p className="text-xs text-gray-500 mt-1">
                Displayed at the bottom of every page
              </p>
            </div>
          </div>
        </div>

        {/* Advanced Customization */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Code className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Advanced Customization</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom CSS
              </label>
              <textarea
                value={formData.custom_css}
                onChange={(e) => setFormData({ ...formData, custom_css: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono text-sm"
                placeholder={`/* Custom styles */\n.my-class {\n  color: #333;\n}`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Additional CSS styles applied to all pages
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Header HTML
              </label>
              <textarea
                value={formData.header_html}
                onChange={(e) => setFormData({ ...formData, header_html: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono text-sm"
                placeholder={`<!-- Analytics, fonts, etc. -->\n<script>console.log('Custom header');</script>`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Custom HTML injected into the page head (analytics, fonts, etc.)
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Preview Section */}
      <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-lg p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview Your Site</h3>
        <p className="text-gray-600 mb-4">
          Changes will be visible on your public website once saved. Your website is accessible at:
        </p>
        <div className="bg-white rounded-lg p-3 border border-gray-200 font-mono text-sm text-gray-700">
          /site/{currentCompany?.id}/[page-slug]
        </div>
      </div>
    </div>
  );
}
