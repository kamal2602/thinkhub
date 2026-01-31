import { useState, useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { auctionService } from '../../services/auctionService';
import { Plus, Calendar, Gavel, Users, DollarSign, Package, TrendingUp, Edit, Trash2, Eye } from 'lucide-react';

export function AuctionManagement() {
  const { currentCompany } = useCompany();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'houses' | 'events' | 'lots' | 'buyers' | 'settlements'>('events');
  const [loading, setLoading] = useState(false);

  const [auctionHouses, setAuctionHouses] = useState<any[]>([]);
  const [auctionEvents, setAuctionEvents] = useState<any[]>([]);
  const [buyerAccounts, setBuyerAccounts] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);

  const [showHouseModal, setShowHouseModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showBuyerModal, setShowBuyerModal] = useState(false);

  const [selectedHouse, setSelectedHouse] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);

  useEffect(() => {
    if (currentCompany) {
      loadData();
    }
  }, [currentCompany, activeTab]);

  const loadData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      switch (activeTab) {
        case 'houses':
          const houses = await auctionService.getAuctionHouses(currentCompany.id);
          setAuctionHouses(houses);
          break;
        case 'events':
          const events = await auctionService.getAuctionEvents(currentCompany.id);
          setAuctionEvents(events);
          break;
        case 'buyers':
          const buyers = await auctionService.getBuyerAccounts(currentCompany.id);
          setBuyerAccounts(buyers);
          break;
        case 'settlements':
          const sett = await auctionService.getSettlements(currentCompany.id);
          setSettlements(sett);
          break;
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHouse = () => {
    setSelectedHouse(null);
    setShowHouseModal(true);
  };

  const handleEditHouse = (house: any) => {
    setSelectedHouse(house);
    setShowHouseModal(true);
  };

  const handleDeleteHouse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this auction house?')) return;

    try {
      await auctionService.deleteAuctionHouse(id);
      showToast('Auction house deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      showToast(error.message || 'Failed to delete auction house', 'error');
    }
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleCreateBuyer = () => {
    setSelectedBuyer(null);
    setShowBuyerModal(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: 'bg-gray-100 text-gray-800',
      preview: 'bg-blue-100 text-blue-800',
      live: 'bg-green-100 text-green-800',
      closed: 'bg-yellow-100 text-yellow-800',
      settled: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auction Management</h1>
          <p className="text-gray-600 mt-1">Manage auction houses, events, lots, and settlements</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'houses', label: 'Auction Houses', icon: Gavel },
            { id: 'events', label: 'Auction Events', icon: Calendar },
            { id: 'lots', label: 'Auction Lots', icon: Package },
            { id: 'buyers', label: 'Buyers', icon: Users },
            { id: 'settlements', label: 'Settlements', icon: DollarSign }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 'houses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Auction Houses</h2>
            <button
              onClick={handleCreateHouse}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Auction House
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : auctionHouses.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Gavel className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No auction houses configured</p>
              <button
                onClick={handleCreateHouse}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first auction house
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {auctionHouses.map(house => (
                <div key={house.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{house.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{house.auction_type.replace('_', ' ')}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${house.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {house.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    {house.commission_rate && (
                      <div className="flex justify-between">
                        <span>Commission:</span>
                        <span className="font-medium">{house.commission_rate}%</span>
                      </div>
                    )}
                    {house.listing_fee && (
                      <div className="flex justify-between">
                        <span>Listing Fee:</span>
                        <span className="font-medium">{formatCurrency(house.listing_fee)}</span>
                      </div>
                    )}
                    {house.contact_email && (
                      <div className="flex justify-between">
                        <span>Contact:</span>
                        <span className="font-medium truncate max-w-[150px]">{house.contact_email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditHouse(house)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteHouse(house.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Auction Events</h2>
            <button
              onClick={handleCreateEvent}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Create Event
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : auctionEvents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No auction events scheduled</p>
              <button
                onClick={handleCreateEvent}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Schedule your first auction
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lots</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auctionEvents.map(event => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{event.event_name}</div>
                          <div className="text-sm text-gray-500">{event.auction_house?.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(event.start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.lots_sold} / {event.total_lots}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(event.total_hammer_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditEvent(event)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-800">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'buyers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Buyer Accounts</h2>
            <button
              onClick={handleCreateBuyer}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Buyer
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : buyerAccounts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No buyer accounts registered</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchases</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {buyerAccounts.map(buyer => (
                    <tr key={buyer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{buyer.buyer_name}</div>
                          <div className="text-sm text-gray-500">#{buyer.buyer_number}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {buyer.buyer_type?.replace('_', ' ') || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {buyer.email || buyer.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {buyer.total_purchases}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(buyer.total_spent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Auction Settlements</h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No settlements recorded</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lot</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hammer Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {settlements.map(settlement => (
                    <tr key={settlement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{settlement.auction_lot?.lot_number}</div>
                        <div className="text-sm text-gray-500">{settlement.auction_lot?.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {settlement.buyer?.buyer_name || 'Anonymous'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(settlement.hammer_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        -{formatCurrency(settlement.auction_commission)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={settlement.net_profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {formatCurrency(settlement.net_profit)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          settlement.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          settlement.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {settlement.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
