-- Add optional video_url to exercises for video-based questions
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS video_url text NULL;


