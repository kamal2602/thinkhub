export interface ComponentSpec {
  capacity: string;
  quantity: number;
  originalText?: string;
}

export function parseComponentPattern(input: string): ComponentSpec[] {
  if (!input || input.trim() === '') {
    return [];
  }

  const cleaned = input.trim();
  const results: ComponentSpec[] = [];

  // Pattern 1: "2x8GB" or "2 x 8GB" (prefix multiplier - check FIRST to avoid conflicting with asterisk)
  const prefixMultiplyPattern = /^(\d+)\s*[X×x]\s*(\d+)\s*(GB|TB|MHz)/i;
  const prefixMultiplyMatch = cleaned.match(prefixMultiplyPattern);

  if (prefixMultiplyMatch) {
    const quantity = parseInt(prefixMultiplyMatch[1]);
    const capacity = `${prefixMultiplyMatch[2]}${prefixMultiplyMatch[3]}`.toUpperCase();

    for (let i = 0; i < quantity; i++) {
      results.push({
        capacity,
        quantity: 1,
        originalText: cleaned,
      });
    }
    return results;
  }

  // Pattern 2: "8GB X2" or "8GB * 2" or "8 X 2" or "8GB×2" (suffix multiplier, including asterisk)
  const multiplyPattern = /(\d+)\s*(GB|TB|MHz)?\s*[X×x*]\s*(\d+)/i;
  const multiplyMatch = cleaned.match(multiplyPattern);

  if (multiplyMatch) {
    const capacity = multiplyMatch[2]
      ? `${multiplyMatch[1]}${multiplyMatch[2]}`
      : multiplyMatch[1];
    const quantity = parseInt(multiplyMatch[3]);

    for (let i = 0; i < quantity; i++) {
      results.push({
        capacity: capacity.toUpperCase(),
        quantity: 1,
        originalText: cleaned,
      });
    }
    return results;
  }

  // Pattern 3: "16GB (2x8GB)" - extract the detail in parentheses
  const detailPattern = /\((\d+)\s*[X×x*]\s*(\d+)\s*(GB|TB|MHz)\)/i;
  const detailMatch = cleaned.match(detailPattern);

  if (detailMatch) {
    const quantity = parseInt(detailMatch[1]);
    const capacity = `${detailMatch[2]}${detailMatch[3]}`.toUpperCase();

    for (let i = 0; i < quantity; i++) {
      results.push({
        capacity,
        quantity: 1,
        originalText: cleaned,
      });
    }
    return results;
  }

  // Pattern 4: "256GB/1TB" or "256GB + 1TB" or "8GB + 8GB" or "1TB Hynix/2TB Samsung" (multiple different components, remove brand names)
  const multiComponentPattern = /(\d+\s*(?:GB|TB)(?:\s+[A-Za-z]+)?)\s*[/+&,]\s*(\d+\s*(?:GB|TB)(?:\s+[A-Za-z]+)?)/i;
  const multiComponentMatch = cleaned.match(multiComponentPattern);

  if (multiComponentMatch) {
    // Remove brand names - keep only numbers and units
    const cleanCapacity1 = multiComponentMatch[1].match(/(\d+\s*(?:GB|TB))/i)?.[0] || multiComponentMatch[1];
    const cleanCapacity2 = multiComponentMatch[2].match(/(\d+\s*(?:GB|TB))/i)?.[0] || multiComponentMatch[2];

    results.push({
      capacity: cleanCapacity1.trim().toUpperCase(),
      quantity: 1,
      originalText: cleaned,
    });
    results.push({
      capacity: cleanCapacity2.trim().toUpperCase(),
      quantity: 1,
      originalText: cleaned,
    });
    return results;
  }

  // Pattern 5: Simple "16GB" or "512GB SSD"
  const simplePattern = /\d+\s*(GB|TB|MHz)/i;
  if (simplePattern.test(cleaned)) {
    results.push({
      capacity: cleaned.toUpperCase(),
      quantity: 1,
      originalText: cleaned,
    });
    return results;
  }

  // Default: return as-is (might be text like "Varies" or "Unknown")
  results.push({
    capacity: cleaned,
    quantity: 1,
    originalText: cleaned,
  });

  return results;
}

export function getComponentType(capacity: string): 'RAM' | 'SSD' | 'HDD' | 'NVMe' | 'Other' {
  const lower = capacity.toLowerCase();

  if (lower.includes('ssd') || lower.includes('nvme') || lower.includes('m.2')) {
    if (lower.includes('nvme')) return 'NVMe';
    return 'SSD';
  }

  if (lower.includes('hdd') || lower.includes('hard drive')) {
    return 'HDD';
  }

  if (lower.includes('gb') && !lower.includes('tb') && parseInt(lower) <= 64) {
    return 'RAM';
  }

  if (lower.includes('tb') || (lower.includes('gb') && parseInt(lower) >= 128)) {
    return 'HDD';
  }

  return 'Other';
}

export function extractTechnologyType(text: string): string | null {
  const lower = text.toLowerCase();

  // RAM types
  if (lower.includes('ddr5')) return 'DDR5';
  if (lower.includes('ddr4')) return 'DDR4';
  if (lower.includes('ddr3')) return 'DDR3';
  if (lower.includes('ddr2')) return 'DDR2';

  // Storage types
  if (lower.includes('nvme')) return 'NVMe';
  if (lower.includes('m.2')) return 'M.2';
  if (lower.includes('ssd')) return 'SSD';
  if (lower.includes('hdd')) return 'HDD';

  return null;
}

export function formatComponentDisplay(components: ComponentSpec[]): string {
  if (components.length === 0) return '';

  const grouped = new Map<string, number>();

  components.forEach(comp => {
    const current = grouped.get(comp.capacity) || 0;
    grouped.set(comp.capacity, current + comp.quantity);
  });

  const parts: string[] = [];
  grouped.forEach((quantity, capacity) => {
    if (quantity > 1) {
      parts.push(`${quantity}x ${capacity}`);
    } else {
      parts.push(capacity);
    }
  });

  return parts.join(' + ');
}

export function parseRAM(ramString: string): ComponentSpec[] {
  return parseComponentPattern(ramString);
}

export function parseStorage(storageString: string): ComponentSpec[] {
  return parseComponentPattern(storageString);
}

export function calculateTotalCapacity(components: ComponentSpec[]): { value: number; unit: string } | null {
  if (components.length === 0) return null;

  let totalGB = 0;

  components.forEach(comp => {
    const match = comp.capacity.match(/(\d+)\s*(GB|TB)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toUpperCase();

      if (unit === 'TB') {
        totalGB += value * 1024;
      } else {
        totalGB += value;
      }
    }
  });

  if (totalGB === 0) return null;

  if (totalGB >= 1024) {
    return {
      value: totalGB / 1024,
      unit: 'TB',
    };
  }

  return {
    value: totalGB,
    unit: 'GB',
  };
}
