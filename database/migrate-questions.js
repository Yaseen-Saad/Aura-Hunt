const { supabase } = require('../api/supabase');

async function migrateQuestionsSchema() {
  try {
    console.log('🔄 Migrating questions table schema...');

    // Add missing columns if they don't exist
    const alterCommands = [
      'ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS clue TEXT DEFAULT \'\';',
      'ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS clue_position TEXT DEFAULT \'\';', 
      'ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS url TEXT DEFAULT \'\';',
      'ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS qr_position TEXT DEFAULT \'\';',
      'ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS answer TEXT DEFAULT \'\';',
      'ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT \'\';',
      'ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS note TEXT DEFAULT \'\';'
    ];

    console.log('Adding missing columns to questions table...');
    
    for (const command of alterCommands) {
      try {
        // Note: Supabase doesn't support raw SQL execution via the client in this way
        // These commands need to be run manually in the Supabase SQL editor
        console.log(`Command to run: ${command}`);
      } catch (error) {
        console.log(`Note: ${command} - ${error.message}`);
      }
    }

    console.log('\n📋 Manual Migration Steps:');
    console.log('Please run the following commands in your Supabase SQL Editor:');
    console.log('='.repeat(60));
    alterCommands.forEach((command, index) => {
      console.log(`${index + 1}. ${command}`);
    });
    console.log('='.repeat(60));

    // Test if we can query the questions table
    const { data: testQuery, error: testError } = await supabase
      .from('questions')
      .select('id, name')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection test failed:', testError);
    } else {
      console.log('✅ Database connection test successful');
    }

    console.log('\n🎯 After running the SQL commands above, run: npm run seed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateQuestionsSchema();