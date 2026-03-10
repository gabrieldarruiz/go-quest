ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE users
SET password_hash = crypt(gen_random_uuid()::text, gen_salt('bf'))
WHERE password_hash IS NULL OR password_hash = '';

ALTER TABLE users
ALTER COLUMN password_hash SET NOT NULL;
