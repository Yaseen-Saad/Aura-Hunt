const { supabase } = require('../api/supabase');
require('dotenv').config({ path: '../.env' });

async function fixSubmissionDisplay() {
  try {
    console.log('🔄 Fixing submission display...');

    // Step 1: Check if file_url column exists, if not, we'll work around it
    const { data: existingImages, error: fetchError } = await supabase
      .from('image_submissions')
      .select('*')
      .limit(5);

    if (fetchError) {
      console.error('Error fetching images:', fetchError);
      return;
    }

    console.log(`Found ${existingImages?.length || 0} image records in database`);
    if (existingImages && existingImages.length > 0) {
      console.log('Sample image record:', existingImages[0]);
    }

    // Step 2: Get team_questions to find text submissions in attempts arrays
    const { data: teamQuestions, error: teamQError } = await supabase
      .from('team_questions')
      .select('team_id, question_id, attempts')
      .not('attempts', 'is', null)
      .limit(10);

    if (teamQError) {
      console.error('Error fetching team questions:', teamQError);
    } else {
      console.log(`Found ${teamQuestions?.length || 0} team question records with attempts`);
      if (teamQuestions && teamQuestions.length > 0) {
        console.log('Sample attempts:', teamQuestions[0].attempts);
      }
    }

    // Step 3: Try to update image records with file_url if column exists
    if (existingImages && existingImages.length > 0) {
      for (const image of existingImages) {
        try {
          // Generate the public URL using Supabase storage
          const { data: publicUrlData } = supabase.storage
            .from('aura-hunt-images')
            .getPublicUrl(image.file_name);
          
          console.log(`Generated URL for ${image.file_name}: ${publicUrlData.publicUrl}`);
          
          // Try to update with file_url
          const { error: updateError } = await supabase
            .from('image_submissions')
            .update({ file_url: publicUrlData.publicUrl })
            .eq('id', image.id);

          if (updateError) {
            console.log(`Note: file_url column might not exist yet: ${updateError.message}`);
          } else {
            console.log(`✅ Updated image ${image.id} with URL`);
          }
        } catch (err) {
          console.log(`Note: Could not update image ${image.id}:`, err.message);
        }
      }
    }

    console.log('✅ Submission display fix completed!');

  } catch (error) {
    console.error('Error in fixSubmissionDisplay:', error);
  }
}

fixSubmissionDisplay();