-- Drop email UNIQUE constraint to allow re-imports with changed emails
-- and employees who share mailboxes or have no email
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_email_key;
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email) WHERE email IS NOT NULL;
