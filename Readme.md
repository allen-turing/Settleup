# Expense Sharing App (Splitwise / Tricount Clone)

## Project Goal

Build a modern expense-sharing application similar to Splitwise or Tricount name it as "PayPaySplit"

The app should allow groups of people to:
- create trips/groups
- add shared expenses
- split expenses equally or unequally
- track balances
- simplify settlements
- categorize spending
- record settlements/payments
- upload bill images

The app should automatically calculate:
- who owes whom
- net balances
- simplified settlements

---

# Core Features

## Authentication
- User signup/login
- JWT/session authentication
- Profile management

---

# Groups / Trips

Users can:
- create groups/trips
- invite members
- remove members
- view group balances

Examples:
- Goa Trip
- Flat Expenses
- Office Lunch
- Europe Backpacking

---

# Expenses

Each expense should contain:

- title
- description
- amount
- currency
- category
- paid by
- participants
- split type
- date
- optional receipt image

Supported split types:
- Equal
- Exact Amount
- Percentage
- Shares

---

# Categories

Default categories:
- Food
- Hotel
- Fuel
- Shopping
- Tickets
- Entertainment
- Miscellaneous

Support:
- category icon
- category color
- custom categories

---

# Balance System

The system should calculate:

For each user:

```text
balance =
(total_paid_by_user)
-
(total_user_owes)
```

Positive balance:
- user should receive money

Negative balance:
- user owes money

---

# Settlement Simplification

Generate minimal transactions between users.

Example:

Before:
- A owes B ₹100
- A owes C ₹100
- C owes B ₹100

Simplified:
- A pays B ₹200

Implement greedy debt simplification algorithm.

---

# Settlements

Users can mark debts as settled.

Settlement contains:
- payer
- receiver
- amount
- date
- note

---

# Receipt Uploads

Users can upload:
- images
- PDFs

Store:
- local storage or S3-compatible storage

---

# Analytics

Provide:
- category-wise spending
- monthly spending
- group spending summary
- user contribution summary

Charts:
- pie chart
- bar chart
- timeline

---

# Tech Stack

Recommended stack:

Frontend:
- React
- Next.js
- TypeScript
- TailwindCSS

Backend:
- Node.js
- Express or NestJS

Database:
- PostgreSQL

ORM:
- Prisma

Authentication:
- JWT

Storage:
- S3 / Cloudinary

Deployment:
- Docker
- Vercel (frontend)
- Railway / Render / Fly.io (backend)

---

# Database Schema

## users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## groups

```sql
CREATE TABLE groups (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## group_members

```sql
CREATE TABLE group_members (
    group_id UUID REFERENCES groups(id),
    user_id UUID REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (group_id, user_id)
);
```

## categories

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20)
);
```

## expenses

```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY,

    group_id UUID REFERENCES groups(id),

    title VARCHAR(255) NOT NULL,
    description TEXT,

    total_amount DECIMAL(12,2) NOT NULL,

    paid_by UUID REFERENCES users(id),

    category_id UUID REFERENCES categories(id),

    split_type VARCHAR(20),

    expense_date DATE NOT NULL,

    currency VARCHAR(10) DEFAULT 'INR',

    receipt_url TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## expense_participants

```sql
CREATE TABLE expense_participants (
    expense_id UUID REFERENCES expenses(id),

    user_id UUID REFERENCES users(id),

    share_amount DECIMAL(12,2) NOT NULL,

    percentage DECIMAL(5,2),

    shares INTEGER,

    is_settled BOOLEAN DEFAULT FALSE,

    PRIMARY KEY (expense_id, user_id)
);
```

## settlements

```sql
CREATE TABLE settlements (
    id UUID PRIMARY KEY,

    group_id UUID REFERENCES groups(id),

    paid_by UUID REFERENCES users(id),

    paid_to UUID REFERENCES users(id),

    amount DECIMAL(12,2) NOT NULL,

    settlement_date DATE NOT NULL,

    note TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# API Requirements

## Auth APIs
- POST /auth/signup
- POST /auth/login
- GET /auth/me

## Group APIs
- POST /groups
- GET /groups
- GET /groups/:id
- POST /groups/:id/members
- DELETE /groups/:id/members/:userId

## Expense APIs
- POST /expenses
- GET /groups/:id/expenses
- PUT /expenses/:id
- DELETE /expenses/:id

## Settlement APIs
- POST /settlements
- GET /groups/:id/settlements

## Analytics APIs
- GET /groups/:id/analytics
- GET /users/:id/summary

---

# Important Rules

## Money Handling

NEVER use float/double for money calculations.

Use:

```sql
DECIMAL(12,2)
```

---

# Business Logic Requirements

## Expense Creation

When an expense is added:
1. create expense record
2. create participant records
3. recalculate balances

## Balance Calculation

Balances should NOT be permanently stored.

Always calculate dynamically from:
- expenses
- settlements

## Debt Simplification

Implement algorithm:
1. calculate net balances
2. separate debtors and creditors
3. greedily minimize transactions

---

# UI Pages

## Authentication
- Login
- Signup

## Dashboard
- user balances
- recent groups
- recent expenses

## Group Details
- expense list
- balances
- settlement suggestions

## Add Expense Modal

Fields:
- amount
- title
- category
- paid by
- participants
- split type

## Analytics
- charts
- category spending
- monthly reports

---

# Nice-to-Have Features

- dark mode
- notifications
- recurring expenses
- multi-currency support
- OCR receipt scanning
- export to CSV/PDF
- mobile app
- offline mode
- real-time sync

---

# Code Quality Requirements

- Use TypeScript everywhere
- Use clean architecture
- Use service/repository pattern
- Add validation
- Add unit tests
- Add API documentation
- Add error handling
- Add database migrations

---

# Security Requirements

- hashed passwords
- JWT expiration
- input validation
- SQL injection protection
- rate limiting
- authorization checks

---

# Final Goal

Create a production-ready expense sharing application similar to:
- Splitwise
- Tricount

Focus on:
- correctness of balance calculations
- clean UI/UX
- scalable backend architecture
- accurate settlement simplification
- reliable money handling

Humans become irrational over tiny amounts of money, so calculations must be precise.
