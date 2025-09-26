require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function debugSupabaseQuery() {
  console.log('🐛 Debugging Supabase Query Issue...\n');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    const businessProfileId = '13fd7d95-4665-47dc-89c3-abb70cfb1b02';
    
    // 1. Check if GoogleOverview exists
    console.log('1️⃣ Checking GoogleOverview...');
    const { data: overview, error: overviewError } = await supabase
      .from('GoogleOverview')
      .select('*')
      .eq('businessProfileId', businessProfileId)
      .single();
    
    if (overviewError) {
      console.error('❌ Overview error:', overviewError);
      return;
    }
    
    console.log('✅ Found overview:', overview.id);
    
    // 2. Check if PeriodicalMetric records exist for this overview
    console.log('\n2️⃣ Checking PeriodicalMetric records...');
    const { data: metrics, error: metricsError } = await supabase
      .from('PeriodicalMetric')
      .select('*')
      .eq('googleOverviewId', overview.id);
    
    if (metricsError) {
      console.error('❌ Metrics error:', metricsError);
      return;
    }
    
    console.log(`✅ Found ${metrics?.length || 0} PeriodicalMetric records:`);
    if (metrics) {
      metrics.forEach(metric => {
        console.log(`   - Period ${metric.periodKey} (${metric.periodLabel}): ${metric.reviewCount} reviews, ${metric.avgRating} avg`);
      });
    }
    
    // 3. Try the nested query that's failing
    console.log('\n3️⃣ Testing nested query...');
    const { data: nestedResult, error: nestedError } = await supabase
      .from('GoogleOverview')
      .select(`
        *,
        periodicalMetrics:PeriodicalMetric(*)
      `)
      .eq('businessProfileId', businessProfileId)
      .single();
    
    if (nestedError) {
      console.error('❌ Nested query error:', nestedError);
    } else {
      console.log('✅ Nested query success!');
      console.log(`   - Overview ID: ${nestedResult.id}`);
      console.log(`   - Metrics count: ${nestedResult.periodicalMetrics?.length || 0}`);
    }
    
    // 4. Try the full business profile query
    console.log('\n4️⃣ Testing full business profile query...');
    const { data: fullProfile, error: fullError } = await supabase
      .from('GoogleBusinessProfile')
      .select(`
        *,
        overview:GoogleOverview(
          *,
          periodicalMetrics:PeriodicalMetric(*)
        )
      `)
      .eq('id', businessProfileId)
      .single();
    
    if (fullError) {
      console.error('❌ Full profile query error:', fullError);
    } else {
      console.log('✅ Full profile query success!');
      console.log(`   - Profile: ${fullProfile.displayName}`);
      console.log(`   - Has overview: ${!!fullProfile.overview}`);
      console.log(`   - Metrics count: ${fullProfile.overview?.periodicalMetrics?.length || 0}`);
      
      if (fullProfile.overview?.periodicalMetrics) {
        fullProfile.overview.periodicalMetrics.forEach(metric => {
          console.log(`     * Period ${metric.periodKey}: ${metric.reviewCount} reviews`);
        });
      }
    }
    
    // 5. Try different syntax variations
    console.log('\n5️⃣ Testing different syntax variations...');
    
    // Variation A: Without alias
    console.log('   Testing variation A (no alias)...');
    const { data: varA, error: errA } = await supabase
      .from('GoogleBusinessProfile')
      .select(`
        id,
        displayName,
        GoogleOverview(
          id,
          PeriodicalMetric(id, periodKey, reviewCount)
        )
      `)
      .eq('id', businessProfileId)
      .single();
    
    if (errA) {
      console.log('   ❌ Variation A failed:', errA.message);
    } else {
      console.log('   ✅ Variation A success!');
      console.log(`     - Metrics: ${varA.GoogleOverview?.[0]?.PeriodicalMetric?.length || 0}`);
    }
    
    // Variation B: Using relationship field names from schema
    console.log('   Testing variation B (schema field names)...');
    const { data: varB, error: errB } = await supabase
      .from('GoogleBusinessProfile')
      .select(`
        id,
        displayName,
        overview!businessProfileId(
          id,
          periodicalMetrics!googleOverviewId(id, periodKey, reviewCount)
        )
      `)
      .eq('id', businessProfileId)
      .single();
    
    if (errB) {
      console.log('   ❌ Variation B failed:', errB.message);
    } else {
      console.log('   ✅ Variation B success!');
      console.log(`     - Metrics: ${varB.overview?.periodicalMetrics?.length || 0}`);
    }
    
    // Variation C: Direct foreign key reference
    console.log('   Testing variation C (direct FK)...');
    const { data: varC, error: errC } = await supabase
      .from('GoogleBusinessProfile')
      .select(`
        id,
        displayName,
        GoogleOverview!businessProfileId(
          id,
          PeriodicalMetric!googleOverviewId(id, periodKey, reviewCount)
        )
      `)
      .eq('id', businessProfileId)
      .single();
    
    if (errC) {
      console.log('   ❌ Variation C failed:', errC.message);
    } else {
      console.log('   ✅ Variation C success!');
      console.log(`     - Overview array length: ${varC.GoogleOverview?.length || 0}`);
      if (varC.GoogleOverview && varC.GoogleOverview.length > 0) {
        console.log(`     - Metrics: ${varC.GoogleOverview[0].PeriodicalMetric?.length || 0}`);
      }
    }
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

debugSupabaseQuery(); 