#!/usr/bin/env node

console.log('🔍 Verifying Testing Setup...\n');

const fs = require('fs');
const path = require('path');

const checks = [
  {
    name: 'Playwright Config',
    path: './playwright.config.ts',
  },
  {
    name: 'Auth Fixtures',
    path: './tests/fixtures/auth.ts',
  },
  {
    name: 'Database Fixtures',
    path: './tests/fixtures/database.ts',
  },
  {
    name: 'Auth Tests',
    path: './tests/e2e/auth.spec.ts',
  },
  {
    name: 'Purchase Order Tests',
    path: './tests/e2e/purchase-orders.spec.ts',
  },
  {
    name: 'Asset Processing Tests',
    path: './tests/e2e/asset-processing.spec.ts',
  },
  {
    name: 'Sales Invoice Tests',
    path: './tests/e2e/sales-invoices.spec.ts',
  },
  {
    name: 'Permission Tests',
    path: './tests/e2e/permissions.spec.ts',
  },
  {
    name: 'Feature Flag Service',
    path: './src/services/featureFlagService.ts',
  },
  {
    name: 'Feature Flag Context',
    path: './src/contexts/FeatureFlagContext.tsx',
  },
  {
    name: 'Feature Flags Manager UI',
    path: './src/components/experiments/FeatureFlagsManager.tsx',
  },
  {
    name: 'A/B Experiments Manager UI',
    path: './src/components/experiments/ABExperimentsManager.tsx',
  },
  {
    name: 'Example Experiment',
    path: './src/components/experiments/ExampleExperiment.tsx',
  },
];

let allPassed = true;

checks.forEach(check => {
  const exists = fs.existsSync(path.join(__dirname, check.path));
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  if (!exists) allPassed = false;
});

console.log('\n📦 NPM Scripts:');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const testScripts = [
  'test:e2e',
  'test:e2e:ui',
  'test:e2e:headed',
  'test:e2e:debug',
  'test:e2e:report',
];

testScripts.forEach(script => {
  const exists = packageJson.scripts[script];
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${script}`);
  if (!exists) allPassed = false;
});

console.log('\n🗄️  Database Tables:');
const migrationPath = './supabase/migrations/20260203130000_create_ab_testing_system.sql';
if (fs.existsSync(migrationPath)) {
  console.log('✅ A/B Testing migration exists');
} else {
  console.log('❌ A/B Testing migration missing');
  allPassed = false;
}

console.log('\n📚 Documentation:');
const docs = [
  './docs/testing/TESTING_README.md',
  './docs/testing/PLAYWRIGHT_GUIDE.md',
  './docs/testing/AB_TESTING_GUIDE.md',
  './TESTING_SETUP_COMPLETE.md',
];

docs.forEach(doc => {
  const exists = fs.existsSync(doc);
  const status = exists ? '✅' : '❌';
  const name = path.basename(doc);
  console.log(`${status} ${name}`);
  if (!exists) allPassed = false;
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ All checks passed! Setup is complete.\n');
  console.log('Next steps:');
  console.log('1. Install browsers: npx playwright install');
  console.log('2. Set environment variables in .env');
  console.log('3. Run tests: npm run test:e2e:ui\n');
} else {
  console.log('❌ Some checks failed. Please review the output above.\n');
  process.exit(1);
}
