import React, { useState, useEffect } from 'react';
import { Search, Users, Building2, Link2, ChevronRight, Filter } from 'lucide-react';
import { partyService, PartyLink } from '../../services/partyService';
import { PartyLinksWidget } from '../common/PartyLinksWidget';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';

interface Party {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  entity_type?: string;
  party_type: 'customer' | 'supplier';
  created_at: string;
}

export function PartyDirectory() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'supplier'>('all');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (currentCompany) {
      loadParties();
      loadStats();
    }
  }, [currentCompany, searchTerm, filterType]);

  const loadParties = async () => {
    if (!currentCompany) return;

    try {
      setLoading(true);
      const result = await partyService.getAllParties(currentCompany.id, {
        search: searchTerm || undefined,
        partyType: filterType === 'all' ? undefined : filterType,
        limit: 100,
      });
      setParties(result.parties);
    } catch (error) {
      showToast('Failed to load parties', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!currentCompany) return;

    try {
      const data = await partyService.getPartyLinkStats(currentCompany.id);
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSelectParty = (party: Party) => {
    setSelectedParty(party);
  };

  const getEntityTypeBadges = (entityType?: string) => {
    if (!entityType) return null;

    const types = entityType.split(',').map((t) => t.trim());
    return (
      <div className="flex flex-wrap gap-1">
        {types.slice(0, 3).map((type, index) => (
          <span
            key={index}
            className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-medium"
          >
            {type}
          </span>
        ))}
        {types.length > 3 && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-medium">
            +{types.length - 3} more
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Party Directory</h2>
        <p className="text-slate-600">
          Unified identity management for customers, suppliers, and all business relationships. Link
          records across engines to prevent identity fragmentation.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Parties</p>
                <p className="text-2xl font-bold text-slate-900">{parties.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Link2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Links</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total_links}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Linked Parties</p>
                <p className="text-2xl font-bold text-slate-900">
                  {parties.filter((p) =>
                    stats.by_source_type
                      ? Object.keys(stats.by_source_type).length > 0
                      : false
                  ).length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search parties by name, email, or phone..."
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
            <option value="all">All Parties</option>
            <option value="customer">Customers Only</option>
            <option value="supplier">Suppliers Only</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Parties List</h3>
            <p className="text-sm text-slate-600 mt-1">
              {parties.length} {parties.length === 1 ? 'party' : 'parties'} found
            </p>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading parties...</div>
            ) : parties.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No parties found</p>
                <p className="text-sm text-slate-500 mt-1">
                  {searchTerm
                    ? 'Try a different search term'
                    : 'Create customers or suppliers to see them here'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {parties.map((party) => (
                  <button
                    key={party.id}
                    onClick={() => handleSelectParty(party)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                      selectedParty?.id === party.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {party.party_type === 'customer' ? (
                            <Users className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Building2 className="w-4 h-4 text-purple-600" />
                          )}
                          <span className="font-medium text-slate-900">{party.name}</span>
                        </div>
                        {party.email && (
                          <p className="text-sm text-slate-600 mb-1">{party.email}</p>
                        )}
                        {party.phone && (
                          <p className="text-sm text-slate-500">{party.phone}</p>
                        )}
                        {party.entity_type && (
                          <div className="mt-2">{getEntityTypeBadges(party.entity_type)}</div>
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
            <h3 className="font-semibold text-slate-900">Party Details</h3>
            <p className="text-sm text-slate-600 mt-1">
              {selectedParty ? 'View and manage identity links' : 'Select a party to view details'}
            </p>
          </div>

          <div className="p-4 overflow-y-auto" style={{ maxHeight: '600px' }}>
            {!selectedParty ? (
              <div className="py-12 text-center">
                <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500">Select a party from the list to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-2">Party Information</h4>
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-xs text-slate-500">Name</span>
                      <p className="text-sm font-medium text-slate-900">{selectedParty.name}</p>
                    </div>
                    {selectedParty.email && (
                      <div>
                        <span className="text-xs text-slate-500">Email</span>
                        <p className="text-sm text-slate-900">{selectedParty.email}</p>
                      </div>
                    )}
                    {selectedParty.phone && (
                      <div>
                        <span className="text-xs text-slate-500">Phone</span>
                        <p className="text-sm text-slate-900">{selectedParty.phone}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-slate-500">Type</span>
                      <p className="text-sm text-slate-900 capitalize">
                        {selectedParty.party_type}
                      </p>
                    </div>
                    {selectedParty.entity_type && (
                      <div>
                        <span className="text-xs text-slate-500">Roles</span>
                        <div className="mt-1">{getEntityTypeBadges(selectedParty.entity_type)}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-xs text-slate-500">Party ID</span>
                      <p className="text-xs font-mono text-slate-600">{selectedParty.id}</p>
                    </div>
                  </div>
                </div>

                <PartyLinksWidget
                  partyType={selectedParty.party_type}
                  partyId={selectedParty.id}
                  partyName={selectedParty.name}
                />

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    Use the links above to connect this party to leads, buyer accounts, portal users,
                    or other identity records across your engines. This creates a unified view of all
                    customer touchpoints.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {stats && stats.by_source_type && Object.keys(stats.by_source_type).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Link Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.by_source_type).map(([type, count]: [string, any]) => (
              <div key={type} className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-900">{count}</p>
                <p className="text-sm text-slate-600 mt-1 capitalize">
                  {type.replace(/_/g, ' ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
