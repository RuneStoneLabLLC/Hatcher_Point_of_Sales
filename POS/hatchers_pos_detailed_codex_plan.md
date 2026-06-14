# Hatcher Supply POS Replacement - Detailed Codex Planning Document

Source prompt: `POS/hatchers_pos_codex_planning_prompt.xml`  
Prepared for: RuneStoneLabs LLC  
Current date: 2026-06-14  
Status: Planning only. Do not build until RuneStoneLabs approves the plan.

## 1. Executive Summary

Hatcher Supply needs a replacement for Bindo POS that can run in-store checkout reliably, improve inventory management, improve customer and loyalty tracking, and continue using the merchant's existing TSYS-related payment relationship for card-present payments. This project should be treated as a business-critical migration, not as a normal web app. The store must be able to sell products, reconcile drawers, accept card and cash payments, manage stock, look up customers, and cut over with minimal disruption.

The recommended approach is a custom POS and back-office system built around the RuneStoneLabs baseline stack:

- Frontend: React with Vite.
- Backend: Node.js with Express.
- Database: PostgreSQL.
- ORM: Prisma.
- Hosting: Railway for the cloud backend and database.
- CI/CD: GitHub push-to-deploy.
- Local register layer: a browser-based register app with local offline storage and a small local bridge/agent or thin desktop wrapper for receipt printers, cash drawer, scales, and terminal communication.
- Payments: semi-integrated card terminal architecture. The POS sends the transaction amount and request metadata to a certified terminal or payment middleware. The terminal handles card entry and TSYS/Global Payments/FIS authorization. The POS stores only non-sensitive payment result metadata.

The plan deliberately separates the POS business workflow from payment card handling. The custom system should never capture, transmit, or store raw cardholder data, PAN, CVV, PIN, track data, or raw EMV payloads. This keeps the build realistic for a small team and reduces PCI burden.

The most important early work is not code. It is discovery:

- Audit exactly what Hatcher uses in Bindo today.
- Capture screenshots, exports, reports, settings, receipt examples, and hardware details before access disappears.
- Identify every feature that must be replicated, replaced by integration, deferred with sign-off, or intentionally dropped with sign-off.
- Confirm the actual merchant payment setup, because "TSYS" may refer to a legacy merchant relationship, a Global Payments Integrated relationship, a Cayan/Genius path, a TSYS developer path, or another reseller configuration.

Biggest risks:

- Bindo data may be incomplete, inaccessible, or badly structured.
- Payment integration path may take longer than application development.
- Offline card behavior may be limited by the terminal and processor, not by the custom POS.
- Hardware compatibility can consume time if receipt printers, cash drawers, scales, and card terminals are not selected early.
- A two-developer team must avoid scope creep and build the minimum cutover-ready system before advanced features.

Recommended phasing:

1. Discovery and feature parity audit.
2. Architecture confirmation and technical spike.
3. Data model and migration plan.
4. MVP register with cash/check/house account tender and receipts.
5. Inventory, receiving, stock movements, and cost control.
6. Customers, loyalty, house accounts, tax exemptions, and pricing tiers.
7. TSYS/semi-integrated card payment integration.
8. Reporting and end-of-day reconciliation.
9. Parallel testing, hardware testing, and cutover rehearsal.
10. Go-live, stabilization, and post-launch improvements.

Minimum cutover-ready milestone:

The store can run a full business day on the new system when it supports product lookup/scanning, cart checkout, taxes, cash/card/check/house account tender, receipts, drawer open/close, user permissions, returns/voids with manager approval, inventory decrement, customer lookup, basic reports, payment terminal authorization, and recovery from brief internet loss without losing transactions.

## 2. Discovery Questions

These questions must be answered before any build phase starts. Codex should treat unanswered items as blockers or explicit assumptions, not silent decisions.

### Business Rules

- How many registers/lane stations are used today?
- Does Hatcher need mobile POS on a tablet or only fixed registers?
- What are the busiest checkout times and highest expected transaction volume per hour?
- What tender types are used today?
- Does the store accept checks?
- Does the store accept split tender?
- Does the store allow store credit?
- Does the store allow house account charges?
- Does the store allow customer deposits for special orders?
- Does the store accept returns without receipt?
- What is the return policy by product type?
- Who can approve voids, refunds, discounts, price overrides, and cash drawer adjustments?
- Is employee timeclock required in v1 or later?
- Does the store sell online today through Bindo or any other storefront?
- If online ordering exists, are online orders paid online, paid in store, picked up, delivered, or shipped?
- Does the store need delivery scheduling for bulk materials?
- Does the store need invoices or statements for charge accounts?
- Are there customer classes, such as retail, contractor, wholesale, farm, or employee?
- Are agricultural tax exemptions used?
- Are resale exemptions used?
- What Maryland tax rules apply to the product mix?
- Are any products age-restricted, regulated, hazardous, serialized, or otherwise special?
- Are any items sold by weight, length, pallet, ton, yard, scoop, or other non-each units?
- Are scales used at checkout?
- Are bulk products sold from a measured pile, by loader bucket, by yard, by ton, or by flat price?
- Does the store need to print shelf labels or barcode labels?
- Are purchase orders currently used?
- Are vendors/suppliers tracked today?
- Are there standing seasonal reorder patterns?

### Bindo Current-State Audit

- Is the Bindo account still accessible?
- Who has admin access?
- What exports are available?
- Can product catalog be exported with SKU, barcode, cost, retail price, category, supplier, tax flag, and quantity?
- Can inventory quantities be exported by location?
- Can customer records be exported?
- Can purchase history be exported?
- Can gift card balances be exported?
- Can house account balances be exported?
- Can outstanding store credits be exported?
- Can open orders, layaways, special orders, or deposits be exported?
- Can historical sales be exported by day, item, tender, employee, and tax?
- Can reports be exported as CSV, XLSX, or PDF?
- Can receipts be reprinted or exported?
- Can settings, tax rules, discounts, loyalty rules, and user permissions be captured?
- What Bindo features are actually used daily, weekly, monthly, and rarely?
- What features exist in Bindo but are not used?
- What Bindo behavior do staff dislike and want changed?
- What Bindo behavior do staff rely on and want preserved?

### TSYS / Payment Account Specifics

- Who is the merchant services contact?
- Is the merchant account currently under TSYS, Global Payments, Cayan, Genius, Heartland, FIS, Worldpay, or a reseller?
- What is the merchant ID?
- What gateway or terminal platform is currently used?
- What card terminal models are currently deployed?
- Are current terminals owned, leased, or processor-provided?
- Are terminals compatible with semi-integrated POS operation?
- Does the processor support a developer sandbox?
- Is access to developer docs gated behind partner approval?
- Does the merchant have permission to use third-party POS software with the existing merchant account?
- What transaction types are required: sale, refund, void, preauth, capture, tip adjust, partial approval, debit PIN, EBT, gift card, or fleet card?
- Are debit PIN and contactless required?
- Is offline card authorization supported? If yes, what limits, card types, and liability rules apply?
- How is batch settlement handled today?
- Does the terminal auto-settle or does the POS need to trigger close/batch?
- What receipt fields must be printed for compliance?
- What PCI SAQ does the merchant complete today?

### Hardware

- What register devices are currently used?
- What operating system runs on each register?
- What receipt printer model is used?
- Is the cash drawer connected through the receipt printer, USB, serial, network, or another interface?
- What barcode scanner model is used?
- Does the scanner behave as keyboard input?
- Is a customer display required?
- Is a scale required?
- Is a label printer required?
- Are terminals connected by Ethernet, Wi-Fi, USB, serial, or Bluetooth?
- Is the store network reliable?
- Is there a backup internet connection?
- Is there a UPS for registers, router, switch, and terminals?

### Data Migration

- What is the required historical sales lookback: all history, prior year, prior 90 days, or summary only?
- Is exact historical line-item detail required?
- Are old Bindo receipts needed for returns?
- Are existing SKUs and barcodes clean?
- Are duplicate customers common?
- Are duplicate products common?
- Are costs accurate in Bindo?
- Are current inventory quantities accurate?
- Should go-live include a full physical count?
- What spreadsheet backups already exist?
- Who will validate migrated data?
- What is acceptable error tolerance for inventory opening balances?

### Hosting And Operations

- Who owns the Railway account?
- Who owns the GitHub repository?
- Who owns database backups?
- What is the support expectation after launch?
- What hours require emergency support?
- Who can approve production deployments?
- What is the recovery time objective if Railway is unavailable?
- What is the backup retention requirement?
- Is a local fallback mode required if the cloud backend is down?

## 3. System Architecture

### Recommended Component List

The system should be divided into clear components so Codex can build and test each part separately.

1. Register Web App
   - Runs at the checkout lane.
   - Optimized for speed, scanning, cart operations, tender selection, and receipts.
   - Uses local cache for catalog, tax rules, customers subset, register session, and pending transactions.

2. Back Office Web App
   - Used by owner/manager.
   - Manages products, inventory, vendors, receiving, customers, loyalty, house accounts, users, reports, and settings.

3. API Backend
   - Node.js / Express service.
   - Provides REST or typed RPC endpoints.
   - Owns business rules, validation, permissions, audit logging, transaction finalization, inventory movement, reporting queries, and sync.

4. PostgreSQL Database
   - System of record for products, customers, sales, tenders, inventory movements, house accounts, loyalty, reports, users, permissions, settings, and audit logs.

5. Local Register Store
   - IndexedDB in the browser for product catalog, active session, offline transactions, receipt queue, and sync status.
   - Must be encrypted where practical and must never store card data.

6. Local Hardware Bridge / Thin Desktop Shell
   - Provides controlled access to receipt printer, cash drawer, scale, and possibly terminal communication.
   - Candidate approaches:
     - Start simple: USB scanner as keyboard input and browser print for receipts.
     - Next: local Node bridge service for ESC/POS printer and cash drawer pulse.
     - Later: Electron/Tauri wrapper if a full desktop deployment becomes easier to support.

7. Payment Terminal Integration
   - Semi-integrated terminal or gateway-provided local/cloud interface.
   - POS sends amount and transaction request.
   - Terminal collects card.
   - Processor authorizes.
   - POS receives approval/decline and safe receipt data.

8. Reporting / Export Service
   - API endpoints for operational reports.
   - CSV exports for accounting and owner analysis.
   - Could begin as backend queries and later evolve to materialized views.

9. Background Jobs
   - Recalculate inventory summaries.
   - Generate daily summaries.
   - Send optional customer notifications.
   - Retry queued sync events.
   - Run backup verification checks.

### Text Architecture Diagram

```text
Cashier
  |
  v
Register Web App
  |-- IndexedDB local cache
  |-- Scanner keyboard input
  |-- Receipt printer via browser print or local bridge
  |-- Cash drawer via printer/local bridge
  |
  +--> API Backend on Railway
        |
        +--> PostgreSQL on Railway
        |
        +--> Background Jobs / Reporting
        |
        +--> Payment Adapter Service
              |
              +--> Semi-integrated terminal or processor SDK
                    |
                    +--> TSYS / Global Payments / FIS processing path

Manager / Owner
  |
  v
Back Office Web App
  |
  +--> API Backend
```

### Offline / Online Strategy

The app should be cloud-first but not cloud-dependent for basic store operation.

Online mode:

- Register fetches catalog, customer lookup, pricing, tax rules, and inventory availability from backend.
- Completed sales are finalized server-side.
- Inventory movements are written immediately.
- Card payments are authorized through terminal.
- Receipts and reports are available immediately.

Degraded offline mode:

- Register can continue cash/check sales using cached product catalog, cached tax rules, and locally generated transaction IDs.
- Register queues offline sales in IndexedDB.
- Register clearly shows "Offline" and "Unsynced transactions".
- Cash drawer and receipt printing continue if local hardware is available.
- Inventory on hand shown during offline mode is marked "last synced" and not guaranteed current.
- New customers, house account charges, gift card redemption, loyalty redemption, and tax-exempt changes should be restricted or require manager override unless the relevant data is cached and conflicts can be resolved.
- Card payments are allowed offline only if the selected terminal/processor officially supports store-and-forward. The POS must not invent offline card authorization.

Sync after reconnection:

- Offline sales are submitted to backend in chronological order.
- Backend validates product IDs, tax rules, register session, and tender types.
- Inventory movements are created using the sale timestamp.
- Conflicts are flagged for manager review.
- Synced receipt numbers are assigned or mapped from offline receipt IDs.
- Audit log records that transaction originated offline.

### Deviation From Baseline Stack

The baseline stack is acceptable, but a pure React web app hosted on Railway is not enough for a physical register. The plan adds two POS-specific layers:

- IndexedDB offline cache and sync queue.
- Local hardware bridge or thin desktop shell.

This is justified because web browsers do not reliably provide standardized access to every receipt printer, cash drawer, scale, and card terminal needed in a brick-and-mortar POS.

## 4. Data Model

The data model should be built around immutable business events. Sales, tenders, inventory movements, cash events, account charges, loyalty transactions, and gift card transactions should be append-style records. Do not silently overwrite history.

### Tenant / Location / Register

`Organization`

- id
- name
- legal_name
- timezone
- default_currency
- created_at
- updated_at

`Location`

- id
- organization_id
- name
- address fields
- tax_jurisdiction
- active
- created_at
- updated_at

`Register`

- id
- location_id
- name
- lane_number
- hardware_profile_id
- active
- created_at
- updated_at

`RegisterSession`

- id
- register_id
- opened_by_user_id
- closed_by_user_id
- opened_at
- closed_at
- opening_cash_amount
- expected_cash_amount
- actual_cash_amount
- variance_amount
- status
- notes

### Products / Catalog

`Product`

- id
- organization_id
- name
- description
- sku
- primary_barcode
- category_id
- department_id
- supplier_id
- taxable_default
- active
- track_inventory
- product_type: standard, bulk, weighed, service, non_stock, kit
- default_unit_id
- sales_unit_id
- purchase_unit_id
- created_at
- updated_at

`ProductVariant`

- id
- product_id
- sku
- barcode
- attributes_json
- retail_price
- cost
- active

`ProductBarcode`

- id
- product_id
- variant_id nullable
- barcode
- source
- active

`Category`

- id
- parent_category_id
- name
- sort_order
- active

`UnitOfMeasure`

- id
- name
- abbreviation
- type: count, weight, volume, length, area

`UnitConversion`

- id
- from_unit_id
- to_unit_id
- factor
- product_id nullable

### Pricing

`PriceTier`

- id
- name
- description
- active

`ProductPrice`

- id
- product_id
- variant_id nullable
- price_tier_id
- unit_id
- min_quantity
- price
- starts_at
- ends_at
- active

`Promotion`

- id
- name
- type
- starts_at
- ends_at
- rules_json
- active
- manager_approval_required

### Inventory

`InventoryLocation`

- id
- location_id
- name
- type: sales_floor, warehouse, yard, damaged, shrink
- active

`InventoryBalance`

- id
- product_id
- variant_id nullable
- inventory_location_id
- quantity_on_hand
- quantity_reserved
- quantity_available
- reorder_point
- reorder_quantity
- updated_at

`InventoryMovement`

- id
- product_id
- variant_id nullable
- inventory_location_id
- movement_type: sale, return, receive, adjustment, damage, shrink, transfer_out, transfer_in, correction
- quantity_delta
- unit_id
- unit_cost
- reference_type
- reference_id
- occurred_at
- created_by_user_id
- notes

`StockCount`

- id
- location_id
- status
- started_at
- completed_at
- created_by_user_id

`StockCountLine`

- id
- stock_count_id
- product_id
- expected_quantity
- counted_quantity
- variance
- approved_by_user_id

### Suppliers / Purchasing

`Supplier`

- id
- organization_id
- name
- contact_name
- phone
- email
- address fields
- active

`PurchaseOrder`

- id
- supplier_id
- location_id
- status: draft, ordered, partially_received, received, cancelled
- order_date
- expected_date
- created_by_user_id
- notes

`PurchaseOrderLine`

- id
- purchase_order_id
- product_id
- quantity_ordered
- quantity_received
- unit_id
- unit_cost

`ReceivingEvent`

- id
- purchase_order_id nullable
- supplier_id
- received_by_user_id
- received_at
- notes

`ReceivingLine`

- id
- receiving_event_id
- product_id
- quantity_received
- unit_id
- unit_cost

### Customers / Loyalty / House Accounts

`Customer`

- id
- organization_id
- customer_number
- first_name
- last_name
- company_name
- phone
- email
- address fields
- price_tier_id
- tax_exempt_status
- active
- created_at
- updated_at

`CustomerContactMethod`

- id
- customer_id
- type: phone, email, sms
- value
- marketing_opt_in
- receipt_opt_in

`LoyaltyAccount`

- id
- customer_id
- status
- points_balance
- lifetime_points
- joined_at

`LoyaltyTransaction`

- id
- loyalty_account_id
- sale_id nullable
- type: earn, redeem, adjust, expire
- points_delta
- reason
- created_by_user_id
- created_at

Recommended loyalty model for v1:

- Simple points-per-dollar program.
- Earn points on eligible pre-tax sales.
- Redeem points for fixed-dollar discounts only with customer lookup.
- Exclude house account payments, gift card purchases, taxes, and manually excluded categories.

This is easier to explain, easier to audit, and easier to migrate than tiered or complex promotional loyalty.

`HouseAccount`

- id
- customer_id
- status
- credit_limit
- current_balance
- terms_days
- billing_contact
- statement_delivery_method

`HouseAccountTransaction`

- id
- house_account_id
- type: charge, payment, credit, adjustment, finance_charge
- amount
- sale_id nullable
- payment_reference nullable
- due_date
- occurred_at
- created_by_user_id
- notes

`Statement`

- id
- house_account_id
- period_start
- period_end
- beginning_balance
- charges
- payments
- ending_balance
- generated_at
- status

### Tax / Exemptions

`TaxRate`

- id
- location_id
- name
- jurisdiction
- rate
- starts_at
- ends_at
- active

`TaxCategory`

- id
- name
- taxable
- rules_json

`CustomerTaxExemption`

- id
- customer_id
- exemption_type: agricultural, resale, nonprofit, other
- certificate_number
- certificate_file_reference
- starts_at
- expires_at
- verified_by_user_id
- verified_at
- active

`SaleTaxLine`

- id
- sale_id
- sale_line_id nullable
- tax_rate_id
- taxable_amount
- tax_amount
- exemption_id nullable

### Sales / Tender / Receipts

`Sale`

- id
- organization_id
- location_id
- register_id
- register_session_id
- customer_id nullable
- sale_number
- status: draft, completed, voided, refunded, partially_refunded
- subtotal
- discount_total
- tax_total
- total
- source: register, offline_register, back_office, ecommerce_later
- completed_at
- created_by_user_id
- approved_by_user_id nullable
- offline_origin_id nullable

`SaleLine`

- id
- sale_id
- product_id
- variant_id nullable
- quantity
- unit_id
- unit_price
- unit_cost_snapshot
- discount_amount
- tax_amount
- line_total
- price_source
- tax_exempt_applied
- returned_quantity

`Tender`

- id
- sale_id
- type: cash, card, check, gift_card, house_account, store_credit
- amount
- status: pending, approved, declined, voided, refunded
- provider
- provider_transaction_id nullable
- safe_receipt_data_json
- created_at

PCI note:

- `Tender` may store card brand, last four digits, auth code, terminal ID, and provider transaction ID.
- `Tender` must never store PAN, CVV, PIN, track data, or raw EMV data.

`Receipt`

- id
- sale_id
- receipt_number
- print_count
- email_sent_at
- sms_sent_at
- receipt_snapshot_json

### Gift Cards / Store Credit

`GiftCard`

- id
- public_code_hash
- display_last4
- status
- issued_at
- expires_at nullable
- initial_amount
- current_balance

`GiftCardTransaction`

- id
- gift_card_id
- type: issue, redeem, reload, refund, void, adjust
- amount
- sale_id nullable
- created_by_user_id
- created_at
- notes

`StoreCredit`

- id
- customer_id nullable
- status
- original_amount
- current_balance
- issued_from_sale_id nullable
- reason
- created_at

### Users / Permissions / Audit

`User`

- id
- organization_id
- name
- email
- pin_hash nullable
- password_hash nullable
- mfa_enabled
- active

`Role`

- id
- name
- description

`Permission`

- id
- key
- description

`UserRole`

- user_id
- role_id

`AuditLog`

- id
- organization_id
- user_id
- action
- entity_type
- entity_id
- before_json nullable
- after_json nullable
- ip_address
- register_id nullable
- created_at

## 5. Feature Breakdown

### Checkout

MVP:

- User login/PIN at register.
- Open register session with starting cash.
- Product lookup by barcode scanner.
- Product search by name/SKU.
- Cart with quantity changes.
- Manual line discount with permission.
- Order-level discount with permission.
- Tax calculation.
- Cash tender with change calculation.
- Check tender.
- House account charge tender if customer has active account.
- Split tender.
- Receipt print.
- Void before tender.
- Return/refund workflow with manager approval.
- End-of-day close and Z-report.

V1:

- Suspended ticket / hold cart.
- Customer display support.
- Email/SMS receipt.
- More refined return policies by product/category.
- Offline cash/check sale queue.

Later:

- Mobile POS.
- E-commerce order pickup integration.
- Advanced promotions and upsell recommendations.

### Inventory

MVP:

- Product CRUD.
- Category/department management.
- SKU and barcode fields.
- Cost and retail price.
- Stock-on-hand.
- Inventory movement log.
- Sale decrements stock.
- Return increments stock.
- Manual adjustment with reason and audit.
- Low-stock report.
- CSV import/export.

V1:

- Purchase orders.
- Receiving workflow.
- Reorder points.
- Stock counts and cycle counts.
- Damage/shrink workflows.
- Vendor/supplier records.
- Unit-of-measure conversions.
- Bulk and pallet quantity handling.

Later:

- Forecasting.
- Suggested reorder quantities.
- Multi-location transfers.
- Barcode label printing.

### Cost Control

MVP:

- Store unit cost snapshot on sale lines.
- Gross margin report by item/category.
- Inventory value report.
- Adjustment report.

V1:

- Average cost.
- Last received cost.
- Shrink/damage reporting.
- Slow-moving inventory report.
- Vendor cost history.

Later:

- Automated margin alerts.
- Seasonal purchasing analysis.

### Customers And Loyalty

MVP:

- Customer profiles.
- Customer lookup at checkout.
- Attach sale to customer.
- Purchase history.
- Simple points-per-dollar loyalty ledger.
- Manager adjustment of loyalty points.

V1:

- Loyalty redemption at checkout.
- Customer merge/de-duplication workflow.
- Marketing opt-in fields.
- Customer notes.

Later:

- Campaign exports.
- SMS/email marketing integration.
- Tiered rewards.

### House Accounts

MVP:

- Customer account status.
- Credit limit.
- Current balance.
- Charge sale to account.
- Apply payment to account.
- Basic aging report.

V1:

- Statement generation.
- Due dates and terms.
- Account holds.
- Account payment receipts.

Later:

- Finance charges.
- Email statements.
- Accounting integration.

### Tax Exemptions

MVP:

- Store exemption certificate metadata.
- Mark customer as tax exempt.
- Apply tax exemption at checkout with customer attached.
- Report taxable vs exempt sales.

V1:

- Certificate file upload.
- Expiration alerts.
- Product/category-specific exemption rules.

Later:

- Automated compliance review exports.

### Pricing

MVP:

- Retail price.
- Customer price tier assignment.
- Manual price override with permission.

V1:

- Wholesale/contractor tiers.
- Quantity break pricing.
- Bulk material pricing.

Later:

- Promotional engine.
- Scheduled price changes.

### Reporting

MVP:

- Daily sales.
- Sales by item.
- Sales by category.
- Sales by employee.
- Tender summary.
- Tax collected.
- Cash drawer variance.
- Inventory on hand.
- Inventory value.
- Low-stock list.
- CSV export for each report.

V1:

- Margin reporting.
- Customer purchase history report.
- Loyalty report.
- House account aging.
- Purchase order/receiving report.

Later:

- Dashboard widgets.
- Scheduled report emails.
- Accounting sync.

### Users And Roles

MVP:

- Owner, manager, cashier roles.
- PIN or password login.
- Permission checks for refund, void, discount, price override, drawer close, and reports.
- Audit logs for sensitive actions.

V1:

- MFA for owner/admin accounts.
- Employee active/inactive status.
- Timeclock if confirmed needed.

Later:

- Granular custom roles.
- SSO is unnecessary unless business grows.

## 6. TSYS Payment Integration Plan

### Current Payment Research Summary

The payment environment has changed and must be verified directly with the merchant's processor/contact. Public sources show:

- TSYS now presents itself as part of FIS for issuer/payment stack messaging at `https://www.tsys.com/`.
- Global Payments Integrated says it is transitioning to the Global Payments brand and lists semi-integrated APIs, terminal management, EMV devices, and online/offline capabilities for software partners at `https://www.globalpaymentsintegrated.com/en-us`.
- Global Payments developer resources are available at `https://developer.globalpayments.com/`.
- PCI standards and SAQ selection must be based on the actual cardholder data environment and payment architecture: `https://www.pcisecuritystandards.org/standards/`.

Because the merchant says "TSYS," Codex must not assume the exact integration path. The first implementation task is to identify the actual account/channel:

- Legacy TSYS merchant services.
- Cayan/Genius.
- Global Payments Integrated.
- TSYS developer account.
- FIS/TSYS issuer-side relationship, which may not be the merchant acquiring path.
- A reseller or ISO using TSYS rails.

### Recommended Integration Direction

Use a semi-integrated terminal approach.

The POS should:

- Create a sale and calculate the total.
- Send the amount, transaction type, reference ID, and optional metadata to a certified terminal integration.
- Wait for approved/declined/cancelled/timeout response.
- Store only safe payment metadata.
- Print compliant receipt fields returned by the terminal/provider.
- Tie refunds and voids to original provider transaction IDs.

The POS should not:

- Display a card entry form.
- Read magstripe data.
- Read chip data.
- Handle PIN entry.
- Store full card number.
- Store CVV.
- Store raw authorization payloads that include sensitive data.

### Integration Path Decision Tree

Step 1: Contact merchant services provider.

- Ask for the official supported semi-integrated option for a third-party POS.
- Ask whether the existing merchant account can process through that option.
- Ask for developer docs, sandbox, terminal list, certification requirements, fee changes, and support contacts.

Step 2: Evaluate available paths.

Candidate A: Global Payments Integrated / Genius style terminal integration.

- Likely best fit if the merchant's TSYS relationship traces through Cayan/Genius or Global Payments Integrated.
- Strong because it is intended for software partners and integrated payment experiences.
- Must confirm terminal availability, certification path, and whether a small two-developer shop can get access.

Candidate B: TSYS developer / Multipass / gateway path.

- Potential fit if the merchant is directly provisioned for TSYS developer tools.
- Must confirm that it supports card-present EMV, contactless, debit PIN, partial approval, refunds, voids, and batch settlement using certified terminals.

Candidate C: Processor-provided semi-integrated middleware.

- Potential fit if the merchant's reseller offers a supported local terminal connector.
- Could be faster than direct certification.
- Risk: vendor lock-in or limited documentation.

Candidate D: Switch to another gateway while keeping merchant account.

- Use only if the merchant's existing TSYS relationship supports a gateway bridge.
- Requires explicit merchant approval and rate/funding confirmation.

### Terminal Hardware Shortlist

Do not purchase hardware until processor compatibility is confirmed.

Shortlist categories:

- PAX countertop terminals.
- Ingenico countertop terminals.
- Dejavoo countertop terminals.
- Equinox terminals.
- Existing Hatcher terminal model if compatible.

Evaluation criteria:

- Certified for the chosen processor path.
- Supports EMV chip.
- Supports NFC/contactless.
- Supports magstripe fallback where allowed.
- Supports debit PIN.
- Supports partial approvals.
- Supports refunds and voids.
- Supports batch settlement behavior required by merchant account.
- Supports Ethernet first; Wi-Fi optional.
- Has clear integration docs.
- Has replacement availability and support.
- Can print or return receipt data required by card brand rules.

### POS To Terminal Flow

Sale flow:

1. Cashier builds cart.
2. POS calculates subtotal, discounts, tax, and total.
3. Cashier selects card tender.
4. POS creates pending `Tender` record with a local transaction reference.
5. POS sends payment request to terminal integration: amount, sale reference, register ID, transaction type.
6. Customer taps/inserts/swipes card on terminal.
7. Terminal communicates with processor.
8. Terminal returns approved, declined, cancelled, timeout, or error.
9. POS updates tender status.
10. If approved, POS finalizes sale, creates inventory movements, and prints receipt.
11. If declined/cancelled, POS keeps cart open and allows another tender.

Refund flow:

1. Cashier finds original sale.
2. Manager approval is required based on role rules.
3. POS identifies original provider transaction ID.
4. POS sends linked refund request to terminal/provider.
5. Terminal/provider returns result.
6. POS records refund tender, inventory return movements if goods returned, and receipt.

Void flow:

1. Void is allowed only before settlement and only if provider supports it.
2. POS sends linked void request.
3. POS updates sale/tender status only after provider confirms void.

Settlement:

- Confirm whether terminal auto-settles, processor auto-settles, or POS must trigger batch close.
- If POS triggers settlement, end-of-day workflow must include batch close status and exception handling.

### Onboarding / Certification Steps

1. Identify the exact merchant/payment account path.
2. Get written confirmation that a custom third-party POS can integrate.
3. Request developer account and sandbox credentials.
4. Request official terminal integration guide.
5. Select certified terminal model.
6. Confirm transaction types and offline capabilities.
7. Implement payment adapter in a non-production environment.
8. Complete test scripts required by provider.
9. Validate receipts.
10. Validate refunds, voids, partial approvals, debit PIN, and settlement.
11. Complete provider certification or attestation.
12. Document PCI SAQ expectation and merchant controls.
13. Run pilot transactions using live test amounts before full go-live.

### PCI Scope Statement

Target:

- Reduce scope by using certified semi-integrated payment terminals.
- POS does not store, process, or transmit raw cardholder data.
- POS stores only non-sensitive transaction metadata.

Likely SAQ:

- The likely direction is SAQ P2PE-HW or SAQ B-IP / SAQ C-VT / SAQ C depending on the final terminal, connectivity, and cardholder data environment.
- This cannot be finalized until the processor confirms terminal architecture and PCI listing/status.

Controls required:

- Network segmentation for payment terminals where recommended.
- No card data in logs.
- No card data in database.
- No card data in support screenshots.
- Secure passwords and MFA for admin access.
- Patch management.
- Audit logs.
- Vendor documentation retained.
- Annual PCI validation with merchant services provider.

## 7. Bindo Data Migration Plan

### Migration Principle

Treat Bindo access as a time-limited asset. Capture everything possible before service disappears or account access is lost.

### Data To Extract

Required:

- Product catalog.
- SKUs.
- Barcodes/UPCs.
- Product names.
- Categories/departments.
- Suppliers/vendors.
- Costs.
- Retail prices.
- Tax flags.
- Current inventory quantities.
- Customer records.
- Customer contact info.
- Purchase history.
- Loyalty balances.
- Gift card balances.
- Store credit balances.
- House account balances.
- Open orders and deposits.
- Historical sales, at least recent history.
- Tax reports.
- End-of-day reports.
- User list and roles.
- Hardware/settings screenshots.

Optional but valuable:

- Product images.
- Receipt templates.
- Promotion settings.
- Online storefront settings.
- Accounting export settings.
- Email/SMS campaign history.

### Extraction Steps

1. Gain Bindo admin access.
2. Record a screen walkthrough of the live Bindo system.
3. Capture screenshots of every settings area.
4. Export every available CSV/XLSX/PDF report.
5. Save sample receipts for cash, card, refund, house account, gift card, and tax-exempt sale.
6. Export product catalog and inventory.
7. Export customer records.
8. Export gift card/store credit/house account data if available.
9. Export recent sales history.
10. Save files in a dated migration folder.
11. Make a read-only backup copy before cleaning data.

### Cleaning Steps

1. Normalize product names.
2. De-duplicate SKUs.
3. De-duplicate barcodes.
4. Flag products missing SKU/barcode.
5. Flag products missing cost.
6. Normalize categories.
7. Normalize suppliers.
8. Validate tax flags.
9. Normalize customer names and phone numbers.
10. Merge obvious duplicate customers only after review.
11. Flag invalid email addresses.
12. Reconcile inventory quantities against recent sales and physical count.

### Validation Steps

1. Count source products vs imported products.
2. Count active products vs inactive products.
3. Compare category totals.
4. Compare inventory valuation by category.
5. Compare customer count.
6. Compare gift card/store credit balances.
7. Compare house account balances.
8. Sample 50 high-volume products.
9. Sample 25 customers.
10. Sample top vendors.
11. Run test checkout with migrated products.
12. Get owner sign-off on migrated opening data.

### Fallback If Clean Export Is Not Available

Fallback path:

- Rebuild catalog from existing spreadsheets, vendor invoices, shelf labels, barcode scanning, and receipts.
- Use Bindo reports/screenshots as reference where possible.
- Run full physical inventory count before go-live.
- Import opening balances manually.
- Preserve historical sales as PDF/CSV archives outside the POS if line-item import is not feasible.
- Import only current customers and balances required for operations.

Fallback acceptance:

- Owner signs off that historical Bindo data is archived but not fully queryable in the new POS.
- Owner signs off on opening inventory and account balances.

## 8. Phased Roadmap

The roadmap assumes a two-developer RuneStoneLabs team. Timelines depend heavily on payment integration access and Bindo export quality.

### Phase 0: Project Setup And Approval

Goal:

- Align scope, responsibilities, communication, and approval gates.

Work:

- Review this plan with RuneStoneLabs.
- Confirm project owner and merchant decision maker.
- Confirm deadline for Bindo shutdown.
- Create project repository structure.
- Create issue tracker labels by phase.
- Define production, staging, and local environments.
- Define coding standards and review requirements.
- Define support expectations.
- Define backup expectations.
- Decide whether plan artifacts remain Markdown, XML, or both.

Exit criteria:

- Human approval to proceed.
- Discovery sessions scheduled.
- Payment provider contact identified.
- Repository ready for planning artifacts.

### Phase 1: Feature Parity And Current-State Audit

Goal:

- Learn exactly what Hatcher uses today and prevent accidental regression.

Work:

- Interview owner.
- Interview cashiers/front-line staff.
- Interview inventory/back-office staff.
- Walk through Bindo register workflow.
- Walk through Bindo back-office workflow.
- Capture screenshots and video.
- Export all available data.
- Collect physical receipts and reports.
- Document hardware inventory.
- Document store network setup.
- Document payment terminal/account setup.
- Build Feature Parity Matrix.

Feature Parity Matrix columns:

- Capability.
- In use: yes/no/unknown.
- Current Bindo behavior.
- Pain point or must-preserve behavior.
- New system disposition: replicate, replace-via-integration, defer, drop.
- Target phase.
- Decision owner.
- Merchant sign-off required.
- Rationale.

Exit criteria:

- Feature Parity Matrix completed.
- Unknowns reduced or explicitly tracked.
- Drop/defer items have owner sign-off.
- Bindo export archive created.

### Phase 2: Architecture And Technical Spikes

Goal:

- Prove the riskiest technical assumptions before building full features.

Work:

- Create architecture decision records.
- Confirm React/Vite plus Express/Prisma/PostgreSQL stack.
- Prototype local IndexedDB offline queue.
- Prototype scanner input handling.
- Prototype receipt printing approach.
- Prototype cash drawer trigger approach.
- Determine whether local bridge or desktop wrapper is needed for v1.
- Contact TSYS/Global Payments/FIS/reseller.
- Obtain payment integration docs if possible.
- Confirm terminal options and sandbox path.
- Prototype simple terminal payment if sandbox/hardware is available.
- Confirm Railway deployment pattern.
- Confirm backup/restore workflow.

Exit criteria:

- Offline strategy approved.
- Hardware strategy approved.
- Payment integration path selected or escalated as a blocking risk.
- Development architecture approved.

### Phase 3: Core Data Model And Foundation

Goal:

- Build the stable foundation for users, products, customers, registers, audit logs, and settings.

Work:

- Design Prisma schema.
- Define migrations.
- Create seed data for roles, permissions, tender types, units, and settings.
- Build authentication.
- Build role-based permissions.
- Build audit logging.
- Build organization/location/register tables.
- Build product/category/supplier tables.
- Build customer tables.
- Build settings management.
- Build import/export framework.
- Add automated tests for permissions and audit logging.

Exit criteria:

- Backend foundation can run locally and in staging.
- Database migrations apply cleanly.
- User roles and audit logs work.
- Product and customer CRUD works.
- CSV import/export framework is ready.

### Phase 4: MVP Register And Cash Checkout

Goal:

- Make the register usable for non-card checkout and validate store workflow.

Work:

- Build register login/PIN.
- Build open register session.
- Build product scan/search.
- Build cart.
- Build quantity edits.
- Build discounts with permission.
- Build tax calculation.
- Build cash tender.
- Build check tender.
- Build house account tender placeholder if account exists.
- Build split tender.
- Build sale finalization.
- Build inventory decrement from sale.
- Build receipt snapshot and print.
- Build register close.
- Build Z-report.
- Build void before tender.
- Build refund/return basics.
- Add tests for sale totals, tax, tender validation, and inventory movements.

Exit criteria:

- Staff can complete a cash sale.
- Staff can complete a check sale.
- Staff can print a receipt.
- Drawer session can open and close.
- Inventory decrements.
- Z-report matches test transactions.

### Phase 5: Inventory And Purchasing

Goal:

- Solve the main Bindo pain point with first-class inventory.

Work:

- Build product import workflow.
- Build inventory balances.
- Build inventory movement ledger.
- Build manual adjustments.
- Build receiving without PO.
- Build purchase orders.
- Build PO receiving.
- Build reorder points.
- Build low-stock report.
- Build stock count workflow.
- Build damage/shrink workflow.
- Build unit-of-measure support.
- Build bulk/pallet quantity support.
- Build inventory value report.
- Add tests for inventory movement math.

Exit criteria:

- Inventory can be loaded, adjusted, counted, received, sold, and reported.
- Stock movement audit trail is complete.
- Owner can identify low-stock and inventory value.

### Phase 6: Customers, Loyalty, House Accounts, Tax Exemptions

Goal:

- Solve the second major pain point and support farm-supply customer workflows.

Work:

- Build customer lookup at checkout.
- Build customer purchase history.
- Build loyalty account ledger.
- Build points earning.
- Build points redemption.
- Build manager loyalty adjustment.
- Build house account records.
- Build credit limit checks.
- Build account charges.
- Build account payments.
- Build account aging report.
- Build statement data model.
- Build tax exemption certificate records.
- Build tax exemption checkout logic.
- Build price tiers.
- Build quantity break pricing.
- Add tests for customer pricing, tax exemption, loyalty, and account balances.

Exit criteria:

- A customer can be attached to sale.
- Loyalty can earn and redeem.
- House account can be charged and paid.
- Tax-exempt sale can be processed and reported.
- Price tier applies correctly.

### Phase 7: Card Payment Integration

Goal:

- Add secure card-present payments through the selected semi-integrated path.

Work:

- Finalize payment provider contract/access.
- Acquire test terminal or sandbox.
- Build payment adapter interface.
- Implement selected provider.
- Build terminal pairing/configuration.
- Build card sale flow.
- Build decline/cancel/timeout handling.
- Build partial approval handling.
- Build linked refund.
- Build void.
- Build settlement/batch status flow if required.
- Validate receipts.
- Add payment metadata storage safeguards.
- Add log redaction.
- Complete provider test scripts.
- Complete certification/approval if required.

Exit criteria:

- Test card sale completes.
- Decline/cancel flow works.
- Refund and void work.
- Receipt data is compliant.
- No cardholder data is stored in app database or logs.
- Provider approves integration for production or signs off on pilot.

### Phase 8: Offline Resilience

Goal:

- Keep selling during internet outages without losing data or creating unsafe payment behavior.

Work:

- Build catalog sync to IndexedDB.
- Build local transaction queue.
- Build offline cash/check sales.
- Build offline receipt numbering strategy.
- Build sync retry.
- Build conflict review.
- Build offline status UI.
- Build restrictions for unavailable workflows.
- Confirm card offline behavior with processor.
- Add tests for offline sale, sync, duplicate submission, and conflict handling.

Exit criteria:

- Register can complete offline cash sale.
- Register can sync sale later.
- Duplicate submissions are prevented.
- Staff can see unsynced status.
- Card offline behavior is documented and tested if supported.

### Phase 9: Reporting, Admin Polish, And Exports

Goal:

- Give owner reliable operational visibility and exportable records.

Work:

- Build daily sales report.
- Build tender report.
- Build tax report.
- Build employee sales report.
- Build item/category sales reports.
- Build inventory value report.
- Build movement report.
- Build low-stock report.
- Build margin report.
- Build house account aging.
- Build loyalty report.
- Add CSV export to all reports.
- Add print-friendly report views.
- Add dashboard landing page.

Exit criteria:

- Owner can reconcile daily operations.
- Owner can export records.
- Reports match known test data.

### Phase 10: Migration Rehearsal And Parallel Testing

Goal:

- Prove the system using real store data before go-live.

Work:

- Import latest Bindo export into staging.
- Run data validation.
- Set up test register hardware.
- Run cashier training.
- Run mock sales.
- Run returns.
- Run cash drawer close.
- Run card payments in test/live pilot mode.
- Run end-of-day report.
- Compare against Bindo behavior.
- Fix gaps.
- Run a full cutover rehearsal.

Exit criteria:

- Staff can operate the register.
- Owner signs off on migrated data.
- Payment pilot succeeds.
- Hardware works.
- Cutover checklist is complete.

### Phase 11: Go-Live And Stabilization

Goal:

- Switch Hatcher from Bindo to the new POS with controlled risk.

Work:

- Freeze Bindo changes at agreed time.
- Export final product/customer/account/gift card data.
- Run final migration.
- Perform physical opening count if required.
- Configure production terminals.
- Configure production registers.
- Verify backup.
- Verify rollback plan.
- Start first business day with support on-site or immediately available.
- Monitor transaction queue, payments, reports, and hardware.
- Reconcile first-day sales and cash.
- Log issues and triage.

Exit criteria:

- Store completes a full business day on new POS.
- Cash, card, and account tender reconcile.
- No critical data loss.
- Owner approves continued operation.

## 9. Cutover And Go-Live Plan

### Pre-Cutover

- Choose go-live date.
- Avoid peak season or peak day if possible.
- Complete staff training.
- Complete payment certification.
- Complete hardware setup.
- Complete production deployment.
- Complete backup/restore test.
- Complete final migration rehearsal.
- Prepare printed quick-reference guides.
- Prepare emergency contact list.
- Prepare manual receipt book backup.
- Prepare cash-only fallback procedure.

### Cutover Day Minus 1

- Close business as normal on Bindo.
- Run Bindo end-of-day report.
- Export final sales and inventory reports.
- Export customers, balances, gift cards, and store credits.
- Freeze changes in Bindo if possible.
- Run final import to new POS.
- Validate counts and balances.
- Print go-live checklist.
- Confirm terminals and registers are ready.

### Go-Live Morning

- Open register sessions in new POS.
- Confirm product scan works.
- Confirm receipt print works.
- Confirm cash drawer opens.
- Confirm card terminal works.
- Run one small controlled card transaction if allowed.
- Verify reporting captures transaction.
- Void/refund test if allowed and documented.
- Begin live operations.

### During First Business Day

- Keep support present or on-call.
- Record every issue.
- Reconcile transactions every few hours.
- Monitor payment status.
- Monitor offline/sync status.
- Keep Bindo read-only if possible.
- Keep manual fallback supplies ready.

### End Of First Day

- Close register sessions.
- Run Z-report.
- Compare cash drawer expected vs actual.
- Compare card settlement/batch.
- Review house account charges.
- Review refunds/voids.
- Review inventory movements.
- Backup database.
- Owner signs first-day reconciliation.

### Rollback / Contingency

Rollback should be planned but avoided once live transactions occur in both systems.

Possible fallback modes:

- If card integration fails but POS works: run cash/check/house account in POS and use standalone terminal for card payments, manually entering card tender result in POS.
- If POS checkout fails: use manual receipts and standalone terminal, then enter sales later.
- If inventory import is bad: continue selling but pause inventory reliance, fix opening balances after close.
- If production hosting fails: use offline register mode for cash/check if available; use standalone terminal for cards.
- If severe unrecoverable issue occurs early: temporarily return to Bindo only if Bindo is still available and transaction reconciliation plan is written.

Rollback rule:

- Never split live operations between Bindo and the new POS without a written reconciliation plan.

## 10. Risks And Mitigations

### Risk 1: Bindo Data Availability

Severity: Critical.

Problem:

- Bindo may be unavailable, export may be incomplete, or data may be messy.

Mitigation:

- Export immediately.
- Capture screenshots and videos.
- Save all reports.
- Preserve raw files.
- Build fallback manual catalog rebuild process.
- Require owner sign-off on opening balances.

### Risk 2: Payment Integration Timeline

Severity: Critical.

Problem:

- TSYS/Global Payments/FIS access, certification, and terminal availability may take longer than expected.

Mitigation:

- Start payment discovery before app build.
- Maintain standalone terminal fallback.
- Build POS tender abstraction.
- Do not hard-code provider-specific assumptions.
- Gate go-live on payment approval or explicit standalone-terminal workaround.

### Risk 3: Offline Behavior

Severity: High.

Problem:

- Store cannot stop selling during internet outage, but card offline behavior may be limited by processor rules.

Mitigation:

- Support offline cash/check sales.
- Cache catalog and tax rules.
- Queue local transactions.
- Clearly show sync status.
- Confirm card offline rules with processor.
- Use standalone terminal fallback if needed.

### Risk 4: Hardware Compatibility

Severity: High.

Problem:

- Receipt printer, cash drawer, scanner, scale, and terminal integrations can be inconsistent.

Mitigation:

- Inventory hardware early.
- Prefer known supported models.
- Use scanner-as-keyboard first.
- Use browser print first if acceptable.
- Add local bridge only where needed.
- Test hardware in the actual store before go-live.

### Risk 5: Team Bandwidth

Severity: High.

Problem:

- A two-developer team can be overwhelmed by POS scope.

Mitigation:

- Build cutover-ready scope first.
- Defer advanced features with sign-off.
- Use simple architecture.
- Avoid unnecessary custom UI complexity.
- Keep payment integration isolated.
- Use weekly demo/review checkpoints.

### Risk 6: Tax And House Account Complexity

Severity: High.

Problem:

- Agricultural exemptions, resale certificates, account terms, and pricing tiers can create compliance and accounting issues.

Mitigation:

- Interview owner/bookkeeper.
- Model exemptions and house accounts from day one.
- Add audit logs.
- Require manager approval for adjustments.
- Export reports for accountant review.

### Risk 7: Inventory Accuracy

Severity: Medium/High.

Problem:

- If current inventory is inaccurate, the new POS may be blamed for old data issues.

Mitigation:

- Do physical count before go-live where practical.
- Import opening balances as owner-approved baseline.
- Track adjustments transparently.
- Provide variance reports.

### Risk 8: Security And Support

Severity: High.

Problem:

- A custom POS creates long-term support responsibility.

Mitigation:

- Use MFA for admins.
- Patch dependencies.
- Back up database.
- Monitor errors.
- Use least privilege.
- Avoid card data.
- Document operational runbooks.

## 11. Codex Work Breakdown

This section translates the plan into work Codex can execute later after human approval.

### Codex Rule Set For This Project

- Do not begin implementation until RuneStoneLabs approves this planning document.
- Never store payment card data.
- Never bypass payment provider certification steps.
- Prefer small, reviewable changes.
- Add tests before expanding scope.
- Keep each phase deployable.
- Do not refactor unrelated website files.
- Keep POS code isolated under `POS` or a clearly approved app folder.
- Document assumptions in each phase PR/commit.
- Ask for human decision when a feature is ambiguous or legally/compliance sensitive.

### Suggested Future Repository Structure

```text
POS/
  docs/
    plans/
    discovery/
    adr/
    runbooks/
  apps/
    register/
    back-office/
    api/
    local-bridge/
  packages/
    shared/
    database/
    payments/
    hardware/
  migrations/
  scripts/
  tests/
```

This is a proposed structure only. Do not create it until implementation is approved.

### Future Codex Task Order

1. Create `POS/docs/discovery/feature-parity-matrix.md`.
2. Create discovery interview forms.
3. Create hardware inventory checklist.
4. Create payment-provider question checklist.
5. Create migration file inventory checklist.
6. Create architecture decision records.
7. Scaffold app only after approval.
8. Implement foundation.
9. Implement register MVP.
10. Implement inventory.
11. Implement customer/loyalty/house accounts.
12. Implement payment adapter.
13. Implement reporting.
14. Implement offline sync.
15. Perform migration rehearsal.
16. Prepare go-live runbooks.

## 12. Open Questions

### Immediate Business Questions

- What date does Hatcher need to be fully off Bindo?
- Is Bindo still accessible right now?
- Who can provide Bindo admin access?
- Does Hatcher currently sell online through Bindo?
- Does Hatcher use gift cards today?
- Does Hatcher use loyalty today?
- Does Hatcher use house accounts today?
- Does Hatcher use store credit today?
- Does Hatcher use purchase orders today?
- Does Hatcher use QuickBooks, Xero, or another accounting system?
- Does Hatcher need timeclock in v1?

### Payment Questions

- Who is the merchant services contact?
- What company bills the merchant for card processing today?
- What terminal model is currently used?
- Is the current terminal compatible with semi-integrated third-party POS operation?
- Does the merchant account support Global Payments Integrated, Genius, TSYS developer tools, or another certified path?
- What PCI SAQ does Hatcher currently complete?
- Is offline card processing currently used?
- Are debit PIN transactions required?

### Hardware Questions

- What receipt printer is currently used?
- What barcode scanner is currently used?
- How is the cash drawer connected?
- Is there a scale?
- Is there a customer-facing display?
- Are register PCs Windows machines?
- Is the store network wired to the register area?
- Is there backup internet?

### Data Questions

- Can Bindo export products, customers, inventory, and sales?
- Are current Bindo inventory quantities trusted?
- Are product costs accurate?
- Are customer duplicates common?
- Are house account balances maintained in Bindo or somewhere else?
- Are gift card balances maintained in Bindo or somewhere else?
- How much historical sales data must be searchable in the new POS?

### Scope Questions

- What is the smallest acceptable go-live system?
- Which features can be deferred with merchant sign-off?
- Will RuneStoneLabs provide ongoing support?
- What support response time is expected during business hours?
- Who approves production deployments?

## Final Planning Note

This document is a detailed plan, not an implementation. The next correct step is a human review by RuneStoneLabs and Hatcher decision makers. After approval, Codex should begin with discovery artifacts and feature parity documentation before writing application code.
