const { supabase } = require('../api/supabase');

async function createStorageBucket() {
  try {
    console.log('🪣 Creating Supabase storage bucket...');

    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    console.log('Existing buckets:', buckets?.map(b => b.name) || []);

    const bucketExists = buckets?.some(bucket => bucket.name === 'aura-hunt-images');
    
    if (bucketExists) {
      console.log('✅ Bucket "aura-hunt-images" already exists');
    } else {
      // Create the bucket
      const { data: createData, error: createError } = await supabase.storage.createBucket('aura-hunt-images', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 10485760 // 10MB
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        console.log('\n📋 Manual Setup Required:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to Storage section');
        console.log('3. Click "New Bucket"');
        console.log('4. Name: aura-hunt-images');
        console.log('5. Make it Public: Yes');
        console.log('6. Set file size limit to 10MB');
        return;
      }

      console.log('✅ Bucket created successfully:', createData);
    }

    // Test bucket access
    console.log('\n🧪 Testing bucket access...');
    
    // Try to list files (should work even if empty)
    const { data: files, error: testError } = await supabase.storage
      .from('aura-hunt-images')
      .list();

    if (testError) {
      console.error('❌ Bucket access test failed:', testError);
      console.log('\n📋 Manual Policy Setup Required:');
      console.log('Go to Supabase Dashboard > Storage > Policies and add:');
      console.log('1. SELECT policy: "Allow public read access"');
      console.log('   - Policy name: Allow public read access');
      console.log('   - Allowed operation: SELECT');
      console.log('   - Target roles: public');
      console.log('   - USING expression: bucket_id = \'aura-hunt-images\'');
      console.log('');
      console.log('2. INSERT policy: "Allow service role full access"');
      console.log('   - Policy name: Allow service role full access');
      console.log('   - Allowed operation: ALL');
      console.log('   - Target roles: service_role');
      console.log('   - USING expression: auth.role() = \'service_role\'');
    } else {
      console.log('✅ Bucket access test successful');
      console.log(`Found ${files?.length || 0} files in bucket`);
    }

    // Test upload capability
    console.log('\n🔧 Testing upload capability...');
    const testData = Buffer.from('test image data');
    const testFileName = `test-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('aura-hunt-images')
      .upload(testFileName, testData, {
        contentType: 'text/plain'
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful:', uploadData.path);
      
      // Clean up test file
      await supabase.storage
        .from('aura-hunt-images')
        .remove([testFileName]);
      console.log('🧹 Test file cleaned up');
    }

  } catch (error) {
    console.error('Error in bucket setup:', error);
  }
}

createStorageBucket();