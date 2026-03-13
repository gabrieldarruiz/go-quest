ALTER TABLE daily_goals
    DROP COLUMN IF EXISTS template_id,
    DROP COLUMN IF EXISTS xp_reward;
