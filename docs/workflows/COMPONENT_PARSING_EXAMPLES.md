# Component Parsing Examples

This document shows how different input formats are parsed into individual components.

## RAM Patterns

### Single Stick (No Multiplier)
| Input | Parsed As | Result |
|-------|-----------|--------|
| `16GB` | 1x 16GB | 1 component: 16GB |
| `8GB DDR4` | 1x 8GB DDR4 | 1 component: 8GB DDR4 |
| `32GB` | 1x 32GB | 1 component: 32GB |
| `4GB` | 1x 4GB | 1 component: 4GB |

### Multiple Sticks (With Multiplier)
| Input | Parsed As | Result |
|-------|-----------|--------|
| `8GB X2` | 2x 8GB | 2 components: 8GB, 8GB |
| `8GB * 2` | 2x 8GB | 2 components: 8GB, 8GB |
| `8GB×2` | 2x 8GB | 2 components: 8GB, 8GB |
| `8 * 2` | 2x 8 | 2 components: 8, 8 |
| `2x8GB` | 2x 8GB | 2 components: 8GB, 8GB |
| `2 x 8GB` | 2x 8GB | 2 components: 8GB, 8GB |
| `16GB (2x8GB)` | 2x 8GB | 2 components: 8GB, 8GB |
| `4x4GB` | 4x 4GB | 4 components: 4GB, 4GB, 4GB, 4GB |
| `8GB + 8GB` | 2x 8GB | 2 components: 8GB, 8GB |

### Important Distinction
- `16GB` → **ONE** 16GB stick
- `16GB (2x8GB)` → **TWO** 8GB sticks
- `2x8GB` → **TWO** 8GB sticks
- `8GB X2` → **TWO** 8GB sticks
- `8GB * 2` → **TWO** 8GB sticks (asterisk as multiplier)
- `8GB + 8GB` → **TWO** 8GB sticks (addition notation)

## Storage Patterns

### Single Drive
| Input | Parsed As | Result |
|-------|-----------|--------|
| `512GB SSD` | 1x 512GB SSD | 1 component: 512GB SSD |
| `1TB HDD` | 1x 1TB HDD | 1 component: 1TB HDD |
| `256GB` | 1x 256GB | 1 component: 256GB |
| `2TB` | 1x 2TB | 1 component: 2TB |

### Multiple Drives
| Input | Parsed As | Result |
|-------|-----------|--------|
| `256GB/1TB` | 256GB + 1TB | 2 components: 256GB, 1TB |
| `256GB + 1TB` | 256GB + 1TB | 2 components: 256GB, 1TB |
| `512GB SSD/2TB HDD` | 512GB SSD + 2TB HDD | 2 components: 512GB SSD, 2TB HDD |
| `256GB,1TB` | 256GB + 1TB | 2 components: 256GB, 1TB |
| `1TB Hynix/2TB Samsung` | 1TB Hynix + 2TB Samsung | 2 components: 1TB HYNIX, 2TB SAMSUNG |

### Dual SSD Configuration
| Input | Parsed As | Result |
|-------|-----------|--------|
| `2x512GB SSD` | 2x 512GB SSD | 2 components: 512GB SSD, 512GB SSD |
| `512GB SSD X2` | 2x 512GB SSD | 2 components: 512GB SSD, 512GB SSD |

## Real-World Examples

### Laptops

#### Example 1: Basic Laptop
```
RAM: 8GB
Storage: 256GB SSD
```
**Components Created:**
- 1x 8GB RAM (installed)
- 1x 256GB SSD (installed)

#### Example 2: Dual-Channel RAM Laptop
```
RAM: 16GB (2x8GB)
Storage: 512GB NVMe
```
**Components Created:**
- 2x 8GB RAM (installed)
- 1x 512GB NVMe (installed)

#### Example 3: High-End Laptop
```
RAM: 2x16GB DDR4
Storage: 1TB SSD/2TB HDD
```
**Components Created:**
- 2x 16GB DDR4 RAM (installed)
- 1x 1TB SSD (installed)
- 1x 2TB HDD (installed)

#### Example 4: Standard Configuration
```
RAM: 16GB
Storage: 512GB
```
**Components Created:**
- 1x 16GB RAM (installed)
- 1x 512GB drive (installed)

### Desktops

#### Example 1: Gaming Desktop
```
RAM: 4x8GB DDR4
Storage: 512GB SSD/2TB HDD
```
**Components Created:**
- 4x 8GB DDR4 RAM (installed)
- 1x 512GB SSD (installed)
- 1x 2TB HDD (installed)

#### Example 2: Workstation
```
RAM: 64GB (4x16GB)
Storage: 2x1TB NVMe
```
**Components Created:**
- 4x 16GB RAM (installed)
- 2x 1TB NVMe (installed)

## Harvesting Examples

### Scenario 1: Single 16GB Stick
**Asset Arrives With:** `RAM: 16GB`
**Components Created:** 1x 16GB RAM
**Action:** Harvest the 16GB stick
**Result:**
- Asset: No RAM
- Harvested Inventory: +1x 16GB RAM

### Scenario 2: Dual 8GB Sticks
**Asset Arrives With:** `RAM: 16GB (2x8GB)`
**Components Created:** 2x 8GB RAM
**Action:** Harvest 1x 8GB stick
**Result:**
- Asset: 1x 8GB RAM (installed)
- Harvested Inventory: +1x 8GB RAM

### Scenario 3: Upgrade Path
**Asset Has:** `RAM: 8GB`
**Components:** 1x 8GB RAM
**Action 1:** Harvest the 8GB stick
**Action 2:** Install a harvested 16GB stick
**Result:**
- Asset: 1x 16GB RAM (installed)
- Harvested Inventory: +1x 8GB RAM, -1x 16GB RAM

## Parsing Priority

The parser checks patterns in this order:

1. **Explicit multipliers with prefix** (`2x8GB`, `4x4GB`)
2. **Explicit multipliers with suffix** (`8GB X2`, `8GB * 2`)
3. **Parenthetical notation** (`16GB (2x8GB)`)
4. **Multiple drives separated** (`256GB/1TB`, `512GB+1TB`)
5. **Single component** (`16GB`, `512GB SSD`)

This ensures:
- `16GB` is always treated as **one** 16GB component
- `16GB (2x8GB)` is always treated as **two** 8GB components
- Explicit multipliers are always respected

## Common Supplier Formats

Different suppliers use different notation:

| Supplier Format | System Interprets As |
|----------------|---------------------|
| `16GB RAM` | 1x 16GB stick |
| `8GB X2` | 2x 8GB sticks |
| `2*8GB` | 2x 8GB sticks |
| `16GB (2x8)` | 2x 8GB sticks |
| `Dual 8GB` | 1x "Dual 8GB" (not parsed as 2 sticks) |

**Note:** Text like "Dual 8GB" without explicit multipliers is treated as a single component with that description. Always use numeric multipliers (2x, X2, *2) for proper parsing.

## Testing Your Input

To test how your input will be parsed:

1. Go to Smart Receiving or PO Import
2. Upload your file
3. Review the component mapping preview
4. Components are created automatically based on parsed values

Or test in browser console:
```javascript
import { parseComponentPattern } from './lib/componentParser';

// Test single stick
console.log(parseComponentPattern('16GB'));
// Output: [{ capacity: '16GB', quantity: 1 }]

// Test multiple sticks
console.log(parseComponentPattern('16GB (2x8GB)'));
// Output: [{ capacity: '8GB', quantity: 1 }, { capacity: '8GB', quantity: 1 }]
```
