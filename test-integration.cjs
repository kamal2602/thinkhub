#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

console.log('🧪 Testing A/B Testing Integration...\n');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing environment variables');
  console.log('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseTables() {
  console.log('📋 Checking database tables...');

  const tables = [
    'feature_flags',
    'ab_experiments',
    'user_variant_assignments',
    'experiment_events'
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        console.log(`❌ Table "${table}": ${error.message}`);
        return false;
      }
      console.log(`✅ Table "${table}" exists and is accessible`);
    } catch (err) {
      console.log(`❌ Table "${table}": ${err.message}`);
      return false;
    }
  }

  return true;
}

async function testFeatureFlagOperations() {
  console.log('\n🚩 Testing feature flag operations...');

  try {
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (!companies || companies.length === 0) {
      console.log('⚠️  No companies found - skipping write operations');
      return true;
    }

    const companyId = companies[0].id;
    const testKey = `test_flag_${Date.now()}`;

    const { data: flag, error: createError } = await supabase
      .from('feature_flags')
      .insert({
        company_id: companyId,
        key: testKey,
        name: 'Test Flag',
        description: 'Integration test flag',
        enabled: true,
        rollout_percentage: 50
      })
      .select()
      .single();

    if (createError) {
      console.log(`❌ Create flag failed: ${createError.message}`);
      return false;
    }

    console.log(`✅ Created feature flag: ${testKey}`);

    const { data: readFlag, error: readError } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('id', flag.id)
      .single();

    if (readError) {
      console.log(`❌ Read flag failed: ${readError.message}`);
      return false;
    }

    console.log(`✅ Read feature flag: ${readFlag.key}`);

    const { error: deleteError } = await supabase
      .from('feature_flags')
      .delete()
      .eq('id', flag.id);

    if (deleteError) {
      console.log(`❌ Delete flag failed: ${deleteError.message}`);
      return false;
    }

    console.log(`✅ Deleted feature flag`);
    return true;
  } catch (err) {
    console.log(`❌ Feature flag test failed: ${err.message}`);
    return false;
  }
}

async function runTests() {
  const tablesOk = await testDatabaseTables();
  const operationsOk = await testFeatureFlagOperations();

  console.log('\n' + '='.repeat(50));

  if (tablesOk && operationsOk) {
    console.log('✅ All integration tests passed!\n');
    console.log('Your A/B testing system is ready to use.');
    return true;
  } else {
    console.log('❌ Some tests failed. Check the output above.\n');
    return false;
  }
}

runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
