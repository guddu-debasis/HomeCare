# 🏡 Hearth (HomeCare)

> **Enterprise-grade, full-stack home services booking platform** featuring multi-seller checkout, Redis-backed high-concurrency cart management, secure Razorpay payments, asynchronous PDF invoice generation via AWS SQS workers, and safe natural-language AI service discovery powered by Groq and LangChain.

[![Node.js](https://img.shields.io/badge/Node.js-v20+-68a063?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-v5.2-black?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-v19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-4169e1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-v0.45-c5f74f?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-REST-00e9a3?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)
[![AWS SQS](https://img.shields.io/badge/AWS-SQS_Worker-ff9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/sqs/)
[![Groq AI](https://img.shields.io/badge/Groq_AI-Llama_3_/_LangChain-f55036?style=for-the-badge&logo=fastapi&logoColor=white)](https://groq.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payments-0c2340?style=for-the-badge&logo=razorpay&logoColor=white)](https://razorpay.com/)

---

## 📑 Table of Contents

1. [Executive Overview](#-executive-overview)
2. [Key Capabilities by Role](#-key-capabilities-by-role)
3. [System Architecture & Data Flows](#-system-architecture--data-flows)
   - [High-Level Architecture](#high-level-architecture)
   - [Live Cart & Checkout Flow](#live-cart--checkout-flow)
   - [Payment & Asynchronous Invoicing Pipeline](#payment--asynchronous-invoicing-pipeline)
   - [Hallucination-Proof AI Search Pipeline](#hallucination-proof-ai-search-pipeline)
   - [Multi-Seller Order Rollup Hierarchy](#multi-seller-order-rollup-hierarchy)
4. [Technology Stack & Architectural Rationale](#-technology-stack--architectural-rationale)
5. [Repository Structure](#-repository-structure)
6. [Database Schema & Data Model](#-database-schema--data-model)
7. [Step-by-Step Setup Guide](#-step-by-step-setup-guide)
   - [Prerequisites](#1-prerequisites)
   - [Backend Installation & Configuration](#2-backend-installation--configuration)
   - [Database Setup & Migrations](#3-database-setup--migrations)
   - [Invoice Worker Configuration](#4-invoice-worker-configuration)
   - [Frontend Installation & Configuration](#5-frontend-installation--configuration)
   - [Initial Bootstrap Walkthrough](#6-initial-bootstrap-walkthrough)
8. [Environment Variables Reference](#-environment-variables-reference)
9. [Third-Party Services Onboarding Guide](#-third-party-services-onboarding-guide)
10. [Comprehensive API Reference](#-comprehensive-api-reference)
    - [Authentication & Account Management](#1-auth--account-management)
    - [Live Cart Management](#2-live-cart-management)
    - [Catalog & Services](#3-catalog--services)
    - [Seller Offerings & Listings](#4-seller-offerings--listings)
    - [Orders & Bookings](#5-orders--bookings)
    - [Payments & Webhooks](#6-payments--webhooks)
    - [Reviews & Ratings](#7-reviews--ratings)
    - [AI Natural-Language Search](#8-ai-natural-language-search)
11. [Testing Core Workflows with cURL](#-testing-core-workflows-with-curl)
12. [Available NPM Scripts](#-available-npm-scripts)
13. [Troubleshooting & Common Pitfalls](#-troubleshooting--common-pitfalls)
14. [Current Implementation Status & Roadmap](#-current-implementation-status--roadmap)

---

## 💡 Executive Overview

**Hearth (HomeCare)** bridges homeowners with verified local home-service providers (cleaners, electricians, plumbers, appliance technicians, and more). Unlike monolithic single-vendor platforms, Hearth is built from the ground up as a **multi-vendor marketplace**:

- A single customer checkout can bundle services across multiple independent service providers.
- Each provider manages their own pricing, job acceptance, and status tracking independently without blocking or interfering with other items in the booking.
- High-frequency operations like shopping carts and notification badges are offloaded to **Upstash Redis**, ensuring microsecond response times and zero database contention.
- CPU-intensive tasks such as generating branded PDF invoices are decoupled from the API request path using an **AWS SQS** queue and a standalone worker process.
- Customers can search using natural language (e.g., *"Find me an affordable, top-rated electrician for emergency wiring"*). Hearth answers using a **deterministic retrieval-then-rank architecture** powered by Groq and LangChain that strictly prevents hallucinations and prompt injection.

---

## 👥 Key Capabilities by Role

### 🛍️ Customers
- **Service Discovery**: Browse master catalog services, filter by provider price and rating, or query using natural language AI.
- **High-Performance Cart**: Adjust quantities instantly via Redis atomic operations.
- **Combined Checkout**: Book multiple services from different sellers in a single transaction with scheduled booking dates and time slots.
- **Secure Online Payments**: Integrated Razorpay checkout with instantaneous cryptographic signature verification and fallback webhook listeners.
- **Instant Invoices**: Download generated PDF invoices directly from the booking detail screen.
- **Live Tracking & Ratings**: Cancel specific lines or whole bookings, track progress, and review sellers post-completion.

### 🛠️ Sellers (Service Providers)
- **Custom Service Offerings**: Link to catalog services with custom pricing and detailed descriptions.
- **Booking Management**: Accept, reject, or mark bookings completed independently per order line.
- **Time Window Guard**: Safeguard that prevents sellers from marking jobs "completed" before the scheduled booking date arrives.
- **Real-Time Badging**: Redis-backed unread notification count badge in the navigation bar.

### 🛡️ Administrators
- **Master Catalog Governance**: Add, modify, and delete global categories and base service templates.
- **Restricted Access**: Admin registration is gated by a cryptographically secure `ADMIN_SETUP_SECRET` header check to prevent unauthorized privilege escalation.
- **Future Moderation**: Database columns prepared for seller listing verification (`verificationStatus`, `rejectionReason`).

---

## 🏛️ System Architecture & Data Flows

### High-Level Architecture

```
                    ┌──────────────────────────────────────────┐
                    │          React 19 SPA (Vite)             │
                    │   Tailwind CSS v4 · React Router v7      │
                    └────────────────────┬─────────────────────┘
                                         │ Axios (Bearer JWT)
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               Express 5 REST API (:5000)                               │
│  ┌──────────────────┐    ┌────────────────────────┐    ┌─────────────────────────────┐ │
│  │ CORS & Body JSON │───▶│ validate(Dto) [Joi]    │───▶│ Controllers (Thin Adapter)  │ │
│  └──────────────────┘    └────────────────────────┘    └──────────────┬──────────────┘ │
│                                                                       │                │
│                                              ┌────────────────────────┴──────────────┐ │
│                                              ▼                                       │ │
│                                  Domain Services (Business Logic)                    │ │
│                                              │                                       │ │
│        ┌───────────────────────────┬─────────┴───────────────┬──────────────────┐    │ │
│        ▼                           ▼                         ▼                  ▼    │ │
│  Drizzle ORM                 Upstash Redis               Groq Cloud       AWS SQS    │ │
│  (PostgreSQL)                (REST Client)               (LangChain)      (Client)   │ │
└────────┬───────────────────────────┬─────────────────────────┬──────────────────┬────┘ │
         │                           │                         │                  │      │
         ▼                           ▼                         ▼                  │      │
  ┌──────────────┐            ┌─────────────┐           ┌──────────────┐          │      │
  │  PostgreSQL  │            │Upstash Redis│           │  Groq LLM    │          │      │
  │  Database    │            │ (Ephemeral) │           │(Llama3-120b) │          │      │
  └──────┬───────┘            └─────────────┘           └──────────────┘          │      │
         ▲                                                                        │      │
         │ writes PDF Base64                                                      │      │
         │                                                                        ▼      │
┌────────┴────────────────────────────────────────────────────────────────────────┴────┐
│                    Standalone Invoice Background Worker Process                       │
│                       `npm run worker:invoice` (Long-Polling SQS)                    │
│                                                                                       │
│   SQS ReceiveMessage ──▶ Extract orderId ──▶ Fetch DB ──▶ PDFKit Render ──▶ SQS Delete│
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Live Cart & Checkout Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend as React Client
    participant API as Express API
    participant Redis as Upstash Redis
    participant DB as PostgreSQL (Drizzle)

    Customer->>Frontend: Clicks "Add to Cart"
    Frontend->>API: POST /app/v1/cart { serviceId, sellerId, quantity }
    API->>Redis: HINCRBY cart:customer:{id} "{serviceId}:{sellerId}" {quantity}
    API->>Redis: EXPIRE cart:customer:{id} 2592000 (30 Days TTL)
    API-->>Frontend: 200 OK (Item Count / Cart Updated)

    Customer->>Frontend: Proceed to Checkout
    Frontend->>API: POST /api/v1/orders { bookingDate, timeSlot }
    API->>Redis: HGETALL cart:customer:{id}
    API->>DB: Batch Fetch Service details & Seller prices
    API->>DB: BEGIN Transaction: INSERT INTO "Order/Booking" & "Order_Items"
    DB-->>API: Transaction Committed (orderId)
    API->>Redis: DEL cart:customer:{id} (Purge Cart)
    API-->>Frontend: 201 Created { orderId, totalAmount, status: "pending" }
```

---

### Payment & Asynchronous Invoicing Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Client as React Client
    participant API as Express API
    participant Razorpay as Razorpay Gateway
    participant SQS as AWS SQS Queue
    participant Worker as Invoice Worker
    participant DB as PostgreSQL

    Customer->>Client: Pay Now
    Client->>API: POST /api/v1/payments/orders/:id/create
    API->>Razorpay: orders.create({ amount, currency: "INR" })
    Razorpay-->>API: razorpayOrderId
    API->>DB: Update order with razorpayOrderId
    API-->>Client: { razorpayOrderId, amount, keyId }

    Client->>Razorpay: Opens Razorpay Checkout Modal
    Razorpay-->>Client: Returns { paymentId, signature }
    Client->>API: POST /api/v1/payments/verify
    API->>API: Constant-time timingSafeEqual HMAC validation

    alt Valid Signature
        API->>DB: UPDATE "Order/Booking" SET paymentStatus = 'paid'
        API->>SQS: SendMessageCommand({ orderId })
        Note over API: Returns immediately! PDF is NOT generated inline.
        API-->>Client: 200 OK { paymentStatus: "paid" }
    else SQS Unavailable / Offline
        API->>API: Graceful Fallback: Generate inline via Promise
    end

    loop Worker Long Polling
        Worker->>SQS: ReceiveMessageCommand (WaitTimeSeconds: 20)
        SQS-->>Worker: Deliver { orderId }
        Worker->>DB: Fetch Order, Customer & Item lines
        Worker->>Worker: Render PDF in-memory (PDFKit)
        Worker->>DB: UPDATE "Order/Booking" SET invoicePdfBase64, invoiceGeneratedAt
        Worker->>SQS: DeleteMessageCommand (ReceiptHandle)
    end
```

---

### Hallucination-Proof AI Search Pipeline

Hearth uses a strict **Retrieval-Augmented Ranking** architecture. The AI engine is strictly prohibited from guessing or fabricating service catalog entities:

```mermaid
flowchart TD
    A[Customer Query: 'Emergency sink leakage repair'] --> B[Express Controller]
    B --> C[(PostgreSQL DB)]
    C -- Step 1: Deterministic Retrieval --> D[Fetch All Approved Seller_Service Offerings + Ratings]
    D --> E[Candidate Serialization: id, title, price, rating, bio]
    E --> F[Groq ChatGroq: openai/gpt-oss-120b]
    A --> F
    F -- Step 2: LangChain withStructuredOutput --> G[Structured JSON Schema: Array of { sellerServiceId, reason }]
    G --> H[Step 3: Database Reconciliation Engine]
    H -- Discard any ID not in original Candidate list --> I[Clean Verified Matches]
    I -- Hydrate authoritative pricing & metadata from DB --> J[Return Enriched Results to Customer]
```

---

### Multi-Seller Order Rollup Hierarchy

A customer's single order can contain items from multiple independent providers. The overarching `Order/Booking.status` is a **purely derived rollup** of the child `Order_Items.status`:

```
                ┌──────────────────────────────────────┐
                │        Order/Booking #101            │
                │        Rollup Status: "pending"      │
                └──────────────────┬───────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Order_Item #1    │      │ Order_Item #2    │      │ Order_Item #3    │
│ Seller A (Plumb) │      │ Seller B (Clean) │      │ Seller C (Elect) │
│ Status: ACCEPTED │      │ Status: PENDING  │      │ Status: CANCELLED│
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

**Rollup Rules (`order-status.util.js`):**
1. If **every** item is `cancelled` $\rightarrow$ Parent status is `cancelled`.
2. Cancelled lines are ignored when assessing fulfillment progress.
3. If all active items are `completed` $\rightarrow$ Parent status is `completed`.
4. If all active items are `accepted` or `completed` $\rightarrow$ Parent status is `accepted`.
5. Otherwise $\rightarrow$ Parent status is `pending`.

---

## 🛠️ Technology Stack & Architectural Rationale

| Layer | Technology | Architectural Rationale |
|---|---|---|
| **Backend Framework** | **Node.js 20+** & **Express 5.2** | Native promise-handling in Express 5 middleware eliminates boilerplate `asyncHandler` wrappers while maximizing asynchronous I/O efficiency. |
| **Database** | **PostgreSQL 16** (via `pg`) | Relational integrity is vital for financial ledgers, foreign keys, order items, and cascading constraints. |
| **ORM** | **Drizzle ORM** & **Drizzle Kit** | Zero-overhead, type-safe SQL query builder. Schema declared as code in `schema.js` acts as the single source of truth without heavy runtime ORM bloat. |
| **Validation** | **Joi** (via custom `BaseDto`) | Strict incoming request body validation. Automatic sanitization drops unknown attributes (`stripUnknown: true`) and aggregates errors. |
| **Ephemeral Cache** | **Upstash Redis** (REST SDK) | Serverless-native HTTP client. Powers atomic shopping cart hash mutations (`HINCRBY`), notification counters, and customer AI rate-limit windows. |
| **Queue & Worker** | **AWS SQS** + **PDFKit** | Decouples CPU-intensive PDF document compilation from the synchronous payment webhook/verify request lifecycle. |
| **AI Discovery** | **Groq** (`@langchain/groq`) | Ultra-fast inference with deterministic temperature (`0.0`). Bound to structured Zod output schemas to guarantee predictable JSON serialization. |
| **Authentication** | **JWT** + **Passport.js** | Stateless access tokens (15m expiry) paired with SHA-256 hashed refresh tokens stored in PostgreSQL. Optional Google OAuth 2.0 integration. |
| **Payments** | **Razorpay** | Industry-standard payment gateway. Validated using constant-time cryptographic HMAC SHA-256 signatures (`crypto.timingSafeEqual`). |
| **Frontend** | **React 19**, **Vite**, **Tailwind CSS v4** | Blazing-fast component development, native CSS module compilation, route-level code splitting via `React.lazy` and `<Suspense>`. |

---

## 📂 Repository Structure

```
HomeCare/
├── .env.example                 # Canonical environment configuration blueprint
├── drizzle.config.js            # Drizzle Kit migration and database connection configuration
├── package.json                 # Backend dependencies, engine constraints, and scripts
├── server.js                    # Web server entrypoint; initializes DB pool & starts Express
├── drizzle/                     # Versioned SQL migrations generated by Drizzle Kit
│   ├── 0000_...sql
│   └── meta/
├── src/
│   ├── app.js                   # Express application setup, global middlewares, route registration
│   ├── common/                  # Shared cross-cutting concerns
│   │   ├── config/              # External service instances (PostgreSQL pool, Redis, SQS, Groq, Razorpay)
│   │   ├── dto/                 # BaseDto class implementing Joi validation
│   │   ├── middlewares/         # verifyAuth, role guards (Admin, Seller, Customer), Joi validator, errorHandler
│   │   └── utils/               # ApiError, ApiResponse, JWT utilities, PDF generators, status rollup
│   ├── db/
│   │   └── schema.js            # Authoritative database schema definitions (Tables, Enums, Constraints)
│   ├── modules/                 # Modular domain features (Routes, Controllers, Services, DTOs)
│   │   ├── admin/               # Admin authentication, registration secret validation, password reset
│   │   ├── ai-search/           # Groq natural-language search with deterministic DB candidate ranking
│   │   ├── cart/                # Redis hash-backed live customer shopping cart
│   │   ├── customer/            # Customer authentication, profile, notifications, Google OAuth
│   │   ├── order/               # Order creation, order item status, cancellation, and invoice download
│   │   ├── payment/             # Razorpay order generation, signature verification, webhook handler, SQS enqueue
│   │   ├── ratings/             # Post-service customer reviews and ratings calculation
│   │   ├── seller/              # Seller onboarding, booking acceptance/rejection, notification hub
│   │   ├── seller-service/      # Individual seller custom pricing and listing management
│   │   └── service/             # Master catalog service management (Admin / Seller)
│   └── workers/
│       └── invoice-worker.js    # Standalone SQS queue consumer process for background invoice rendering
└── homecare-frontend/           # React 19 Single Page Application
    ├── index.html
    ├── package.json             # Frontend dependencies (React 19, Tailwind v4, Axios, React Router 7)
    ├── vite.config.js           # Vite configuration with Tailwind CSS v4 compiler plugin
    └── src/
        ├── App.jsx              # Client router with lazy-loaded route views & protected role wrappers
        ├── index.css            # Global Tailwind CSS definitions and custom scrollbar styles
        ├── components/          # Reusable UI widgets (Navbar, Modal, NotificationBell, AiSearchPanel, Footer)
        ├── context/             # React Contexts (AuthContext, ToastContext, ThemeContext)
        ├── lib/                 # Shared utilities (api.js API client, formatters, UI style tokens)
        └── pages/               # Application views
            ├── Home.jsx         # Hero section, catalog search, AI search panel, provider list
            ├── Login.jsx        # Unified multi-role login with Google OAuth trigger
            ├── Register.jsx     # Registration for Customers and Sellers
            ├── SellerProfile.jsx# Provider bio, service offerings, and aggregated ratings
            ├── customer/        # Cart.jsx, Orders.jsx, OrderDetail.jsx
            ├── seller/          # MyServices.jsx (Service pricing management)
            └── admin/           # ManageServices.jsx (Master catalog curation)
```

---

## 🗄️ Database Schema & Data Model

Hearth maintains **strict separation of identity** by assigning Customers, Sellers, and Admins to separate tables. This preserves clean foreign key references, distinct security postures, and role-specific profile fields.

```mermaid
erDiagram
    Customers ||--o{ "Order/Booking" : places
    Customers ||--o{ Ratings : writes
    Customers ||--o{ Notifications : receives
    Customers ||--o{ Cart_Items : legacy

    Seller ||--o{ Seller_Service : offers
    Seller ||--o{ Order_Items : fulfills
    Seller ||--o{ Ratings : receives
    Seller ||--o{ Notifications : receives

    Service ||--o{ Seller_Service : categorizes
    Service ||--o{ Order_Items : defines

    "Order/Booking" ||--|{ Order_Items : contains
    "Order/Booking" ||--o{ Ratings : evaluated_in

    Customers {
        serial id PK
        varchar username
        varchar email UK
        varchar password
        varchar phNo
        varchar currLocation
        varchar refreshToken
        timestamp createdAt
    }

    Seller {
        serial id PK
        varchar username
        varchar email UK
        varchar password
        varchar phNo
        varchar refreshToken
        timestamp createdAt
    }

    Admin {
        serial id PK
        varchar username
        varchar email UK
        varchar password
        varchar refreshToken
        timestamp createdAt
    }

    Service {
        serial id PK
        varchar serviceName
        decimal basePrice
        varchar description
    }

    Seller_Service {
        serial id PK
        int sellerId FK
        int serviceId FK
        decimal customPrice
        varchar description
        enum verificationStatus
        varchar rejectionReason
    }

    "Order/Booking" {
        serial id PK
        int customerId FK
        decimal totalAmount
        enum paymentStatus
        enum status
        date bookingDate
        varchar timeSlot
        varchar razorpayOrderId
        varchar razorpayPaymentId
        text invoicePdfBase64
        timestamp invoiceGeneratedAt
    }

    Order_Items {
        serial id PK
        int orderId FK
        int serviceId FK
        int sellerId FK
        int quantity
        decimal price
        enum status
    }

    Ratings {
        serial id PK
        int bookingId FK
        int customerId FK
        int sellerId FK
        int ratingScore
        varchar comment
    }

    Notifications {
        serial id PK
        int sellerId FK
        int customerId FK
        varchar title
        varchar message
        varchar type
        boolean isRead
    }
```

### PostgreSQL Enums
- **`payment_status`**: `'pending'`, `'paid'`, `'failed'`, `'refunded'`
- **`booking_status`**: `'pending'`, `'accepted'`, `'completed'`, `'cancelled'`
- **`verification_status`**: `'pending'`, `'approved'`, `'rejected'`

---

## 🚀 Step-by-Step Setup Guide

Follow this guide to get Hearth running locally from scratch.

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher (`node -v`)
- **npm**: `v10.0.0` or higher (`npm -v`)
- **PostgreSQL**: A local instance or a managed cloud database (e.g., [Neon](https://neon.tech), [Supabase](https://supabase.com)).
- **Upstash Redis**: A free Redis database with REST API credentials from [Upstash Console](https://console.upstash.com).
- **Razorpay**: A free developer account from [Razorpay Dashboard](https://dashboard.razorpay.com).
- **Groq API**: An API key from [Groq Console](https://console.groq.com/keys).
- *(Optional)* **AWS Account**: An SQS queue with IAM programmatic credentials for detached invoice workers.

---

### 2. Backend Installation & Configuration

1. Clone the repository and navigate into the root directory:
   ```bash
   git clone https://github.com/guddu-debasis/HomeCare.git
   cd HomeCare
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Initialize your environment configuration file:
   ```bash
   cp .env.example .env
   ```

4. Populate `.env` with your actual credentials (see the [Environment Variables Reference](#-environment-variables-reference) below).

---

### 3. Database Setup & Migrations

Drizzle Kit gives you flexible options for managing your database schema:

```bash
# Option A: Instant Live Sync (Recommended for local development)
# Compares src/db/schema.js directly with your database and applies changes immediately.
npx drizzle-kit push

# Option B: Formal Migration Files (Recommended for production environments)
# 1. Generate SQL migration files
npm run db:generate

# 2. Execute pending migrations against the database
npm run db:migrate
```

> [!WARNING]
> **Drizzle Push Caution**: `npx drizzle-kit push` will inspect the live database and prompt you if a column exists in the database but not in `schema.js`. Always read the interactive prompt carefully to avoid accidentally dropping live columns.

---

### 4. Invoice Worker Configuration

Hearth features a decoupled background worker for invoice rendering:

- **If AWS SQS is configured** (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SQS_INVOICE_QUEUE_URL` set in `.env`):
  Start the background polling worker in a dedicated terminal:
  ```bash
  npm run worker:invoice
  ```
- **If AWS SQS is NOT configured** (local development mode):
  You do not need to run the worker. The payment service automatically detects the absence of SQS credentials and gracefully falls back to generating the invoice directly in an asynchronous background promise.

---

### 5. Frontend Installation & Configuration

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd homecare-frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Create the frontend environment file:
   ```bash
   cp .env.example .env
   ```

4. Verify `homecare-frontend/.env`:
   ```ini
   # Match this with the PORT where your backend server is running (default: 5000)
   VITE_API_URL=http://localhost:5000
   ```

5. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   The client application will be available at `http://localhost:5173`.

---

### 6. Initial Bootstrap Walkthrough

To test the entire marketplace loop:

1. **Start the API Server**: In the repo root, run:
   ```bash
   npm run dev
   ```
2. **Register the Platform Admin**:
   Admin registration requires the `x-setup-secret` header matching `ADMIN_SETUP_SECRET` from your `.env`:
   ```bash
   curl -X POST http://localhost:5000/app/v1/admin/register \
     -H "Content-Type: application/json" \
     -H "x-setup-secret: your_super_secure_admin_secret" \
     -d "{\"username\": \"SuperAdmin\", \"email\": \"admin@hearth.local\", \"password\": \"Admin@12345\"}"
   ```
3. **Log in as Admin** via the UI (`http://localhost:5173/login`) and create global categories (e.g., *Plumbing*, *Home Cleaning*).
4. **Register as a Seller** (`http://localhost:5173/register`), select services to offer, and specify your custom pricing.
5. **Register as a Customer**, search for services using text or AI discovery, add them to your cart, schedule a booking date, and complete checkout!

---

## 🔐 Environment Variables Reference

### Backend Configuration (`.env`)

| Variable | Required? | Example / Default | Description & Where to Find |
|---|:---:|---|---|
| `PORT` | Optional | `5000` | Port for the Express server to bind to. |
| `NODE_ENV` | Optional | `development` | Environment mode (`development` or `production`). |
| `DATABASE_URL` | **Required** | `postgresql://user:pass@host:5432/dbname?sslmode=require` | PostgreSQL connection string from Neon, Supabase, or local Postgres. |
| `DIRECT_DATABASE_URL`| Optional | `postgresql://user:pass@host:5432/dbname` | Direct (session-mode) connection string required when running migrations on pooled providers like Supabase. |
| `CLIENT_URL` | **Required** | `http://localhost:5173` | Frontend URL; used for CORS validation and Google OAuth redirect destinations. |
| `UPSTASH_REDIS_REST_URL` | **Required** | `https://prompt-box-123.upstash.io` | Upstash Redis REST endpoint from [console.upstash.com](https://console.upstash.com). |
| `UPSTASH_REDIS_REST_TOKEN` | **Required** | `AXz...` | Upstash Redis REST bearer token. |
| `JWT_ACCESS_SECRET` | **Required** | `openssl rand -hex 32` | Secret key used to sign short-lived JSON Web Tokens. |
| `JWT_REFRESH_SECRET` | **Required** | `openssl rand -hex 32` | Secret key used to sign long-lived refresh tokens. |
| `JWT_ACCESS_EXPIRES_IN` | Optional | `15m` | Lifetime of access tokens. |
| `JWT_REFRESH_EXPIRES_IN` | Optional | `7d` | Lifetime of refresh tokens. |
| `ADMIN_SETUP_SECRET` | **Required** | `your_secret_passphrase` | Secret key passed as `x-setup-secret` header to authorize creating Admin accounts. |
| `RAZORPAY_KEY_ID` | **Required** | `rzp_test_...` | Razorpay Key ID from [dashboard.razorpay.com](https://dashboard.razorpay.com) -> Settings -> API Keys. |
| `RAZORPAY_KEY_SECRET` | **Required** | `your_razorpay_secret` | Razorpay Key Secret. |
| `RAZORPAY_WEBHOOK_SECRET`| Optional | `your_webhook_secret` | Secret configured in Razorpay Webhooks dashboard. |
| `GROQ_API_KEY` | **Required** | `gsk_...` | API Key from [console.groq.com/keys](https://console.groq.com/keys) powering AI search. |
| `EMAIL_USER` | Optional | `notifications@hearth.local` | SMTP email address for sending password-reset emails via Nodemailer. |
| `EMAIL_PASSWORD` | Optional | `app_specific_password` | SMTP password or Google App Password. |
| `GOOGLE_CLIENT_ID` | Optional | `...apps.googleusercontent.com` | Google Cloud Console OAuth 2.0 Client ID for social login. |
| `GOOGLE_CLIENT_SECRET` | Optional | `GOCSPX-...` | Google Cloud Console OAuth 2.0 Client Secret. |
| `AWS_REGION` | Optional | `ap-south-1` | AWS region where the SQS invoice queue is provisioned. |
| `AWS_ACCESS_KEY_ID` | Optional | `AKIA...` | IAM user access key with `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage`. |
| `AWS_SECRET_ACCESS_KEY` | Optional | `secret...` | IAM user secret access key. |
| `SQS_INVOICE_QUEUE_URL` | Optional | `https://sqs.ap-south-1.amazonaws.com/.../invoices` | Target Amazon SQS Queue URL for invoice generation jobs. |

### Frontend Configuration (`homecare-frontend/.env`)

| Variable | Required? | Example / Default | Description |
|---|:---:|---|---|
| `VITE_API_URL` | **Required** | `http://localhost:5000` | Target URL of the backend Express API server. |

---

## 🌐 Third-Party Services Onboarding Guide

### 1. Upstash Redis
1. Visit [console.upstash.com](https://console.upstash.com) and create a free serverless Redis database.
2. Under the **Details** page, select the **REST API** tab.
3. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into your `.env`.

### 2. Groq AI Platform
1. Visit [console.groq.com](https://console.groq.com) and sign up for a free developer account.
2. Navigate to **API Keys** and generate a new secret key.
3. Paste it into `GROQ_API_KEY` in `.env`.

### 3. Razorpay Payments & Webhooks
1. Sign up at [dashboard.razorpay.com](https://dashboard.razorpay.com) and activate **Test Mode**.
2. Go to **Settings** $\rightarrow$ **API Keys** and generate your Test Key ID and Secret.
3. *(Optional Webhook)*: Go to **Settings** $\rightarrow$ **Webhooks** $\rightarrow$ **Add New Webhook**:
   - **Webhook URL**: `https://<your-public-domain>/api/v1/payments/webhook` (use [ngrok](https://ngrok.com) for local testing).
   - **Secret**: Generate a random 32-character hex string and assign it to `RAZORPAY_WEBHOOK_SECRET`.
   - **Active Events**: Check `payment.captured` and `payment.failed`.

### 4. Amazon Web Services (AWS) SQS
1. In the AWS Console, navigate to **Simple Queue Service (SQS)** and click **Create queue**.
2. Choose **Standard Queue**, name it `homecare-invoices`, and set **Default Visibility Timeout** to `60 seconds`.
3. In **IAM**, create a service user with programmatic access and attach an inline policy granting:
   `sqs:SendMessage`, `sqs:ReceiveMessage`, and `sqs:DeleteMessage` on the queue ARN.
4. Copy your credentials and queue URL into `.env`.

### 5. Google OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Application Type: Web Application).
3. Under **Authorized Redirect URIs**, register:
   - `http://localhost:5000/app/v1/customer/auth/google/callback`
   - `http://localhost:5000/app/v1/seller/auth/google/callback`
4. Copy the Client ID and Client Secret into `.env`.

---

## 📡 Comprehensive API Reference

> [!NOTE]
> **API Mounting Scheme**: Authentication, account management, and customer cart routes are mounted under `/app/v1/*`. Domain services (catalog, orders, payments, ratings, AI search) are mounted under `/api/v1/*`.

All successful API responses return a structured envelope:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```
Validation errors and exceptions return:
```json
{
  "success": false,
  "message": "Validation Error / Error Description",
  "errors": [ "Error detail line 1", "Error detail line 2" ]
}
```

---

### 1. Auth & Account Management

#### Admin Auth (`/app/v1/admin`)
| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `POST` | `/app/v1/admin/register` | Header `x-setup-secret` | Register an admin user (Requires `ADMIN_SETUP_SECRET`). |
| `POST` | `/app/v1/admin/login` | None | Authenticate admin with email/password; returns JWTs. |
| `POST` | `/app/v1/admin/logout` | Admin | Revoke the active refresh token. |
| `POST` | `/app/v1/admin/refresh-token` | None | Exchange a valid `refreshToken` for a new `accessToken`. |
| `POST` | `/app/v1/admin/forgot-password`| None | Send a password reset email link with reset token. |
| `POST` | `/app/v1/admin/reset-password` | None | Set a new password using a reset token. |

#### Customer Auth (`/app/v1/customer`)
| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `POST` | `/app/v1/customer/register` | None | Create a new customer profile. |
| `POST` | `/app/v1/customer/login` | None | Authenticate customer; returns access and refresh tokens. |
| `POST` | `/app/v1/customer/logout` | Customer | Log out customer and invalidate session. |
| `POST` | `/app/v1/customer/refresh-token` | None | Issue a new access token using a refresh token. |
| `GET` | `/app/v1/customer/auth/google` | None | Initiate Google OAuth 2.0 sign-in flow. |
| `GET` | `/app/v1/customer/notifications` | Customer | Retrieve customer notifications. |
| `GET` | `/app/v1/customer/notifications/unread-count`| Customer | Fetch unread count badge directly from Redis. |
| `PATCH`| `/app/v1/customer/notifications/read-all` | Customer | Mark all customer notifications as read. |
| `PATCH`| `/app/v1/customer/notifications/:id/read` | Customer | Mark an individual notification as read. |

#### Seller Auth (`/app/v1/seller`)
| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `POST` | `/app/v1/seller/register` | None | Create a new seller profile. |
| `POST` | `/app/v1/seller/login` | None | Authenticate seller; returns access and refresh tokens. |
| `POST` | `/app/v1/seller/logout` | Seller | Log out seller and invalidate session. |
| `POST` | `/app/v1/seller/refresh-token` | None | Issue a new access token using a refresh token. |
| `GET` | `/app/v1/seller/bookings` | Seller | Fetch all booking lines assigned to this seller. |
| `PATCH`| `/app/v1/seller/bookings/:id/status` | Seller | Update an item's status (`accepted`, `completed`, `cancelled`). |
| `GET` | `/app/v1/seller/notifications` | Seller | Retrieve seller notifications. |
| `GET` | `/app/v1/seller/notifications/unread-count` | Seller | Fetch unread count badge from Redis. |
| `PATCH`| `/app/v1/seller/notifications/read-all` | Seller | Mark all seller notifications as read. |
| `PATCH`| `/app/v1/seller/notifications/:id/read` | Seller | Mark an individual notification as read. |

#### Universal Password Reset
| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `POST` | `/app/v1/auth/reset-password` | None | Universal endpoint that verifies reset tokens across Customers, Sellers, and Admins. |

---

### 2. Live Cart Management (`/app/v1/cart`)
*All cart endpoints require Customer authentication (`verifyCustomer`). Backed purely by Upstash Redis.*

| Method | Endpoint | Request Body | Description |
|---|---|---|---|
| `POST` | `/app/v1/cart` | `{ "serviceId": 1, "sellerId": 2, "quantity": 1 }` | Add item or increment quantity in the Redis cart. |
| `GET` | `/app/v1/cart` | None | Retrieve cart items enriched with live catalog pricing. |
| `GET` | `/app/v1/cart/count` | None | Super-fast `HLEN` badge count query for the navbar. |
| `PATCH`| `/app/v1/cart/increment` | `{ "serviceId": 1, "sellerId": 2, "delta": 1 }` | Fast +/- stepper updating quantity in Redis. |
| `DELETE`| `/app/v1/cart/:serviceId/:sellerId` | None | Delete an individual item entry from the Redis cart. |

---

### 3. Catalog & Services (`/api/v1/services`)

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/services` | Public | Fetch all master catalog services. |
| `POST` | `/api/v1/services` | Admin or Seller | Create a new master catalog service (`serviceName`, `basePrice`, `description`). |
| `DELETE`| `/api/v1/services/:id` | Admin | Delete a master catalog service. |

---

### 4. Seller Offerings & Listings (`/api/v1/seller-services`)

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/seller-services` | Public | Retrieve all seller offerings with provider details. |
| `GET` | `/api/v1/seller-services/service/:serviceId`| Public | Fetch all sellers offering a specific service. |
| `GET` | `/api/v1/seller-services/seller/:sellerId` | Public | Fetch all services offered by a specific seller. |
| `POST` | `/api/v1/seller-services` | Seller | Offer a service with custom price and description. |
| `PATCH`| `/api/v1/seller-services/:serviceId` | Seller | Update custom pricing or description for an offering. |
| `DELETE`| `/api/v1/seller-services/:serviceId` | Seller | Remove a service from the seller's profile. |

---

### 5. Orders & Bookings (`/api/v1/orders`)
*All order endpoints require Customer authentication.*

| Method | Endpoint | Request Body | Description |
|---|---|---|---|
| `POST` | `/api/v1/orders` | `{ "bookingDate": "2026-03-30", "timeSlot": "10:00 AM - 12:00 PM" }` | Checkout items from Redis cart and create database order. |
| `GET` | `/api/v1/orders` | None | List customer's booking history. |
| `GET` | `/api/v1/orders/:id` | None | Get comprehensive order details, status rollups, and items. |
| `PATCH`| `/api/v1/orders/:id/cancel` | None | Cancel an entire order (allowed before jobs are accepted). |
| `PATCH`| `/api/v1/orders/:id/items/:itemId/cancel` | None | Cancel a specific order line in a combined multi-seller order. |
| `GET` | `/api/v1/orders/:id/invoice` | None | Stream or download the generated PDF invoice. |

---

### 6. Payments & Webhooks (`/api/v1/payments`)

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `POST` | `/api/v1/payments/orders/:orderId/create` | Customer | Create a Razorpay order ID for payment initialization. |
| `POST` | `/api/v1/payments/verify` | Customer | Cryptographically verify Razorpay signature and enqueue invoice generation. |
| `POST` | `/api/v1/payments/webhook` | Webhook Signature | Razorpay webhook listener verifying `x-razorpay-signature`. |

---

### 7. Reviews & Ratings (`/api/v1/ratings`)

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `GET` | `/api/v1/ratings/seller/:sellerId` | Public | Fetch all reviews and aggregate score for a seller. |
| `POST` | `/api/v1/ratings` | Customer | Submit a rating score (1-5) and review comment for a completed booking. |

---

### 8. AI Natural-Language Search (`/api/v1/ai-search`)

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `POST` | `/api/v1/ai-search` | Customer | Natural-language search query. Rate limited to 20 queries/hr per customer via Redis. |

**Request Payload:**
```json
{
  "query": "Need an affordable deep cleaning for a 2 bedroom apartment this weekend"
}
```

**Response Format:**
```json
{
  "success": true,
  "message": "AI search completed successfully",
  "data": [
    {
      "sellerServiceId": 14,
      "serviceName": "Deep House Cleaning",
      "sellerName": "CleanPros Co.",
      "price": "1499.00",
      "rating": 4.8,
      "reason": "Best match for 2-bedroom budget constraints with a 4.8 rating over 50+ reviews."
    }
  ]
}
```

---

## 🧪 Testing Core Workflows with cURL

Here is an end-to-end command-line testing script you can run directly in your terminal:

```bash
# 1. Register an Admin (using setup secret)
curl -s -X POST http://localhost:5000/app/v1/admin/register \
  -H "Content-Type: application/json" \
  -H "x-setup-secret: your_super_secure_admin_secret" \
  -d '{"username":"OpsAdmin","email":"admin@hearth.local","password":"Password@123"}'

# 2. Register a Customer
curl -s -X POST http://localhost:5000/app/v1/customer/register \
  -H "Content-Type: application/json" \
  -d '{"username":"JaneDoe","email":"jane@example.com","password":"Password@123","phNo":"9876543210"}'

# 3. Log In as Customer
LOGIN_RES=$(curl -s -X POST http://localhost:5000/app/v1/customer/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"Password@123"}')

TOKEN=$(echo $LOGIN_RES | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
echo "Customer Token: $TOKEN"

# 4. Add Service #1 from Seller #1 to Redis Cart
curl -s -X POST http://localhost:5000/app/v1/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"serviceId": 1, "sellerId": 1, "quantity": 1}'

# 5. Check Cart Contents
curl -s -X GET http://localhost:5000/app/v1/cart \
  -H "Authorization: Bearer $TOKEN"

# 6. Execute AI Natural Language Search
curl -s -X POST http://localhost:5000/api/v1/ai-search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "Looking for high-rated home deep cleaning services"}'
```

---

## 📜 Available NPM Scripts

### Root Directory (`HomeCare/`)
| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `nodemon server.js` | Starts the Express API server with hot reload. |
| `npm start` | `node server.js` | Starts the Express API server in production mode. |
| `npm run worker:invoice` | `node src/workers/invoice-worker.js` | Starts the standalone AWS SQS invoice generation worker. |
| `npm run db:generate` | `drizzle-kit generate` | Generates a new SQL migration file by comparing schema code. |
| `npm run db:migrate` | `drizzle-kit migrate` | Applies any unapplied SQL migration files to the database. |
| `npx drizzle-kit push`| `drizzle-kit push` | Directly synchronizes the database with `schema.js`. |

### Frontend Directory (`homecare-frontend/`)
| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `vite` | Starts the Vite development server on port 5173. |
| `npm run build` | `vite build` | Compiles an optimized production bundle into `dist/`. |
| `npm run preview` | `vite preview` | Previews the compiled production build locally. |
| `npm run lint` | `oxlint` | Runs fast lint checks across frontend files. |

---

## ❓ Troubleshooting & Common Pitfalls

### 1. `CORS: origin http://localhost:5173 not allowed`
- **Cause**: The frontend URL does not match `CLIENT_URL` in `.env`.
- **Solution**: Set `CLIENT_URL=http://localhost:5173` in `.env` and restart the backend server.

### 2. Frontend 404s or Network Errors when fetching APIs
- **Cause**: Port mismatch between frontend and backend.
- **Solution**: Check `server.js` (defaults to `5000`). Make sure `homecare-frontend/.env` has `VITE_API_URL=http://localhost:5000` rather than `8000`.

### 3. `Admin registration is restricted` (403 Forbidden)
- **Cause**: Missing or incorrect `x-setup-secret` header.
- **Solution**: Ensure your request includes `-H "x-setup-secret: <ADMIN_SETUP_SECRET>"` matching your `.env` value.

### 4. `Order total ₹0.50 is below the minimum payable amount of ₹1.00`
- **Cause**: Razorpay enforces a strict minimum transaction limit of 100 paise (₹1.00 INR).
- **Solution**: Set your service `basePrice` and `customPrice` to at least ₹1.00.

### 5. Invoices show "Still Generating"
- **Cause**: The payment was completed, but either:
  1. AWS SQS credentials are provided, but the background worker (`npm run worker:invoice`) is not running.
  2. SQS credentials are not provided, and the direct fallback encountered an error.
- **Solution**: If using SQS, ensure `npm run worker:invoice` is running in a separate terminal. Check worker logs for parsing or permission issues.

### 6. Drizzle Kit Migrate silent no-op or failure on Supabase / Neon
- **Cause**: Transaction poolers (e.g. Supabase port 6543) do not maintain stable session state required for DDL locks.
- **Solution**: Provide a direct connection URL (port 5432) under `DIRECT_DATABASE_URL` in `.env`.

---

## 🗺️ Current Implementation Status & Roadmap

- [x] **Core Multi-Vendor Booking Engine**: Complete, fully functional with multi-seller rollup logic.
- [x] **Redis Live Shopping Cart**: Complete, using high-performance atomic hash operations.
- [x] **Razorpay Payment Integration**: Complete with HMAC constant-time validation and fallback webhooks.
- [x] **Decoupled Invoice System**: Complete with SQS worker and fallback direct generation.
- [x] **Safe AI Service Discovery**: Complete with LangChain forced schema output and database reconciliation.
- [x] **Universal Password Reset**: Complete across all three user roles.
- [ ] **Seller Listing Admin Moderation UI**: The database columns (`verificationStatus`, `rejectionReason`) are ready, and AI search filters by `approved` status. Dedicated admin UI endpoints for approving/rejecting listings are scheduled for the next release.
- [ ] **Database Cart Clean-up**: Drop the legacy `Cart_Items` table in an upcoming migration since Redis now handles all cart operations.
- [ ] **Email Notification Dispatch**: Integrate Nodemailer with order status changes.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
