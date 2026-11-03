import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_cY17XqUOdEeo@ep-solitary-sea-bd7s0yh1-pooler.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({ connectionString });

async function seed() {
  console.log('--- Starting Dynamic Data Generator for CashPilot on Neon DB ---');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Clean existing records safely
    console.log('1. Cleaning existing data...');
    await client.query(`
      TRUNCATE TABLE 
        audit_log,
        transactions,
        dues,
        expense_claim_items,
        expense_claims,
        recurring_rules,
        budgets,
        categories,
        parties,
        accounts,
        memberships,
        organizations,
        users
      RESTART IDENTITY CASCADE;
    `);

    // 2. Seed Users
    console.log('2. Creating users with securely hashed credentials...');
    const passwordHash = await bcrypt.hash('Admin@123', 10);

    const userRows = await client.query(
      `INSERT INTO users (name, email, phone, password_hash) VALUES
       ('Business Owner', 'owner@cash.local', '9810011111', $1),
       ('Senior Accountant', 'accounts@cash.local', '9810022222', $1),
       ('Sales & Field Lead', 'employee@cash.local', '9810033333', $1),
       ('Managing Partner', 'viewer@cash.local', '9810044444', $1)
       RETURNING id, name, email;`,
      [passwordHash]
    );

    const [owner, accountant, employee, viewer] = userRows.rows;

    // 3. Create Multi-Tenant Businesses
    console.log('3. Setting up dynamic businesses (Retail, IT Software, and Food & Beverage)...');
    
    // Org 1: Apex Retail & Electronics
    const org1Res = await client.query(`SELECT create_business('Apex Retail & Electronics', 'RETAIL', $1) AS id;`, [owner.id]);
    const org1 = org1Res.rows[0].id;
    await client.query(`UPDATE organizations SET low_cash_alert = 75000, gstin = '27AABCA1234F1Z5' WHERE id = $1;`, [org1]);

    // Org 2: NovaByte Cloud & Software
    const org2Res = await client.query(`SELECT create_business('NovaByte Cloud & Software', 'IT_SOFTWARE', $1) AS id;`, [owner.id]);
    const org2 = org2Res.rows[0].id;
    await client.query(`UPDATE organizations SET low_cash_alert = 150000, gstin = '29AABCN5678K1Z2' WHERE id = $1;`, [org2]);

    // Org 3: Urban Roast Cafe & Bistro
    const org3Res = await client.query(`SELECT create_business('Urban Roast Cafe & Bistro', 'RESTAURANT', $1) AS id;`, [owner.id]);
    const org3 = org3Res.rows[0].id;
    await client.query(`UPDATE organizations SET low_cash_alert = 40000, gstin = '27AABCU9012M1Z8' WHERE id = $1;`, [org3]);

    // Assign team memberships
    await client.query(`
      INSERT INTO memberships (org_id, user_id, role) VALUES
        ($1, $2, 'ACCOUNTANT'),
        ($1, $3, 'EMPLOYEE'),
        ($1, $4, 'VIEWER'),
        ($2, $2, 'ACCOUNTANT'),
        ($2, $3, 'EMPLOYEE'),
        ($3, $2, 'ACCOUNTANT');
    `, [org1, accountant.id, employee.id, viewer.id]);

    await client.query(`UPDATE users SET last_org_id = $1 WHERE id = $2;`, [org1, owner.id]);
    await client.query(`UPDATE users SET last_org_id = $1 WHERE id = $2;`, [org1, accountant.id]);
    await client.query(`UPDATE users SET last_org_id = $1 WHERE id = $2;`, [org1, employee.id]);

    // 4. Accounts Configuration (Opening Balances & Live Banking)
    console.log('4. Creating bank accounts and digital wallets...');

    // Org 1 Accounts
    await client.query(`
      INSERT INTO accounts (org_id, name, type, bank_name, account_no_last4, opening_balance, opening_date) VALUES
        ($1, 'HDFC Premium Current A/c', 'BANK', 'HDFC Bank', '8842', 450000, CURRENT_DATE - INTERVAL '180 days'),
        ($1, 'ICICI Operating A/c', 'BANK', 'ICICI Bank', '3190', 220000, CURRENT_DATE - INTERVAL '180 days'),
        ($1, 'Razorpay / UPI Merchant', 'UPI_WALLET', NULL, NULL, 35000, CURRENT_DATE - INTERVAL '180 days');
    `, [org1]);
    await client.query(`
      UPDATE accounts SET opening_balance = 50000, opening_date = CURRENT_DATE - INTERVAL '180 days'
      WHERE org_id = $1 AND name = 'Cash in Hand';
    `, [org1]);

    // Org 2 Accounts
    await client.query(`
      INSERT INTO accounts (org_id, name, type, bank_name, account_no_last4, opening_balance, opening_date) VALUES
        ($1, 'Kotak Tech Current A/c', 'BANK', 'Kotak Mahindra', '5511', 1250000, CURRENT_DATE - INTERVAL '180 days'),
        ($1, 'Stripe Global Wallet', 'UPI_WALLET', NULL, NULL, 180000, CURRENT_DATE - INTERVAL '180 days');
    `, [org2]);
    await client.query(`
      UPDATE accounts SET opening_balance = 20000, opening_date = CURRENT_DATE - INTERVAL '180 days'
      WHERE org_id = $1 AND name = 'Cash in Hand';
    `, [org2]);

    // 5. Parties (Customers, Vendors, Contractors)
    console.log('5. Populating verified customers and vendors...');
    await client.query(`
      INSERT INTO parties (org_id, name, kind, phone, email, gstin) VALUES
        ($1, 'Reliance Digital Distro', 'VENDOR', '9820011122', 'vendor@reliancedigital.com', '27AABCR1111A1Z1'),
        ($1, 'Croma Retail Corp', 'CUSTOMER', '9820033344', 'b2b@croma.com', '27AABCC2222B1Z2'),
        ($1, 'Tata Power Utilities', 'VENDOR', '9820055566', 'care@tatapower.com', '27AABCT3333C1Z3'),
        ($1, 'Prime Commercial Realty (Landlord)', 'VENDOR', '9820077788', 'leasing@primerealty.com', '27AABCP4444D1Z4'),
        ($1, 'Aditya Logistics Express', 'VENDOR', '9820099900', 'dispatch@adityalogistics.com', '27AABCA5555E1Z5'),
        ($2, 'Fintech Innovations Ltd', 'CUSTOMER', '9830011122', 'accounts@fintechinno.com', '29AABCF6666F1Z6'),
        ($2, 'Nexus Enterprise Inc (USA)', 'CUSTOMER', '9830033344', 'billing@nexusenterprise.com', NULL),
        ($2, 'Amazon Web Services India', 'VENDOR', '9830055566', 'aws-billing@amazon.com', '27AABCA7777G1Z7'),
        ($2, 'Slack & Atlassian Subscriptions', 'VENDOR', '9830077788', 'subs@atlassian.com', NULL);
    `, [org1, org2]);

    // 6. Dynamic Daily Transactions Generator across past 150 days up to TODAY
    console.log('6. Generating rolling dynamic transactions across 150 days up to today...');
    
    // Lookups
    const org1Accs = (await client.query(`SELECT id, name FROM accounts WHERE org_id = $1`, [org1])).rows;
    const org1Cats = (await client.query(`SELECT id, name, direction FROM categories WHERE org_id = $1`, [org1])).rows;
    const org1Parties = (await client.query(`SELECT id, name, kind FROM parties WHERE org_id = $1`, [org1])).rows;

    const accMap: Record<string, number> = Object.fromEntries(org1Accs.map(a => [a.name, a.id]));
    const catMap: Record<string, number> = Object.fromEntries(org1Cats.map(c => [c.name, c.id]));
    const partyMap: Record<string, number> = Object.fromEntries(org1Parties.map(p => [p.name, p.id]));

    // 6.1 Daily Retail Counter & POS Sales
    await client.query(`
      INSERT INTO transactions (org_id, txn_date, direction, amount, account_id, category_id, payment_mode, reference, notes, created_by)
      SELECT 
        $1,
        d::date,
        'IN',
        round((12000 + (sin(extract(doy from d)) * 3000) + (random() * 8000))::numeric, 2),
        $2,
        $3,
        'CARD',
        'POS-BATCH-' || to_char(d, 'YYYYMMDD'),
        'Daily evening POS closing batch',
        $4
      FROM generate_series(CURRENT_DATE - INTERVAL '150 days', CURRENT_DATE, '1 day') d;
    `, [
      org1,
      accMap['HDFC Premium Current A/c'],
      catMap['Counter Sales'] || catMap['Sales / Revenue'],
      accountant.id,
    ]);

    // 6.2 Daily Digital / UPI Sales
    await client.query(`
      INSERT INTO transactions (org_id, txn_date, direction, amount, account_id, category_id, payment_mode, reference, notes, created_by)
      SELECT 
        $1,
        d::date,
        'IN',
        round((6000 + (random() * 5000))::numeric, 2),
        $2,
        $3,
        'UPI',
        'UPI-QR-' || to_char(d, 'YYYYMMDD'),
        'QR counter collections',
        $4
      FROM generate_series(CURRENT_DATE - INTERVAL '150 days', CURRENT_DATE, '1 day') d;
    `, [
      org1,
      accMap['Razorpay / UPI Merchant'],
      catMap['Counter Sales'] || catMap['Sales / Revenue'],
      accountant.id,
    ]);

    // 6.3 Bi-weekly Stock Purchases
    await client.query(`
      INSERT INTO transactions (org_id, txn_date, direction, amount, account_id, category_id, party_id, payment_mode, reference, notes, created_by)
      SELECT 
        $1,
        d::date,
        'OUT',
        round((75000 + (random() * 30000))::numeric, 2),
        $2,
        $3,
        $4,
        'BANK',
        'NEFT-WH-' || to_char(d, 'YYYYMMDD'),
        'Wholesale electronics & inventory restock',
        $5
      FROM generate_series(CURRENT_DATE - INTERVAL '150 days' + INTERVAL '3 days', CURRENT_DATE - INTERVAL '2 days', '14 days') d;
    `, [
      org1,
      accMap['HDFC Premium Current A/c'],
      catMap['Inventory Purchase'],
      partyMap['Reliance Digital Distro'],
      accountant.id,
    ]);

    // 6.4 Monthly Recurring Overheads
    await client.query(`
      INSERT INTO transactions (org_id, txn_date, direction, amount, account_id, category_id, party_id, payment_mode, reference, notes, created_by)
      SELECT 
        $1,
        (m::date + v.day_offset),
        'OUT',
        v.amount,
        $2,
        v.cat_id,
        v.party_id,
        'BANK',
        v.ref_prefix || '-' || to_char(m, 'MonYYYY'),
        v.memo,
        $3
      FROM generate_series(CURRENT_DATE - INTERVAL '150 days', CURRENT_DATE - INTERVAL '15 days', '1 month') m
      CROSS JOIN (
        VALUES 
          (4, $4::int, 65000::numeric, $5::int, 'RENT', 'Storefront commercial rent'),
          (1, $6::int, 145000::numeric, NULL::int, 'SALARY', 'Monthly staff salaries & wages'),
          (8, $7::int, 18200::numeric, $8::int, 'UTIL', 'Commercial electricity power bill'),
          (15, $9::int, 42000::numeric, NULL::int, 'GST', 'Monthly GST 3B tax settlement'),
          (18, $10::int, 15000::numeric, NULL::int, 'MKT', 'Local newspaper and online promotions')
      ) v(day_offset, cat_id, amount, party_id, ref_prefix, memo);
    `, [
      org1,
      accMap['HDFC Premium Current A/c'],
      accountant.id,
      catMap['Rent'],
      partyMap['Prime Commercial Realty (Landlord)'],
      catMap['Salaries & Wages'],
      catMap['Electricity & Utilities'],
      partyMap['Tata Power Utilities'],
      catMap['Taxes & GST'],
      catMap['Marketing'],
    ]);

    // 7. Atomic Transfers (Weekly sweep from UPI to Bank)
    console.log('7. Creating dual-leg atomic account transfers...');
    await client.query(`
      INSERT INTO transactions (org_id, txn_date, direction, amount, account_id, transfer_group, payment_mode, notes, created_by)
      SELECT 
        $1, 
        d::date, 
        x.dir::flow_dir, 
        45000, 
        x.acc_id, 
        g, 
        'BANK', 
        'Scheduled UPI wallet auto-sweep to bank', 
        $2
      FROM generate_series(CURRENT_DATE - INTERVAL '140 days', CURRENT_DATE - INTERVAL '4 days', '7 days') d
      CROSS JOIN LATERAL (SELECT gen_random_uuid() g) gg
      CROSS JOIN LATERAL (
        VALUES 
          ('OUT', $3::int), 
          ('IN', $4::int)
      ) x(dir, acc_id);
    `, [org1, accountant.id, accMap['Razorpay / UPI Merchant'], accMap['HDFC Premium Current A/c']]);

    // 8. Open Dues (Receivables & Payables with upcoming and overdue milestones)
    console.log('8. Generating rolling invoices, bills, and receivables...');
    await client.query(`
      INSERT INTO dues (org_id, kind, party_id, category_id, doc_no, description, amount, issue_date, due_date, created_by) VALUES
        -- Overdue Invoice (Awaiting follow-up)
        ($1, 'RECEIVABLE', $2, $3, 'INV-2026-901', 'Smart TV bulk supply order (Branch 1)', 128000, CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE - INTERVAL '10 days', $4),
        -- Open Current Invoice
        ($1, 'RECEIVABLE', $2, $3, 'INV-2026-902', 'Laptops & display consignment', 84500, CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE + INTERVAL '18 days', $4),
        -- Future Invoice
        ($1, 'RECEIVABLE', $2, $3, 'INV-2026-903', 'Annual maintenance accessories contract', 46000, CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '27 days', $4),
        -- Overdue Vendor Bill
        ($1, 'PAYABLE', $5, $6, 'REL-SUP-4102', 'High-end smartphone inventory shipment', 215000, CURRENT_DATE - INTERVAL '28 days', CURRENT_DATE - INTERVAL '5 days', $4),
        -- Upcoming Vendor Bill
        ($1, 'PAYABLE', $7, $8, 'LOG-EXP-889', 'Monthly fleet dispatch and courier freight', 32400, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '12 days', $4);
    `, [
      org1,
      partyMap['Croma Retail Corp'],
      catMap['Counter Sales'] || catMap['Sales / Revenue'],
      accountant.id,
      partyMap['Reliance Digital Distro'],
      catMap['Inventory Purchase'],
      partyMap['Aditya Logistics Express'],
      catMap['Shipping & Delivery'] || catMap['Operating Expenses'] || catMap['Inventory Purchase'],
    ]);

    // Record partial settlement on INV-2026-901
    const due1Row = await client.query(`SELECT id FROM dues WHERE doc_no = 'INV-2026-901' LIMIT 1`);
    if (due1Row.rows.length) {
      await client.query(`
        INSERT INTO transactions (org_id, txn_date, direction, amount, account_id, due_id, party_id, category_id, payment_mode, reference, notes, created_by)
        VALUES ($1, CURRENT_DATE - INTERVAL '7 days', 'IN', 50000, $2, $3, $4, $5, 'BANK', 'UTR-PART-9912', 'Part payment received for bulk invoice', $6);
      `, [
        org1,
        accMap['HDFC Premium Current A/c'],
        due1Row.rows[0].id,
        partyMap['Croma Retail Corp'],
        catMap['Counter Sales'] || catMap['Sales / Revenue'],
        accountant.id
      ]);
    }

    // 9. Recurring Rules for Forecast Projections
    console.log('9. Configuring active recurring forecast cash rules...');
    await client.query(`
      INSERT INTO recurring_rules (org_id, title, direction, amount, account_id, category_id, party_id, frequency, next_date, auto_post, active) VALUES
        ($1, 'Store Retail Lease', 'OUT', 65000, $2, $3, $4, 'MONTHLY', CURRENT_DATE + INTERVAL '5 days', true, true),
        ($1, 'Team Salaries', 'OUT', 145000, $2, $5, NULL, 'MONTHLY', CURRENT_DATE + INTERVAL '25 days', true, true),
        ($1, 'Commercial Power Bill', 'OUT', 18200, $2, $6, $7, 'MONTHLY', CURRENT_DATE + INTERVAL '12 days', true, true),
        ($1, 'Business Loan EMI', 'OUT', 34500, $2, $8, NULL, 'MONTHLY', CURRENT_DATE + INTERVAL '8 days', true, true);
    `, [
      org1,
      accMap['HDFC Premium Current A/c'],
      catMap['Rent'],
      partyMap['Prime Commercial Realty (Landlord)'],
      catMap['Salaries & Wages'],
      catMap['Electricity & Utilities'],
      partyMap['Tata Power Utilities'],
      catMap['Loan Repayment / EMI'] || catMap['Financing Activities'] || catMap['Rent']
    ]);

    // 10. Budgets for Current & Upcoming Months
    console.log('10. Establishing dynamic category monthly budgets...');
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    await client.query(`
      INSERT INTO budgets (org_id, category_id, month, amount)
      VALUES 
        ($1, $2, $3::date, 350000), -- Inventory
        ($1, $4, $3::date, 150000), -- Salaries
        ($1, $5, $3::date, 65000),  -- Rent
        ($1, $6, $3::date, 22000),  -- Electricity
        ($1, $7, $3::date, 20000)   -- Marketing
      ON CONFLICT (org_id, category_id, month) DO UPDATE SET amount = EXCLUDED.amount;
    `, [
      org1,
      catMap['Inventory Purchase'],
      currentMonth,
      catMap['Salaries & Wages'],
      catMap['Rent'],
      catMap['Electricity & Utilities'],
      catMap['Marketing']
    ]);

    // 11. Expense Claims with workflow states (Draft, Submitted, Approved, Paid)
    console.log('11. Seeding expense claims across approval lifecycle...');
    const travelCat = catMap['Travel & Conveyance'] || catMap['Office & Admin'] || catMap['Marketing'];
    const adminCat = catMap['Office & Admin'] || catMap['Marketing'];

    // Claim 1: SUBMITTED (Ready for owner/accountant review)
    const c1 = await client.query(`
      INSERT INTO expense_claims (org_id, claim_no, employee_id, title, status, total, submitted_at)
      VALUES ($1, next_claim_no($1), $2, 'Client Visit & Hardware Demo – Pune', 'SUBMITTED', 6850, now() - interval '2 days')
      RETURNING id;
    `, [org1, employee.id]);
    await client.query(`
      INSERT INTO expense_claim_items (claim_id, expense_date, category_id, description, amount) VALUES
        ($1, CURRENT_DATE - INTERVAL '3 days', $2, 'Inter-city Cab & Tolls Pune return', 2450),
        ($1, CURRENT_DATE - INTERVAL '3 days', $2, 'Hotel Stay 1 Night (Business rate)', 3200),
        ($1, CURRENT_DATE - INTERVAL '2 days', $3, 'Client Executive Dinner', 1200);
    `, [c1.rows[0].id, travelCat, adminCat]);

    // Claim 2: APPROVED (Ready to be reimbursed)
    const c2 = await client.query(`
      INSERT INTO expense_claims (org_id, claim_no, employee_id, title, status, total, approved_amount, reviewed_by, reviewed_at, review_note, submitted_at)
      VALUES ($1, next_claim_no($1), $2, 'Quarterly Store Stationery & Logistics', 'APPROVED', 3400, 3400, $3, now() - interval '1 day', 'All receipts verified. Approved in full.', now() - interval '4 days')
      RETURNING id;
    `, [org1, employee.id, owner.id]);
    await client.query(`
      INSERT INTO expense_claim_items (claim_id, expense_date, category_id, description, amount) VALUES
        ($1, CURRENT_DATE - INTERVAL '6 days', $2, 'Thermal Receipt Rolls & Barcode Labels', 1900),
        ($1, CURRENT_DATE - INTERVAL '5 days', $2, 'Courier and Packaging Cartons', 1500);
    `, [c2.rows[0].id, adminCat]);

    // Claim 3: DRAFT (Employee currently filling)
    const c3 = await client.query(`
      INSERT INTO expense_claims (org_id, claim_no, employee_id, title, status, total)
      VALUES ($1, next_claim_no($1), $2, 'Local Travel & Client Site Inspections', 'DRAFT', 1450)
      RETURNING id;
    `, [org1, employee.id]);
    await client.query(`
      INSERT INTO expense_claim_items (claim_id, expense_date, category_id, description, amount) VALUES
        ($1, CURRENT_DATE - INTERVAL '1 day', $2, 'Metro card recharge and local auto fares', 1450);
    `, [c3.rows[0].id, travelCat]);

    await client.query('COMMIT');
    console.log('✅ Dynamic cloud data seeding completed successfully on Neon PostgreSQL!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed with error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
