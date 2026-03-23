ALTER TABLE user_progress
    DROP COLUMN IF EXISTS save_milestone,
    DROP COLUMN IF EXISTS save_balance;
