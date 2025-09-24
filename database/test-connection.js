const { supabase } = require('../api/supabase');

async function testConnection() {
  try {
    console.log('🔌 Testing Supabase connection...');
    console.log('URL:', process.env.SUPABASE_URL);
    console.log('Service key (first 20 chars):', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');

    // Simple test query
    console.log('\n1. Testing database connection...');
    const { data: dbTest, error: dbError } = await supabase
      .from('teams')
      .select('id')
      .limit(1);

    if (dbError) {
      console.error('Database connection failed:', dbError);
      return false;
    }

    console.log('Database connection successful');

    // Test storage connection
    console.log('\n2. Testing storage connection...');
    const { data: storageTest, error: storageError } = await supabase.storage.listBuckets();

    if (storageError) {
      console.error('Storage connection failed:', storageError);
      return false;
    }

    console.log('Storage connection successful');
    console.log('Available buckets:', storageTest?.map(b => b.name) || []);

    return true;

  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

testConnection();