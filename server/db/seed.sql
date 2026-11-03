-- Demo data. Password for all demo users: Admin@123
INSERT INTO users(name,email,phone,password_hash) VALUES
 ('Business Owner','owner@cash.local','9000000001',crypt('Admin@123',gen_salt('bf',10))),
 ('Accountant','accounts@cash.local','9000000002',crypt('Admin@123',gen_salt('bf',10))),
 ('Partner (view only)','viewer@cash.local','9000000003',crypt('Admin@123',gen_salt('bf',10)));

SELECT create_business('Sunrise Retail Mart','RETAIL',1);       -- org 1
SELECT create_business('Bluepeak IT Services','IT_SOFTWARE',1); -- org 2
INSERT INTO memberships VALUES (1,2,'ACCOUNTANT'),(1,3,'VIEWER'),(2,2,'ACCOUNTANT');
UPDATE organizations SET low_cash_alert = 50000 WHERE id = 1;

INSERT INTO accounts(org_id,name,type,bank_name,account_no_last4,opening_balance,opening_date) VALUES
 (1,'HDFC Current A/c','BANK','HDFC Bank','4417',350000, date_trunc('month',CURRENT_DATE) - interval '5 months'),
 (1,'PhonePe Business','UPI_WALLET',NULL,NULL,15000, date_trunc('month',CURRENT_DATE) - interval '5 months'),
 (2,'ICICI Current A/c','BANK','ICICI Bank','9021',800000, date_trunc('month',CURRENT_DATE) - interval '5 months');
UPDATE accounts SET opening_balance = 25000, opening_date = date_trunc('month',CURRENT_DATE) - interval '5 months' WHERE name='Cash in Hand';

INSERT INTO parties(org_id,name,kind,phone) VALUES
 (1,'Metro Wholesale','VENDOR','9811000001'),(1,'FreshFarm Supplies','VENDOR','9811000002'),
 (1,'City Hotel (B2B)','CUSTOMER','9811000003'),(1,'Landlord – R. Sharma','VENDOR','9811000004'),
 (2,'Acme Corp','CUSTOMER','9822000001'),(2,'Globex Ltd','CUSTOMER','9822000002'),(2,'AWS India','VENDOR',NULL);

-- helper to look up category id by org & name
CREATE OR REPLACE FUNCTION cat(o INT, n TEXT) RETURNS INT AS $$ SELECT id FROM categories WHERE org_id=o AND name=n LIMIT 1 $$ LANGUAGE sql;
CREATE OR REPLACE FUNCTION acc(o INT, n TEXT) RETURNS INT AS $$ SELECT id FROM accounts WHERE org_id=o AND name=n LIMIT 1 $$ LANGUAGE sql;

-- ~5 months of daily retail sales (cash + UPI) and weekly purchases
INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,category_id,payment_mode,created_by)
SELECT 1, d::date, 'IN', round((8000 + random()*7000)::numeric, 0), acc(1,'Cash in Hand'), cat(1,'Counter Sales'), 'CASH', 2
FROM generate_series(date_trunc('month',CURRENT_DATE) - interval '4 months', CURRENT_DATE, '1 day') d;
INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,category_id,payment_mode,created_by)
SELECT 1, d::date, 'IN', round((5000 + random()*6000)::numeric, 0), acc(1,'PhonePe Business'), cat(1,'Counter Sales'), 'UPI', 2
FROM generate_series(date_trunc('month',CURRENT_DATE) - interval '4 months', CURRENT_DATE, '1 day') d;
INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,category_id,party_id,payment_mode,created_by)
SELECT 1, d::date, 'OUT', round((55000 + random()*20000)::numeric, 0), acc(1,'HDFC Current A/c'), cat(1,'Inventory Purchase'), 1, 'BANK', 2
FROM generate_series(date_trunc('month',CURRENT_DATE) - interval '4 months' + interval '2 days', CURRENT_DATE - 1, '7 days') d;
-- weekly cash deposit: cash → bank, UPI → bank (transfers)
INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,transfer_group,payment_mode,notes,created_by)
SELECT 1, d::date, x.dir::flow_dir, 75000, x.a, g, 'BANK', 'Cash deposited to bank', 2
FROM generate_series(date_trunc('month',CURRENT_DATE) - interval '4 months' + interval '6 days', CURRENT_DATE - 1, '7 days') d
CROSS JOIN LATERAL (SELECT gen_random_uuid() g) gg
CROSS JOIN LATERAL (VALUES ('OUT', acc(1,'Cash in Hand')), ('IN', acc(1,'HDFC Current A/c'))) x(dir,a);
INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,transfer_group,payment_mode,notes,created_by)
SELECT 1, d::date, x.dir::flow_dir, 55000, x.a, g, 'BANK', 'UPI settlement to bank', 2
FROM generate_series(date_trunc('month',CURRENT_DATE) - interval '4 months' + interval '6 days', CURRENT_DATE - 1, '7 days') d
CROSS JOIN LATERAL (SELECT gen_random_uuid() g) gg
CROSS JOIN LATERAL (VALUES ('OUT', acc(1,'PhonePe Business')), ('IN', acc(1,'HDFC Current A/c'))) x(dir,a);
-- monthly fixed costs
INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,category_id,party_id,payment_mode,created_by)
SELECT 1, (m::date + v.dd), 'OUT', v.amt, acc(1,'HDFC Current A/c'), cat(1,v.c), v.p, 'BANK', 2
FROM generate_series(date_trunc('month',CURRENT_DATE) - interval '4 months', date_trunc('month',CURRENT_DATE) - interval '1 month', '1 month') m
CROSS JOIN (VALUES (4,'Rent',45000::numeric,4),(0,'Salaries & Wages',120000,NULL),(9,'Electricity & Utilities',14500,NULL),
                   (19,'Taxes & GST',38000,NULL),(14,'Marketing',12000,NULL)) v(dd,c,amt,p);
INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,category_id,payment_mode,notes,created_by) VALUES
 (1, date_trunc('month',CURRENT_DATE) - interval '2 months' + interval '11 days','OUT',185000,acc(1,'HDFC Current A/c'),cat(1,'Equipment / Assets'),'BANK','New billing counter + POS',1),
 (1, date_trunc('month',CURRENT_DATE) - interval '3 months' + interval '3 days','IN',300000,acc(1,'HDFC Current A/c'),cat(1,'Loan Received'),'BANK','Working capital loan',1);

-- Dues: receivables & payables (some overdue, some future)
INSERT INTO dues(org_id,kind,party_id,category_id,doc_no,description,amount,issue_date,due_date,created_by) VALUES
 (1,'RECEIVABLE',3,cat(1,'Sales / Revenue'),'INV-1041','Bulk supplies – Oct',86000,CURRENT_DATE-40,CURRENT_DATE-10,2),
 (1,'RECEIVABLE',3,cat(1,'Sales / Revenue'),'INV-1052','Bulk supplies – Nov',54000,CURRENT_DATE-5,CURRENT_DATE+25,2),
 (1,'PAYABLE',1,cat(1,'Inventory Purchase'),'MW-7781','Festive stock',210000,CURRENT_DATE-12,CURRENT_DATE+8,2),
 (1,'PAYABLE',2,cat(1,'Inventory Purchase'),'FF-332','Dairy & produce',38000,CURRENT_DATE-20,CURRENT_DATE-3,2),
 (2,'RECEIVABLE',5,cat(2,'Project Billing'),'BP-2026-018','Milestone 2',450000,CURRENT_DATE-30,CURRENT_DATE+15,2),
 (2,'RECEIVABLE',6,cat(2,'Project Billing'),'BP-2026-019','Support retainer',120000,CURRENT_DATE-10,CURRENT_DATE+20,2);
-- part payment against INV-1041
INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,due_id,party_id,category_id,payment_mode,reference,created_by)
VALUES (1,CURRENT_DATE-6,'IN',30000,acc(1,'HDFC Current A/c'),1,3,cat(1,'Sales / Revenue'),'BANK','NEFT 55120',2);

-- Recurring rules
INSERT INTO recurring_rules(org_id,title,direction,amount,account_id,category_id,party_id,frequency,next_date) VALUES
 (1,'Shop rent','OUT',45000,acc(1,'HDFC Current A/c'),cat(1,'Rent'),4,'MONTHLY',(date_trunc('month',CURRENT_DATE)+interval '4 days')::date),
 (1,'Staff salaries','OUT',120000,acc(1,'HDFC Current A/c'),cat(1,'Salaries & Wages'),NULL,'MONTHLY',(date_trunc('month',CURRENT_DATE)+interval '1 month')::date),
 (1,'Business loan EMI','OUT',27500,acc(1,'HDFC Current A/c'),cat(1,'Loan Repayment / EMI'),NULL,'MONTHLY',(date_trunc('month',CURRENT_DATE)+interval '9 days')::date),
 (1,'Electricity','OUT',14500,acc(1,'HDFC Current A/c'),cat(1,'Electricity & Utilities'),NULL,'MONTHLY',(date_trunc('month',CURRENT_DATE)+interval '9 days')::date),
 (2,'AWS cloud','OUT',38000,acc(2,'ICICI Current A/c'),cat(2,'Software Licences & Cloud'),7,'MONTHLY',(date_trunc('month',CURRENT_DATE)+interval '6 days')::date);

-- Budgets for current month
INSERT INTO budgets(org_id,category_id,month,amount)
SELECT 1, cat(1,n), date_trunc('month',CURRENT_DATE)::date, a FROM (VALUES
 ('Inventory Purchase',320000::numeric),('Salaries & Wages',120000),('Rent',45000),('Marketing',10000),('Electricity & Utilities',15000)) v(n,a);

-- A few current-month expenses so budgets show usage
INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,category_id,payment_mode,created_by) VALUES
 (1, date_trunc('month',CURRENT_DATE)::date,'OUT',13500,acc(1,'Cash in Hand'),cat(1,'Marketing'),'CASH',2);

-- Bluepeak sample cash book
INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,category_id,party_id,payment_mode,created_by)
SELECT 2, (m + interval '10 days')::date, 'IN', 380000 + (random()*120000)::int, acc(2,'ICICI Current A/c'), cat(2,'Project Billing'), 5, 'BANK', 2
FROM generate_series(date_trunc('month',CURRENT_DATE) - interval '4 months', date_trunc('month',CURRENT_DATE) - interval '1 month', '1 month') m;
INSERT INTO transactions(org_id,txn_date,direction,amount,account_id,category_id,payment_mode,created_by)
SELECT 2, (m + interval '1 day')::date, 'OUT', 260000, acc(2,'ICICI Current A/c'), cat(2,'Salaries & Wages'), 'BANK', 2
FROM generate_series(date_trunc('month',CURRENT_DATE) - interval '4 months', date_trunc('month',CURRENT_DATE) - interval '1 month', '1 month') m;

DROP FUNCTION cat(INT,TEXT); DROP FUNCTION acc(INT,TEXT);

-- Expense claims demo
INSERT INTO users(name,email,phone,password_hash) VALUES ('Field Executive','employee@cash.local','9000000004',crypt('Admin@123',gen_salt('bf',10)));
INSERT INTO memberships VALUES (1,4,'EMPLOYEE'),(2,4,'EMPLOYEE');
INSERT INTO expense_claims(org_id,claim_no,employee_id,title,status,total,submitted_at) VALUES
 (1,next_claim_no(1),4,'Supplier visit – Indore','SUBMITTED',4350,now()-interval '2 days'),
 (1,next_claim_no(1),4,'Fuel & local conveyance – Oct','DRAFT',1890,NULL);
INSERT INTO expense_claim_items(claim_id,expense_date,category_id,description,amount) VALUES
 (1,CURRENT_DATE-4,(SELECT id FROM categories WHERE org_id=1 AND name='Travel & Conveyance'),'Bus ticket Bhopal–Indore return',1150),
 (1,CURRENT_DATE-4,(SELECT id FROM categories WHERE org_id=1 AND name='Travel & Conveyance'),'Hotel 1 night',2400),
 (1,CURRENT_DATE-3,(SELECT id FROM categories WHERE org_id=1 AND name='Office & Admin'),'Meals with supplier',800),
 (2,CURRENT_DATE-8,(SELECT id FROM categories WHERE org_id=1 AND name='Travel & Conveyance'),'Petrol – bike',1890);

UPDATE users SET last_org_id = 1;
