import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export interface PartyLink {
  id: string;
  company_id: string;
  source_type: string;
  source_id: string;
  party_type: 'customer' | 'supplier';
  party_id: string;
  linked_at: string;
  linked_by?: string;
  link_method: 'manual' | 'auto' | 'import' | 'suggested';
  confidence_score?: number;
  notes?: string;
  created_at: string;
}

export interface PartyResolution {
  found: boolean;
  party_type?: 'customer' | 'supplier';
  party_id?: string;
  party?: any;
  link?: PartyLink;
}

export interface PartySuggestion {
  party_type: 'customer' | 'supplier';
  party_id: string;
  party: any;
  match_score: number;
  match_reason: string;
}

export interface PartyProfile {
  party: any;
  party_type: 'customer' | 'supplier';
  linked_sources: Array<{
    link: PartyLink;
    source_data?: any;
  }>;
}

export class PartyService extends BaseService {
  /**
   * Link a source record to a Party
   */
  async linkToParty(
    companyId: string,
    sourceType: string,
    sourceId: string,
    partyType: 'customer' | 'supplier',
    partyId: string,
    options?: {
      linkedBy?: string;
      method?: 'manual' | 'auto' | 'import' | 'suggested';
      confidenceScore?: number;
      notes?: string;
    }
  ): Promise<PartyLink> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('party_links')
        .insert({
          company_id: companyId,
          source_type: sourceType,
          source_id: sourceId,
          party_type: partyType,
          party_id: partyId,
          linked_by: options?.linkedBy,
          link_method: options?.method || 'manual',
          confidence_score: options?.confidenceScore,
          notes: options?.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to link to party');
  }

  /**
   * Resolve a source record to its Party
   */
  async resolveParty(
    companyId: string,
    sourceType: string,
    sourceId: string
  ): Promise<PartyResolution> {
    return this.executeQuery(async () => {
      const { data: link, error: linkError } = await supabase
        .from('party_links')
        .select('*')
        .eq('company_id', companyId)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .maybeSingle();

      if (linkError) throw linkError;

      if (!link) {
        return { found: false };
      }

      const table = link.party_type === 'customer' ? 'customers' : 'suppliers';
      const { data: party, error: partyError } = await supabase
        .from(table)
        .select('*')
        .eq('id', link.party_id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (partyError) throw partyError;

      return {
        found: true,
        party_type: link.party_type,
        party_id: link.party_id,
        party: party,
        link: link,
      };
    }, 'Failed to resolve party');
  }

  /**
   * Find suggested Party matches for a source record
   */
  async suggestPartyMatches(
    companyId: string,
    searchCriteria: {
      email?: string;
      phone?: string;
      name?: string;
    }
  ): Promise<PartySuggestion[]> {
    return this.executeQuery(async () => {
      const suggestions: PartySuggestion[] = [];

      if (searchCriteria.email) {
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('company_id', companyId)
          .ilike('email', searchCriteria.email);

        if (customers) {
          customers.forEach((c) => {
            suggestions.push({
              party_type: 'customer',
              party_id: c.id,
              party: c,
              match_score: 0.95,
              match_reason: 'Email match',
            });
          });
        }

        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('*')
          .eq('company_id', companyId)
          .ilike('email', searchCriteria.email);

        if (suppliers) {
          suppliers.forEach((s) => {
            suggestions.push({
              party_type: 'supplier',
              party_id: s.id,
              party: s,
              match_score: 0.95,
              match_reason: 'Email match',
            });
          });
        }
      }

      if (searchCriteria.name && suggestions.length === 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('*')
          .eq('company_id', companyId)
          .ilike('name', `%${searchCriteria.name}%`)
          .limit(5);

        if (customers) {
          customers.forEach((c) => {
            suggestions.push({
              party_type: 'customer',
              party_id: c.id,
              party: c,
              match_score: 0.70,
              match_reason: 'Name similarity',
            });
          });
        }

        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('*')
          .eq('company_id', companyId)
          .ilike('name', `%${searchCriteria.name}%`)
          .limit(5);

        if (suppliers) {
          suppliers.forEach((s) => {
            suggestions.push({
              party_type: 'supplier',
              party_id: s.id,
              party: s,
              match_score: 0.70,
              match_reason: 'Name similarity',
            });
          });
        }
      }

      return suggestions.sort((a, b) => b.match_score - a.match_score);
    }, 'Failed to suggest party matches');
  }

  /**
   * Get all Party links for a specific Party
   */
  async getPartyLinks(
    companyId: string,
    partyType: 'customer' | 'supplier',
    partyId: string
  ): Promise<PartyLink[]> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('party_links')
        .select('*')
        .eq('company_id', companyId)
        .eq('party_type', partyType)
        .eq('party_id', partyId)
        .order('linked_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch party links');
  }

  /**
   * Get complete Party profile with all linked sources
   */
  async getPartyProfile(
    companyId: string,
    partyType: 'customer' | 'supplier',
    partyId: string
  ): Promise<PartyProfile> {
    return this.executeQuery(async () => {
      const table = partyType === 'customer' ? 'customers' : 'suppliers';
      const { data: party, error: partyError } = await supabase
        .from(table)
        .select('*')
        .eq('id', partyId)
        .eq('company_id', companyId)
        .single();

      if (partyError) throw partyError;

      const links = await this.getPartyLinks(companyId, partyType, partyId);

      const linkedSources = links.map((link) => ({
        link,
        source_data: undefined,
      }));

      return {
        party,
        party_type: partyType,
        linked_sources: linkedSources,
      };
    }, 'Failed to fetch party profile');
  }

  /**
   * Unlink a source record from its Party
   */
  async unlinkFromParty(
    companyId: string,
    sourceType: string,
    sourceId: string
  ): Promise<void> {
    return this.executeQuery(async () => {
      const { error } = await supabase
        .from('party_links')
        .delete()
        .eq('company_id', companyId)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId);

      if (error) throw error;
    }, 'Failed to unlink from party');
  }

  /**
   * Update Party link metadata
   */
  async updatePartyLink(
    linkId: string,
    companyId: string,
    updates: {
      link_method?: 'manual' | 'auto' | 'import' | 'suggested';
      confidence_score?: number;
      notes?: string;
    }
  ): Promise<PartyLink> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('party_links')
        .update(updates)
        .eq('id', linkId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }, 'Failed to update party link');
  }

  /**
   * Get all Parties (customers + suppliers) for a company
   */
  async getAllParties(
    companyId: string,
    options?: {
      search?: string;
      partyType?: 'customer' | 'supplier';
      limit?: number;
      offset?: number;
    }
  ): Promise<{ parties: any[]; total: number }> {
    return this.executeQuery(async () => {
      const parties: any[] = [];

      if (!options?.partyType || options.partyType === 'customer') {
        let query = supabase
          .from('customers')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId);

        if (options?.search) {
          query = query.or(
            `name.ilike.%${options.search}%,email.ilike.%${options.search}%,phone.ilike.%${options.search}%`
          );
        }

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        if (options?.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const { data: customers, error: custError, count: custCount } = await query;
        if (custError) throw custError;

        if (customers) {
          parties.push(
            ...customers.map((c) => ({ ...c, party_type: 'customer' as const }))
          );
        }
      }

      if (!options?.partyType || options.partyType === 'supplier') {
        let query = supabase
          .from('suppliers')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId);

        if (options?.search) {
          query = query.or(
            `name.ilike.%${options.search}%,email.ilike.%${options.search}%,phone.ilike.%${options.search}%`
          );
        }

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        if (options?.offset) {
          query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        }

        const { data: suppliers, error: suppError, count: suppCount } = await query;
        if (suppError) throw suppError;

        if (suppliers) {
          parties.push(
            ...suppliers.map((s) => ({ ...s, party_type: 'supplier' as const }))
          );
        }
      }

      return {
        parties,
        total: parties.length,
      };
    }, 'Failed to fetch all parties');
  }

  /**
   * Check if a source record is already linked to a Party
   */
  async isLinked(
    companyId: string,
    sourceType: string,
    sourceId: string
  ): Promise<boolean> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('party_links')
        .select('id')
        .eq('company_id', companyId)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    }, 'Failed to check link status');
  }

  /**
   * Get statistics about Party links
   */
  async getPartyLinkStats(companyId: string): Promise<{
    total_links: number;
    by_source_type: Record<string, number>;
    by_link_method: Record<string, number>;
  }> {
    return this.executeQuery(async () => {
      const { data: links, error } = await supabase
        .from('party_links')
        .select('source_type, link_method')
        .eq('company_id', companyId);

      if (error) throw error;

      const bySourceType: Record<string, number> = {};
      const byLinkMethod: Record<string, number> = {};

      links?.forEach((link) => {
        bySourceType[link.source_type] = (bySourceType[link.source_type] || 0) + 1;
        byLinkMethod[link.link_method] = (byLinkMethod[link.link_method] || 0) + 1;
      });

      return {
        total_links: links?.length || 0,
        by_source_type: bySourceType,
        by_link_method: byLinkMethod,
      };
    }, 'Failed to fetch party link stats');
  }
}

export const partyService = new PartyService();
