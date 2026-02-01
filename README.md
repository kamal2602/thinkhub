# Modular ITAD ERP System

A comprehensive, engine-driven enterprise resource planning platform for IT Asset Disposition (ITAD), electronics reselling, component harvesting, and circular economy operations.

## Overview

This system is built on a modular engine architecture that allows organizations to activate only the features they need, from basic inventory management to advanced ITAD compliance, auction platforms, CRM, and more.

## Key Features

- **Engine-Based Architecture** - Modular system where features can be enabled/disabled per company
- **Multi-Company & Multi-Workspace** - Manage multiple businesses with isolated data
- **ITAD Compliance** - Data sanitization tracking, certificates, environmental reporting (WEEE, GRI)
- **Component Harvesting** - Track harvested parts, market pricing, and resale value
- **Smart Import Intelligence** - AI-powered field mapping and product type detection
- **Customer Portal** - Self-service portal for clients to track assets and download certificates
- **Purchase & Receiving** - Comprehensive PO management with smart receiving workflows
- **Sales & Invoicing** - Unified sales catalog for whole assets and components
- **Auction Platform** - Built-in auction engine aligned with core inventory
- **CRM** - Lead, opportunity, and activity tracking
- **Website CMS** - Public-facing website engine for marketing
- **Processing Workflows** - Asset lifecycle tracking from receiving through testing to sale
- **Real-time Updates** - Live collaboration with Supabase realtime
- **Enterprise Security** - Role-based access control with comprehensive audit trails

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password + Customer Portal)
- **Icons**: Lucide React
- **File Processing**: XLSX for Excel imports
- **Drag & Drop**: dnd-kit for Kanban boards
- **Routing**: React Router v6

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account

### Environment Setup

1. Clone the repository
2. Create `.env` file with your Supabase credentials:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation
```bash
npm install
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

## Documentation

Comprehensive documentation is available in the `/docs` directory:

### Quick Links
- **[Documentation Index](docs/README.md)** - Complete documentation navigation
- **[First Time Setup](docs/guides/FIRST_TIME_SETUP_GUIDE.md)** - Get started guide
- **[Architecture Overview](docs/architecture/ENGINES.md)** - System architecture
- **[Processing Workflow](docs/workflows/PROCESSING_WORKFLOW_GUIDE.md)** - Asset processing guide
- **[Deployment Guide](docs/reference/DEPLOYMENT.md)** - Production deployment

### Documentation Structure
- **`/docs/architecture`** - System design, engine architecture, modular ERP
- **`/docs/guides`** - Getting started, quick starts, troubleshooting
- **`/docs/workflows`** - Processing, receiving, import intelligence
- **`/docs/features`** - Feature-specific documentation
- **`/docs/implementation`** - Project status and change logs
- **`/docs/reference`** - Technical specifications
- **`/docs/archive`** - Historical documentation

## Project Structure

```
src/
├── components/
│   ├── accounting/       # GL, journal entries
│   ├── ai/              # AI valuation widgets
│   ├── apps/            # Engine installer
│   ├── auctions/        # Auction management
│   ├── auth/            # Login & registration
│   ├── common/          # Shared components, modals, guards
│   ├── compliance/      # Audit exports
│   ├── crm/             # Leads, opportunities, activities
│   ├── customer-portal/ # Customer self-service portal
│   ├── dashboard/       # Engine-driven dashboards
│   ├── esg/             # ESG/environmental compliance
│   ├── inventory/       # Asset inventory, components
│   ├── itad/            # ITAD compliance, certificates
│   ├── layout/          # App shell, sidebar, navigation
│   ├── onboarding/      # First-time setup wizard
│   ├── processing/      # Asset processing workflows
│   ├── purchases/       # PO management, smart imports
│   ├── receiving/       # Receiving workflows
│   ├── sales/           # Sales invoices, catalog
│   ├── settings/        # System configuration, engines
│   ├── website/         # CMS engine
│   └── workspace/       # Universal workspace tables
├── contexts/            # Auth, Company, Workspace, Toast
├── hooks/               # Custom React hooks
├── lib/                 # Utilities, database types, parsers
├── models/              # Data models
├── services/            # Business logic services
└── pages/              # Top-level pages

supabase/
└── migrations/         # Database schema migrations
```

## Engine System

The platform uses an engine registry system where each company can activate specific modules:

**Core Engines:**
- Inventory (always on)
- Processing
- Receiving

**Optional Engines:**
- ITAD Compliance
- Component Harvesting
- Auction Platform
- CRM
- Customer Portal
- Website/CMS
- Accounting
- ESG/Compliance Reporting
- AI Valuation

Engines can be toggled in Settings → Engine Toggles.

## Security

- **Row Level Security (RLS)** on all tables
- **Company-scoped data** - Complete isolation between organizations
- **Role-based access control** - Admin, Manager, Staff, Viewer, Customer Portal
- **Audit trails** - Comprehensive change tracking
- **Engine gating** - Features locked unless engine enabled
- **Zero parallel truth** - Single source of truth for inventory, financial data

## Database

PostgreSQL via Supabase with 200+ migration files covering:
- Multi-company architecture
- Party system (unified customers/suppliers)
- ITAD compliance tracking
- Component harvesting and sales
- Import intelligence
- Audit trails
- RLS policies

See `/docs/reference` for database schema documentation.

## Contributing

When adding features:
1. Follow the engine architecture patterns
2. Ensure RLS policies are in place
3. Update relevant documentation in `/docs`
4. Test with engine enabled/disabled states

## License

Proprietary - All rights reserved

## Support

For questions or support:
- Review documentation in `/docs`
- Check troubleshooting guides
- Contact the development team

---

**Version:** 2.0
**Last Updated:** February 2026
**Architecture:** Modular Engine System
