import { useState, useEffect } from 'react';
import { Plus, Phone, Mail, Calendar as CalendarIcon, MessageSquare, CheckCircle, Clock, Edit2, Trash2 } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { crmService, ActivityWithParty, CreateActivityInput } from '../../services/crmService';
import { customerService } from '../../services/customerService';

export function Activities() {
  const { selectedCompany } = useCompany();
  const [activities, setActivities] = useState<ActivityWithParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityWithParty | null>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    party_id: '',
    activity_type: 'call',
    subject: '',
    description: '',
    due_date: '',
  });
  const [error, setError] = useState('');
  const [filterCompleted, setFilterCompleted] = useState<boolean | null>(null);
  const [filterType, setFilterType] = useState<string>('');

  const canEdit = selectedCompany?.role !== 'viewer';

  useEffect(() => {
    if (selectedCompany) {
      fetchActivities();
      fetchParties();
    }
  }, [selectedCompany, filterCompleted, filterType]);

  const fetchActivities = async () => {
    try {
      const data = await crmService.getActivities(selectedCompany!.id, {
        completed: filterCompleted !== null ? filterCompleted : undefined,
        ...(filterType && { entityType: filterType }),
      });
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParties = async () => {
    try {
      const customers = await customerService.getCustomers(selectedCompany!.id);
      setParties(customers);
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingActivity) {
        await crmService.updateActivity(editingActivity.id, selectedCompany!.id, formData);
      } else {
        await crmService.createActivity({
          company_id: selectedCompany!.id,
          ...formData,
        } as CreateActivityInput);
      }

      await fetchActivities();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleComplete = async (activityId: string) => {
    try {
      await crmService.completeActivity(activityId, selectedCompany!.id);
      await fetchActivities();
    } catch (error: any) {
      alert('Error completing activity: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
      await crmService.deleteActivity(id, selectedCompany!.id);
      await fetchActivities();
    } catch (error: any) {
      alert('Error deleting activity: ' + error.message);
    }
  };

  const openModal = (activity?: ActivityWithParty) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        party_id: activity.party_id || '',
        activity_type: activity.activity_type,
        subject: activity.subject,
        description: activity.description || '',
        due_date: activity.due_date || '',
      });
    } else {
      resetForm();
    }
    setShowModal(true);
    setError('');
  };

  const resetForm = () => {
    setEditingActivity(null);
    setFormData({
      party_id: '',
      activity_type: 'call',
      subject: '',
      description: '',
      due_date: '',
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return <Phone className="h-5 w-5 text-blue-500" />;
      case 'email':
        return <Mail className="h-5 w-5 text-green-500" />;
      case 'meeting':
        return <CalendarIcon className="h-5 w-5 text-orange-500" />;
      case 'note':
        return <MessageSquare className="h-5 w-5 text-gray-500" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActivityTypeBadge = (type: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (type) {
      case 'call':
        return `${baseClasses} bg-blue-100 text-blue-700`;
      case 'email':
        return `${baseClasses} bg-green-100 text-green-700`;
      case 'meeting':
        return `${baseClasses} bg-orange-100 text-orange-700`;
      case 'note':
        return `${baseClasses} bg-gray-100 text-gray-700`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700`;
    }
  };

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a company first.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
          <p className="text-gray-600">Track calls, emails, meetings, and notes</p>
        </div>
        {canEdit && (
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Add Activity
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilterCompleted(null)}
          className={`px-4 py-2 rounded-lg ${filterCompleted === null ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilterCompleted(false)}
          className={`px-4 py-2 rounded-lg ${filterCompleted === false ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilterCompleted(true)}
          className={`px-4 py-2 rounded-lg ${filterCompleted === true ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Completed
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="divide-y divide-gray-200">
          {activities.map((activity) => (
            <div key={activity.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {getActivityIcon(activity.activity_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={getActivityTypeBadge(activity.activity_type)}>
                      {activity.activity_type}
                    </span>
                    {activity.completed_at && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        Completed
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {activity.subject}
                  </h3>

                  {activity.party && (
                    <p className="text-sm text-gray-600 mb-1">
                      {activity.party.name}
                    </p>
                  )}

                  {activity.description && (
                    <p className="text-sm text-gray-500 mb-2">
                      {activity.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {activity.due_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due: {new Date(activity.due_date).toLocaleDateString()}
                      </div>
                    )}
                    <div>
                      Created: {new Date(activity.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex gap-2">
                    {!activity.completed_at && (
                      <button
                        onClick={() => handleComplete(activity.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Mark as complete"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => openModal(activity)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {activities.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No activities</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new activity.
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingActivity ? 'Edit Activity' : 'Add New Activity'}
              </h2>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Activity Type *
                  </label>
                  <select
                    value={formData.activity_type}
                    onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="note">Note</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact
                  </label>
                  <select
                    value={formData.party_id}
                    onChange={(e) => setFormData({ ...formData, party_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">Select a contact...</option>
                    {parties.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name} {party.email ? `(${party.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    {editingActivity ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
