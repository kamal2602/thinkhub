import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';
import { ContactService, contactService } from './contactService';

export interface Lead {
  id: string;
  company_id: string;
  lead_name: string;
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
  lead_source?: string;
  status: string;
  qualification_score?: number;
  assigned_to?: string;
  notes?: string;
  party_id: string;
  created_at: string;
  updated_at: string;
}

export interface LeadWithParty extends Lead {
  party_type: 'customer';
}

export interface Opportunity {
  id: string;
  company_id: string;
  party_id?: string;
  customer_id?: string;
  title: string;
  value_estimate?: number;
  probability_percent?: number;
  stage: string;
  expected_close_date?: string;
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OpportunityWithParty extends Opportunity {
  party?: any;
  party_type?: 'customer' | 'supplier';
}

export interface Activity {
  id: string;
  company_id: string;
  party_id?: string;
  activity_type: string;
  subject: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  assigned_to?: string;
  completed_at?: string;
  due_date?: string;
  created_at: string;
}

export interface ActivityWithParty extends Activity {
  party?: any;
  party_type?: 'customer' | 'supplier';
}

export interface Quote {
  id: string;
  company_id: string;
  quote_number: string;
  customer_id?: string;
  lead_id?: string;
  opportunity_id?: string;
  quote_date: string;
  expiry_date?: string;
  total_amount?: number;
  status: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface OpportunityStage {
  id: string;
  company_id: string;
  name: string;
  sort_order: number;
  is_closed: boolean;
  is_won: boolean;
  color?: string;
  created_at: string;
}

export interface LeadSource {
  id: string;
  company_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PipelineStats {
  total_opportunities: number;
  total_value: number;
  weighted_value: number;
  by_stage: Array<{
    stage: string;
    count: number;
    value: number;
  }>;
}

export interface CreateLeadInput {
  company_id: string;
  lead_name: string;
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: string;
  lead_source?: string;
  qualification_score?: number;
  assigned_to?: string;
  notes?: string;
}

export interface CreateOpportunityInput {
  company_id: string;
  party_id?: string;
  customer_id?: string;
  title: string;
  value_estimate?: number;
  probability_percent?: number;
  stage?: string;
  expected_close_date?: string;
  assigned_to?: string;
  notes?: string;
}

export interface CreateActivityInput {
  company_id: string;
  party_id?: string;
  activity_type: string;
  subject: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  assigned_to?: string;
  due_date?: string;
}

export class CRMService extends BaseService {
  private partyService: PartyService;

  constructor() {
    super();
    this.partyService = new PartyService();
  }

  async getLeads(companyId: string, filters?: {
    status?: string;
    assignedTo?: string;
    leadSource?: string;
  }): Promise<LeadWithParty[]> {
    try {
      let query = this.supabase
        .from('crm_leads')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      if (filters?.leadSource) {
        query = query.eq('source', filters.leadSource);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(lead => ({
        ...lead,
        lead_name: lead.name || '',
        company_name: lead.company || '',
        contact_email: lead.email || '',
        contact_phone: lead.phone || '',
        lead_source: lead.source || '',
        qualification_score: 50,
        party_id: lead.id,
        party_type: 'customer' as const,
      }));
    } catch (error) {
      return this.handleError(error, 'fetch leads');
    }
  }

  async getLeadById(id: string, companyId: string): Promise<LeadWithParty | null> {
    try {
      const { data, error } = await this.supabase
        .from('crm_leads')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        lead_name: data.name || '',
        company_name: data.company || '',
        contact_email: data.email || '',
        contact_phone: data.phone || '',
        lead_source: data.source || '',
        qualification_score: 50,
        party_id: data.id,
        party_type: 'customer' as const,
      };
    } catch (error) {
      return this.handleError(error, 'fetch lead');
    }
  }

  async createLead(input: CreateLeadInput): Promise<Lead> {
    try {
      const { data, error } = await this.supabase
        .from('crm_leads')
        .insert({
          company_id: input.company_id,
          name: input.lead_name,
          company: input.company_name || '',
          email: input.contact_email || '',
          phone: input.contact_phone || '',
          source: input.lead_source || '',
          status: input.status || 'new',
          notes: input.notes || '',
          assigned_to: input.assigned_to,
          created_by: input.assigned_to,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        company_id: data.company_id,
        lead_name: data.name,
        company_name: data.company,
        contact_email: data.email,
        contact_phone: data.phone,
        lead_source: data.source,
        status: data.status || 'new',
        qualification_score: 50,
        assigned_to: data.assigned_to,
        notes: data.notes,
        party_id: data.id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      return this.handleError(error, 'create lead');
    }
  }

  async updateLead(id: string, companyId: string, updates: Partial<Lead>): Promise<Lead> {
    try {
      const current = await this.getLeadById(id, companyId);
      if (!current) throw new Error('Lead not found');

      const { data, error } = await this.supabase
        .from('crm_leads')
        .update({
          name: updates.lead_name ?? current.lead_name,
          company: updates.company_name ?? current.company_name,
          email: updates.contact_email ?? current.contact_email,
          phone: updates.contact_phone ?? current.contact_phone,
          source: updates.lead_source ?? current.lead_source,
          status: updates.status ?? current.status,
          notes: updates.notes ?? current.notes,
          assigned_to: updates.assigned_to ?? current.assigned_to,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        company_id: data.company_id,
        lead_name: data.name,
        company_name: data.company,
        contact_email: data.email,
        contact_phone: data.phone,
        lead_source: data.source,
        status: data.status || 'new',
        qualification_score: 50,
        assigned_to: data.assigned_to,
        notes: data.notes,
        party_id: data.id,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      return this.handleError(error, 'update lead');
    }
  }

  async deleteLead(id: string, companyId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('crm_leads')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, 'delete lead');
    }
  }

  async convertLeadToOpportunity(
    leadId: string,
    companyId: string,
    opportunityData: {
      title: string;
      value_estimate?: number;
      stage?: string;
      expected_close_date?: string;
    }
  ): Promise<Opportunity> {
    try {
      const lead = await this.getLeadById(leadId, companyId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Auto-create contact from lead if not exists
      let contactId: string | undefined;

      // Check if a contact already exists for this lead (by email)
      if (lead.contact_email) {
        const { data: existingContact } = await this.supabase
          .from('contacts')
          .select('id')
          .eq('company_id', companyId)
          .eq('email', lead.contact_email)
          .maybeSingle();

        contactId = existingContact?.id;
      }

      // If no existing contact, create one
      if (!contactId) {
        const { data: newContact, error: contactError } = await this.supabase
          .from('contacts')
          .insert({
            company_id: companyId,
            name: lead.company_name || lead.lead_name,
            type: lead.company_name ? 'company' : 'individual',
            email: lead.contact_email || '',
            phone: lead.contact_phone || '',
            created_by: lead.assigned_to || lead.created_by,
          })
          .select('id')
          .single();

        if (contactError) throw contactError;
        contactId = newContact.id;

        // Add customer role to the new contact
        await this.supabase
          .from('contact_roles')
          .insert({
            company_id: companyId,
            contact_id: contactId,
            role_key: 'customer',
            is_active: true,
            created_by: lead.assigned_to || lead.created_by,
          });
      }

      const opportunity = await this.createOpportunity({
        company_id: companyId,
        customer_id: contactId,
        title: opportunityData.title,
        value_estimate: opportunityData.value_estimate,
        stage: opportunityData.stage || 'prospecting',
        expected_close_date: opportunityData.expected_close_date,
        assigned_to: lead.assigned_to,
      });

      await this.updateLead(leadId, companyId, {
        status: 'converted',
      });

      return opportunity;
    } catch (error) {
      return this.handleError(error, 'convert lead to opportunity');
    }
  }

  async convertProspectToCustomer(prospectId: string, companyId: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('convert_prospect_to_customer', {
        prospect_id: prospectId,
      });

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, 'convert prospect to customer');
    }
  }

  async getOpportunities(companyId: string, filters?: {
    stage?: string;
    assignedTo?: string;
  }): Promise<OpportunityWithParty[]> {
    try {
      let query = this.supabase
        .from('crm_opportunities')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.stage) {
        query = query.eq('stage', filters.stage);
      }

      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      const opportunitiesWithParty = await Promise.all(
        (data || []).map(async (opp) => {
          let party = null;
          let party_type: 'customer' | 'supplier' | undefined;

          if (opp.customer_id) {
            const { data: customerData } = await this.supabase
              .from('contacts')
              .select('*')
              .eq('id', opp.customer_id)
              .maybeSingle();

            if (customerData) {
              party = customerData;
              party_type = 'customer';
            }
          }

          return {
            ...opp,
            title: opp.name || 'Untitled Opportunity',
            value_estimate: opp.value ? parseFloat(opp.value) : undefined,
            probability_percent: opp.probability ? parseInt(opp.probability) : undefined,
            party_id: opp.customer_id,
            party,
            party_type,
          };
        })
      );

      return opportunitiesWithParty;
    } catch (error) {
      return this.handleError(error, 'fetch opportunities');
    }
  }

  async getOpportunityById(id: string, companyId: string): Promise<OpportunityWithParty | null> {
    try {
      const { data, error } = await this.supabase
        .from('crm_opportunities')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      let party = null;
      let party_type: 'customer' | 'supplier' | undefined;

      if (data.customer_id) {
        const { data: customerData } = await this.supabase
          .from('contacts')
          .select('*')
          .eq('id', data.customer_id)
          .maybeSingle();

        if (customerData) {
          party = customerData;
          party_type = 'customer';
        }
      }

      return {
        ...data,
        title: data.name || 'Untitled Opportunity',
        value_estimate: data.value ? parseFloat(data.value) : undefined,
        probability_percent: data.probability ? parseInt(data.probability) : undefined,
        party_id: data.customer_id,
        party,
        party_type,
      };
    } catch (error) {
      return this.handleError(error, 'fetch opportunity');
    }
  }

  async createOpportunity(input: CreateOpportunityInput): Promise<Opportunity> {
    try {
      const { data, error } = await this.supabase
        .from('crm_opportunities')
        .insert({
          company_id: input.company_id,
          customer_id: input.customer_id || input.party_id,
          name: input.title,
          value: input.value_estimate,
          probability: input.probability_percent || 50,
          stage: input.stage || 'prospecting',
          expected_close_date: input.expected_close_date,
          notes: input.notes,
          assigned_to: input.assigned_to,
          created_by: input.assigned_to,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        title: data.name,
        value_estimate: data.value ? parseFloat(data.value) : undefined,
        probability_percent: data.probability ? parseInt(data.probability) : undefined,
        party_id: data.customer_id,
      };
    } catch (error) {
      return this.handleError(error, 'create opportunity');
    }
  }

  async updateOpportunity(id: string, companyId: string, updates: Partial<Opportunity>): Promise<Opportunity> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title) updateData.name = updates.title;
      if (updates.value_estimate !== undefined) updateData.value = updates.value_estimate;
      if (updates.probability_percent !== undefined) updateData.probability = updates.probability_percent;
      if (updates.stage) updateData.stage = updates.stage;
      if (updates.expected_close_date) updateData.expected_close_date = updates.expected_close_date;
      if (updates.notes) updateData.notes = updates.notes;
      if (updates.assigned_to) updateData.assigned_to = updates.assigned_to;

      const { data, error } = await this.supabase
        .from('crm_opportunities')
        .update(updateData)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        title: data.name,
        value_estimate: data.value ? parseFloat(data.value) : undefined,
        probability_percent: data.probability ? parseInt(data.probability) : undefined,
        party_id: data.customer_id,
      };
    } catch (error) {
      return this.handleError(error, 'update opportunity');
    }
  }

  async deleteOpportunity(id: string, companyId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('crm_opportunities')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, 'delete opportunity');
    }
  }

  async getActivities(companyId: string, filters?: {
    partyId?: string;
    entityType?: string;
    entityId?: string;
    assignedTo?: string;
    completed?: boolean;
  }): Promise<ActivityWithParty[]> {
    try {
      let query = this.supabase
        .from('activities')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (filters?.partyId) {
        query = query.eq('party_id', filters.partyId);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.entityId) {
        query = query.eq('entity_id', filters.entityId);
      }

      if (filters?.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      if (filters?.completed !== undefined) {
        if (filters.completed) {
          query = query.not('completed_at', 'is', null);
        } else {
          query = query.is('completed_at', null);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const activitiesWithParty = await Promise.all(
        (data || []).map(async (activity) => {
          if (activity.party_id) {
            const { data: party } = await this.supabase
              .from('customers')
              .select('*')
              .eq('id', activity.party_id)
              .maybeSingle();

            return {
              ...activity,
              party,
              party_type: 'customer' as const,
            };
          }
          return activity;
        })
      );

      return activitiesWithParty;
    } catch (error) {
      return this.handleError(error, 'fetch activities');
    }
  }

  async createActivity(input: CreateActivityInput): Promise<Activity> {
    try {
      const { data, error } = await this.supabase
        .from('activities')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'create activity');
    }
  }

  async updateActivity(id: string, companyId: string, updates: Partial<Activity>): Promise<Activity> {
    try {
      const { data, error } = await this.supabase
        .from('activities')
        .update(updates)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'update activity');
    }
  }

  async completeActivity(id: string, companyId: string): Promise<Activity> {
    return this.updateActivity(id, companyId, {
      completed_at: new Date().toISOString(),
    });
  }

  async deleteActivity(id: string, companyId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('activities')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, 'delete activity');
    }
  }

  async getPipelineStats(companyId: string): Promise<PipelineStats> {
    try {
      const opportunities = await this.getOpportunities(companyId);

      const stats: PipelineStats = {
        total_opportunities: opportunities.length,
        total_value: 0,
        weighted_value: 0,
        by_stage: [],
      };

      const stageMap = new Map<string, { count: number; value: number }>();

      opportunities.forEach((opp) => {
        const value = opp.value_estimate || 0;
        const probability = (opp.probability_percent || 0) / 100;

        stats.total_value += value;
        stats.weighted_value += value * probability;

        const existing = stageMap.get(opp.stage) || { count: 0, value: 0 };
        stageMap.set(opp.stage, {
          count: existing.count + 1,
          value: existing.value + value,
        });
      });

      stats.by_stage = Array.from(stageMap.entries()).map(([stage, data]) => ({
        stage,
        count: data.count,
        value: data.value,
      }));

      return stats;
    } catch (error) {
      return this.handleError(error, 'fetch pipeline stats');
    }
  }

  async getOpportunityStages(companyId: string): Promise<OpportunityStage[]> {
    try {
      const { data, error } = await this.supabase
        .from('opportunity_stages')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      return this.handleError(error, 'fetch opportunity stages');
    }
  }

  async createOpportunityStage(companyId: string, input: {
    name: string;
    sort_order?: number;
    is_closed?: boolean;
    is_won?: boolean;
    color?: string;
  }): Promise<OpportunityStage> {
    try {
      const { data, error } = await this.supabase
        .from('opportunity_stages')
        .insert({
          company_id: companyId,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'create opportunity stage');
    }
  }

  async getLeadSources(companyId: string): Promise<LeadSource[]> {
    try {
      const { data, error } = await this.supabase
        .from('lead_sources')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      return this.handleError(error, 'fetch lead sources');
    }
  }

  async createLeadSource(companyId: string, input: {
    name: string;
    sort_order?: number;
  }): Promise<LeadSource> {
    try {
      const { data, error } = await this.supabase
        .from('lead_sources')
        .insert({
          company_id: companyId,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'create lead source');
    }
  }
}

export const crmService = new CRMService();
