import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, Smartphone, Star, StarOff, User } from 'lucide-react';
import { contactService } from '../../services/contactService';
import type { Database } from '../../lib/database.types';

type Contact = Database['public']['Tables']['contacts']['Row'];

interface CustomerContactsProps {
  customerId: string;
  canEdit: boolean;
}

export function CustomerContacts({ customerId, canEdit }: CustomerContactsProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    mobile: '',
    role: '',
    department: '',
    is_primary: false,
    is_billing: false,
    is_shipping: false,
    notes: '',
  });

  useEffect(() => {
    fetchContacts();
  }, [customerId]);

  const fetchContacts = async () => {
    try {
      const data = await contactService.getByCustomer(customerId);
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await contactService.update(editingContact.id, formData);
      } else {
        await contactService.create({
          customer_id: customerId,
          ...formData,
        });
      }
      await fetchContacts();
      closeModal();
    } catch (error: any) {
      alert('Error saving contact: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await contactService.delete(id);
      await fetchContacts();
    } catch (error: any) {
      alert('Error deleting contact: ' + error.message);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      await contactService.setPrimary(id, customerId);
      await fetchContacts();
    } catch (error: any) {
      alert('Error setting primary contact: ' + error.message);
    }
  };

  const openModal = (contact?: Contact) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        full_name: contact.full_name,
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        role: contact.role || '',
        department: contact.department || '',
        is_primary: contact.is_primary || false,
        is_billing: contact.is_billing || false,
        is_shipping: contact.is_shipping || false,
        notes: contact.notes || '',
      });
    } else {
      setEditingContact(null);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        mobile: '',
        role: '',
        department: '',
        is_primary: false,
        is_billing: false,
        is_shipping: false,
        notes: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingContact(null);
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading contacts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Contacts</h3>
        {canEdit && (
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No contacts added yet</p>
          {canEdit && (
            <button
              onClick={() => openModal()}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Add your first contact
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{contact.full_name}</h4>
                    {contact.is_primary && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  {contact.role && (
                    <p className="text-sm text-gray-600">{contact.role}</p>
                  )}
                  {contact.department && (
                    <p className="text-xs text-gray-500">{contact.department}</p>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    {!contact.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(contact.id)}
                        className="p-1 text-gray-400 hover:text-yellow-500"
                        title="Set as primary"
                      >
                        <StarOff className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openModal(contact)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${contact.email}`} className="hover:text-blue-600">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    {contact.phone}
                  </div>
                )}
                {contact.mobile && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Smartphone className="w-4 h-4" />
                    {contact.mobile}
                  </div>
                )}
              </div>

              {(contact.is_billing || contact.is_shipping) && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                  {contact.is_billing && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                      Billing
                    </span>
                  )}
                  {contact.is_shipping && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      Shipping
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile</label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g., CEO, CFO, Purchasing Manager"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g., Finance, IT, Operations"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_primary}
                      onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Primary Contact</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_billing}
                      onChange={(e) => setFormData({ ...formData, is_billing: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Billing Contact</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_shipping}
                      onChange={(e) => setFormData({ ...formData, is_shipping: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Shipping Contact</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingContact ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
