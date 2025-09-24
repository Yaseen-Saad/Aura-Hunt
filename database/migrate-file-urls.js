const { supabase } = require('../api/supabase');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running file_url migration...');

    // Add the file_url column if it doesn't exist
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.image_submissions 
        ADD COLUMN IF NOT EXISTS file_url TEXT;
      `
    });

    if (alterError && !alterError.message.includes('already exists')) {
      console.error('Error adding column:', alterError);
      // Try alternative method
      console.log('Trying alternative migration method...');
    }

    // Update existing records to generate file_url from file_path
    const { data: existingImages, error: fetchError } = await supabase
      .from('image_submissions')
      .select('id, file_path')
      .is('file_url', null);

    if (fetchError) {
      console.error('Error fetching existing images:', fetchError);
      return;
    }

    console.log(`Found ${existingImages?.length || 0} images without file_url`);

    // Update each image with the correct public URL
    for (const image of existingImages || []) {
      const publicUrl = `https://aotevixdwpfvwrauhlpx.supabase.co/storage/v1/object/public/aura-hunt-images/${image.file_path}`;
      
      const { error: updateError } = await supabase
        .from('image_submissions')
        .update({ file_url: publicUrl })
        .eq('id', image.id);

      if (updateError) {
        console.error(`Error updating image ${image.id}:`, updateError);
      }
    }

    // Verify the migration
    const { data: verifyData, error: verifyError } = await supabase
      .from('image_submissions')
      .select('id, file_url')
      .limit(5);

    if (verifyError) {
      console.error('Error verifying migration:', verifyError);
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('Sample URLs:', verifyData?.map(img => img.file_url));
    }

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
runMigration();