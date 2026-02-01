import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export interface ChartOfAccount {
  id: string;
  company_id: string;
  account_code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  account_category: string | null;
  parent_account_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference_type: 'manual' | 'sales_invoice' | 'purchase_order' | 'payment' | 'adjustment' | null;
  reference_id: string | null;
  status: 'draft' | 'posted' | 'void';
  posted_at: string | null;
  posted_by: string | null;
  created_at: string;
  created_by: string;
  notes: string | null;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  description: string | null;
  debit_amount: number;
  credit_amount: number;
  created_at: string;
}

export class AccountingService extends BaseService {
  async getChartOfAccounts(companyId: string): Promise<ChartOfAccount[]> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('account_code');

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch chart of accounts');
  }

  async getJournalEntries(companyId: string, filters?: {
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<JournalEntry[]> {
    return this.executeQuery(async () => {
      let query = supabase
        .from('journal_entries')
        .select('*')
        .eq('company_id', companyId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.start_date) {
        query = query.gte('entry_date', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('entry_date', filters.end_date);
      }

      query = query.order('entry_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }, 'Failed to fetch journal entries');
  }

  async getJournalEntryLines(entryId: string): Promise<JournalEntryLine[]> {
    return this.executeQuery(async () => {
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select('*')
        .eq('journal_entry_id', entryId)
        .order('created_at');

      if (error) throw error;
      return data || [];
    }, 'Failed to fetch journal entry lines');
  }

  async getAccountBalance(accountId: string, asOfDate?: string): Promise<number> {
    return this.executeQuery(async () => {
      let query = supabase
        .from('journal_entry_lines')
        .select(`
          debit_amount,
          credit_amount,
          journal_entries!inner(entry_date, status)
        `)
        .eq('account_id', accountId)
        .eq('journal_entries.status', 'posted');

      if (asOfDate) {
        query = query.lte('journal_entries.entry_date', asOfDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const lines = data || [];
      const totalDebit = lines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
      const totalCredit = lines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);

      return totalDebit - totalCredit;
    }, 'Failed to calculate account balance');
  }

  async getIncomeStatement(companyId: string, startDate: string, endDate: string): Promise<any> {
    return this.executeQuery(async () => {
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_of_accounts!inner (account_code, account_name, account_type)
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'posted')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (error) throw error;

      const revenue: Record<string, number> = {};
      const expenses: Record<string, number> = {};

      entries?.forEach((entry: any) => {
        entry.journal_entry_lines?.forEach((line: any) => {
          const account = line.chart_of_accounts;
          if (!account) return;

          const amount = line.credit_amount - line.debit_amount;

          if (account.account_type === 'revenue') {
            revenue[account.account_name] = (revenue[account.account_name] || 0) + amount;
          } else if (account.account_type === 'expense') {
            expenses[account.account_name] = (expenses[account.account_name] || 0) - amount;
          }
        });
      });

      const totalRevenue = Object.values(revenue).reduce((sum, val) => sum + val, 0);
      const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);

      return {
        period_start: startDate,
        period_end: endDate,
        revenue,
        expenses,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_income: totalRevenue - totalExpenses,
      };
    }, 'Failed to generate income statement');
  }
}

export const accountingService = new AccountingService();
