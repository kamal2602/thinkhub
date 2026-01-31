import { supabase } from './supabase';

export interface SearchResult {
  id: string;
  type: 'asset' | 'component' | 'customer' | 'supplier';
  title: string;
  subtitle?: string;
  metadata?: Record<string, any>;
  rank?: number;
}

export async function searchGlobal(
  query: string,
  companyId: string,
  options?: {
    types?: Array<'asset' | 'component' | 'customer' | 'supplier'>;
    limit?: number;
  }
): Promise<SearchResult[]> {
  const { types = ['asset', 'component', 'customer', 'supplier'], limit = 20 } = options || {};
  const results: SearchResult[] = [];

  if (types.includes('asset')) {
    const { data } = await supabase.rpc('search_assets', {
      search_query: query,
      company_id_param: companyId,
      limit_param: Math.ceil(limit / types.length)
    });

    if (data) {
      results.push(...data.map((item: any) => ({
        id: item.id,
        type: 'asset' as const,
        title: item.serial_number || 'Unknown Serial',
        subtitle: `${item.brand || ''} ${item.model || ''}`.trim() || undefined,
        metadata: { status: item.status },
        rank: item.rank
      })));
    }
  }

  if (types.includes('customer')) {
    const { data } = await supabase
      .from('customers')
      .select('id, name, contact_name, email')
      .eq('company_id', companyId)
      .or(`name.ilike.%${query}%,contact_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(Math.ceil(limit / types.length));

    if (data) {
      results.push(...data.map(item => ({
        id: item.id,
        type: 'customer' as const,
        title: item.name,
        subtitle: item.contact_name || item.email || undefined,
        metadata: {}
      })));
    }
  }

  if (types.includes('supplier')) {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, contact_name, email')
      .eq('company_id', companyId)
      .or(`name.ilike.%${query}%,contact_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(Math.ceil(limit / types.length));

    if (data) {
      results.push(...data.map(item => ({
        id: item.id,
        type: 'supplier' as const,
        title: item.name,
        subtitle: item.contact_name || item.email || undefined,
        metadata: {}
      })));
    }
  }

  return results.sort((a, b) => (b.rank || 0) - (a.rank || 0)).slice(0, limit);
}

export function fuzzyMatch(search: string, text: string): boolean {
  const searchLower = search.toLowerCase();
  const textLower = text.toLowerCase();

  let searchIndex = 0;
  for (let i = 0; i < textLower.length && searchIndex < searchLower.length; i++) {
    if (textLower[i] === searchLower[searchIndex]) {
      searchIndex++;
    }
  }

  return searchIndex === searchLower.length;
}

export function highlightMatches(text: string, search: string): string {
  if (!search.trim()) return text;

  const regex = new RegExp(`(${search})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>');
}
