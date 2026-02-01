# Customer Portal & ITAD - Quick Start Guide

## Immediate Action Items

### 1. Test the Customer Portal (5 minutes)

```bash
# Start the dev server (if not already running)
npm run dev
```

Navigate to: `http://localhost:5173/portal`

1. Click "Register" tab
2. Use a test Customer ID from your database:
   ```sql
   SELECT id, name FROM customers WHERE business_type = 'itad_service_customer' LIMIT 1;
   ```
3. Fill out registration form
4. Login and explore the dashboard

### 2. Add Your First Downstream Vendor (3 minutes)

1. Login to main app (not portal)
2. Sidebar > ITAD > Downstream Vendors (NEW)
3. Click "Add Vendor"
4. Fill out:
   - Vendor Name: "ABC Recycling"
   - Vendor Type: "Recycler"
   - Check "R2 Certified"
   - Set expiration date (try < 90 days to see warning)
5. Save

### 3. Add Company Certifications (3 minutes)

1. Sidebar > Settings > Company Certifications (NEW)
2. Click "Add Certification"
3. Add your R2v3 or e-Stewards certification
4. Set expiration date
5. Save

### 4. Create Test ITAD Project (5 minutes)

1. Sidebar > ITAD > Projects
2. Create new project
3. Set revenue share percentage (e.g., 40%)
4. Note the project ID

### 5. Link Asset to Project (2 minutes)

1. Go to Processing > All Assets
2. Edit any asset
3. Select the ITAD project you created
4. Save

### 6. Simulate Sale & Revenue Share (5 minutes)

1. Sidebar > Sales > Create Invoice
2. Add the asset you linked
3. Set sale price (e.g., $500)
4. Complete the sale
5. Check the database:
   ```sql
   SELECT * FROM revenue_share_transactions
   ORDER BY transaction_date DESC LIMIT 1;
   ```
6. Verify calculation:
   - Sale Price: $500
   - Costs: (whatever was recorded)
   - Gross Profit: Sale - Costs
   - Customer Share: Profit × Revenue Share %

### 7. Customer Views Their Data (2 minutes)

1. Go back to portal: `http://localhost:5173/portal`
2. Login with customer portal account
3. Dashboard shows:
   - Active projects
   - Assets processed
   - Revenue share total
   - Environmental impact
4. Navigate to "Revenue Reports"
5. See the transaction you just created

## Database Quick Reference

### Get Customer ID for Portal Registration
```sql
SELECT id, name, business_type
FROM customers
WHERE business_type = 'itad_service_customer';
```

### Check Revenue Share Transactions
```sql
SELECT
  t.transaction_date,
  a.brand, a.model,
  t.sale_price,
  t.total_costs,
  t.gross_profit,
  t.revenue_share_percentage,
  t.customer_share_amount,
  t.settlement_status
FROM revenue_share_transactions t
LEFT JOIN assets a ON a.id = t.asset_id
ORDER BY t.transaction_date DESC;
```

### View All Customer Portal Users
```sql
SELECT
  cpu.email,
  cpu.full_name,
  c.name as customer_name,
  cpu.last_login_at,
  cpu.login_count,
  cpu.is_active
FROM customer_portal_users cpu
JOIN customers c ON c.id = cpu.customer_id
ORDER BY cpu.created_at DESC;
```

### Check Collection Requests
```sql
SELECT
  cr.request_number,
  cr.requested_by_name,
  cr.status,
  cr.estimated_quantity,
  cr.requested_pickup_date,
  c.name as customer_name
FROM collection_requests cr
JOIN customers c ON c.id = cr.customer_id
ORDER BY cr.created_at DESC;
```

### View Downstream Vendors
```sql
SELECT
  vendor_name,
  vendor_type,
  r2_certified,
  r2_expiration_date,
  e_stewards_certified,
  e_stewards_expiration_date,
  is_active
FROM downstream_vendors
WHERE company_id = 'your-company-id'
ORDER BY vendor_name;
```

## Key Endpoints & Routes

### Customer Portal
- **Portal Home**: `/portal`
- **Registration**: `/portal` (Register tab)
- **Login**: `/portal` (Sign In tab)
- After login, automatically goes to dashboard

### Internal Admin
- **Downstream Vendors**: Sidebar > ITAD > Downstream Vendors
- **Company Certifications**: Sidebar > Settings > Company Certifications
- **ITAD Projects**: Sidebar > ITAD > Projects
- **Certificates**: Sidebar > ITAD > Certificates
- **Environmental Compliance**: Sidebar > ITAD > Environmental Compliance

## Common Issues & Solutions

### Issue: Can't register in portal
**Solution**: Make sure you have a valid Customer ID from the customers table

### Issue: Customer can't see their projects
**Solution**: Verify the customer_id in customer_portal_users matches the itad_customer_id in itad_projects

### Issue: Revenue share not calculating
**Solution**: Make sure the asset has itad_project_id set, and the project has revenue_share_percentage set

### Issue: Downstream vendor certifications not showing as expiring
**Solution**: Set expiration date to less than 90 days from today

### Issue: Build fails
**Solution**: Run `npm run build` - it should succeed. If not, check for missing imports.

## Next Implementation Priority

1. **Email Notifications** (Most Important)
   - Notify customers when assets are received
   - Notify when certificates are ready
   - Notify when revenue shares are settled

2. **PDF Certificate Generation**
   - Professional PDF templates
   - Auto-generate and email to customers

3. **Link Receiving to Projects**
   - Update receiving workflow
   - Add project selector
   - Auto-link assets

## Customer Onboarding Process

When onboarding a new ITAD customer:

1. **Create Customer Record**
   ```sql
   INSERT INTO customers (company_id, name, business_type)
   VALUES ('your-company-id', 'Customer Name', 'itad_service_customer');
   ```

2. **Create ITAD Project**
   - Use internal UI: ITAD > Projects > New Project
   - Set service type and revenue share %

3. **Provide Portal Access**
   - Send customer their Customer ID (from step 1)
   - Send portal URL: `yourdomain.com/portal`
   - Instruct them to register

4. **Customer Registers**
   - They go to portal
   - Register with their Customer ID
   - Can immediately start submitting collection requests

## Troubleshooting RLS Policies

If a customer can't see their data:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'customer_portal_users',
  'collection_requests',
  'revenue_share_transactions',
  'itad_certificates'
);

-- Should all show rowsecurity = true

-- Check policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'customer_portal_users';
```

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs for RLS policy violations
3. Verify database foreign key relationships
4. Ensure customer_id matches across tables

## Success Indicators

You'll know it's working when:

- ✅ Customer can register and login to portal
- ✅ Customer sees their projects on dashboard
- ✅ Customer can submit collection requests
- ✅ Customer sees revenue share transactions
- ✅ Internal users can manage downstream vendors
- ✅ Internal users can track company certifications
- ✅ Revenue shares auto-calculate when assets are sold

## Production Deployment Notes

Before deploying to production:

1. **Security**
   - Implement proper password hashing (edge function)
   - Use HTTPS for all connections
   - Enable 2FA for internal users

2. **Email**
   - Set up email service (SendGrid, AWS SES, etc.)
   - Create notification templates
   - Test all notification triggers

3. **Monitoring**
   - Set up error tracking (Sentry, etc.)
   - Monitor API usage
   - Track customer portal usage metrics

4. **Backups**
   - Ensure Supabase backups are enabled
   - Test restore procedures
   - Document recovery plan

5. **Documentation**
   - Create customer user guide
   - Create internal admin guide
   - Document common workflows

## Resources

- **Main Documentation**: `CUSTOMER_PORTAL_AND_ITAD_IMPLEMENTATION.md`
- **Database Schema**: `supabase/migrations/create_customer_portal_and_advanced_itad.sql`
- **Customer Portal Code**: `src/components/customer-portal/`
- **ITAD Components**: `src/components/itad/`

---

**You're ready to test!** Start with step 1 above and work through the checklist.
