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
 * ARCHITECTURE ALIGNMENT (Core Contract Compliant):
 * - Buyers are Parties (customers table) - use party_id in bids ✅
 * - Inventory via auction_inventory_items (NOT direct assets) ✅
 * - One auction can sell from multiple purchase_lots ✅
 * - Settlements create sales_orders → then sales_invoices ✅
 * - Inventory locked during live auctions ✅
 * - NO financial data in auction tables ✅
 * - Authority chain: purchase_lot → inventory_item → auction → order_line → invoice ✅
 *
 * LEGACY TABLES (Read-Only):
 * - auction_lot_items: Use auction_inventory_items instead
 * - buyer_accounts: Use party_links for legacy mapping
 * - auction_settlements: Use sales_invoices with sales_channel='auction'
 */

type AuctionHouse = Database['public']['Tables']['auction_houses']['Row'];
type AuctionHouseInsert = Database['public']['Tables']['auction_houses']['Insert'];
type AuctionEvent = Database['public']['Tables']['auction_events']['Row'];
type AuctionEventInsert = Database['public']['Tables']['auction_events']['Insert'];
type AuctionLot = Database['public']['Tables']['auction_lots']['Row'];
type AuctionLotInsert = Database['public']['Tables']['auction_lots']['Insert'];
type Bid = Database['public']['Tables']['bids']['Row'];
type BidInsert = Database['public']['Tables']['bids']['Insert'];

// New types for core-aligned architecture
type AuctionInventoryItem = {
  id: string;
  auction_lot_id: string;
  inventory_item_id: string;
  asset_id?: string;
  component_id?: string;
  quantity: number;
  estimated_value?: number;
  display_description?: string;
  status: 'reserved' | 'sold' | 'released';
};

type AuctionInventoryItemInsert = Omit<AuctionInventoryItem, 'id' | 'added_at'>;

type SalesOrder = {
  id: string;
  company_id: string;
  customer_id: string;
  order_number: string;
  order_date: string;
  status: 'draft' | 'confirmed' | 'fulfilled' | 'cancelled';
  source_engine?: string;
  source_id?: string;
  total_amount: number;
  total_cost_amount?: number;
};

// Legacy types - read-only for historical data display only
type AuctionLotItem = Database['public']['Tables']['auction_lot_items']['Row'];
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
        auction_inventory_items(
          *,
          inventory_item:inventory_items(id, name, sku, cost_price),
          asset:assets(id, serial_number, brand, model, total_cost),
          component:harvested_components_inventory(id, component_type, brand, model)
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

  /**
   * Add inventory items to auction lot (Core-aligned)
   * References inventory_items instead of assets directly
   */
  async addInventoryToLot(params: {
    companyId: string;
    lotId: string;
    inventoryItemId: string;
    assetId?: string;
    componentId?: string;
    quantity?: number;
    estimatedValue?: number;
    displayDescription?: string;
  }): Promise<AuctionInventoryItem> {
    const { companyId, lotId, inventoryItemId, assetId, componentId, quantity = 1, estimatedValue, displayDescription } = params;

    const { data, error } = await supabase
      .from('auction_inventory_items')
      .insert({
        company_id: companyId,
        auction_lot_id: lotId,
        inventory_item_id: inventoryItemId,
        asset_id: assetId,
        component_id: componentId,
        quantity: quantity,
        estimated_value: estimatedValue,
        display_description: displayDescription,
        status: 'reserved'
      })
      .select()
      .single();

    if (error) throw error;

    // Lock inventory when adding to auction
    await supabase.rpc('lock_inventory_for_auction', {
      p_inventory_item_id: inventoryItemId,
      p_auction_lot_id: lotId,
      p_quantity: quantity
    });

    return data;
  },

  async removeInventoryFromLot(itemId: string): Promise<void> {
    // Get item details for unlock
    const { data: item } = await supabase
      .from('auction_inventory_items')
      .select('inventory_item_id, quantity')
      .eq('id', itemId)
      .single();

    if (item) {
      // Release inventory lock
      await supabase.rpc('release_inventory_lock', {
        p_inventory_item_id: item.inventory_item_id,
        p_quantity: item.quantity
      });
    }

    // Delete the auction inventory item
    const { error } = await supabase
      .from('auction_inventory_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },

  async getAuctionInventoryItems(lotId: string): Promise<AuctionInventoryItem[]> {
    const { data, error } = await supabase
      .from('auction_inventory_items')
      .select(`
        *,
        inventory_item:inventory_items(id, name, sku, cost_price, brand, model),
        asset:assets(id, serial_number, brand, model, total_cost),
        component:harvested_components_inventory(id, component_type, brand, model)
      `)
      .eq('auction_lot_id', lotId);

    if (error) throw error;
    return data || [];
  },

  /**
   * @deprecated Use getAuctionInventoryItems instead
   * Legacy function for backward compatibility - reads from old table
   */
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
   * Settle auction lot - Core-aligned architecture
   *
   * AUTHORITY CHAIN: purchase_lot → inventory_item → auction → order_line → invoice
   *
   * Flow:
   * 1. Create sales_order (commitment)
   * 2. Create order_lines from auction_inventory_items
   * 3. Transfer inventory locks from auction to order
   * 4. Mark auction as settled
   * 5. Optionally create sales_invoice (billing)
   *
   * NO financial data stored in auction_lots table.
   * All financial truth lives in sales_orders and sales_invoices.
   *
   * @param lotId - Auction lot ID
   * @param partyId - Buyer party ID (customer)
   * @param hammerPrice - Final winning bid amount
   * @param commission - Auction house commission (metadata only)
   * @param buyerPremium - Additional buyer premium
   * @returns Sales order created for the settlement
   */
  async settleAuction(params: {
    companyId: string;
    lotId: string;
    partyId: string;
    hammerPrice: number;
    commission?: number;
    buyerPremium?: number;
    notes?: string;
    createInvoice?: boolean; // Optional: create invoice immediately
  }): Promise<SalesOrder> {
    const {
      companyId,
      lotId,
      partyId,
      hammerPrice,
      commission = 0,
      buyerPremium = 0,
      notes = '',
      createInvoice = true
    } = params;

    // 1. Get lot details
    const { data: lot, error: lotError } = await supabase
      .from('auction_lots')
      .select(`
        *,
        auction_event:auction_events(event_name)
      `)
      .eq('id', lotId)
      .single();

    if (lotError) throw lotError;
    if (!lot) throw new Error('Auction lot not found');

    // 2. Get inventory items from auction_inventory_items (authoritative source)
    const { data: auctionItems, error: itemsError } = await supabase
      .from('auction_inventory_items')
      .select(`
        *,
        inventory_item:inventory_items(id, name, cost_price),
        asset:assets(id, serial_number, total_cost),
        component:harvested_components_inventory(id, component_type)
      `)
      .eq('auction_lot_id', lotId)
      .eq('status', 'reserved');

    if (itemsError) throw itemsError;
    if (!auctionItems || auctionItems.length === 0) {
      throw new Error('No inventory items found for auction lot');
    }

    // 3. Calculate total cost basis (from inventory)
    const totalCostBasis = auctionItems.reduce((sum, item) => {
      const costPerUnit = item.asset?.total_cost || item.inventory_item?.cost_price || 0;
      return sum + (costPerUnit * item.quantity);
    }, 0);

    // 4. Generate order number
    const { data: orderCount } = await supabase
      .from('sales_orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const orderNumber = `AUC-${String((orderCount?.count || 0) + 1).padStart(6, '0')}`;

    // 5. Create sales order (financial truth)
    const totalAmount = hammerPrice + buyerPremium;

    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .insert({
        company_id: companyId,
        customer_id: partyId,
        order_number: orderNumber,
        order_date: new Date().toISOString().split('T')[0],
        status: 'confirmed',
        source_engine: 'auction',
        source_id: lotId,
        subtotal_amount: hammerPrice,
        total_amount: totalAmount,
        total_cost_amount: totalCostBasis,
        notes: `Auction Settlement - ${lot.auction_event?.event_name} - Lot ${lot.lot_number}\n${notes}`,
        metadata: {
          hammer_price: hammerPrice,
          buyer_premium: buyerPremium,
          commission: commission,
          auction_lot_id: lotId,
          auction_lot_number: lot.lot_number
        }
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 6. Create order lines for each inventory item
    const orderLines = auctionItems.map(item => ({
      order_id: order.id,
      inventory_item_id: item.inventory_item_id,
      asset_id: item.asset_id,
      component_id: item.component_id,
      description: item.display_description || item.inventory_item?.name || 'Auction Item',
      quantity: item.quantity,
      unit_price: hammerPrice / auctionItems.length, // Distribute hammer price
      total_price: (hammerPrice / auctionItems.length) * item.quantity,
      cost_price: item.asset?.total_cost || item.inventory_item?.cost_price || 0
    }));

    const { error: linesError } = await supabase
      .from('sales_order_lines')
      .insert(orderLines);

    if (linesError) throw linesError;

    // 7. Transfer inventory locks from auction to order
    for (const item of auctionItems) {
      await supabase.rpc('transfer_inventory_lock_to_order', {
        p_inventory_item_id: item.inventory_item_id,
        p_order_id: order.id
      });
    }

    // 8. Update auction inventory items status
    await supabase
      .from('auction_inventory_items')
      .update({ status: 'sold' })
      .eq('auction_lot_id', lotId);

    // 9. Update assets status (if serialized items)
    const assetIds = auctionItems.filter(i => i.asset_id).map(i => i.asset_id);
    if (assetIds.length > 0) {
      await supabase
        .from('assets')
        .update({
          status: 'sold',
          reserved_for_order: order.id,
          sold_date: new Date().toISOString().split('T')[0]
        })
        .in('id', assetIds);
    }

    // 10. Mark auction lot as sold (metadata only)
    await supabase
      .from('auction_lots')
      .update({ status: 'sold' })
      .eq('id', lotId);

    // 11. Mark winning bid
    await supabase
      .from('bids')
      .update({ is_winning: false })
      .eq('auction_lot_id', lotId);

    await supabase
      .from('bids')
      .update({ is_winning: true })
      .eq('auction_lot_id', lotId)
      .eq('party_id', partyId)
      .order('bid_amount', { ascending: false })
      .limit(1);

    // 12. Optionally create invoice immediately
    if (createInvoice) {
      const { data: invoiceCount } = await supabase
        .from('sales_invoices')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);

      const invoiceNumber = `INV-AUC-${String((invoiceCount?.count || 0) + 1).padStart(6, '0')}`;

      await salesInvoiceService.createInvoice({
        company_id: companyId,
        customer_id: partyId,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        total_amount: totalAmount,
        paid_amount: 0,
        payment_status: 'unpaid',
        sales_channel: 'auction',
        sales_order_id: order.id,
        notes: `Invoice for Order ${orderNumber}`,
      });
    }

    return order;
  },

  /**
   * Get auction settlements (from sales_orders with source_engine = 'auction')
   * This reads from the core financial system (sales_orders) not parallel tables
   */
  async getSettlements(companyId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customer:customers(name, customer_number, email),
        sales_order_lines(
          *,
          inventory_item:inventory_items(name, sku),
          asset:assets(serial_number, brand, model),
          component:harvested_components_inventory(component_type, brand, model)
        )
      `)
      .eq('company_id', companyId)
      .eq('source_engine', 'auction')
      .order('order_date', { ascending: false });

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
   * Calculate lot cost basis from inventory items
   * Uses auction_inventory_items as single source of truth
   */
  async calculateLotCostBasis(lotId: string): Promise<number> {
    const { data: items, error } = await supabase
      .from('auction_inventory_items')
      .select(`
        quantity,
        inventory_item:inventory_items(cost_price),
        asset:assets(total_cost)
      `)
      .eq('auction_lot_id', lotId);

    if (error) throw error;

    const totalCost = (items || []).reduce((sum, item) => {
      const costPerUnit = item.asset?.total_cost || item.inventory_item?.cost_price || 0;
      return sum + (costPerUnit * item.quantity);
    }, 0);

    return totalCost;
  },

  /**
   * Start auction (lock inventory)
   * Prevents inventory from being sold elsewhere during live auction
   */
  async startAuction(lotId: string): Promise<void> {
    // Get all inventory items in this auction
    const { data: items, error: itemsError } = await supabase
      .from('auction_inventory_items')
      .select('id, inventory_item_id, quantity')
      .eq('auction_lot_id', lotId);

    if (itemsError) throw itemsError;

    // Lock each inventory item
    for (const item of items || []) {
      await supabase.rpc('lock_inventory_for_auction', {
        p_inventory_item_id: item.inventory_item_id,
        p_auction_lot_id: lotId,
        p_quantity: item.quantity
      });
    }

    // Update auction lot status
    await supabase
      .from('auction_lots')
      .update({
        status: 'live',
        start_time: new Date().toISOString()
      })
      .eq('id', lotId);
  },

  /**
   * Close auction without sale (release inventory locks)
   */
  async closeAuctionNoSale(lotId: string): Promise<void> {
    // Get all inventory items
    const { data: items } = await supabase
      .from('auction_inventory_items')
      .select('inventory_item_id, quantity')
      .eq('auction_lot_id', lotId);

    // Release locks
    for (const item of items || []) {
      await supabase.rpc('release_inventory_lock', {
        p_inventory_item_id: item.inventory_item_id,
        p_quantity: item.quantity
      });
    }

    // Update auction inventory items status
    await supabase
      .from('auction_inventory_items')
      .update({ status: 'released' })
      .eq('auction_lot_id', lotId);

    // Update auction lot status
    await supabase
      .from('auction_lots')
      .update({
        status: 'closed',
        end_time: new Date().toISOString()
      })
      .eq('id', lotId);
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
