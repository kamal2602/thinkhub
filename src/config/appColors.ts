// Vibrant color scheme for each app - inspired by Odoo
// Each app gets a unique, distinctive color

export const APP_COLORS: Record<string, { bg: string; text: string; gradient?: string }> = {
  // Operations - Blue/Cyan shades
  'contacts': {
    bg: 'bg-sky-500',
    text: 'text-sky-500',
    gradient: 'from-sky-400 to-sky-600',
  },
  'procurement': {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-700',
  },
  'orders': {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-700',
  },
  'receiving': {
    bg: 'bg-cyan-500',
    text: 'text-cyan-500',
    gradient: 'from-cyan-400 to-cyan-600',
  },
  'processing': {
    bg: 'bg-indigo-600',
    text: 'text-indigo-600',
    gradient: 'from-indigo-500 to-indigo-700',
  },
  'inventory': {
    bg: 'bg-purple-600',
    text: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-700',
  },
  'lots': {
    bg: 'bg-violet-500',
    text: 'text-violet-500',
    gradient: 'from-violet-400 to-violet-600',
  },

  // Repairs & Quality - Teal/Green shades
  'repairs': {
    bg: 'bg-teal-600',
    text: 'text-teal-600',
    gradient: 'from-teal-500 to-teal-700',
  },

  // Sales - Orange/Amber shades
  'reseller': {
    bg: 'bg-orange-500',
    text: 'text-orange-500',
    gradient: 'from-orange-400 to-orange-600',
  },
  'auction': {
    bg: 'bg-amber-600',
    text: 'text-amber-600',
    gradient: 'from-amber-500 to-amber-700',
  },
  'website': {
    bg: 'bg-yellow-500',
    text: 'text-yellow-500',
    gradient: 'from-yellow-400 to-yellow-600',
  },

  // Financial - Green/Emerald shades
  'invoices': {
    bg: 'bg-emerald-600',
    text: 'text-emerald-600',
    gradient: 'from-emerald-500 to-emerald-700',
  },
  'payments': {
    bg: 'bg-green-600',
    text: 'text-green-600',
    gradient: 'from-green-500 to-green-700',
  },
  'accounting': {
    bg: 'bg-lime-600',
    text: 'text-lime-600',
    gradient: 'from-lime-500 to-lime-700',
  },

  // Specialized - Red/Pink shades
  'itad': {
    bg: 'bg-rose-600',
    text: 'text-rose-600',
    gradient: 'from-rose-500 to-rose-700',
  },
  'recycling': {
    bg: 'bg-pink-600',
    text: 'text-pink-600',
    gradient: 'from-pink-500 to-pink-700',
  },

  // CRM & Marketing - Fuchsia/Purple shades
  'crm': {
    bg: 'bg-fuchsia-600',
    text: 'text-fuchsia-600',
    gradient: 'from-fuchsia-500 to-fuchsia-700',
  },

  // Compliance - Slate/Gray shades with color accent
  'esg': {
    bg: 'bg-green-700',
    text: 'text-green-700',
    gradient: 'from-green-600 to-green-800',
  },
  'reports': {
    bg: 'bg-slate-600',
    text: 'text-slate-600',
    gradient: 'from-slate-500 to-slate-700',
  },

  // Administration - Neutral with accent
  'users': {
    bg: 'bg-zinc-600',
    text: 'text-zinc-600',
    gradient: 'from-zinc-500 to-zinc-700',
  },
  'company': {
    bg: 'bg-gray-700',
    text: 'text-gray-700',
    gradient: 'from-gray-600 to-gray-800',
  },
  'automation': {
    bg: 'bg-blue-500',
    text: 'text-blue-500',
    gradient: 'from-blue-400 to-blue-600',
  },
  'apps': {
    bg: 'bg-indigo-500',
    text: 'text-indigo-500',
    gradient: 'from-indigo-400 to-indigo-600',
  },
  'settings': {
    bg: 'bg-gray-600',
    text: 'text-gray-600',
    gradient: 'from-gray-500 to-gray-700',
  },
};

// Fallback color for unknown apps
export const DEFAULT_APP_COLOR = {
  bg: 'bg-blue-600',
  text: 'text-blue-600',
  gradient: 'from-blue-500 to-blue-700',
};

export function getAppColor(key: string) {
  return APP_COLORS[key] || DEFAULT_APP_COLOR;
}
