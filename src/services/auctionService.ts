import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type AuctionHouse = Database['public']['Tables']['auction_houses']['Row'];
type AuctionHouseInsert = Database['public']['Tables']['auction_houses']['Insert'];
type AuctionEvent = Database['public']['Tables']['auction_events']['Row'];
type AuctionEventInsert = Database['public']['Tables']['auction_events']['Insert'];
type AuctionLot = Database['public']['Tables']['auction_lots']['Row'];
type AuctionLotInsert = Database['public']['Tables']['auction_lots']['Insert'];
type AuctionLotItem = Database['public']['Tables']['auction_lot_items']['Row'];
type AuctionLotItemInsert = Database['public']['Tables']['auction_lot_items']['Insert'];
type BuyerAccount = Database['public']['Tables']['buyer_accounts']['Row'];
type BuyerAccountInsert = Database['public']['Tables']['buyer_accounts']['Insert'];
type Bid = Database['public']['Tables']['bids']['Row'];
type BidInsert = Database['public']['Tables']['bids']['Insert'];
type AuctionSettlement = Database['public']['Tables']['auction_settlements']['Row'];
type AuctionSettlementInsert = Database['public']['Tables']['auction_settlements']['Insert'];

export const auctionService = {
  async getAuctionHouses(companyId: string): Promise<AuctionHouse[]> {
    const { data, error } = await supabase
      .from('auction_houses')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async createAuctionHouse(house: AuctionHouseInsert): Promise<AuctionHouse> {
    const { data, error } = await supabase
      .from('auction_houses')
      .insert(house)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAuctionHouse(id: string, updates: Partial<AuctionHouseInsert>): Promise<AuctionHouse> {
    const { data, error } = await supabase
      .from('auction_houses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAuctionHouse(id: string): Promise<void> {
    const { error } = await supabase
      .from('auction_houses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAuctionEvents(companyId: string): Promise<AuctionEvent[]> {
    const { data, error } = await supabase
      .from('auction_events')
      .select(`
        *,
        auction_house:auction_houses(name, auction_type)
      `)
      .eq('company_id', companyId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAuctionEvent(id: string): Promise<AuctionEvent | null> {
    const { data, error } = await supabase
      .from('auction_events')
      .select(`
        *,
        auction_house:auction_houses(*),
        auction_lots:auction_lots(count)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createAuctionEvent(event: AuctionEventInsert): Promise<AuctionEvent> {
    const { data, error } = await supabase
      .from('auction_events')
      .insert(event)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAuctionEvent(id: string, updates: Partial<AuctionEventInsert>): Promise<AuctionEvent> {
    const { data, error } = await supabase
      .from('auction_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAuctionEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('auction_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAuctionLots(eventId: string): Promise<AuctionLot[]> {
    const { data, error } = await supabase
      .from('auction_lots')
      .select(`
        *,
        auction_lot_items(count)
      `)
      .eq('auction_event_id', eventId)
      .order('lot_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getAuctionLot(id: string): Promise<AuctionLot | null> {
    const { data, error } = await supabase
      .from('auction_lots')
      .select(`
        *,
        auction_event:auction_events(event_name, start_date, status),
        auction_lot_items(
          *,
          asset:assets(serial_number, brand, model),
          component:harvested_components_inventory(component_type, brand, model)
        ),
        bids(*, buyer:buyer_accounts(buyer_name))
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createAuctionLot(lot: AuctionLotInsert): Promise<AuctionLot> {
    const { data, error } = await supabase
      .from('auction_lots')
      .insert(lot)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAuctionLot(id: string, updates: Partial<AuctionLotInsert>): Promise<AuctionLot> {
    const { data, error } = await supabase
      .from('auction_lots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAuctionLot(id: string): Promise<void> {
    const { error } = await supabase
      .from('auction_lots')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async addItemsToLot(lotId: string, items: AuctionLotItemInsert[]): Promise<AuctionLotItem[]> {
    const itemsWithLot = items.map(item => ({ ...item, auction_lot_id: lotId }));

    const { data, error } = await supabase
      .from('auction_lot_items')
      .insert(itemsWithLot)
      .select();

    if (error) throw error;
    return data || [];
  },

  async removeItemFromLot(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('auction_lot_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },

  async getLotItems(lotId: string): Promise<AuctionLotItem[]> {
    const { data, error } = await supabase
      .from('auction_lot_items')
      .select(`
        *,
        asset:assets(serial_number, brand, model, product_type:product_types(name)),
        component:harvested_components_inventory(component_type, brand, model)
      `)
      .eq('auction_lot_id', lotId);

    if (error) throw error;
    return data || [];
  },

  async getBuyerAccounts(companyId: string): Promise<BuyerAccount[]> {
    const { data, error } = await supabase
      .from('buyer_accounts')
      .select('*')
      .eq('company_id', companyId)
      .order('buyer_name');

    if (error) throw error;
    return data || [];
  },

  async createBuyerAccount(buyer: BuyerAccountInsert): Promise<BuyerAccount> {
    const { data, error } = await supabase
      .from('buyer_accounts')
      .insert(buyer)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateBuyerAccount(id: string, updates: Partial<BuyerAccountInsert>): Promise<BuyerAccount> {
    const { data, error} = await supabase
      .from('buyer_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async placeBid(bid: BidInsert): Promise<Bid> {
    const { data: currentBids, error: fetchError } = await supabase
      .from('bids')
      .update({ is_winning: false })
      .eq('auction_lot_id', bid.auction_lot_id)
      .eq('is_winning', true);

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('bids')
      .insert({ ...bid, is_winning: true })
      .select()
      .single();

    if (error) throw error;

    const { error: updateError } = await supabase
      .from('auction_lots')
      .update({
        current_bid: bid.bid_amount,
        bid_count: (await supabase
          .from('bids')
          .select('id', { count: 'exact', head: true })
          .eq('auction_lot_id', bid.auction_lot_id)
        ).count || 0
      })
      .eq('id', bid.auction_lot_id);

    if (updateError) throw updateError;

    return data;
  },

  async getBidsForLot(lotId: string): Promise<Bid[]> {
    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        buyer:buyer_accounts(buyer_name, buyer_number)
      `)
      .eq('auction_lot_id', lotId)
      .order('bid_amount', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async retractBid(bidId: string): Promise<void> {
    const { error } = await supabase
      .from('bids')
      .update({ is_retracted: true })
      .eq('id', bidId);

    if (error) throw error;
  },

  async createSettlement(settlement: AuctionSettlementInsert): Promise<AuctionSettlement> {
    const { data, error } = await supabase
      .from('auction_settlements')
      .insert(settlement)
      .select()
      .single();

    if (error) throw error;

    const { error: updateError } = await supabase
      .from('auction_lots')
      .update({ status: 'sold' })
      .eq('id', settlement.auction_lot_id);

    if (updateError) throw updateError;

    return data;
  },

  async getSettlements(companyId: string): Promise<AuctionSettlement[]> {
    const { data, error } = await supabase
      .from('auction_settlements')
      .select(`
        *,
        auction_lot:auction_lots(lot_number, title),
        buyer:buyer_accounts(buyer_name, buyer_number)
      `)
      .eq('company_id', companyId)
      .order('settlement_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateSettlement(id: string, updates: Partial<AuctionSettlementInsert>): Promise<AuctionSettlement> {
    const { data, error } = await supabase
      .from('auction_settlements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async calculateLotCostBasis(lotId: string): Promise<number> {
    const { data: items, error } = await supabase
      .from('auction_lot_items')
      .select('cost_basis, quantity')
      .eq('auction_lot_id', lotId);

    if (error) throw error;

    return items?.reduce((sum, item) => {
      return sum + ((item.cost_basis || 0) * (item.quantity || 1));
    }, 0) || 0;
  },

  async exportAuctionCatalog(eventId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('auction_lots')
      .select(`
        lot_number,
        title,
        description,
        category,
        starting_price,
        estimate_low,
        estimate_high,
        items_count,
        image_urls,
        status
      `)
      .eq('auction_event_id', eventId)
      .order('lot_order');

    if (error) throw error;
    return data || [];
  }
};
