ALTER TABLE daily_goals
    ADD COLUMN template_id INTEGER REFERENCES goal_templates(id),
    ADD COLUMN xp_reward   INTEGER NOT NULL DEFAULT 0;
