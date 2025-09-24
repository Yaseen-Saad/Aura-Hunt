require('dotenv').config({ path: '../.env' });
const { supabase } = require('../api/supabase');

async function fixImageUrls() {
  try {
    console.log('🔄 Fixing image URLs...');

    // First, let's see what's in the image_submissions table
    const { data: allImages, error: fetchError } = await supabase
      .from('image_submissions')
      .select('*');

    if (fetchError) {
      console.error('Error fetching images:', fetchError);
      return;
    }

    console.log(`Found ${allImages?.length || 0} image submissions`);
    
    if (allImages && allImages.length > 0) {
      console.log('Sample image record:', allImages[0]);
      
      // Update each record to include the public URL
      for (const image of allImages) {
        // Generate the public URL from the file path
        const { data: publicUrlData } = supabase.storage
          .from('aura-hunt-images')
          .getPublicUrl(image.file_name || image.file_path);
        
        console.log(`Updating image ${image.id} with URL: ${publicUrlData.publicUrl}`);
        
        // Try to add file_url field to the record
        const { error: updateError } = await supabase
          .from('image_submissions')
          .update({ file_url: publicUrlData.publicUrl })
          .eq('id', image.id);

        if (updateError) {
          console.error(`Error updating image ${image.id}:`, updateError);
        }
      }
    }

    console.log('✅ Image URL fix completed!');

  } catch (error) {
    console.error('Error fixing image URLs:', error);
  }
}

fixImageUrls();