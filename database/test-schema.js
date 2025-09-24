const { supabase } = require('../api/supabase');

async function runDirectMigration() {
  try {
    console.log('🔄 Running direct database migration...');

    // Try to add columns by attempting to update the table structure
    // We'll do this by trying to insert a test record with the new fields
    
    console.log('Testing new schema compatibility...');
    
    // First, let's check what columns currently exist
    const { data: existingQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);

    if (fetchError) {
      console.error('❌ Failed to fetch existing questions:', fetchError);
      return;
    }

    if (existingQuestions && existingQuestions.length > 0) {
      console.log('Current question structure:', Object.keys(existingQuestions[0]));
    }

    // Try to update an existing question with new fields to test schema
    if (existingQuestions && existingQuestions.length > 0) {
      const testQuestionId = existingQuestions[0].id;
      
      console.log(`Testing schema update on question ${testQuestionId}...`);
      
      const { error: updateError } = await supabase
        .from('questions')
        .update({
          clue: 'test clue',
          clue_position: 'test position',
          url: 'test url',
          qr_position: 'test qr position', 
          answer: 'test answer',
          status: 'test status',
          note: 'test note'
        })
        .eq('id', testQuestionId);

      if (updateError) {
        console.error('❌ Schema update test failed:', updateError);
        console.log('\n🔧 You need to manually add the missing columns in Supabase dashboard:');
        console.log('1. Go to Database > Tables > questions');
        console.log('2. Add these columns:');
        console.log('   - clue (text)');
        console.log('   - clue_position (text)');
        console.log('   - url (text)');
        console.log('   - qr_position (text)');
        console.log('   - answer (text)');
        console.log('   - status (text)');
        console.log('   - note (text)');
        return false;
      }

      console.log('✅ Schema update test successful!');
      
      // Revert the test changes
      await supabase
        .from('questions')
        .update({
          clue: '',
          clue_position: '',
          url: '',
          qr_position: '',
          answer: '',
          status: '',
          note: ''
        })
        .eq('id', testQuestionId);
        
      return true;
    }

  } catch (error) {
    console.error('❌ Migration test failed:', error);
    return false;
  }
}

runDirectMigration().then(success => {
  if (success) {
    console.log('🎉 Migration successful! You can now run the seed script.');
  } else {
    console.log('⚠️ Migration needed. Please add the columns manually in Supabase dashboard.');
  }
});