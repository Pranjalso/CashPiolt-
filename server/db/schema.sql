-- =====================================================================
--  CashPilot — Multi-business Cash Flow Management
--  PostgreSQL 14+ schema
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE business_type AS ENUM ('RETAIL','RESTAURANT','MANUFACTURING','TRADING','SERVICES',
  'IT_SOFTWARE','CONSTRUCTION','HEALTHCARE','EDUCATION','TRANSPORT','AGRICULTURE','FREELANCER','NGO','OTHER');
CREATE TYPE member_role   AS ENUM ('OWNER','ACCOUNTANT','EMPLOYEE','VIEWER');
CREATE TYPE claim_status  AS ENUM ('DRAFT','SUBMITTED','APPROVED','REJECTED','PAID');
CREATE TYPE account_type  AS ENUM ('CASH','BANK','UPI_WALLET','CREDIT_CARD','LOAN');
CREATE TYPE flow_dir      AS ENUM ('IN','OUT');
CREATE TYPE cf_activity   AS ENUM ('OPERATING','INVESTING','FINANCING');
CREATE TYPE due_kind      AS ENUM ('RECEIVABLE','PAYABLE');
CREATE TYPE due_status    AS ENUM ('OPEN','PARTIAL','PAID','CANCELLED');
CREATE TYPE frequency     AS ENUM ('DAILY','WEEKLY','MONTHLY','QUARTERLY','YEARLY');

-- ---------- Tenancy ---------------------------------------------------
CREATE TABLE organizations (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  business_type business_type NOT NULL DEFAULT 'OTHER',
  currency      CHAR(3) NOT NULL DEFAULT 'INR',
  gstin         TEXT,
  fy_start_month INT NOT NULL DEFAULT 4 CHECK (fy_start_month BETWEEN 1 AND 12),
  low_cash_alert NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_org_id   INT,                       -- business opened last; used at next login
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- one user can run / access many businesses
CREATE TABLE memberships (
  org_id  INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role    member_role NOT NULL DEFAULT 'VIEWER',
  PRIMARY KEY (org_id, user_id)
);

-- ---------- Masters ---------------------------------------------------
CREATE TABLE accounts (
  id              SERIAL PRIMARY KEY,
  org_id          INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            account_type NOT NULL DEFAULT 'CASH',
  bank_name       TEXT,
  account_no_last4 TEXT,
  opening_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  opening_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (org_id, name)
);

CREATE TABLE categories (
  id        SERIAL PRIMARY KEY,
  org_id    INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  direction flow_dir NOT NULL,
  activity  cf_activity NOT NULL DEFAULT 'OPERATING',
  color     TEXT NOT NULL DEFAULT '#3B4FE0',
  active    BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (org_id, name, direction)
);

CREATE TABLE parties (               -- customers & vendors
  id        SERIAL PRIMARY KEY,
  org_id    INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  kind      TEXT NOT NULL DEFAULT 'BOTH' CHECK (kind IN ('CUSTOMER','VENDOR','EMPLOYEE','LENDER','BOTH')),
  phone     TEXT,
  email     TEXT,
  gstin     TEXT,
  UNIQUE (org_id, name)
);

-- ---------- Dues: receivables (invoices) & payables (bills) ----------
CREATE TABLE dues (
  id          SERIAL PRIMARY KEY,
  org_id      INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind        due_kind NOT NULL,
  party_id    INT REFERENCES parties(id),
  category_id INT REFERENCES categories(id),
  doc_no      TEXT,
  description TEXT,
  amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  issue_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date    DATE NOT NULL,
  status      due_status NOT NULL DEFAULT 'OPEN',
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dues_org ON dues(org_id, status, due_date);

-- ---------- Recurring rules (rent, salary, EMI, subscriptions) -------
CREATE TABLE recurring_rules (
  id          SERIAL PRIMARY KEY,
  org_id      INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  direction   flow_dir NOT NULL,
  amount      NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  account_id  INT NOT NULL REFERENCES accounts(id),
  category_id INT REFERENCES categories(id),
  party_id    INT REFERENCES parties(id),
  frequency   frequency NOT NULL DEFAULT 'MONTHLY',
  next_date   DATE NOT NULL,
  end_date    DATE,
  auto_post   BOOLEAN NOT NULL DEFAULT TRUE,
  active      BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------- Cash book (every rupee in or out) -------------------------
CREATE TABLE transactions (
  id             BIGSERIAL PRIMARY KEY,
  org_id         INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  txn_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  direction      flow_dir NOT NULL,
  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  account_id     INT NOT NULL REFERENCES accounts(id),
  category_id    INT REFERENCES categories(id),
  party_id       INT REFERENCES parties(id),
  due_id         INT REFERENCES dues(id),
  recurring_id   INT REFERENCES recurring_rules(id),
  transfer_group UUID,                -- both legs of an account-to-account transfer
  claim_id       INT,                 -- reimbursement of an expense claim (FK added below)
  payment_mode   TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_mode IN ('CASH','UPI','BANK','CARD','CHEQUE','OTHER')),
  reference      TEXT,
  notes          TEXT,
  created_by     INT REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (transfer_group IS NOT NULL OR category_id IS NOT NULL OR due_id IS NOT NULL OR claim_id IS NOT NULL)
);
CREATE INDEX idx_txn_org_date ON transactions(org_id, txn_date DESC);
CREATE INDEX idx_txn_account  ON transactions(account_id);
CREATE INDEX idx_txn_due      ON transactions(due_id);

-- tenant safety: account/category/party/due must belong to the same org
CREATE OR REPLACE FUNCTION check_txn_tenant() RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE id = NEW.account_id AND org_id = NEW.org_id) THEN
    RAISE EXCEPTION 'Account does not belong to this business' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.category_id AND org_id = NEW.org_id) THEN
    RAISE EXCEPTION 'Category does not belong to this business' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.party_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM parties WHERE id = NEW.party_id AND org_id = NEW.org_id) THEN
    RAISE EXCEPTION 'Party does not belong to this business' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.due_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dues WHERE id = NEW.due_id AND org_id = NEW.org_id) THEN
    RAISE EXCEPTION 'Invoice/bill does not belong to this business' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_txn_tenant BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION check_txn_tenant();

-- keep due status in sync with settlements
CREATE OR REPLACE FUNCTION refresh_due_status() RETURNS TRIGGER AS $$
DECLARE d_id INT; paid NUMERIC; total NUMERIC;
BEGIN
  d_id := COALESCE(NEW.due_id, OLD.due_id);
  IF d_id IS NULL THEN RETURN NULL; END IF;
  SELECT amount INTO total FROM dues WHERE id = d_id;
  SELECT COALESCE(SUM(amount),0) INTO paid FROM transactions WHERE due_id = d_id;
  IF paid > total THEN
    RAISE EXCEPTION 'Settlement % exceeds invoice/bill amount %', paid, total USING ERRCODE = 'check_violation';
  END IF;
  UPDATE dues SET status = CASE WHEN paid = 0 THEN 'OPEN' WHEN paid < total THEN 'PARTIAL' ELSE 'PAID' END::due_status
   WHERE id = d_id AND status <> 'CANCELLED';
  RETURN NULL;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_due_status AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION refresh_due_status();

-- ---------- Expense claims (employee reimbursements) ----------------
CREATE TABLE expense_claims (
  id              SERIAL PRIMARY KEY,
  org_id          INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  claim_no        TEXT NOT NULL,
  employee_id     INT NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  status          claim_status NOT NULL DEFAULT 'DRAFT',
  total           NUMERIC(14,2) NOT NULL DEFAULT 0,
  submitted_at    TIMESTAMPTZ,
  reviewed_by     INT REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  approved_amount NUMERIC(14,2),
  paid_txn_id     BIGINT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, claim_no),
  CHECK (approved_amount IS NULL OR approved_amount <= total)
);
CREATE INDEX idx_claims_org ON expense_claims(org_id, status);

CREATE TABLE expense_claim_items (
  id           SERIAL PRIMARY KEY,
  claim_id     INT NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  category_id  INT NOT NULL REFERENCES categories(id),
  description  TEXT NOT NULL,
  amount       NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  receipt_url  TEXT,                    -- uploaded image / PDF (data URL or object storage key)
  receipt_mime TEXT
);

ALTER TABLE transactions ADD CONSTRAINT fk_txn_claim FOREIGN KEY (claim_id) REFERENCES expense_claims(id);

-- claim number per business: CLM-2026-0001
CREATE TABLE claim_sequences (org_id INT PRIMARY KEY, last_no INT NOT NULL DEFAULT 0);
CREATE OR REPLACE FUNCTION next_claim_no(p_org INT) RETURNS TEXT AS $$
DECLARE n INT;
BEGIN
  INSERT INTO claim_sequences VALUES (p_org, 1)
  ON CONFLICT (org_id) DO UPDATE SET last_no = claim_sequences.last_no + 1 RETURNING last_no INTO n;
  RETURN 'CLM-' || to_char(now(),'YYYY') || '-' || lpad(n::text, 4, '0');
END $$ LANGUAGE plpgsql;

-- ---------- Budgets ---------------------------------------------------
CREATE TABLE budgets (
  id          SERIAL PRIMARY KEY,
  org_id      INT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month       DATE NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),   -- first day of month
  amount      NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  UNIQUE (org_id, category_id, month)
);

-- ---------- Audit -----------------------------------------------------
CREATE TABLE audit_log (
  id         BIGSERIAL PRIMARY KEY,
  org_id     INT REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id),
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  detail     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Category templates per business type --------------------
CREATE TABLE category_templates (
  business_type business_type,          -- NULL = common to all
  name      TEXT NOT NULL,
  direction flow_dir NOT NULL,
  activity  cf_activity NOT NULL DEFAULT 'OPERATING',
  color     TEXT NOT NULL DEFAULT '#3B4FE0'
);

INSERT INTO category_templates(business_type,name,direction,activity,color) VALUES
 (NULL,'Sales / Revenue','IN','OPERATING','#12b39a'),
 (NULL,'Other Income','IN','OPERATING','#0ea5e9'),
 (NULL,'Interest Received','IN','INVESTING','#14b8a6'),
 (NULL,'Loan Received','IN','FINANCING','#6366f1'),
 (NULL,'Owner Capital','IN','FINANCING','#8b5cf6'),
 (NULL,'Salaries & Wages','OUT','OPERATING','#E91E7B'),
 (NULL,'Rent','OUT','OPERATING','#f97316'),
 (NULL,'Electricity & Utilities','OUT','OPERATING','#f59e0b'),
 (NULL,'Internet & Phone','OUT','OPERATING','#eab308'),
 (NULL,'Taxes & GST','OUT','OPERATING','#ef4444'),
 (NULL,'Marketing','OUT','OPERATING','#ec4899'),
 (NULL,'Travel & Conveyance','OUT','OPERATING','#a855f7'),
 (NULL,'Office & Admin','OUT','OPERATING','#64748b'),
 (NULL,'Bank Charges','OUT','OPERATING','#94a3b8'),
 (NULL,'Equipment / Assets','OUT','INVESTING','#0B1F4B'),
 (NULL,'Loan Repayment / EMI','OUT','FINANCING','#3B4FE0'),
 (NULL,'Owner Drawings','OUT','FINANCING','#7c3aed'),
 ('RETAIL','Inventory Purchase','OUT','OPERATING','#dc2626'),
 ('RETAIL','Counter Sales','IN','OPERATING','#16a34a'),
 ('RETAIL','Online Sales','IN','OPERATING','#22c55e'),
 ('RESTAURANT','Dine-in Sales','IN','OPERATING','#16a34a'),
 ('RESTAURANT','Delivery App Payouts','IN','OPERATING','#22c55e'),
 ('RESTAURANT','Groceries & Raw Material','OUT','OPERATING','#dc2626'),
 ('RESTAURANT','Gas / Fuel','OUT','OPERATING','#ea580c'),
 ('MANUFACTURING','Raw Material','OUT','OPERATING','#dc2626'),
 ('MANUFACTURING','Factory Overheads','OUT','OPERATING','#ea580c'),
 ('MANUFACTURING','Machine Maintenance','OUT','OPERATING','#f97316'),
 ('MANUFACTURING','Job Work Income','IN','OPERATING','#16a34a'),
 ('TRADING','Goods Purchase','OUT','OPERATING','#dc2626'),
 ('TRADING','Freight & Logistics','OUT','OPERATING','#ea580c'),
 ('TRADING','Commission Income','IN','OPERATING','#16a34a'),
 ('SERVICES','Service Fees','IN','OPERATING','#16a34a'),
 ('SERVICES','Subcontractor Payments','OUT','OPERATING','#dc2626'),
 ('IT_SOFTWARE','Project Billing','IN','OPERATING','#16a34a'),
 ('IT_SOFTWARE','Software Licences & Cloud','OUT','OPERATING','#dc2626'),
 ('IT_SOFTWARE','Contractors / Freelancers','OUT','OPERATING','#ea580c'),
 ('CONSTRUCTION','Running Bill Receipts','IN','OPERATING','#16a34a'),
 ('CONSTRUCTION','Cement, Steel & Material','OUT','OPERATING','#dc2626'),
 ('CONSTRUCTION','Labour Payments','OUT','OPERATING','#ea580c'),
 ('CONSTRUCTION','Equipment Hire','OUT','OPERATING','#f97316'),
 ('HEALTHCARE','Consultation Fees','IN','OPERATING','#16a34a'),
 ('HEALTHCARE','Pharmacy Sales','IN','OPERATING','#22c55e'),
 ('HEALTHCARE','Medical Supplies','OUT','OPERATING','#dc2626'),
 ('EDUCATION','Tuition / Course Fees','IN','OPERATING','#16a34a'),
 ('EDUCATION','Faculty Payments','OUT','OPERATING','#dc2626'),
 ('TRANSPORT','Freight Income','IN','OPERATING','#16a34a'),
 ('TRANSPORT','Fuel','OUT','OPERATING','#dc2626'),
 ('TRANSPORT','Vehicle Maintenance','OUT','OPERATING','#ea580c'),
 ('TRANSPORT','Tolls & Permits','OUT','OPERATING','#f97316'),
 ('AGRICULTURE','Crop / Produce Sales','IN','OPERATING','#16a34a'),
 ('AGRICULTURE','Seeds & Fertiliser','OUT','OPERATING','#dc2626'),
 ('AGRICULTURE','Subsidy Received','IN','OPERATING','#22c55e'),
 ('FREELANCER','Client Payments','IN','OPERATING','#16a34a'),
 ('FREELANCER','Tools & Subscriptions','OUT','OPERATING','#dc2626'),
 ('NGO','Donations & Grants','IN','OPERATING','#16a34a'),
 ('NGO','Programme Expenses','OUT','OPERATING','#dc2626');

-- Create a new business with its default categories and a Cash account
CREATE OR REPLACE FUNCTION create_business(p_name TEXT, p_type business_type, p_owner INT, p_currency CHAR(3) DEFAULT 'INR')
RETURNS INT AS $$
DECLARE o INT;
BEGIN
  INSERT INTO organizations(name, business_type, currency) VALUES (p_name, p_type, p_currency) RETURNING id INTO o;
  INSERT INTO memberships(org_id, user_id, role) VALUES (o, p_owner, 'OWNER');
  INSERT INTO categories(org_id, name, direction, activity, color)
    SELECT o, name, direction, activity, color FROM category_templates
     WHERE business_type IS NULL OR business_type = p_type;
  INSERT INTO accounts(org_id, name, type) VALUES (o, 'Cash in Hand', 'CASH');
  RETURN o;
END $$ LANGUAGE plpgsql;

-- ---------- Reporting views -------------------------------------------
CREATE VIEW v_account_balances AS
SELECT a.id AS account_id, a.org_id, a.name, a.type, a.opening_balance,
       COALESCE(SUM(CASE WHEN t.direction='IN' THEN t.amount END),0) AS total_in,
       COALESCE(SUM(CASE WHEN t.direction='OUT' THEN t.amount END),0) AS total_out,
       a.opening_balance
       + COALESCE(SUM(CASE WHEN t.direction='IN' THEN t.amount ELSE -t.amount END),0) AS balance
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id
GROUP BY a.id;

CREATE VIEW v_due_status AS
SELECT d.*, p.name AS party_name, c.name AS category_name,
       COALESCE((SELECT SUM(amount) FROM transactions t WHERE t.due_id = d.id),0) AS paid,
       d.amount - COALESCE((SELECT SUM(amount) FROM transactions t WHERE t.due_id = d.id),0) AS outstanding,
       CASE WHEN d.status IN ('OPEN','PARTIAL') AND d.due_date < CURRENT_DATE
            THEN CURRENT_DATE - d.due_date ELSE 0 END AS days_overdue
FROM dues d
LEFT JOIN parties p ON p.id = d.party_id
LEFT JOIN categories c ON c.id = d.category_id;

-- monthly cash flow (transfers excluded – they move money, not create it)
CREATE VIEW v_monthly_cashflow AS
SELECT t.org_id, date_trunc('month', t.txn_date)::date AS month,
       SUM(CASE WHEN t.direction='IN'  THEN t.amount ELSE 0 END) AS inflow,
       SUM(CASE WHEN t.direction='OUT' THEN t.amount ELSE 0 END) AS outflow,
       SUM(CASE WHEN t.direction='IN'  THEN t.amount ELSE -t.amount END) AS net
FROM transactions t
WHERE t.transfer_group IS NULL
GROUP BY 1,2;
