import { supabase } from './supabase';

export interface PurchaseOrderStats {
  totalExpected: number;
  totalReceived: number;
  canReimport: boolean;
  receivingStarted: boolean;
}

export async function checkPOReceivingStatus(poId: string): Promise<PurchaseOrderStats> {
  const { data: expectedItems, error: expectedError } = await supabase
    .from('expected_receiving_items')
    .select('id, received')
    .eq('purchase_order_id', poId);

  if (expectedError) throw expectedError;

  const totalExpected = expectedItems?.length || 0;
  const totalReceived = expectedItems?.filter(item => item.received).length || 0;
  const receivingStarted = totalReceived > 0;
  const canReimport = !receivingStarted;

  return {
    totalExpected,
    totalReceived,
    canReimport,
    receivingStarted
  };
}

export async function deleteExpectedItemsForPO(poId: string): Promise<void> {
  const { error } = await supabase
    .from('expected_receiving_items')
    .delete()
    .eq('purchase_order_id', poId);

  if (error) throw error;
}
