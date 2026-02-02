/**
 * @deprecated This module is LEGACY. Use contactService instead.
 * Party has been renamed to Contact at the database level.
 *
 * Migration:
 * - partyService → contactService
 * - party_id → contact_id
 * - party_type → contact roles
 */

import { contactService } from './contactService';

export { contactService as partyService };
export * from './contactService';
