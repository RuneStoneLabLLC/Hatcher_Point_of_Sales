drop table if exists tenders cascade;
drop table if exists sale_lines cascade;
drop table if exists sales cascade;
drop table if exists inventory_movements cascade;
drop table if exists inventory_balances cascade;
drop table if exists loyalty_accounts cascade;
drop table if exists house_accounts cascade;
drop table if exists customers cascade;
drop table if exists products cascade;
drop table if exists categories cascade;
drop table if exists suppliers cascade;
drop table if exists users cascade;

create table categories (
  id serial primary key,
  name text not null unique
);

create table suppliers (
  id serial primary key,
  name text not null,
  contact_name text,
  phone text
);

create table products (
  id serial primary key,
  sku text not null unique,
  barcode text unique,
  name text not null,
  category_id integer not null references categories(id),
  supplier_id integer references suppliers(id),
  unit text not null default 'each',
  retail_price numeric(12,2) not null,
  cost numeric(12,2) not null,
  taxable boolean not null default true,
  active boolean not null default true
);

create table inventory_balances (
  product_id integer primary key references products(id),
  quantity_on_hand numeric(12,2) not null,
  reorder_point numeric(12,2) not null,
  unit_cost numeric(12,2) not null
);

create table inventory_movements (
  id serial primary key,
  product_id integer not null references products(id),
  movement_type text not null,
  quantity_delta numeric(12,2) not null,
  unit_cost numeric(12,2),
  reference text,
  occurred_at timestamptz not null default now()
);

create table customers (
  id serial primary key,
  customer_number text not null unique,
  display_name text not null,
  phone text,
  email text,
  price_tier text not null default 'Retail',
  tax_exempt boolean not null default false,
  active boolean not null default true
);

create table house_accounts (
  id serial primary key,
  customer_id integer not null references customers(id),
  credit_limit numeric(12,2) not null,
  current_balance numeric(12,2) not null,
  terms_days integer not null default 30,
  status text not null default 'active'
);

create table loyalty_accounts (
  id serial primary key,
  customer_id integer not null references customers(id),
  points_balance integer not null default 0,
  lifetime_points integer not null default 0,
  status text not null default 'active',
  joined_at date not null default current_date
);

create table users (
  id serial primary key,
  display_name text not null,
  role text not null
);

create table sales (
  id serial primary key,
  sale_number text not null unique,
  customer_id integer references customers(id),
  cashier_id integer not null references users(id),
  status text not null default 'completed',
  subtotal numeric(12,2) not null,
  tax_total numeric(12,2) not null,
  total numeric(12,2) not null,
  completed_at timestamptz not null default now()
);

create table sale_lines (
  id serial primary key,
  sale_id integer not null references sales(id),
  product_id integer not null references products(id),
  quantity numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  unit_cost numeric(12,2) not null,
  line_total numeric(12,2) not null
);

create table tenders (
  id serial primary key,
  sale_id integer not null references sales(id),
  tender_type text not null,
  amount numeric(12,2) not null,
  provider text,
  provider_transaction_id text,
  card_brand text,
  card_last4 text,
  auth_code text,
  entry_mode text,
  terminal_id text,
  batch_id text,
  payment_request jsonb,
  terminal_response jsonb,
  status text not null default 'approved'
);

insert into categories (name) values
  ('Bulk Materials'),
  ('Landscaping'),
  ('Feed'),
  ('Pet Supplies'),
  ('Bird Seed'),
  ('Home Essentials'),
  ('Hardware'),
  ('Animal Health');

insert into suppliers (name, contact_name, phone) values
  ('Southern States', 'Regional Sales Desk', '800-555-0130'),
  ('Calvert Mulch Works', 'Mason Gray', '410-555-0101'),
  ('Bay Country Feed', 'Elaine Turner', '301-555-0188'),
  ('Mid-Atlantic Hardware', 'Chris Nolan', '443-555-0175');

insert into products (sku, barcode, name, category_id, supplier_id, unit, retail_price, cost, taxable) values
  ('MULCH-BLK-YD', '100000000101', 'Black Mulch - Cubic Yard', 1, 2, 'yard', 39.99, 24.50, true),
  ('MULCH-BRN-YD', '100000000102', 'Brown Mulch - Cubic Yard', 1, 2, 'yard', 38.99, 23.75, true),
  ('TOPSOIL-SCR-YD', '100000000103', 'Screened Topsoil - Cubic Yard', 1, 2, 'yard', 44.00, 28.00, true),
  ('RIVER-ROCK-YD', '100000000104', 'River Rock - Cubic Yard', 1, 2, 'yard', 89.00, 60.00, true),
  ('GRASS-SEED-50', '100000000201', 'Tall Fescue Grass Seed 50 lb', 2, 1, 'bag', 119.99, 82.25, true),
  ('STRAW-BALE', '100000000202', 'Straw Bale', 2, 1, 'bale', 9.99, 5.50, true),
  ('FERT-10-10-10', '100000000203', '10-10-10 Fertilizer 40 lb', 2, 1, 'bag', 24.99, 15.20, true),
  ('HORSE-SENIOR', '100000000301', 'Senior Horse Feed 50 lb', 3, 3, 'bag', 28.99, 20.10, false),
  ('LAYER-PELLET', '100000000302', 'Layer Pellets 50 lb', 3, 3, 'bag', 21.99, 15.40, false),
  ('GOAT-FEED', '100000000303', 'Goat Feed 50 lb', 3, 3, 'bag', 22.49, 15.90, false),
  ('DOG-FOOD-40', '100000000401', 'Farm Dog Maintenance 40 lb', 4, 1, 'bag', 34.99, 24.00, true),
  ('CAT-LITTER-40', '100000000402', 'Cat Litter 40 lb', 4, 1, 'bag', 17.99, 11.25, true),
  ('BIRD-BLEND-40', '100000000501', 'Backyard Bird Blend 40 lb', 5, 1, 'bag', 26.99, 18.45, true),
  ('BLACK-OIL-40', '100000000502', 'Black Oil Sunflower 40 lb', 5, 1, 'bag', 31.99, 22.10, true),
  ('SALT-SOFT-40', '100000000601', 'Water Softener Salt 40 lb', 6, 1, 'bag', 8.99, 5.80, true),
  ('WOOD-PELLET', '100000000602', 'Wood Pellets 40 lb', 6, 1, 'bag', 7.49, 4.85, true),
  ('GLOVES-L', '100000000701', 'Work Gloves Large', 7, 4, 'pair', 12.99, 6.40, true),
  ('WORMER-GOAT', '100000000801', 'Goat Dewormer', 8, 3, 'bottle', 18.99, 11.50, true);

insert into inventory_balances (product_id, quantity_on_hand, reorder_point, unit_cost)
select id,
  case sku
    when 'RIVER-ROCK-YD' then 4
    when 'GRASS-SEED-50' then 7
    when 'GOAT-FEED' then 5
    when 'WOOD-PELLET' then 12
    else 35 + (id * 3)
  end,
  case
    when category_id in (1) then 5
    when category_id in (3, 4, 5, 6) then 12
    else 8
  end,
  cost
from products;

insert into customers (customer_number, display_name, phone, email, price_tier, tax_exempt) values
  ('C-1001', 'Green Hollow Farm', '410-555-1101', 'orders@greenhollow.example', 'Farm', true),
  ('C-1002', 'Patuxent Landscape Co.', '443-555-2202', 'accounts@patuxentlandscape.example', 'Contractor', false),
  ('C-1003', 'Megan Carter', '301-555-3303', 'megan.carter@example.com', 'Retail', false),
  ('C-1004', 'Cedar Ridge Stables', '410-555-4404', 'barn@cedarridge.example', 'Farm', true),
  ('C-1005', 'Huntingtown HOA Grounds', '443-555-5505', 'grounds@hhoa.example', 'Commercial', false),
  ('C-1006', 'David Mills', '410-555-6606', 'david.mills@example.com', 'Retail', false);

insert into house_accounts (customer_id, credit_limit, current_balance, terms_days, status)
select id,
  case customer_number
    when 'C-1001' then 5000
    when 'C-1002' then 7500
    when 'C-1004' then 3500
    else 1000
  end,
  case customer_number
    when 'C-1001' then 1240.55
    when 'C-1002' then 2860.10
    when 'C-1004' then 455.72
    else 0
  end,
  30,
  'active'
from customers
where customer_number in ('C-1001', 'C-1002', 'C-1004');

insert into loyalty_accounts (customer_id, points_balance, lifetime_points, status, joined_at)
select id,
  case customer_number
    when 'C-1003' then 420
    when 'C-1006' then 185
    when 'C-1005' then 760
    else 95
  end,
  case customer_number
    when 'C-1003' then 1310
    when 'C-1006' then 510
    when 'C-1005' then 2295
    else 375
  end,
  'active',
  current_date - ((id * 41) || ' days')::interval
from customers;

insert into users (display_name, role) values
  ('Darryl', 'owner'),
  ('Kim', 'manager'),
  ('Alex', 'cashier'),
  ('Jordan', 'cashier');

insert into sales (sale_number, customer_id, cashier_id, subtotal, tax_total, total, completed_at) values
  ('S-20260614-001', 3, 3, 84.97, 5.10, 90.07, now() - interval '45 minutes'),
  ('S-20260614-002', 1, 2, 173.94, 0.00, 173.94, now() - interval '32 minutes'),
  ('S-20260614-003', null, 4, 47.97, 2.88, 50.85, now() - interval '18 minutes'),
  ('S-20260613-001', 2, 2, 412.50, 24.75, 437.25, now() - interval '1 day 2 hours'),
  ('S-20260613-002', 4, 3, 144.95, 0.00, 144.95, now() - interval '1 day 1 hour'),
  ('S-20260612-001', 5, 1, 526.00, 31.56, 557.56, now() - interval '2 days 3 hours'),
  ('S-20260611-001', 6, 4, 68.97, 4.14, 73.11, now() - interval '3 days 5 hours');

insert into sale_lines (sale_id, product_id, quantity, unit_price, unit_cost, line_total) values
  (1, 13, 2, 26.99, 18.45, 53.98),
  (1, 15, 2, 8.99, 5.80, 17.98),
  (1, 17, 1, 12.99, 6.40, 12.99),
  (2, 8, 6, 28.99, 20.10, 173.94),
  (3, 15, 2, 8.99, 5.80, 17.98),
  (3, 16, 4, 7.49, 4.85, 29.96),
  (4, 1, 5, 39.99, 24.50, 199.95),
  (4, 3, 3, 44.00, 28.00, 132.00),
  (4, 6, 8, 9.99, 5.50, 79.92),
  (5, 8, 5, 28.99, 20.10, 144.95),
  (6, 4, 4, 89.00, 60.00, 356.00),
  (6, 5, 1, 119.99, 82.25, 119.99),
  (6, 7, 2, 24.99, 15.20, 49.98),
  (7, 11, 1, 34.99, 24.00, 34.99),
  (7, 12, 1, 17.99, 11.25, 17.99),
  (7, 18, 1, 18.99, 11.50, 18.99);

insert into tenders (sale_id, tender_type, amount, provider, provider_transaction_id, card_brand, card_last4) values
  (1, 'card', 90.07, 'TSYS mock terminal', 'MOCK-TSYS-10001', 'Visa', '4242'),
  (2, 'house_account', 173.94, null, null, null, null),
  (3, 'cash', 50.85, null, null, null, null),
  (4, 'card', 300.00, 'TSYS mock terminal', 'MOCK-TSYS-10002', 'Mastercard', '5100'),
  (4, 'cash', 137.25, null, null, null, null),
  (5, 'house_account', 144.95, null, null, null, null),
  (6, 'card', 557.56, 'TSYS mock terminal', 'MOCK-TSYS-10003', 'Visa', '1881'),
  (7, 'card', 73.11, 'TSYS mock terminal', 'MOCK-TSYS-10004', 'Discover', '1117');

insert into inventory_movements (product_id, movement_type, quantity_delta, unit_cost, reference, occurred_at)
select product_id, 'sale', -quantity, unit_cost, 'seed sale ' || sale_id, now() - interval '1 day'
from sale_lines;
