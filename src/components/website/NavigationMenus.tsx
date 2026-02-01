import { useEffect, useState } from 'react';
import { Menu, Plus, Edit, Trash2, ChevronDown, ChevronRight, GripVertical, X, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { websiteService, NavigationMenu, NavigationItem, CreateMenuInput, CreateNavItemInput, Page } from '../../services/websiteService';
import { useToast } from '../../contexts/ToastContext';

export function NavigationMenus() {
  const { currentCompany } = useCompany();
  const { addToast } = useToast();
  const [menus, setMenus] = useState<NavigationMenu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<NavigationMenu | null>(null);
  const [menuItems, setMenuItems] = useState<NavigationItem[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<NavigationMenu | null>(null);
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);

  // Form state
  const [menuFormData, setMenuFormData] = useState({
    name: '',
    location: 'header' as 'header' | 'footer' | 'sidebar',
    is_active: true,
  });

  const [itemFormData, setItemFormData] = useState({
    label: '',
    link_type: 'page' as 'page' | 'external',
    target_slug: '',
    external_url: '',
  });

  useEffect(() => {
    if (currentCompany) {
      loadData();
    }
  }, [currentCompany]);

  useEffect(() => {
    if (selectedMenu) {
      loadMenuItems(selectedMenu.id);
    }
  }, [selectedMenu]);

  const loadData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const [menusData, pagesData] = await Promise.all([
        websiteService.getMenus(currentCompany.id),
        websiteService.getPages(currentCompany.id),
      ]);

      setMenus(menusData);
      setPages(pagesData);

      if (menusData.length > 0 && !selectedMenu) {
        setSelectedMenu(menusData[0]);
      }
    } catch (error) {
      addToast('Failed to load menus', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async (menuId: string) => {
    try {
      const items = await websiteService.getNavigationItems(menuId);
      setMenuItems(items);
    } catch (error) {
      addToast('Failed to load menu items', 'error');
      console.error(error);
    }
  };

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;

    try {
      if (editingMenu) {
        await websiteService.updateMenu(currentCompany.id, editingMenu.id, menuFormData);
        addToast('Menu updated successfully', 'success');
      } else {
        const newMenu = await websiteService.createMenu(currentCompany.id, menuFormData);
        setSelectedMenu(newMenu);
        addToast('Menu created successfully', 'success');
      }

      resetMenuForm();
      loadData();
    } catch (error: any) {
      addToast(error.message || 'Failed to save menu', 'error');
      console.error(error);
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenu) return;

    try {
      const input: CreateNavItemInput = {
        menu_id: selectedMenu.id,
        label: itemFormData.label,
        target_slug: itemFormData.link_type === 'page' ? itemFormData.target_slug : undefined,
        external_url: itemFormData.link_type === 'external' ? itemFormData.external_url : undefined,
        sort_order: menuItems.length,
      };

      if (editingItem) {
        await websiteService.updateNavigationItem(editingItem.id, input);
        addToast('Menu item updated successfully', 'success');
      } else {
        await websiteService.createNavigationItem(input);
        addToast('Menu item created successfully', 'success');
      }

      resetItemForm();
      loadMenuItems(selectedMenu.id);
    } catch (error: any) {
      addToast(error.message || 'Failed to save menu item', 'error');
      console.error(error);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!currentCompany) return;
    if (!confirm('Are you sure you want to delete this menu? All menu items will be deleted.')) return;

    try {
      await websiteService.deleteMenu(currentCompany.id, id);
      addToast('Menu deleted successfully', 'success');
      setSelectedMenu(null);
      loadData();
    } catch (error: any) {
      addToast(error.message || 'Failed to delete menu', 'error');
      console.error(error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      await websiteService.deleteNavigationItem(id);
      addToast('Menu item deleted successfully', 'success');
      if (selectedMenu) {
        loadMenuItems(selectedMenu.id);
      }
    } catch (error: any) {
      addToast(error.message || 'Failed to delete menu item', 'error');
      console.error(error);
    }
  };

  const handleEditMenu = (menu: NavigationMenu) => {
    setEditingMenu(menu);
    setMenuFormData({
      name: menu.name,
      location: menu.location,
      is_active: menu.is_active,
    });
    setShowMenuForm(true);
  };

  const handleEditItem = (item: NavigationItem) => {
    setEditingItem(item);
    setItemFormData({
      label: item.label,
      link_type: item.target_slug ? 'page' : 'external',
      target_slug: item.target_slug || '',
      external_url: item.external_url || '',
    });
    setShowItemForm(true);
  };

  const resetMenuForm = () => {
    setMenuFormData({
      name: '',
      location: 'header',
      is_active: true,
    });
    setEditingMenu(null);
    setShowMenuForm(false);
  };

  const resetItemForm = () => {
    setItemFormData({
      label: '',
      link_type: 'page',
      target_slug: '',
      external_url: '',
    });
    setEditingItem(null);
    setShowItemForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading navigation menus...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Navigation Menus</h1>
          <p className="text-gray-600 mt-1">Manage your website navigation</p>
        </div>
        <button
          onClick={() => setShowMenuForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Menu
        </button>
      </div>

      {/* Menu Form */}
      {showMenuForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingMenu ? 'Edit Menu' : 'Create New Menu'}
            </h2>
            <button onClick={resetMenuForm} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleMenuSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Menu Name *
              </label>
              <input
                type="text"
                value={menuFormData.name}
                onChange={(e) => setMenuFormData({ ...menuFormData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
                placeholder="e.g., Main Menu, Footer Links"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={menuFormData.location}
                onChange={(e) => setMenuFormData({ ...menuFormData, location: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="header">Header</option>
                <option value="footer">Footer</option>
                <option value="sidebar">Sidebar</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={menuFormData.is_active}
                onChange={(e) => setMenuFormData({ ...menuFormData, is_active: e.target.checked })}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Active (visible on website)
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                {editingMenu ? 'Update Menu' : 'Create Menu'}
              </button>
              <button
                type="button"
                onClick={resetMenuForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menus List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Menus</h2>
          </div>
          <div className="p-4">
            {menus.length === 0 ? (
              <div className="text-center py-8">
                <Menu className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No menus yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {menus.map((menu) => (
                  <div
                    key={menu.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMenu?.id === menu.id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedMenu(menu)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{menu.name}</p>
                        <p className="text-xs text-gray-500 mt-1 capitalize">{menu.location}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditMenu(menu);
                          }}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMenu(menu.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {menu.is_active ? (
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
          {selectedMenu ? (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedMenu.name} - Items
                </h2>
                <button
                  onClick={() => setShowItemForm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </div>

              {/* Item Form */}
              {showItemForm && (
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <form onSubmit={handleItemSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Label *
                      </label>
                      <input
                        type="text"
                        value={itemFormData.label}
                        onChange={(e) => setItemFormData({ ...itemFormData, label: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        required
                        placeholder="e.g., Home, About, Contact"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Link Type *
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="page"
                            checked={itemFormData.link_type === 'page'}
                            onChange={(e) => setItemFormData({ ...itemFormData, link_type: 'page' })}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Internal Page</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="external"
                            checked={itemFormData.link_type === 'external'}
                            onChange={(e) => setItemFormData({ ...itemFormData, link_type: 'external' })}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">External URL</span>
                        </label>
                      </div>
                    </div>

                    {itemFormData.link_type === 'page' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Page *
                        </label>
                        <select
                          value={itemFormData.target_slug}
                          onChange={(e) => setItemFormData({ ...itemFormData, target_slug: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select a page...</option>
                          {pages.map((page) => (
                            <option key={page.id} value={page.slug}>
                              {page.title} (/{page.slug})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          URL *
                        </label>
                        <input
                          type="url"
                          value={itemFormData.external_url}
                          onChange={(e) => setItemFormData({ ...itemFormData, external_url: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          required
                          placeholder="https://example.com"
                        />
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
                      >
                        {editingItem ? 'Update Item' : 'Add Item'}
                      </button>
                      <button
                        type="button"
                        onClick={resetItemForm}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="p-4">
                {menuItems.length === 0 ? (
                  <div className="text-center py-8">
                    <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No menu items yet</p>
                    <p className="text-sm text-gray-500 mt-1">Add links to pages or external URLs</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {menuItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{item.label}</p>
                            <p className="text-sm text-gray-500">
                              {item.target_slug ? `/${item.target_slug}` : item.external_url}
                              {item.external_url && (
                                <ExternalLink className="inline h-3 w-3 ml-1" />
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <Menu className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a menu to view and manage its items</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
