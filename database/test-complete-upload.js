const { supabase } = require('../api/supabase');
const fs = require('fs');
const path = require('path');

async function testImageUpload() {
  try {
    console.log('🧪 Testing complete image upload flow...');

    // Test 1: Check bucket exists
    console.log('\n1. Checking bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Failed to list buckets:', bucketsError);
      return;
    }

    const bucketExists = buckets?.some(b => b.name === 'aura-hunt-images');
    console.log(`✅ Bucket exists: ${bucketExists}`);
    console.log(`Available buckets: ${buckets?.map(b => b.name).join(', ')}`);

    if (!bucketExists) {
      console.error('❌ aura-hunt-images bucket not found');
      return;
    }

    // Test 2: Create a test image buffer
    console.log('\n2. Creating test image...');
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    const fileName = `test-upload-${Date.now()}.png`;
    
    // Test 3: Upload test image
    console.log('\n3. Uploading test image...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('aura-hunt-images')
      .upload(fileName, testImageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      console.log('Full error object:', JSON.stringify(uploadError, null, 2));
      return;
    }

    console.log('✅ Upload successful:', uploadData.path);

    // Test 4: Get public URL
    console.log('\n4. Getting public URL...');
    const { data: publicUrl } = supabase.storage
      .from('aura-hunt-images')
      .getPublicUrl(fileName);

    console.log('✅ Public URL:', publicUrl.publicUrl);

    // Test 5: Verify file exists
    console.log('\n5. Verifying file exists...');
    const { data: fileInfo, error: infoError } = await supabase.storage
      .from('aura-hunt-images')
      .list('', { search: fileName });

    if (infoError) {
      console.error('❌ Failed to verify file:', infoError);
    } else {
      const fileExists = fileInfo?.some(f => f.name === fileName);
      console.log(`✅ File verification: ${fileExists ? 'Found' : 'Not found'}`);
    }

    // Test 6: Clean up
    console.log('\n6. Cleaning up...');
    const { error: deleteError } = await supabase.storage
      .from('aura-hunt-images')
      .remove([fileName]);

    if (deleteError) {
      console.error('⚠️ Cleanup failed:', deleteError);
    } else {
      console.log('✅ Cleanup successful');
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.log('Error details:', JSON.stringify(error, null, 2));
  }
}

// Test team credentials too
async function testTeamAuth() {
  try {
    console.log('\n🔐 Testing team authentication...');
    
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, token')
      .limit(3);

    if (teamsError) {
      console.error('❌ Failed to fetch teams:', teamsError);
      return;
    }

    console.log(`✅ Found ${teams?.length || 0} teams`);
    if (teams && teams.length > 0) {
      console.log('Sample team:', {
        id: teams[0].id,
        name: teams[0].name,
        token: teams[0].token?.substring(0, 20) + '...'
      });
    }

  } catch (error) {
    console.error('❌ Team auth test failed:', error);
  }
}

// Run tests
async function runAllTests() {
  await testImageUpload();
  await testTeamAuth();
}

runAllTests();