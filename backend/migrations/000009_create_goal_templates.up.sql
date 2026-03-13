CREATE TABLE goal_templates (
    id          SERIAL       PRIMARY KEY,
    title       VARCHAR(100) NOT NULL,
    description TEXT         NOT NULL,
    category    VARCHAR(30)  NOT NULL,
    min_level   SMALLINT     NOT NULL DEFAULT 1,
    max_level   SMALLINT     NOT NULL DEFAULT 10,
    xp_reward   INTEGER      NOT NULL DEFAULT 20,
    difficulty  SMALLINT     NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3)
);
