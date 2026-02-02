import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export interface Contact {
  id: string;
  company_id: string;
  contact_code: string;
  name: string;
  legal_name?: string;
  type: 'company' | 'individual';
  parent_contact_id?: string;
  is_archived: boolean;
  is_active: boolean;
  display_name?: string;
  tax_id?: string;
  website?: string;
  email?: string;
  phone?: string;
  credit_limit?: number;
  payment_terms?: string;
  tags?: string[];
  metadata?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  roles?: string[];
}

export interface ContactRole {
  id: string;
  company_id: string;
  contact_id: string;
  role_key: 'customer' | 'vendor' | 'carrier' | 'broker' | 'recycler' | 'bidder' | 'consignor' | 'internal';
  is_active: boolean;
  created_at: string;
  created_by?: string;
}

export class ContactService extends BaseService {
  async getContacts(
    companyId: string,
    options?: {
      search?: string;
      type?: 'company' | 'individual';
      role?: string;
      parentContactId?: string;
      includeArchived?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ contacts: Contact[]; total: number }> {
    return this.executeQuery(async () => {
      let query = supabase
        .from('contacts_with_roles')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId);

      if (!options?.includeArchived) {
        query = query.eq('is_archived', false);
      }

      if (options?.type) {
        query = query.eq('type', options.type);
      }

      if (options?.parentContactId) {
        query = query.eq('parent_contact_id', options.parentContactId);
      }

      if (options?.search) {
        query = query.or(
          `name.ilike.%${options.search}%,email.ilike.%${options.search}%,phone.ilike.%${options.search}%`
        );
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      query = query.order('name');

      const { data, error, count } = await query;
      if (error) throw error;

      let contacts = data || [];
      if (options?.role) {
        contacts = contacts.filter((c: any) => c.roles?.includes(options.role));
      }

      return { contacts: contacts as Contact[], total: count || 0 };
    }, 'Failed to fetch contacts');
  }

  async getContact(companyId: string, contactId: string): Promise<Contact> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('contacts_with_roles')
        .select('*')
        .eq('id', contactId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data as Contact;
    }, 'Failed to fetch contact');
  }

  async createContact(
    companyId: string,
    contact: Partial<Contact>,
    roles?: string[]
  ): Promise<Contact> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...contact, company_id: companyId, type: contact.type || 'company' })
        .select()
        .single();

      if (error) throw error;

      if (roles && roles.length > 0) {
        await this.addContactRoles(companyId, data.id, roles);
      }

      return data as Contact;
    }, 'Failed to create contact');
  }

  async updateContact(
    companyId: string,
    contactId: string,
    updates: Partial<Contact>
  ): Promise<Contact> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', contactId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data as Contact;
    }, 'Failed to update contact');
  }

  async deleteContact(companyId: string, contactId: string): Promise<void> {
    return this.executeQuery(async () => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('company_id', companyId);

      if (error) throw error;
    }, 'Failed to delete contact');
  }

  async addContactRoles(companyId: string, contactId: string, roles: string[]): Promise<void> {
    return this.executeQuery(async () => {
      const { error } = await supabase
        .from('contact_roles')
        .upsert(roles.map(role => ({
          company_id: companyId,
          contact_id: contactId,
          role_key: role,
        })), { onConflict: 'contact_id,role_key' });

      if (error) throw error;
    }, 'Failed to add contact roles');
  }

  async getCustomers(companyId: string): Promise<Contact[]> {
    const { contacts } = await this.getContacts(companyId, { role: 'customer' });
    return contacts;
  }

  async getVendors(companyId: string): Promise<Contact[]> {
    const { contacts } = await this.getContacts(companyId, { role: 'vendor' });
    return contacts;
  }
}

export const contactService = new ContactService();
