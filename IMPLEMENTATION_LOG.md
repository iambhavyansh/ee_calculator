# EE Calculator — Implementation Log & Handover Guide

This document records the exact architectural decisions, technical agreements, step-by-step progress, and verification procedures for Phase 1 (Nyquist Plot, backend only). Any future agent or developer can reference this document to understand the codebase structure, how decisions were reached, and how to verify or extend the system.

---

## 1. Project Context & Scope

- **Project:** EE Calculator (Modular monolith backend for electrical engineering calculations).
- **Phase 1 Scope:** 
  - Deliver **Nyquist Plot** (`control.nyquist`) end-to-end.
  - Implement minimum shared foundations: FastAPI skeleton, directory layout, calculator registry, discovery endpoint, response envelope, custom error handling, and shared control engine.
  - Computation is synchronous, executed out-of-process via terminable worker pool (`pebble.ProcessPool`).
  - No frontend work in this phase.
  - Python runtime: **Python 3.12 exclusively** (do not use Python 3.14).

---

## 2. Agreed Architectural & Mathematical Decisions

| Question / Area | Decision / Rule | Rationale / Contract Reference |
|---|---|---|
| **Python Runtime** | Python 3.12 via `uv venv --python 3.12` | Python 3.12 is baseline; 3.14 compatibility deferred until dependencies are validated. |
| **Execution Model** | Out-of-process via `pebble.ProcessPool`, `spawn` context | Architecture §5.2: Computation never runs in web event loop; terminable worker ensures timeout enforcement. |
| **Sync Timeout** | 30 seconds default | Contract §5.7: Terminates worker process on expiry, returns HTTP 504 `CALCULATION_TIMEOUT`. |
| **Response Envelope** | Fixed 6 keys: `status`, `calculator`, `results`, `plots`, `tables`, `warnings` | Contract §3: All 6 fields always present; `tables` and `warnings` are empty arrays if not applicable. |
| **Error Envelope** | Top-level `error: {code, message, fields?}` | Contract §4: Custom handlers strip `body` prefix, keep integer row indices, map Pydantic errors cleanly. |
| **Plot Schema (Q1, Q2)** | `positive_branch` & `negative_branch` as separate objects with `omega`, `real`, `imag` | User approval: Separate branches returned directly for clear frontend rendering. |
| **Frequency Range (Q3)** | Auto-selected by `python-control`, overridable by user (`omega_start`, `omega_end`, `num_points`) | Sensible default without arbitrary clipping; customizable by client. |
| **Poles on jω Axis (Q4)** | Handled by `python-control` indentation; `inf`/`nan` converted to `null`; warning issued | Math convention: Indentation around origin/axis; non-finite numbers sanitized to `null` per Contract §3.5. |
| **Discrete Systems (Q5)** | Supported continuous-time ($s$-domain) and discrete-time ($z$-domain) via `dt` parameter | Unified SISO control engine. |
| **Results & Stability (Q6)** | Return `poles`, `zeros`, `num_open_loop_rhp_poles`, `num_encirclements`, `is_stable`, `gain_margin_db`, `phase_margin_deg`, and frequencies | Comprehensive analytical results for educational value. |
| **System Input Forms (Q7)** | Discriminated union on `type: "tf"` or `type: "ss"` | Clean schema validation for transfer function polynomials or state-space matrices. |

---

## 3. Architecture & File Layout

```text
ee_calc/
├── IMPLEMENTATION_LOG.md                      # This handover & audit log
├── README.md                                  # Setup, run, and test documentation
├── requirements.txt                           # Pinned dependencies
├── .env.example                               # Environment variable template
├── contracts/
│   └── fixtures/
│       └── nyquist_contract_fixture.json      # Committed contract fixture for frontend validation
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                            # FastAPI app, lifespan, middleware, exception handlers
│   │   ├── config.py                          # Application settings (Pydantic BaseSettings)
│   │   ├── logging_config.py                  # Standard human-readable logging
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py                  # API v1 router mounting calculators and discovery
│   │   │       └── discovery.py               # GET /api/v1/calculators endpoint
│   │   ├── registry/
│   │   │   ├── __init__.py
│   │   │   └── calculator_registry.py         # Registry storing calculator metadata and routers
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── errors.py                      # Error codes and custom FastAPI exception handlers
│   │   │   ├── schemas.py                     # Response envelope, warning, and complex number models
│   │   │   ├── control_engine.py              # Shared control logic (TF, SS, poles, zeros)
│   │   │   └── execution/
│   │   │       ├── __init__.py
│   │   │       ├── pools.py                   # Pebble ProcessPool manager with spawn context
│   │   │       └── worker.py                  # Picklable worker entry point
│   │   └── calculators/
│   │       ├── __init__.py
│   │       └── control/
│   │           ├── __init__.py
│   │           └── nyquist/
│   │               ├── __init__.py
│   │               ├── metadata.py            # Metadata definition (ID: control.nyquist, sync)
│   │               ├── schemas.py             # Request, PlotData, and Result schemas
│   │               ├── logic.py               # Pure mathematical computation (runs in worker)
│   │               └── router.py              # POST /api/v1/control/nyquist
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py                        # Test client and fixtures
│       ├── unit/
│       │   ├── test_control_engine.py         # Unit tests for control engine
│       │   └── test_nyquist_logic.py          # Unit tests for Nyquist mathematics
│       ├── reference/
│       │   └── test_nyquist_reference.py      # Textbook reference checks
│       ├── api/
│       │   ├── test_nyquist_api.py            # API endpoint integration tests
│       │   ├── test_discovery_api.py          # Discovery endpoint tests
│       │   └── test_error_handling.py         # 422, 404, 500 error format tests
│       └── contracts/
│           └── test_nyquist_contract.py       # Envelope and fixture compliance tests
```

---

## 4. Implementation Steps & Execution Checklist

### Step 1: Environment & Dependency Setup
- [x] Initialize Python 3.12 virtual environment: `uv venv --python 3.12`
- [x] Create `requirements.txt` with pinned dependencies:
  - `fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `pebble`, `numpy`, `scipy`, `control`, `pytest`, `httpx`
- [x] Install dependencies in `.venv` using `uv pip install -r requirements.txt`
- [x] Create `.env.example`

### Step 2: Core Foundation & Shared Plumbing
- [x] `backend/app/config.py`: Settings model (CORS origins, pool size, timeouts).
- [x] `backend/app/logging_config.py`: Standard logging.
- [x] `backend/app/core/schemas.py`: Common models (`ResponseEnvelope`, `WarningItem`, `ComplexNumber`, `PlotWrapper`).
- [x] `backend/app/core/errors.py`: Contract error codes, custom exceptions, and FastAPI exception handlers for `RequestValidationError`, `HTTPException`, and generic 500.
- [x] `backend/app/core/execution/pools.py` & `worker.py`: Terminable `pebble.ProcessPool` setup using `spawn` context.

### Step 3: Calculator Registry & Discovery
- [x] `backend/app/registry/calculator_registry.py`: Registry mechanism enforcing metadata validation at startup.
- [x] `backend/app/api/v1/discovery.py`: Implementation of `GET /api/v1/calculators`.

### Step 4: Shared Control Systems Engine
- [x] `backend/app/core/control_engine.py`:
  - Input parsing for Transfer Function (`tf`) and State Space (`ss`).
  - Conversion of state-space to SISO transfer function.
  - Continuous-time ($s$-domain) and discrete-time ($z$-domain) handling.
  - Pole and zero extraction, stability analysis (RHP pole counts).

### Step 5: Nyquist Calculator Feature Module
- [x] `backend/app/calculators/control/nyquist/metadata.py`: ID `control.nyquist`, category `control`, execution `sync`.
- [x] `backend/app/calculators/control/nyquist/schemas.py`: Request model with discriminated system union, PlotData model with positive and negative branches, Results model with encirclement/margins.
- [x] `backend/app/calculators/control/nyquist/logic.py`: Frequency grid calculation, frequency response evaluation, encirclement counting, margin calculation, imaginary-axis pole detection and warning generation.
- [x] `backend/app/calculators/control/nyquist/router.py`: Worker dispatch, execution timeout handling, and envelope packaging.

### Step 6: FastAPI Application Assembly
- [x] `backend/app/api/v1/router.py`: Aggregates discovery router and registry-registered calculator routers.
- [x] `backend/app/main.py`: Creates FastAPI app, registers exception handlers, manages lifespan (process pool startup/shutdown), and mounts CORS and `/api/v1` routes.

### Step 7: Comprehensive Test Suite
- [x] `backend/tests/conftest.py`: TestClient fixture, pool management.
- [x] `backend/tests/unit/test_control_engine.py`: Unit tests for input parsing, TF/SS conversion.
- [x] `backend/tests/unit/test_nyquist_logic.py`: Unit tests for Nyquist math and NaN/Inf sanitization.
- [x] `backend/tests/reference/test_nyquist_reference.py`: Textbook examples (1st order lag, 3rd order system with known critical gain, integrator at origin, discrete system).
- [x] `backend/tests/api/test_discovery_api.py`: Discovery schema and endpoint check.
- [x] `backend/tests/api/test_nyquist_api.py`: Valid TF and SS requests.
- [x] `backend/tests/api/test_error_handling.py`: Custom error formatting, field path sanitation (no `body` prefix), 404, limit exceeded.
- [x] `backend/tests/contracts/test_nyquist_contract.py`: Envelope check and generation/validation of `contracts/fixtures/nyquist_contract_fixture.json`.

### Step 8: Verification & Documentation
- [x] Run test suite with pytest (20/20 tests passing).
- [x] Verify endpoint using direct HTTP curl request.
- [x] Create `README.md` with full setup, run, and test instructions.

---

## 5. How to Run & Verify

```bash
# 1. Activate Python 3.12 virtual environment
source .venv/bin/activate

# 2. Run all tests
pytest backend/tests -v

# 3. Start development server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# 4. Query Discovery Endpoint
curl -X GET http://127.0.0.1:8000/api/v1/calculators

# 5. Query Nyquist Endpoint
curl -X POST http://127.0.0.1:8000/api/v1/control/nyquist \
  -H "Content-Type: application/json" \
  -d '{
    "system": {
      "type": "tf",
      "numerator": [1],
      "denominator": [1, 2, 1]
    }
  }'
```

---

## 6. Phase 1 Frontend — Architecture & Styling Specifications

### Agreed Decisions
- **Stack:** React + Vite + TypeScript, React Router 6, Axios, Plotly.js (`plotly.js-basic-dist-min`), KaTeX for math rendering.
- **Styling & Theme:**
  - Minimal shadcn/ui-inspired component architecture with Tailwind CSS.
  - Base palette: Strictly neutral (black, grey, white). Light and dark themes via CSS variables.
  - Top-left: Dedicated **Home** button navigation.
  - Top-right: Unified **Theme & Accent selector popup menu** providing Light/Dark/System modes and 6 curated accent colors (Blue, Violet, Emerald, Rose, Amber, Cyan).
  - Accent color applies dynamically to buttons, active navigation, focus rings, selected tabs, and the primary plot line.
  - Calculator cards on the home page smoothly scale up slightly (`scale-[1.02]`) with an accent border highlight on hover.
  - No flash of unstyled theme on initial load (persisted in `localStorage` and set on `document.documentElement` before render).
- **Nyquist Page Layout:**
  - Desktop 2-column layout:
    - Left Column: System input card (TF coefficient list or SS matrix stepper grid with $n=1..6$), Continuous/Discrete ($dt$) toggle, KaTeX live mathematical preview, and Advanced frequency options.
### Frontend Implementation Checklist
- [x] Initialized React + Vite + TypeScript application in `frontend/`.
- [x] Configured Tailwind CSS with neutral tokens and dynamic CSS variables for 6 accent colors.
- [x] Built ThemeContext with Light/Dark/System theme switching and 6 curated accent color presets.
- [x] Implemented pre-paint theme initializer script in `index.html` preventing theme flash.
- [x] Built top bar `Header` with dedicated top-left **Home** button and top-right **Theme & Accent selector popup menu**.
- [x] Built `CatalogPage` and `CalculatorCard` with smooth hover scale (`scale-[1.02]`) and accent border highlight.
- [x] Built `SystemInputForm` supporting continuous and discrete ($dt$) models, TF coefficient rows with add/remove, and SS matrix grid with dimension stepper ($n=1..6$).
- [x] Built `MathView` with KaTeX live mathematical preview for $G(s)$ and $G(z)$.
- [x] Built `AdvancedOptions` with frequency range overrides ($\text{rad/s}$ vs. $\text{Hz}$), density point limits, and calculate/reset actions.
- [x] Built `NyquistPlot` with Plotly.js supporting interactive pan/zoom/reset, equal aspect ratio, solid positive branch, dashed mirror branch, and red critical point marker $(-1 + 0j)$.
- [x] Built `NyquistResultsTable` displaying stability verdict, Nyquist count equation ($Z = P + N$), gain/phase margins, and open-loop poles/zeros.
- [x] Verified full production build (`npm run build` passing with zero errors).
- [x] Verified frontend Vitest suite (7/7 tests passing).
- [x] Verified end-to-end against live running backend.

