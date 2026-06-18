-- Migration: Normalize keyword phrases to match content normalization
-- The normalization is now consistent between keywords and content:
-- - Removes punctuation and special characters
-- - Converts to lowercase
-- - Removes URLs
-- - Collapses whitespace
-- 
-- Existing matches are cleared because they were based on old normalization
-- Users should re-run matching passes after this migration

-- Step 1: Remove existing matches based on old normalization
DELETE FROM "KeywordMatchEvent";

-- Step 2: Normalize all keyword phrases by removing common special characters
-- SQLite REPLACE function is chained to remove most punctuation
UPDATE "MonitoredKeywordRule"
SET normalizedPhrase = lower(trim(
  replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(phrase, '-', ' '),
                    '''', ' '
                  ),
                  '"', ' '
                ),
                '.', ' '
              ),
              ',', ' '
            ),
            '!', ' '
          ),
          '?', ' '
        ),
        '&', ' '
      ),
      '@', ' '
    ),
    '#', ' '
  )
));
