# Invoice Automation Demo Script

This is a hardcoded demo showcasing invoice approval automation for property management. The app simulates processing 1000 monthly invoices with 50/50 electronic vs check split, demonstrating how batch actions reduce manual clicks.

## Demo Overview

- **Total Invoices**: 1000
- **Trusted Electronic**: 700 (batch approvable)
- **Check Invoices**: 200 (queued for check run)
- **Exceptions**: 100 (require manual review)

## Key Features to Demonstrate

### 1. Inbox Tab (Default View)

- **Location**: Top navigation tabs - "Inbox"
- **Features**:
  - Displays all 1000 invoices in a table
  - Columns: Vendor, Description, Date, Invoice #, Amount, Payment Type, Status Badge, Reason
  - Status badges: Green for Trusted, Red for Exception, Blue for others
  - Filters dropdown: All/Trusted/Check/Exception/Approved/Queued
  - Batch actions: "Approve all Trusted (N)" and "Queue all Checks (N)" buttons

### 2. Batch Actions

- **Location**: Inbox tab, top bar below filters
- **Approve all Trusted**:
  - Marks all 700 Trusted electronic invoices as Approved
  - Updates counters instantly
  - Changes status badges from Trusted to Approved
- **Queue all Checks**:
  - Moves all 200 check invoices to Queued status
  - Updates counters
  - Invoices appear in Check Run Queue tab

### 3. Counters

- **Location**: Header bar
- **Displays**: Total, Approved, Queued, Exceptions
- **Updates**: Live as actions are performed

### 4. Check Run Queue Tab

- **Location**: Top navigation - "Check Run Queue"
- **Features**:
  - Shows table of queued invoices (initially 0, becomes 200 after batch)
  - Columns: Vendor, Amount, Status
  - Simulates ready-for-printing checks

### 5. Digest Tab

- **Location**: Top navigation - "Digest"
- **Features**:
  - Summary after batch actions
  - Counts: Approved electronically, Checks queued, Exceptions remaining
  - Top 10 exceptions list with one-line reasons and vendors

### 6. Exception Handling

- **Location**: Inbox tab, click any red "Exception" row
- **Features** (placeholder for now):
  - Opens modal/drawer with full invoice details
  - Shows audit trail (decision reasons)
  - Action buttons: Approve anyway, Keep as exception
  - Demo 5-10 different exception types:
    - Duplicate invoice number
    - New vendor (not trusted)
    - Amount > 3x typical
    - Missing invoice number
    - Missing date
    - Check-only vendor with electronic payment

## Demo Script (Speaker Notes)

1. **Intro (30s)**: "Welcome to our invoice automation demo. This shows how we reduce manual clicks for 1000 monthly invoices – 50/50 electronic vs. check."

2. **Inbox Load (1min)**:
   - Open Inbox tab
   - "Here's the inbox with 1000 invoices. Filters help narrow down."
   - Click filters to show subsets (e.g., Trusted shows 700, Exception shows 100)

3. **Batch Actions (2min)**:
   - "Batch approve all 700 Trusted electronic invoices."
   - Click "Approve all Trusted (700)" button
   - Show counters update: Approved: 700
   - "Now queue 200 checks."
   - Click "Queue all Checks (200)" button
   - Show counters: Queued: 200, Exceptions: 100

4. **Exceptions Handling (3min)**:
   - Filter to Exception
   - "100 exceptions remain. Let's review one."
   - Click an exception row (e.g., duplicate invoice)
   - Open modal: "See the audit trail – why it's an exception. Approve anyway."
   - Click "Approve anyway" button
   - Update counters

5. **Check Queue & Digest (3min)**:
   - Switch to Check Run Queue tab
   - "Check queue ready for batch run."
   - Switch to Digest tab
   - "Digest summary: 700 approved electronically, 200 checks queued, 100 exceptions with top reasons."
   - Highlight top 10 list

6. **Close (1min)**: "This automation saves hours monthly. Ready for integration?"

## Acceptance Criteria Checklist

- [ ] App loads instantly with 1000 invoices
- [ ] Filters work correctly (show exact counts)
- [ ] Batch approve updates 700 to Approved
- [ ] Batch queue moves 200 to Check Queue
- [ ] Counters update live
- [ ] Exception modal opens on click
- [ ] Digest shows accurate summaries
- [ ] Tabs switch smoothly
- [ ] No crashes or performance issues

## Risk Mitigation

- Pre-seeded data ensures deterministic counts
- No randomness in generation
- Test on target devices before demo
- Have backup slides if app fails

## Demo Duration: 7-10 minutes
