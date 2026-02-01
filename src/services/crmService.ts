import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';
import { PartyService } from './partyService';

export interface Lead {
  id: string;
  company_id: string;
  party_id?: string;
  status: string;
  lead_source?: string;
  qualification_score?: number;
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadWithParty extends Lead {
  party?: any;
  party_type?: 'customer' | 'supplier';
}

export interface Opportunity {
  id: string;
  company_id: string;
  party_id?: string;
  lead_id?: string;
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
  lead?: Lead;
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
  party_id?: string;
  status?: string;
  lead_source?: string;
  qualification_score?: number;
  assigned_to?: string;
  notes?: string;
}

export interface CreateOpportunityInput {
  company_id: string;
  party_id?: string;
  lead_id?: string;
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
        .from('leads')
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
        query = query.eq('lead_source', filters.leadSource);
      }

      const { data, error } = await query;
      if (error) throw error;

      const leadsWithParty = await Promise.all(
        (data || []).map(async (lead) => {
          if (lead.party_id) {
            const { data: party } = await this.supabase
              .from('customers')
              .select('*')
              .eq('id', lead.party_id)
              .maybeSingle();

            return {
              ...lead,
              party,
              party_type: 'customer' as const,
            };
          }
          return lead;
        })
      );

      return leadsWithParty;
    } catch (error) {
      return this.handleError(error, 'fetch leads');
    }
  }

  async getLeadById(id: string, companyId: string): Promise<LeadWithParty | null> {
    try {
      const { data, error } = await this.supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      if (data.party_id) {
        const { data: party } = await this.supabase
          .from('customers')
          .select('*')
          .eq('id', data.party_id)
          .maybeSingle();

        return {
          ...data,
          party,
          party_type: 'customer',
        };
      }

      return data;
    } catch (error) {
      return this.handleError(error, 'fetch lead');
    }
  }

  async createLead(input: CreateLeadInput): Promise<Lead> {
    try {
      const { data, error } = await this.supabase
        .from('leads')
        .insert({
          ...input,
          status: input.status || 'new',
        })
        .select()
        .single();

      if (error) throw error;

      if (input.party_id) {
        await this.partyService.linkToParty(
          input.company_id,
          'lead',
          data.id,
          'customer',
          input.party_id,
          { method: 'manual' }
        );
      }

      return data;
    } catch (error) {
      return this.handleError(error, 'create lead');
    }
  }

  async updateLead(id: string, companyId: string, updates: Partial<Lead>): Promise<Lead> {
    try {
      const { data, error } = await this.supabase
        .from('leads')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'update lead');
    }
  }

  async deleteLead(id: string, companyId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('leads')
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

      const opportunity = await this.createOpportunity({
        company_id: companyId,
        party_id: lead.party_id,
        lead_id: leadId,
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

  async getOpportunities(companyId: string, filters?: {
    stage?: string;
    assignedTo?: string;
  }): Promise<OpportunityWithParty[]> {
    try {
      let query = this.supabase
        .from('opportunities')
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

          if (opp.party_id) {
            const { data: customerData } = await this.supabase
              .from('customers')
              .select('*')
              .eq('id', opp.party_id)
              .maybeSingle();

            if (customerData) {
              party = customerData;
              party_type = 'customer';
            }
          }

          let lead = null;
          if (opp.lead_id) {
            const { data: leadData } = await this.supabase
              .from('leads')
              .select('*')
              .eq('id', opp.lead_id)
              .maybeSingle();

            lead = leadData;
          }

          return {
            ...opp,
            party,
            party_type,
            lead,
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
        .from('opportunities')
        .select('*')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      let party = null;
      let party_type: 'customer' | 'supplier' | undefined;

      if (data.party_id) {
        const { data: customerData } = await this.supabase
          .from('customers')
          .select('*')
          .eq('id', data.party_id)
          .maybeSingle();

        if (customerData) {
          party = customerData;
          party_type = 'customer';
        }
      }

      let lead = null;
      if (data.lead_id) {
        const { data: leadData } = await this.supabase
          .from('leads')
          .select('*')
          .eq('id', data.lead_id)
          .maybeSingle();

        lead = leadData;
      }

      return {
        ...data,
        party,
        party_type,
        lead,
      };
    } catch (error) {
      return this.handleError(error, 'fetch opportunity');
    }
  }

  async createOpportunity(input: CreateOpportunityInput): Promise<Opportunity> {
    try {
      const { data, error } = await this.supabase
        .from('opportunities')
        .insert({
          ...input,
          stage: input.stage || 'prospecting',
          probability_percent: input.probability_percent || 50,
        })
        .select()
        .single();

      if (error) throw error;

      if (input.party_id) {
        await this.partyService.linkToParty(
          input.company_id,
          'opportunity',
          data.id,
          'customer',
          input.party_id,
          { method: 'manual' }
        );
      }

      return data;
    } catch (error) {
      return this.handleError(error, 'create opportunity');
    }
  }

  async updateOpportunity(id: string, companyId: string, updates: Partial<Opportunity>): Promise<Opportunity> {
    try {
      const { data, error } = await this.supabase
        .from('opportunities')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      return this.handleError(error, 'update opportunity');
    }
  }

  async deleteOpportunity(id: string, companyId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('opportunities')
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
