import React, { useState, useEffect } from 'react';
import { Search, Users, Building2, Link2, ChevronRight, Filter, UserCircle, Plus, X } from 'lucide-react';
import { contactService, Contact } from '../../services/contactService';
import { PartyLinksWidget } from '../common/PartyLinksWidget';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

export function PartyDirectory() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'company' | 'individual' | 'customer' | 'vendor'>('all');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    type: 'customer' as 'supplier' | 'customer' | 'both',
    email: '',
    phone: '',
    website: '',
    tax_id: '',
  });

  useEffect(() => {
    if (currentCompany) {
      loadContacts();
    }
  }, [currentCompany, searchTerm, filterType]);

  const loadContacts = async () => {
    if (!currentCompany) return;

    try {
      setLoading(true);

      let options: any = {
        search: searchTerm || undefined,
        limit: 100,
      };

      if (filterType === 'company' || filterType === 'individual') {
        options.type = filterType;
      } else if (filterType === 'customer' || filterType === 'vendor') {
        options.role = filterType;
      }

      const result = await contactService.getContacts(currentCompany.id, options);
      setContacts(result.contacts);
    } catch (error) {
      showToast('Failed to load contacts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleCreateContact = async () => {
    if (!currentCompany || !newContact.name) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    try {
      await contactService.createContact(currentCompany.id, newContact);
      showToast('Contact created successfully', 'success');
      setShowAddModal(false);
      setNewContact({
        name: '',
        type: 'customer',
        email: '',
        phone: '',
        website: '',
        tax_id: '',
      });
      loadContacts();
    } catch (error) {
      showToast('Failed to create contact', 'error');
    }
  };

  const getRoleBadges = (roles?: string[]) => {
    if (!roles || roles.length === 0) return null;

    const roleColors: Record<string, string> = {
      customer: 'bg-blue-100 text-blue-800',
      vendor: 'bg-purple-100 text-purple-800',
      carrier: 'bg-green-100 text-green-800',
      broker: 'bg-orange-100 text-orange-800',
      recycler: 'bg-teal-100 text-teal-800',
      bidder: 'bg-pink-100 text-pink-800',
    };

    return (
      <div className="flex flex-wrap gap-1">
        {roles.slice(0, 3).map((role, index) => (
          <span
            key={index}
            className={`px-2 py-0.5 text-xs rounded font-medium ${roleColors[role] || 'bg-slate-100 text-slate-800'}`}
          >
            {role}
          </span>
        ))}
        {roles.length > 3 && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-medium">
            +{roles.length - 3} more
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Contact Directory</h2>
          <p className="text-slate-600">
            Unified contact management for companies and individuals. Manage customers, vendors, and all business relationships in one place with Odoo-style hierarchy.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Contact
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Contacts</p>
              <p className="text-2xl font-bold text-slate-900">{contacts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Companies</p>
              <p className="text-2xl font-bold text-slate-900">
                {contacts.filter(c => c.type === 'company').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <UserCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Individuals</p>
              <p className="text-2xl font-bold text-slate-900">
                {contacts.filter(c => c.type === 'individual').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contacts by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Contacts</option>
            <option value="company">Companies</option>
            <option value="individual">Individuals</option>
            <option value="customer">Customers</option>
            <option value="vendor">Vendors</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Contacts</h3>
            <p className="text-sm text-slate-600 mt-1">
              {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} found
            </p>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No contacts found</p>
                <p className="text-sm text-slate-500 mt-1">
                  {searchTerm
                    ? 'Try a different search term'
                    : 'Create contacts to see them here'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                      selectedContact?.id === contact.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {contact.type === 'company' ? (
                            <Building2 className="w-4 h-4 text-blue-600" />
                          ) : (
                            <UserCircle className="w-4 h-4 text-purple-600" />
                          )}
                          <span className="font-medium text-slate-900">{contact.name}</span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                            {contact.type}
                          </span>
                        </div>
                        {contact.email && (
                          <p className="text-sm text-slate-600 mb-1">{contact.email}</p>
                        )}
                        {contact.phone && (
                          <p className="text-sm text-slate-500">{contact.phone}</p>
                        )}
                        {contact.roles && contact.roles.length > 0 && (
                          <div className="mt-2">{getRoleBadges(contact.roles)}</div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 ml-2" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Contact Details</h3>
            <p className="text-sm text-slate-600 mt-1">
              {selectedContact ? 'View contact information and relationships' : 'Select a contact to view details'}
            </p>
          </div>

          <div className="p-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
            {!selectedContact ? (
              <div className="py-12 text-center">
                <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500">Select a contact from the list to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-2">Contact Information</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-xs text-slate-500">Name</span>
                      <p className="text-sm font-medium text-slate-900">{selectedContact.name}</p>
                    </div>
                    {selectedContact.email && (
                      <div>
                        <span className="text-xs text-slate-500">Email</span>
                        <p className="text-sm text-slate-900">{selectedContact.email}</p>
                      </div>
                    )}
                    {selectedContact.phone && (
                      <div>
                        <span className="text-xs text-slate-500">Phone</span>
                        <p className="text-sm text-slate-900">{selectedContact.phone}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-slate-500">Type</span>
                      <p className="text-sm text-slate-900 capitalize">
                        {selectedContact.type}
                      </p>
                    </div>
                    {selectedContact.roles && selectedContact.roles.length > 0 && (
                      <div>
                        <span className="text-xs text-slate-500">Roles</span>
                        <div className="mt-1">{getRoleBadges(selectedContact.roles)}</div>
                      </div>
                    )}
                    {selectedContact.legal_name && (
                      <div>
                        <span className="text-xs text-slate-500">Legal Name</span>
                        <p className="text-sm text-slate-900">{selectedContact.legal_name}</p>
                      </div>
                    )}
                    {selectedContact.tax_id && (
                      <div>
                        <span className="text-xs text-slate-500">Tax ID</span>
                        <p className="text-sm text-slate-900">{selectedContact.tax_id}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-slate-500">Contact ID</span>
                      <p className="text-xs font-mono text-slate-600">{selectedContact.id}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    This contact is managed in the unified contact system. Use the Customers or Suppliers modules to edit contact details and manage relationships.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Add New Contact</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Contact name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={newContact.type}
                  onChange={(e) => setNewContact({ ...newContact, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="url"
                  value={newContact.website}
                  onChange={(e) => setNewContact({ ...newContact, website: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tax ID</label>
                <input
                  type="text"
                  value={newContact.tax_id}
                  onChange={(e) => setNewContact({ ...newContact, tax_id: e.target.value })}
                  placeholder="Tax identification number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateContact}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
