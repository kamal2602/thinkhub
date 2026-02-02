import React, { useEffect, useState } from 'react';
import { Link2, X, Plus, AlertCircle } from 'lucide-react';
import { partyService, PartyLink } from '../../services/partyService';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface PartyLinksWidgetProps {
  partyType: 'customer' | 'supplier';
  partyId: string;
  partyName?: string;
}

export function PartyLinksWidget({ partyType, partyId, partyName }: PartyLinksWidgetProps) {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [links, setLinks] = useState<PartyLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLink, setShowAddLink] = useState(false);
  const [sourceType, setSourceType] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (currentCompany) {
      loadLinks();
    }
  }, [currentCompany, partyId]);

  const loadLinks = async () => {
    if (!currentCompany) return;

    try {
      setLoading(true);
      const data = await partyService.getPartyLinks(currentCompany.id, partyType, partyId);
      setLinks(data);
    } catch (error) {
      showToast('Failed to load party links', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async () => {
    if (!currentCompany || !sourceType || !sourceId) {
      showToast('Please provide source type and source ID', 'error');
      return;
    }

    try {
      await partyService.linkToParty(
        currentCompany.id,
        sourceType,
        sourceId,
        partyType,
        partyId,
        { notes, method: 'manual' }
      );
      showToast('Link created successfully', 'success');
      setShowAddLink(false);
      setSourceType('');
      setSourceId('');
      setNotes('');
      loadLinks();
    } catch (error: any) {
      showToast(error.message || 'Failed to create link', 'error');
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    if (!currentCompany) return;

    const link = links.find((l) => l.id === linkId);
    if (!link) return;

    if (!confirm(`Remove link to ${link.source_type}?`)) return;

    try {
      await partyService.unlinkFromParty(currentCompany.id, link.source_type, link.source_id);
      showToast('Link removed successfully', 'success');
      loadLinks();
    } catch (error) {
      showToast('Failed to remove link', 'error');
    }
  };

  const getLinkMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'manual':
        return 'bg-blue-100 text-blue-800';
      case 'auto':
        return 'bg-green-100 text-green-800';
      case 'import':
        return 'bg-purple-100 text-purple-800';
      case 'suggested':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-slate-600" />
          <h3 className="font-medium text-slate-900">Unified Identity Links</h3>
        </div>
        <div className="text-sm text-slate-500">Loading links...</div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-slate-600" />
          <h3 className="font-medium text-slate-900">Unified Identity Links</h3>
        </div>
        <button
          onClick={() => setShowAddLink(!showAddLink)}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Link
        </button>
      </div>

      {links.length === 0 && !showAddLink && (
        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-slate-600">
            <p className="font-medium mb-1">No identity links found</p>
            <p className="text-slate-500">
              This contact is not linked to any other records. Link it to leads, buyer accounts,
              or other identity records to unify customer data across engines.
            </p>
          </div>
        </div>
      )}

      {showAddLink && (
        <div className="mb-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h4 className="text-sm font-medium text-slate-900 mb-3">Add New Link</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Source Type
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="">Select source type...</option>
                <option value="lead">Lead (CRM)</option>
                <option value="buyer_account">Buyer Account (Auction)</option>
                <option value="portal_user">Portal User (Customer Portal)</option>
                <option value="website_customer">Website Customer (eCommerce)</option>
                <option value="itad_project">ITAD Project</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Source ID
              </label>
              <input
                type="text"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                placeholder="UUID of the source record"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why are you linking this record?"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Create Link
              </button>
              <button
                onClick={() => {
                  setShowAddLink(false);
                  setSourceType('');
                  setSourceId('');
                  setNotes('');
                }}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-900">
                    {link.source_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getLinkMethodBadgeColor(
                      link.link_method
                    )}`}
                  >
                    {link.link_method}
                  </span>
                  {link.confidence_score && (
                    <span className="text-xs text-slate-500">
                      {Math.round(link.confidence_score * 100)}% match
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-mono mb-1">{link.source_id}</div>
                {link.notes && <div className="text-xs text-slate-600 mt-1">{link.notes}</div>}
                <div className="text-xs text-slate-400 mt-1">
                  Linked {new Date(link.linked_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleRemoveLink(link.id)}
                className="ml-2 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Remove link"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {links.length > 0 && (
        <div className="mt-3 text-xs text-slate-500">
          {links.length} {links.length === 1 ? 'record' : 'records'} linked to this contact
        </div>
      )}
    </div>
  );
}
