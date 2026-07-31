-- Add optional middle initial to staff (some staff have no middle name)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS middle_initial VARCHAR(10);
