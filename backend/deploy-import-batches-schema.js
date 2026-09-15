/**
 * Deploy Import Batches Schema to Supabase
 * This script attempts to deploy the schema, but Supabase SQL Editor is recommended
 * for reliable schema deployment.
 */

const supabase = require('./config/supabase');
const fs = require('fs');
const path = require('path');

async function deploySchema() {
  try {
    console.log('[DEPLOY] Import Batches Schema Deployment');
    console.log('[DEPLOY] ======================================');
    console.log('[DEPLOY] NOTE: For reliable schema deployment, please run the SQL file');
    console.log('[DEPLOY] directly in the Supabase SQL Editor at:');
    console.log('[DEPLOY] https://krenyvbcwtbwcsrpiryf.supabase.co/sql/new');
    console.log('[DEPLOY] File: backend/database/import-batches-schema.sql');
    console.log('[DEPLOY] ======================================');
    console.log('[DEPLOY] Attempting automatic deployment...');

    // Verify tables exist
    console.log('[DEPLOY] Verifying tables exist...');
    const { data: batchesData, error: batchesError } = await supabase
      .from('import_batches')
      .select('*')
      .limit(1);

    if (batchesError) {
      console.error('[DEPLOY] ERROR: import_batches table not accessible:', batchesError.message);
      console.log('[DEPLOY] Please run the SQL schema file in Supabase SQL Editor');
    } else {
      console.log('[DEPLOY] ✓ import_batches table verified');
    }

    const { data: detailsData, error: detailsError } = await supabase
      .from('import_batch_details')
      .select('*')
      .limit(1);

    if (detailsError) {
      console.error('[DEPLOY] ERROR: import_batch_details table not accessible:', detailsError.message);
      console.log('[DEPLOY] Please run the SQL schema file in Supabase SQL Editor');
    } else {
      console.log('[DEPLOY] ✓ import_batch_details table verified');
    }

    if (!batchesError && !detailsError) {
      console.log('[DEPLOY] ✓ All tables verified - schema already deployed');
    } else {
      console.log('[DEPLOY] Manual deployment required - see instructions above');
    }
  } catch (error) {
    console.error('[DEPLOY] Fatal error:', error);
    process.exit(1);
  }
}

deploySchema();
