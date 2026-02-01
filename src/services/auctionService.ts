import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { salesInvoiceService } from './salesInvoiceService';

/**
 * Auction Service
 *
 * REQUIRES ENGINE: auction_enabled
 *
 * This service manages auction houses, events, lots, bids, and settlements.
 * All UI components using this service must be wrapped with:
 * <EngineGuard engine="auction_enabled">
 *
 * ARCHITECTURE ALIGNMENT:
 * - Buyers are Parties (customers table) - use party_id in bids
 * - Lots reference purchase_lots for inventory/cost basis
 * - Settlements create sales_invoices (core financial truth)
 * - buyer_accounts deprecated (use party_links for legacy mapping)
 */

type AuctionHouse = Database['public']['Tables']['auction_houses']['Row'];
type AuctionHouseInsert = Database['public']['Tables']['auction_houses']['Insert'];
type AuctionEvent = Database['public']['Tables']['auction_events']['Row'];
type AuctionEventInsert = Database['public']['Tables']['auction_events']['Insert'];
type AuctionLot = Database['public']['Tables']['auction_lots']['Row'];
type AuctionLotInsert = Database['public']['Tables']['auction_lots']['Insert'];
type AuctionLotItem = Database['public']['Tables']['auction_lot_items']['Row'];
type AuctionLotItemInsert = Database['public']['Tables']['auction_lot_items']['Insert'];
type Bid = Database['public']['Tables']['bids']['Row'];
type BidInsert = Database['public']['Tables']['bids']['Insert'];

// Legacy types - read-only for historical data display only
type AuctionSettlement = Database['public']['Tables']['auction_settlements']['Row'];

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
        purchase_lot:purchase_lots(lot_number, total_cost, total_items, supplier:suppliers(name)),
        auction_lot_items(
          *,
          asset:assets(serial_number, brand, model),
          component:harvested_components_inventory(component_type, brand, model)
        ),
        bids(
          *,
          party:customers(name, email)
        )
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

  // =========================================
  // BUYERS (Party-based)
  // =========================================
  // Buyers are Parties (customers table).
  // Use customerService for all buyer/customer management.
  // buyer_accounts table is deprecated and read-only.

  /**
   * Place a bid on an auction lot
   * @param bid - Bid data with party_id (customer ID) as buyer identity
   */
  async placeBid(bid: BidInsert): Promise<Bid> {
    // Mark all current winning bids as not winning
    const { error: fetchError } = await supabase
      .from('bids')
      .update({ is_winning: false })
      .eq('auction_lot_id', bid.auction_lot_id)
      .eq('is_winning', true);

    if (fetchError) throw fetchError;

    // Insert new bid as winning
    const { data, error } = await supabase
      .from('bids')
      .insert({ ...bid, is_winning: true })
      .select()
      .single();

    if (error) throw error;

    // Update auction lot with current bid and count
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

  /**
   * Get bids for an auction lot
   * Joins with customers (Party) for buyer identity
   */
  async getBidsForLot(lotId: string): Promise<Bid[]> {
    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        party:customers(name, email)
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

  /**
   * Settle an auction lot by creating a sales invoice
   * This is the ONLY way to settle auctions - creates core financial truth
   *
   * Uses purchase_lots as authoritative source for lot items (not auction_lot_items)
   *
   * @param lotId - Auction lot ID
   * @param partyId - Buyer party ID (customer)
   * @param hammerPrice - Final winning bid amount
   * @param commission - Auction house commission
   * @param buyerPremium - Additional buyer premium
   * @returns Sales invoice created for the settlement
   */
  async settleAuction(params: {
    companyId: string;
    lotId: string;
    partyId: string;
    hammerPrice: number;
    commission?: number;
    buyerPremium?: number;
    listingFees?: number;
    otherFees?: number;
    notes?: string;
  }): Promise<any> {
    const {
      companyId,
      lotId,
      partyId,
      hammerPrice,
      commission = 0,
      buyerPremium = 0,
      listingFees = 0,
      otherFees = 0,
      notes = ''
    } = params;

    // 1. Get lot details
    const { data: lot, error: lotError } = await supabase
      .from('auction_lots')
      .select(`
        *,
        purchase_lot:purchase_lots(lot_number, total_cost)
      `)
      .eq('id', lotId)
      .single();

    if (lotError) throw lotError;
    if (!lot) throw new Error('Auction lot not found');

    // 2. Get items from authoritative source (purchase_lots)
    const { data: items, error: itemsError } = await supabase
      .rpc('get_auction_lot_items_from_purchase_lot', {
        p_auction_lot_id: lotId
      });

    if (itemsError) throw itemsError;

    if (!items || items.length === 0) {
      throw new Error('No items found for auction lot. Lot must reference a purchase_lot with available items.');
    }

    // 3. Calculate totals
    const totalSalePrice = hammerPrice + buyerPremium;
    const netProceeds = hammerPrice - commission - listingFees - otherFees;

    // 4. Generate invoice number
    const { data: invoiceCount } = await supabase
      .from('sales_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const invoiceNumber = `INV-AUC-${String((invoiceCount?.count || 0) + 1).padStart(6, '0')}`;

    // 5. Create sales invoice (core financial truth)
    const invoice = await salesInvoiceService.createInvoice({
      company_id: companyId,
      customer_id: partyId,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      total_amount: totalSalePrice,
      paid_amount: 0,
      payment_status: 'unpaid',
      sales_channel: 'auction',
      notes: `Auction Settlement - Lot ${lot.lot_number}\nHammer Price: $${hammerPrice}\nCommission: $${commission}\nBuyer Premium: $${buyerPremium}\n${notes}`,
    });

    // 6. Add line items from authoritative source (purchase_lots)
    for (const item of items) {
      await salesInvoiceService.addInvoiceItem({
        invoice_id: invoice.id,
        description: item.description || `Auction Lot ${lot.lot_number} Item`,
        quantity: item.quantity || 1,
        unit_price: hammerPrice / items.length,
        cost_price: item.cost_basis || 0,
        asset_id: item.asset_id,
        component_id: item.component_id,
      });
    }

    // 7. Mark auction lot as sold
    const { error: updateError } = await supabase
      .from('auction_lots')
      .update({
        status: 'sold',
        hammer_price: hammerPrice,
        buyer_premium: buyerPremium,
        total_price: totalSalePrice
      })
      .eq('id', lotId);

    if (updateError) throw updateError;

    return invoice;
  },

  /**
   * Get auction settlements (from sales_invoices with sales_channel = 'auction')
   * This reads from the core financial system (sales_invoices) not parallel auction_settlements
   */
  async getSettlements(companyId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('sales_invoices')
      .select(`
        *,
        customer:customers(name, customer_number, email),
        sales_invoice_items(
          *,
          asset:assets(serial_number, brand, model),
          component:harvested_components_inventory(component_type, brand, model)
        )
      `)
      .eq('company_id', companyId)
      .eq('sales_channel', 'auction')
      .order('invoice_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * @deprecated Legacy settlements table is read-only for historical data
   * Note: Legacy buyer identity resolved via buyer_accounts_read_only view if needed
   */
  async getLegacySettlements(companyId: string): Promise<AuctionSettlement[]> {
    const { data, error } = await supabase
      .from('auction_settlements')
      .select(`
        *,
        auction_lot:auction_lots(lot_number, title)
      `)
      .eq('company_id', companyId)
      .order('settlement_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Calculate lot cost basis from purchase_lots (if linked) or auction_lot_items (legacy)
   * Uses database function for single source of truth
   */
  async calculateLotCostBasis(lotId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('get_auction_lot_cost_basis', { lot_id: lotId });

    if (error) throw error;
    return data || 0;
  },

  /**
   * Create an auction lot from an existing purchase lot
   * This is the preferred way to create auction lots (uses purchase_lots as source)
   */
  async createAuctionLotFromPurchaseLot(params: {
    companyId: string;
    auctionEventId: string;
    purchaseLotId: string;
    lotNumber: string;
    title: string;
    description?: string;
    startingPrice?: number;
    reservePrice?: number;
    estimateLow?: number;
    estimateHigh?: number;
  }): Promise<AuctionLot> {
    const {
      companyId,
      auctionEventId,
      purchaseLotId,
      lotNumber,
      title,
      description = '',
      startingPrice,
      reservePrice,
      estimateLow,
      estimateHigh
    } = params;

    // Get purchase lot details
    const { data: purchaseLot, error: plError } = await supabase
      .from('purchase_lots')
      .select('*, supplier:suppliers(name)')
      .eq('id', purchaseLotId)
      .single();

    if (plError) throw plError;
    if (!purchaseLot) throw new Error('Purchase lot not found');

    // Create auction lot linked to purchase lot
    const { data, error } = await supabase
      .from('auction_lots')
      .insert({
        company_id: companyId,
        auction_event_id: auctionEventId,
        purchase_lot_id: purchaseLotId,
        lot_number: lotNumber,
        title: title,
        description: description || `${purchaseLot.total_items} items from ${purchaseLot.supplier?.name || 'supplier'}`,
        starting_price: startingPrice,
        reserve_price: reservePrice,
        estimate_low: estimateLow || purchaseLot.total_cost,
        estimate_high: estimateHigh || purchaseLot.total_cost * 1.5,
        items_count: purchaseLot.total_items,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
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
