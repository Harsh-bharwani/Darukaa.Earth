# Darukaa.Earth — Nature Intelligence Dashboard

A high-performance, full-stack geospatial climate-tech dashboard designed to trace, track, and analyze carbon sequestration metrics and biodiversity indicators for localized nature conservation zones. Built leveraging a decoupled microservices-inspired layout with a Python FastAPI backend, a PostGIS-extended PostgreSQL database layer, and an interactive React frontend canvas.

---

## 🏗️ Core Architectural Stack Design

### 1. Database Tier (PostgreSQL + PostGIS)

- **Spatial Computations:** Implemented native **PostGIS spatial extensions** (`SRID 4326`) to parse raw vector features into true structural database geometry.
- **Geospatial Indexing:** Enabled high-velocity geospatial bounding box lookups utilizing structural **GiST Indexes** (`GIST (boundary)`), optimizing map viewport rendering routines.
- **Data Integrity:** Configured strict foreign key cascading structures (`ON DELETE CASCADE`) mapping parent project profiles directly to time-series carbon data segments.

### 2. Backend API Tier (FastAPI + psycopg2)

- **Parametrized SQL Processing:** Utilized native database cursors mapping query data parameters via standard `%s` positional wildcards, completely eliminating the vulnerability surface for SQL injection attacks.
- **Stateless Authentication Layer:** Designed a stateless session handling network context using **JSON Web Tokens (JWT)** and direct, pre-compiled native **`bcrypt` runtime bindings**, eliminating dependency bloat.
- **Automated Payload Validation:** Embedded **Pydantic schemas** (`BaseModel`) at the routing entry boundaries to strictly filter incoming customer input profiles before hitting the operational database level.

### 3. Frontend Interface Tier (React + Vite + Mapbox GL JS)

- **Vite Toolchain Scaffold:** Scaffolding utilizing Vite rather than legacy templates to tap into native ES Modules, drastically lowering asset-compilation and module reload latency.
- **Geospatial Canvas:** Integrated **Mapbox GL JS** coupled with **Mapbox Draw controls**, capturing vector inputs drawn on screen and formatting them into compliant closed GeoJSON feature arrays.
- **Dynamic Layer Interceptors:** Connected a global **Axios interceptor module** that automatically pulls active tokens from browser local storage and injects them into authorization headers, keeping the view layer stateless.
- **Time-Series Visualization:** Paired **Chart.js** hooks to live database channels, rendering smooth, responsive line animations that capture chronological environmental trends instantly.

---

## ⚙️ Local Development Setup Installation

Ensure you have **Python 3.11+**, **Node.js 20+**, and a running instance of **PostgreSQL 16** with the **PostGIS extension package bundle** active on your workstation before launching configurations.

### 1. Database Migration Setup

Log into your native PostgreSQL command-line tool (`psql`) or graphical environment, create the space container, and feed the foundational data structure schema instructions:

```sql
CREATE DATABASE darukaa_earth;
\c darukaa_earth
-- Execute the migrations using your schema file configuration:
\i schema.sql
```

### 2. Backend Application Setup

Navigate directly into the backend workspace directory, initialize your local virtual execution context, and pull down dependencies:

```bash
cd backend
python -m venv venv

# Activate the localized runtime environment:
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Mac/Linux:
source venv/bin/activate

# Install the application components:
pip install -r requirements.txt
```

Create a hidden operational environment configuration file named **`.env`** inside the `backend/` folder directory path and configure your connection strings:

```text
DATABASE_URL=postgresql://postgres:YOUR_MASTER_PASSWORD@localhost:5432/darukaa_earth
JWT_SECRET=your_custom_cryptographic_signature_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Fire up the live local hot-reload web server:

```bash
uvicorn app.main:app --reload
```

_The interactive API dashboard documents will mount automatically at: `http://127.0.0.1:8000/docs`_

### 3. Frontend Dashboard Interface Setup

Open a separate, parallel terminal window tab at the project root directory, navigate into your frontend workspace layout, and pull down structural assets:

```bash
cd frontend
npm install

# Start the Vite local browser asset development pipeline server:
npm run dev
```

_Open your web browser tool and load the local workspace portal at: `http://localhost:5173/`_

---

## 🛡️ DevOps Quality Gateways & CI/CD Pipelines

### Pre-Commit Code Quality Controls (Local)

Implemented localized development automation via **Husky** paired with **lint-staged**. Every time a code developer attempts to execute a `git commit` instruction, the hooks automatically intercept the file modifications and trigger structural format sanitization commands using **Prettier** and syntax verification sweeps across active folders, keeping style conflicts from hitting version control history branches.

### Automated Cloud Verification (GitHub Actions CI/CD)

Designed a production-ready CI/CD configuration pipeline script mounted at `.github/workflows/ci.yml`. On every branch push or merge pull request action targeted at main development tracks, GitHub's virtual cloud container runners automatically:

1. Initialize pristine Node and Python workspace contexts.
2. Verify cross-platform frontend code structures using **ESLint** rules.
3. Validate compilation syntax soundness across full package trees by triggering immediate static checks via `python -m compileall app/`.
