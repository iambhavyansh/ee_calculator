# EE Calculator — Phase 1 (Nyquist Plot)

EE Calculator is a modular electrical engineering calculation platform. Phase 1 provides the core backend foundation and the **Nyquist Plot** (`control.nyquist`) calculator.

---

## 1. Prerequisites

- **Python 3.12** is required (do not use Python 3.14).
- `uv` is recommended for managing the Python environment and dependencies.

---

## 2. Setup

1. **Clone and navigate to repository root:**
   ```bash
   cd ee_calc
   ```

2. **Create Python 3.12 virtual environment:**
   ```bash
   uv venv --python 3.12 .venv
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   uv pip install -r requirements.txt
   ```

4. **Environment variables:**
   Copy `.env.example` to `.env` (optional, defaults are built in):
   ```bash
   cp .env.example .env
   ```

---

## 3. Running the Server

Start the FastAPI application using Uvicorn:

```bash
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 4. API Usage Examples

### Calculator Discovery
Inspect all registered and available calculators:

```bash
curl -X GET http://127.0.0.1:8000/api/v1/calculators
```

**Response:**
```json
{
  "calculators": [
    {
      "id": "control.nyquist",
      "name": "Nyquist Plot",
      "category": "control",
      "category_label": "Control Systems",
      "description": "Nyquist frequency response plot and stability analysis for continuous and discrete SISO systems.",
      "endpoint": "/control/nyquist",
      "execution": "sync",
      "mode_field": null,
      "modes": []
    }
  ]
}
```

### Nyquist Plot Calculation (Transfer Function Input)
```bash
curl -X POST http://127.0.0.1:8000/api/v1/control/nyquist \
  -H "Content-Type: application/json" \
  -d '{
    "system": {
      "type": "tf",
      "numerator": [10.0],
      "denominator": [1.0, 6.0, 11.0, 6.0]
    },
    "num_points": 50
  }'
```

### Nyquist Plot Calculation (State Space Input)
```bash
curl -X POST http://127.0.0.1:8000/api/v1/control/nyquist \
  -H "Content-Type: application/json" \
  -d '{
    "system": {
      "type": "ss",
      "A": [[-2.0]],
      "B": [[1.0]],
      "C": [[1.0]],
      "D": [[0.0]]
    }
  }'
```

---

## 5. Running Tests

Run the complete pytest test suite:

```bash
pytest -v
```

The test suite covers:
- **Unit tests (`backend/tests/unit/`):** Control engine parsing, TF/SS conversions, and Nyquist pure logic.
- **Reference tests (`backend/tests/reference/`):** Textbook systems with analytical checks (1st order lag, 3rd order threshold with critical gain $K_{\text{crit}} = 60$, discrete-time systems).
- **API tests (`backend/tests/api/`):** Discovery endpoint, TF and SS calculations, and custom error formats (422, 404).
- **Contract tests (`backend/tests/contracts/`):** Validation of the locked top-level response envelope and generation of the frontend fixture in `contracts/fixtures/nyquist_contract_fixture.json`.

---

## 6. Frontend Setup & Run

### Prerequisites
- Node.js 18+ (tested on Node v20/v26)
- npm 9+

### Installation & Development
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The UI will be accessible at `http://127.0.0.1:5173`.

### Frontend Tests & Production Build
- **Run Unit & Component Tests:**
  ```bash
  npm test
  ```
- **Run Production Type-Check & Build:**
  ```bash
  npm run build
  ```

---

## 7. Architecture & Handover Documentation

For full architectural details, design rationale, and the step-by-step audit trail, see:
- `IMPLEMENTATION_LOG.md` — Complete handover log and step status.
- `ee_calculator_architecture.md` — System architecture design document.
- `ee_calculator_api_contract.md` — Single source of truth for API formats, error shapes, and envelopes.

