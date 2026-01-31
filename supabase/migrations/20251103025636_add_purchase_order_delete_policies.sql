/*
  # Add Delete Policies for Purchase Orders

  1. Overview
    - Add DELETE policies to allow users to delete draft purchase orders
    - Add DELETE policies for purchase_order_lines (cascade behavior)

  2. Changes
    - Add DELETE policy on purchase_orders table (draft status only)
    - Add DELETE policy on purchase_order_lines table

  3. Security
    - Users can only delete POs from their company
    - Only draft POs can be deleted to prevent data loss
    - DELETE cascades to related purchase_order_lines

  4. Notes
    - Submitted or received POs cannot be deleted (use cancel instead)
    - This prevents accidental loss of important order history
*/

-- Allow users to delete draft purchase orders from their company
CREATE POLICY "Users can delete draft purchase orders"
  ON purchase_orders FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
    )
    AND status = 'draft'
  );

-- Allow users to delete purchase order lines when deleting the PO
CREATE POLICY "Users can delete purchase order lines"
  ON purchase_order_lines FOR DELETE
  TO authenticated
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders 
      WHERE company_id IN (
        SELECT company_id FROM user_company_access WHERE user_id = auth.uid()
      )
      AND status = 'draft'
    )
  );
