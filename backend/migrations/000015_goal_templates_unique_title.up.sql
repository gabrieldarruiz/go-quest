-- Remove duplicatas mantendo o registro de menor id por título
DELETE FROM goal_templates
WHERE id NOT IN (
    SELECT MIN(id) FROM goal_templates GROUP BY title
);

-- Adiciona constraint para evitar duplicatas futuras
ALTER TABLE goal_templates ADD CONSTRAINT goal_templates_title_unique UNIQUE (title);
