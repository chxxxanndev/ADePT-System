-- Add professional designation/title suffix (e.g. REA, RN, Enp) to staff and signatories
ALTER TABLE staff ADD COLUMN IF NOT EXISTS suffix VARCHAR(50);
ALTER TABLE signatories ADD COLUMN IF NOT EXISTS suffix VARCHAR(50);
