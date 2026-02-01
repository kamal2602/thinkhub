import { useEffect, useState } from 'react';
import { FileText, Plus, Edit, Trash2, Eye, EyeOff, ExternalLink, Search, X } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuth } from '../../contexts/AuthContext';
import { websiteService, Page, CreatePageInput, UpdatePageInput } from '../../services/websiteService';
import { useToast } from '../../contexts/ToastContext';

export function Pages() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    meta_description: '',
    status: 'draft' as 'draft' | 'published',
  });

  useEffect(() => {
    if (currentCompany) {
      loadPages();
    }
  }, [currentCompany]);

  const loadPages = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const data = await websiteService.getPages(currentCompany.id);
      setPages(data);
    } catch (error) {
      addToast('Failed to load pages', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !user) return;

    try {
      if (editingPage) {
        // Update existing page
        const input: UpdatePageInput = {
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          meta_description: formData.meta_description,
          status: formData.status,
        };
        await websiteService.updatePage(currentCompany.id, editingPage.id, input);
        addToast('Page updated successfully', 'success');
      } else {
        // Create new page
        const input: CreatePageInput = {
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          meta_description: formData.meta_description,
          status: formData.status,
        };
        await websiteService.createPage(currentCompany.id, user.id, input);
        addToast('Page created successfully', 'success');
      }

      resetForm();
      loadPages();
    } catch (error: any) {
      addToast(error.message || 'Failed to save page', 'error');
      console.error(error);
    }
  };

  const handleEdit = (page: Page) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: typeof page.content === 'string' ? page.content : JSON.stringify(page.content, null, 2),
      meta_description: page.meta_description || '',
      status: page.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!currentCompany) return;
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      await websiteService.deletePage(currentCompany.id, id);
      addToast('Page deleted successfully', 'success');
      loadPages();
    } catch (error: any) {
      addToast(error.message || 'Failed to delete page', 'error');
      console.error(error);
    }
  };

  const handlePublishToggle = async (page: Page) => {
    if (!currentCompany) return;

    try {
      if (page.status === 'published') {
        await websiteService.unpublishPage(currentCompany.id, page.id);
        addToast('Page unpublished', 'success');
      } else {
        await websiteService.publishPage(currentCompany.id, page.id);
        addToast('Page published', 'success');
      }
      loadPages();
    } catch (error: any) {
      addToast(error.message || 'Failed to update page status', 'error');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      meta_description: '',
      status: 'draft',
    });
    setEditingPage(null);
    setShowForm(false);
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: websiteService.generateSlug(title),
    }));
  };

  const getPublicUrl = (slug: string) => {
    return `/site/${currentCompany?.id}/${slug}`;
  };

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading pages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="text-gray-600 mt-1">Manage your website pages</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Page
        </button>
      </div>

      {/* Page Form */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingPage ? 'Edit Page' : 'Create New Page'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL Slug *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  title="Lowercase letters, numbers, and hyphens only"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use lowercase letters, numbers, and hyphens
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter HTML, Markdown, or plain text..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Supports HTML, Markdown, or structured JSON content
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Description
              </label>
              <textarea
                value={formData.meta_description}
                onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Brief description for search engines..."
                maxLength={160}
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 150-160 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                {editingPage ? 'Update Page' : 'Create Page'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search pages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {/* Pages List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Page
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No pages found</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {searchTerm ? 'Try a different search term' : 'Create your first page to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{page.title}</div>
                      {page.meta_description && (
                        <div className="text-sm text-gray-500 mt-1 truncate max-w-md">
                          {page.meta_description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">/{page.slug}</div>
                    </td>
                    <td className="px-6 py-4">
                      {page.status === 'published' ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(page.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {page.status === 'published' && (
                          <a
                            href={getPublicUrl(page.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-teal-600 transition-colors"
                            title="View page"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => handlePublishToggle(page)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title={page.status === 'published' ? 'Unpublish' : 'Publish'}
                        >
                          {page.status === 'published' ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEdit(page)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(page.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
