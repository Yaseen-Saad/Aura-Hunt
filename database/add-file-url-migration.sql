-- Migration to add file_url column to image_submissions table
-- Run this in Supabase SQL Editor

-- Add the file_url column
ALTER TABLE public.image_submissions 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Update existing records to generate file_url from file_path
-- This will create public URLs for existing images
UPDATE public.image_submissions 
SET file_url = CONCAT(
  'https://aotevixdwpfvwrauhlpx.supabase.co/storage/v1/object/public/aura-hunt-images/', 
  file_path
)
WHERE file_url IS NULL;

-- Make file_url NOT NULL for future inserts
ALTER TABLE public.image_submissions 
ALTER COLUMN file_url SET NOT NULL;

-- Refresh materialized view if it exists
REFRESH MATERIALIZED VIEW IF EXISTS public.leaderboard;

-- Verify the changes
SELECT COUNT(*) as total_images, 
       COUNT(file_url) as images_with_url 
FROM public.image_submissions;