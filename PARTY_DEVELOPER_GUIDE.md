# Party System - Developer Quick Reference

**Version:** 1.0
**Date:** February 1, 2026
**Status:** Production Ready

---

## Quick Start

### What is the Party System?

The Party System prevents identity fragmentation by providing a unified identity layer. Instead of creating separate identity tables, all modules use `customers` and `suppliers` tables with links.

**One Person = One Party Record = Multiple Roles**

---

## For New Module Development

### DON'T Do This ❌

```typescript
// Wrong: Creating a new identity table
CREATE TABLE website_customers (
  id uuid PRIMARY KEY,
  name text,
  email text,
  phone text,
  address text,
  ...
);
```

### DO This Instead ✅

```typescript
// Correct: Use existing customers table + metadata
CREATE TABLE website_customer_metadata (
  id uuid PRIMARY KEY,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  cart_preferences jsonb,
  wishlist jsonb,
  marketing_consent boolean,
  last_visit timestamptz,
  ...
);

// Link it via party_links
INSERT INTO party_links (company_id, source_type, source_id, party_type, party_id)
VALUES (company_id, 'website_customer', metadata_id, 'customer', customer_id);
```

---

## Common Patterns

### Pattern 1: Check for Existing Party

```typescript
import { partyService } from './services/partyService';

async function createOrLinkCustomer(email: string, name: string) {
  const companyId = getCurrentCompanyId();

  // Suggest matches by email
  const suggestions = await partyService.suggestPartyMatches(companyId, { email });

  if (suggestions.length > 0) {
    // Show UI: "Found existing customer. Link?"
    const party = suggestions[0];
    return party.party_id;
  } else {
    // Create new customer
    const { data } = await supabase
      .from('customers')
      .insert({ company_id: companyId, name, email, entity_type: 'website_customer' })
      .select()
      .single();

    return data.id;
  }
}
```

### Pattern 2: Link Source to Party

```typescript
async function linkLeadToCustomer(leadId: string, customerId: string) {
  const companyId = getCurrentCompanyId();
  const userId = getCurrentUserId();

  await partyService.linkToParty(
    companyId,
    'lead',           // source_type
    leadId,           // source_id
    'customer',       // party_type
    customerId,       // party_id
    {
      linkedBy: userId,
      method: 'manual',
      notes: 'CRM lead converted to customer'
    }
  );
}
```

### Pattern 3: Resolve Source to Party

```typescript
async function getBuyerDetails(buyerAccountId: string) {
  const companyId = getCurrentCompanyId();

  // Resolve buyer_account to customer
  const resolution = await partyService.resolveParty(
    companyId,
    'buyer_account',
    buyerAccountId
  );

  if (resolution.found) {
    const customer = resolution.party;
    console.log('Customer:', customer.name, customer.email);
    return customer;
  } else {
    throw new Error('Buyer account not linked to customer');
  }
}
```

### Pattern 4: Get Complete Party Profile

```typescript
async function getUnifiedCustomerView(customerId: string) {
  const companyId = getCurrentCompanyId();

  const profile = await partyService.getPartyProfile(
    companyId,
    'customer',
    customerId
  );

  // profile.party = customer record
  // profile.linked_sources = array of all linked records

  return {
    customer: profile.party,
    linkedRecords: profile.linked_sources.map(ls => ({
      type: ls.link.source_type,
      id: ls.link.source_id,
      linkedAt: ls.link.linked_at,
      method: ls.link.link_method
    }))
  };
}
```

---

## Entity Types (Party Roles)

### Customer Roles (Buyer-Side)

| Code | Name | Use Case |
|------|------|----------|
| `sales_customer` | Sales Customer | Direct B2B equipment buyer |
| `itad_client` | ITAD Client | Using ITAD services |
| `prospect` | Prospect | CRM lead (not yet customer) |
| `auction_buyer` | Auction Buyer | Registered auction participant |
| `website_customer` | Website Customer | eCommerce online buyer |
| `distributor` | Distributor | Resale partner |
| `end_user` | End User | Final consumer |
| `consignment_client` | Consignment Client | Selling equipment on consignment |

### Supplier Roles (Seller-Side)

| Code | Name | Use Case |
|------|------|----------|
| `purchase_vendor` | Purchase Vendor | Direct equipment supplier |
| `consignment_vendor` | Consignment Vendor | Providing goods on consignment |
| `downstream_recycler` | Downstream Recycler | Materials/components buyer |
| `service_provider` | Service Provider | External contractor |
| `manufacturer` | Manufacturer | OEM |

### Setting Entity Type

```typescript
// Single role
INSERT INTO customers (name, email, entity_type)
VALUES ('Acme Corp', 'contact@acme.com', 'sales_customer');

// Multiple roles (comma-separated)
UPDATE customers
SET entity_type = 'prospect,sales_customer,auction_buyer'
WHERE id = customer_id;
```

---

## UI Integration

### Adding PartyLinksWidget to Your Component

```tsx
import { PartyLinksWidget } from '../components/common/PartyLinksWidget';

function CustomerDetailPage({ customerId }: { customerId: string }) {
  return (
    <div>
      {/* ... other customer details ... */}

      <div className="mt-6">
        <PartyLinksWidget
          partyType="customer"
          partyId={customerId}
          partyName={customer.name}
        />
      </div>
    </div>
  );
}
```

---

## Database Queries

### Get Party with All Links

```sql
SELECT * FROM party_unified_view
WHERE party_id = 'customer-uuid-here'
  AND company_id = 'company-uuid-here';
```

### Find Parties Active in Multiple Channels

```sql
SELECT
  c.id,
  c.name,
  c.email,
  COUNT(pl.id) AS link_count,
  array_agg(pl.source_type) AS source_types
FROM customers c
LEFT JOIN party_links pl ON pl.party_id = c.id AND pl.party_type = 'customer'
WHERE c.company_id = 'company-uuid-here'
GROUP BY c.id, c.name, c.email
HAVING COUNT(pl.id) >= 2
ORDER BY link_count DESC;
```

### Check if Source is Linked

```sql
SELECT EXISTS (
  SELECT 1 FROM party_links
  WHERE company_id = 'company-uuid-here'
    AND source_type = 'lead'
    AND source_id = 'lead-uuid-here'
);
```

---

## Service API Reference

### `partyService.linkToParty()`

**Purpose:** Link a source record to a Party

```typescript
await partyService.linkToParty(
  companyId: string,
  sourceType: string,      // 'lead', 'buyer_account', etc.
  sourceId: string,        // UUID of source record
  partyType: 'customer' | 'supplier',
  partyId: string,         // UUID of customer/supplier
  options?: {
    linkedBy?: string,
    method?: 'manual' | 'auto' | 'import' | 'suggested',
    confidenceScore?: number,  // 0.00 to 1.00
    notes?: string
  }
): Promise<PartyLink>
```

### `partyService.resolveParty()`

**Purpose:** Resolve a source record to its Party

```typescript
await partyService.resolveParty(
  companyId: string,
  sourceType: string,
  sourceId: string
): Promise<{
  found: boolean;
  party_type?: 'customer' | 'supplier';
  party_id?: string;
  party?: any;
  link?: PartyLink;
}>
```

### `partyService.suggestPartyMatches()`

**Purpose:** Find potential Party matches

```typescript
await partyService.suggestPartyMatches(
  companyId: string,
  searchCriteria: {
    email?: string,
    phone?: string,
    name?: string
  }
): Promise<Array<{
  party_type: 'customer' | 'supplier';
  party_id: string;
  party: any;
  match_score: number;      // 0.00 to 1.00
  match_reason: string;     // 'Email match', 'Name similarity', etc.
}>>
```

### `partyService.getPartyLinks()`

**Purpose:** Get all links for a Party

```typescript
await partyService.getPartyLinks(
  companyId: string,
  partyType: 'customer' | 'supplier',
  partyId: string
): Promise<PartyLink[]>
```

### `partyService.unlinkFromParty()`

**Purpose:** Remove a link

```typescript
await partyService.unlinkFromParty(
  companyId: string,
  sourceType: string,
  sourceId: string
): Promise<void>
```

### `partyService.isLinked()`

**Purpose:** Check if source is already linked

```typescript
await partyService.isLinked(
  companyId: string,
  sourceType: string,
  sourceId: string
): Promise<boolean>
```

---

## Testing Your Integration

### 1. Unit Tests

```typescript
import { partyService } from './services/partyService';

test('should link lead to customer', async () => {
  const link = await partyService.linkToParty(
    companyId,
    'lead',
    leadId,
    'customer',
    customerId,
    { method: 'manual' }
  );

  expect(link.source_type).toBe('lead');
  expect(link.party_id).toBe(customerId);
});

test('should resolve lead to customer', async () => {
  const resolution = await partyService.resolveParty(
    companyId,
    'lead',
    leadId
  );

  expect(resolution.found).toBe(true);
  expect(resolution.party.id).toBe(customerId);
});
```

### 2. Manual Testing

1. Create a customer: `INSERT INTO customers ...`
2. Go to Settings → System → Party Directory
3. Find your customer in the list
4. Click "Add Link"
5. Link a test source record
6. Verify link appears in the list

---

## Troubleshooting

### Error: "Invalid customer party_id"

**Cause:** The party_id doesn't exist in the customers/suppliers table

**Fix:** Verify the party_id exists before linking:
```typescript
const { data } = await supabase
  .from('customers')
  .select('id')
  .eq('id', partyId)
  .eq('company_id', companyId)
  .maybeSingle();

if (!data) {
  throw new Error('Customer not found');
}
```

### Error: "duplicate key value violates unique constraint"

**Cause:** The source record is already linked

**Fix:** Check if linked first:
```typescript
const isLinked = await partyService.isLinked(companyId, sourceType, sourceId);
if (isLinked) {
  // Either unlink first, or skip linking
}
```

### Links Not Showing in UI

**Cause:** RLS policy blocking access

**Fix:** Verify the user's company_id matches the link's company_id

---

## Migration Path

### Current State
- Existing tables remain unchanged
- Linking is optional
- No breaking changes

### When to Adopt
- **New modules:** Use Party system from day 1
- **Existing modules:** Adopt gradually, no rush
- **Phase 4 (future):** Full migration and enforcement

### Adoption Strategy
1. Start using for new identity records
2. Gradually link existing records via admin UI
3. Once 80%+ linked, enable enforcement
4. Migrate remaining records via script

---

## Best Practices

1. **Always check for existing Party before creating new one**
2. **Use entity_type for role classification, not separate tables**
3. **Store module-specific data in separate metadata tables**
4. **Link via party_links, don't store party_id directly**
5. **Use meaningful source_type names (e.g., 'crm_lead', not 'lead')**
6. **Add notes when manually linking for audit trail**
7. **Suggest matches, don't auto-link without confirmation**

---

## FAQs

**Q: Should I create a new identity table for my module?**
A: No. Use existing `customers` or `suppliers` table with module-specific metadata table.

**Q: What if I need custom fields for my module?**
A: Create a separate metadata table linked to customers.id.

**Q: How do I handle anonymous users (website visitors)?**
A: Create customer record with placeholder name, link via party_links after sign-up.

**Q: Can one source be linked to multiple Parties?**
A: No. One source → one Party (enforced by unique constraint).

**Q: Can one Party have multiple source links?**
A: Yes. One Party → many sources (customer, lead, buyer_account, etc.).

**Q: Should I use customer_id or party_id in my tables?**
A: Use `customer_id` directly. party_links is for mapping disparate sources, not for regular FKs.

---

## Support

- **Documentation:** See `PARTY_SYSTEM_ANALYSIS_AND_PLAN.md` for full technical spec
- **Architecture:** See `PARTY_ARCHITECTURE_VISUAL.md` for diagrams
- **Business Case:** See `PARTY_SYSTEM_RECOMMENDATIONS.md`

---

**Last Updated:** February 1, 2026
**Version:** 1.0
**Status:** Production Ready ✅
