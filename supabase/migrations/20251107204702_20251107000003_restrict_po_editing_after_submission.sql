/*
  # Restrict Purchase Order Editing After Submission
  
  1. Changes
    - Replace the broad "FOR ALL" policy with separate policies for INSERT, UPDATE, DELETE
    - Only allow UPDATE on POs with status 'draft' or 'submitted'
    - Prevent editing POs once they have status 'partial', 'received', 'closed', or 'cancelled'
  
  2. Purpose
    - Maintain data integrity and audit trail
    - Prevent accidental changes to POs that are being received or completed
    - Once receiving starts (status = 'partial'), the PO should be locked
  
  3. Reasoning
    - Draft: Full editing allowed (not yet committed)
    - Submitted: Can still edit before receiving starts
    - Partial/Received/Closed: Read-only (receiving in progress or completed)
    - Cancelled: Read-only (historical record)
*/

-- Drop the existing broad policy
DROP POLICY IF EXISTS "Staff and above can manage POs" ON purchase_orders;

-- Allow INSERT (creating new POs)
CREATE POLICY "Staff can create POs"
  ON purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = purchase_orders.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
  );

-- Allow UPDATE only on draft or submitted POs
CREATE POLICY "Staff can update draft and submitted POs"
  ON purchase_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = purchase_orders.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
    AND status IN ('draft', 'submitted')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_company_access
      WHERE user_company_access.company_id = purchase_orders.company_id
      AND user_company_access.user_id = auth.uid()
      AND user_company_access.role IN ('admin', 'manager', 'staff')
    )
    AND status IN ('draft', 'submitted')
  );

-- Note: DELETE policy already exists and only allows deleting draft POs
-- "Users can delete draft purchase orders" policy is already correct
