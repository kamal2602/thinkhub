import { supabase } from '../lib/supabase';

export interface TraceabilityNode {
  id: string;
  type: 'party' | 'inventory' | 'order' | 'invoice' | 'esg_event' | 'movement';
  label: string;
  data: any;
  timestamp: string;
  status?: string;
}

export interface TraceabilityChain {
  nodes: TraceabilityNode[];
  relationships: {
    from: string;
    to: string;
    type: string;
  }[];
}

class TraceabilityService {
  async getInventoryItemChain(inventoryItemId: string): Promise<TraceabilityChain> {
    const nodes: TraceabilityNode[] = [];
    const relationships: { from: string; to: string; type: string }[] = [];

    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select(`
        *,
        catalog_items (*),
        locations (*)
      `)
      .eq('id', inventoryItemId)
      .maybeSingle();

    if (itemError) throw itemError;
    if (!item) return { nodes, relationships };

    nodes.push({
      id: item.id,
      type: 'inventory',
      label: (item as any).catalog_items?.name || 'Inventory Item',
      data: item,
      timestamp: item.created_at,
      status: item.status
    });

    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('inventory_item_id', inventoryItemId)
      .order('movement_date', { ascending: true });

    if (movements) {
      movements.forEach(movement => {
        nodes.push({
          id: movement.id,
          type: 'movement',
          label: movement.movement_type,
          data: movement,
          timestamp: movement.movement_date
        });

        relationships.push({
          from: item.id,
          to: movement.id,
          type: 'moved'
        });
      });
    }

    if (item.source_type === 'purchase_order' && item.source_id) {
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('*, suppliers (*)')
        .eq('id', item.source_id)
        .maybeSingle();

      if (po) {
        nodes.push({
          id: po.id,
          type: 'order',
          label: `PO ${po.po_number}`,
          data: po,
          timestamp: po.created_at,
          status: po.status
        });

        relationships.push({
          from: po.id,
          to: item.id,
          type: 'received'
        });

        if ((po as any).suppliers) {
          nodes.push({
            id: (po as any).suppliers.id,
            type: 'party',
            label: (po as any).suppliers.name,
            data: (po as any).suppliers,
            timestamp: (po as any).suppliers.created_at
          });

          relationships.push({
            from: (po as any).suppliers.id,
            to: po.id,
            type: 'supplied'
          });
        }
      }
    }

    const { data: salesOrderLines } = await supabase
      .from('sales_order_lines')
      .select(`
        *,
        sales_orders (*)
      `)
      .eq('inventory_item_id', inventoryItemId);

    if (salesOrderLines && salesOrderLines.length > 0) {
      salesOrderLines.forEach(line => {
        const so = (line as any).sales_orders;
        if (so) {
          const soNodeId = `so-${so.id}`;
          if (!nodes.find(n => n.id === soNodeId)) {
            nodes.push({
              id: soNodeId,
              type: 'order',
              label: `SO ${so.order_number}`,
              data: so,
              timestamp: so.created_at,
              status: so.status
            });

            relationships.push({
              from: item.id,
              to: soNodeId,
              type: 'sold_on'
            });
          }
        }
      });
    }

    const { data: esgEvents } = await supabase
      .from('esg_events')
      .select('*')
      .eq('entity_type', 'inventory_items')
      .eq('entity_id', inventoryItemId)
      .order('event_date', { ascending: true });

    if (esgEvents) {
      esgEvents.forEach(event => {
        nodes.push({
          id: event.id,
          type: 'esg_event',
          label: event.event_type,
          data: event,
          timestamp: event.created_at
        });

        relationships.push({
          from: item.id,
          to: event.id,
          type: 'impacted'
        });
      });
    }

    return { nodes, relationships };
  }

  async getPartyChain(partyId: string): Promise<TraceabilityChain> {
    const nodes: TraceabilityNode[] = [];
    const relationships: { from: string; to: string; type: string }[] = [];

    const { data: party } = await supabase
      .from('parties')
      .select('*')
      .eq('id', partyId)
      .maybeSingle();

    if (!party) return { nodes, relationships };

    nodes.push({
      id: party.id,
      type: 'party',
      label: party.name,
      data: party,
      timestamp: party.created_at
    });

    if (party.is_customer) {
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('customer_party_id', partyId)
        .limit(10)
        .order('created_at', { ascending: false });

      if (orders) {
        orders.forEach(order => {
          nodes.push({
            id: order.id,
            type: 'order',
            label: `Order ${order.order_number}`,
            data: order,
            timestamp: order.created_at,
            status: order.status
          });

          relationships.push({
            from: party.id,
            to: order.id,
            type: 'ordered'
          });
        });
      }
    }

    const { data: links } = await supabase
      .from('party_links')
      .select(`
        *,
        child:child_party_id (*)
      `)
      .eq('parent_party_id', partyId);

    if (links) {
      links.forEach(link => {
        const child = (link as any).child;
        if (child) {
          nodes.push({
            id: child.id,
            type: 'party',
            label: child.name,
            data: child,
            timestamp: child.created_at
          });

          relationships.push({
            from: party.id,
            to: child.id,
            type: link.relationship_type
          });
        }
      });
    }

    return { nodes, relationships };
  }

  async getSalesOrderChain(orderId: string): Promise<TraceabilityChain> {
    const nodes: TraceabilityNode[] = [];
    const relationships: { from: string; to: string; type: string }[] = [];

    const { data: order } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customer:customer_party_id (*)
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return { nodes, relationships };

    nodes.push({
      id: order.id,
      type: 'order',
      label: `Order ${order.order_number}`,
      data: order,
      timestamp: order.created_at,
      status: order.status
    });

    if ((order as any).customer) {
      nodes.push({
        id: (order as any).customer.id,
        type: 'party',
        label: (order as any).customer.name,
        data: (order as any).customer,
        timestamp: (order as any).customer.created_at
      });

      relationships.push({
        from: (order as any).customer.id,
        to: order.id,
        type: 'ordered'
      });
    }

    const { data: lines } = await supabase
      .from('sales_order_lines')
      .select(`
        *,
        inventory_items (*)
      `)
      .eq('sales_order_id', orderId);

    if (lines) {
      lines.forEach(line => {
        const item = (line as any).inventory_items;
        if (item) {
          nodes.push({
            id: item.id,
            type: 'inventory',
            label: item.serial_number || `Item ${item.id.substring(0, 8)}`,
            data: item,
            timestamp: item.created_at,
            status: item.status
          });

          relationships.push({
            from: order.id,
            to: item.id,
            type: 'includes'
          });
        }
      });
    }

    const { data: invoice } = await supabase
      .from('sales_invoices')
      .select('*')
      .eq('sales_order_id', orderId)
      .maybeSingle();

    if (invoice) {
      nodes.push({
        id: invoice.id,
        type: 'invoice',
        label: `Invoice ${invoice.invoice_number}`,
        data: invoice,
        timestamp: invoice.created_at,
        status: invoice.status
      });

      relationships.push({
        from: order.id,
        to: invoice.id,
        type: 'invoiced'
      });
    }

    return { nodes, relationships };
  }

  async getFullTraceability(entityType: string, entityId: string): Promise<TraceabilityChain> {
    switch (entityType) {
      case 'inventory_item':
        return this.getInventoryItemChain(entityId);
      case 'party':
        return this.getPartyChain(entityId);
      case 'sales_order':
        return this.getSalesOrderChain(entityId);
      default:
        return { nodes: [], relationships: [] };
    }
  }
}

export const traceabilityService = new TraceabilityService();
