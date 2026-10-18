# EE Calculator — API Contract

**Document status:** Revised draft (review fixes applied)\
**Version:** 0.2\
**Applies to:** EE Calculator v1\
**Base path:** `/api/v1`

This document defines the shared API conventions for EE Calculator and the
calculator-specific contract boundaries currently known. It is the single
source of truth for the error contract, async job behavior, retention, queue
and timeout rules; `architecture.md` refers here instead of repeating them.

Shared conventions (envelopes, discovery, error shape, job shapes, identifiers)
are **locked** in this version. Exact per-calculator request/response fields and
worked examples are still completed alongside each calculator's implementation
(see §10).

---

## 1. Contract principles

1. Each calculator has its own endpoint and independent request/response schemas.
2. Endpoints are grouped by calculator category.
3. All calculator success responses use a shared top-level response envelope.
4. Calculator-specific results remain typed and specific to the calculator.
5. Request validation errors are reported with field paths.
6. Valid mathematical outcomes such as instability, non-convergence, or a
   numerical limitation are represented in a successful calculation response,
   not treated as server faults.
7. The frontend validates API responses at the API boundary using Zod.
8. Backend Pydantic schemas and validation are authoritative.
9. Async execution is selected through explicit metadata for each calculator
   and supported mode.
10. This document is versioned with the `/api/v1` API. Breaking changes require
    deliberate contract revision.
11. Clients dispatch on `status` (for calculator responses), `job_state` (for job
    responses) and `error.code` (for errors). HTTP status is a secondary signal
    and is never the only thing a client relies on.

---

## 2. Common conventions

### 2.1 Base URL and versioning

All routes in this document are relative to `/api/v1`.

The frontend obtains the API base URL from `VITE_API_BASE_URL`. This is a public
URL configuration value, not a secret.

### 2.2 Content type and methods

- Calculator execution uses `POST`.
- Calculator discovery uses `GET`.
- Async job polling uses `GET`.
- JSON is the request/response format for the API.
- The exact production/local host and port are configured outside this contract.

### 2.3 Identifiers and naming

One convention is used everywhere:

- A **category slug** and a **calculator slug** are lowercase, hyphen-separated.
- The **endpoint** is `/{category-slug}/{calculator-slug}`.
- The **calculator ID** is `{category-slug}.{calculator-slug}` (dot between the
  two parts; hyphens inside a part are kept), e.g. `power-energy.ac-power`.
- Backend Python package/folder names replace hyphens with underscores
  (`power-energy` ↔ `power_energy`). The registry derives one from the other;
  they are never maintained separately.
- Display names are separate fields and never used for routing.

| Category slug   | Display label       |
| --------------- | ------------------- |
| `control`       | Control Systems     |
| `signals`       | Signals and Systems |
| `circuits`      | Circuit Analysis    |
| `power-energy`  | Power and Energy    |
| `machines`      | Electrical Machines |
| `power-systems` | Power Systems       |

Catalog and UI ordering follows the order of this table, then the order of the
calculator table below.

### 2.4 Calculator routes

| Category      | Calculator                       | ID                                         | Endpoint                                          |
| ------------- | -------------------------------- | ------------------------------------------ | ------------------------------------------------- |
| control       | Nyquist Plot                     | `control.nyquist`                          | `POST /control/nyquist`                           |
| control       | Bode Plot                        | `control.bode`                             | `POST /control/bode`                              |
| control       | Root Locus                       | `control.root-locus`                       | `POST /control/root-locus`                        |
| control       | Pole-Zero Plot                   | `control.pole-zero`                        | `POST /control/pole-zero`                         |
| control       | Routh-Hurwitz Stability          | `control.routh-hurwitz`                    | `POST /control/routh-hurwitz`                     |
| control       | State Space to Transfer Function | `control.state-space-to-transfer-function` | `POST /control/state-space-to-transfer-function`  |
| control       | Time-Domain Response             | `control.time-domain`                      | `POST /control/time-domain`                       |
| signals       | Convolution Response             | `signals.convolution`                      | `POST /signals/convolution`                       |
| signals       | Fourier Series Calculator        | `signals.fourier-series`                   | `POST /signals/fourier-series`                    |
| signals       | Laplace Transform                | `signals.laplace`                          | `POST /signals/laplace`                           |
| signals       | Z-Transform                      | `signals.z-transform`                      | `POST /signals/z-transform`                       |
| signals       | Sampling Calculator              | `signals.sampling`                         | `POST /signals/sampling`                          |
| signals       | EE Waveform Generator            | `signals.waveform`                         | `POST /signals/waveform`                          |
| signals       | Differential Equation Solver     | `signals.differential-equation`            | `POST /signals/differential-equation`             |
| circuits      | Thevenin Equivalent              | `circuits.thevenin`                        | `POST /circuits/thevenin`                         |
| circuits      | Norton Equivalent                | `circuits.norton`                          | `POST /circuits/norton`                           |
| circuits      | Mesh Analysis                    | `circuits.mesh`                            | `POST /circuits/mesh`                             |
| power-energy  | AC Power Calculator              | `power-energy.ac-power`                    | `POST /power-energy/ac-power`                     |
| power-energy  | Power-Factor Correction          | `power-energy.pf-correction`               | `POST /power-energy/pf-correction`                |
| machines      | Transformer Calculator           | `machines.transformer`                     | `POST /machines/transformer`                      |
| machines      | DC Motor/Generator Calculator    | `machines.dc-machine`                      | `POST /machines/dc-machine`                       |
| machines      | Induction Motor Calculator       | `machines.induction-machine`               | `POST /machines/induction-machine`                |
| machines      | Synchronous Machine Calculator   | `machines.synchronous-machine`             | `POST /machines/synchronous-machine`              |
| power-systems | Fault Calculation                | `power-systems.fault`                      | `POST /power-systems/fault`                       |
| power-systems | Load Flow Analysis               | `power-systems.load-flow`                  | `POST /power-systems/load-flow`                   |

These are the canonical v1 paths. Revise only if a concrete collision or library
limitation is found before implementation.

### 2.5 Calculator discovery

`GET /calculators`

The response is the source of truth for frontend catalog discovery. It supports
the grouped and flat catalog views without the frontend hard-coding its own
calculator inventory. It lists **available** calculators only.

**Locked response shape:**

```json
{
  "calculators": [
    {
      "id": "control.bode",
      "name": "Bode Plot",
      "category": "control",
      "category_label": "Control Systems",
      "description": "Magnitude and phase response of a SISO system.",
      "endpoint": "/control/bode",
      "execution": "sync",
      "mode_field": null,
      "modes": []
    },
    {
      "id": "signals.convolution",
      "name": "Convolution Response",
      "category": "signals",
      "category_label": "Signals and Systems",
      "description": "Convolution of two continuous or discrete signals.",
      "endpoint": "/signals/convolution",
      "execution": "sync",
      "mode_field": "mode",
      "modes": [
        { "id": "continuous", "label": "Continuous", "execution": "async" },
        { "id": "discrete", "label": "Discrete", "execution": "sync" }
      ]
    }
  ]
}
```

Rules:

- `execution` is `"sync"` or `"async"` and is the calculator default.
- If `modes` is non-empty, `mode_field` names the request field (`mode` or
  `operation`) that selects a mode, and each mode's `execution` overrides the
  default for requests that select it.
- Execution metadata is informational for the UI. The client decides how to
  handle a response from its `status` discriminator (§5.2), not from metadata.
- An empty registry is valid and returns `{ "calculators": [] }`.
- Startup validates required metadata. A registered calculator initialization
  failure stops application startup rather than silently exposing a partial
  catalog.

---

## 3. Standard success response

All successful calculator responses use this top-level envelope. **All six fields
are always present**; `plots`, `tables` and `warnings` are empty arrays when not
applicable.

```json
{
  "status": "success",
  "calculator": "control.bode",
  "results": {},
  "plots": [],
  "tables": [],
  "warnings": []
}
```

`results` is intentionally empty in this shape example and is replaced by the
calculator-specific result object.

### 3.1 Fields

| Field        | Meaning                                                                    |
| ------------ | -------------------------------------------------------------------------- |
| `status`     | Always `"success"` for a completed calculation. (`"accepted"` is used only by the async acceptance response, §5.2.) |
| `calculator` | Stable calculator ID (§2.3).                                               |
| `results`    | Calculator-specific typed results.                                         |
| `plots`      | Zero or more structured plot payloads (§3.3).                              |
| `tables`     | Zero or more structured result tables (§3.4).                              |
| `warnings`   | Zero or more non-blocking warnings or limitations (§3.5).                  |

### 3.2 Symbolic results

A symbolic expression uses a shared object with readable text and LaTeX:

```json
{
  "text": "s + 2",
  "latex": "s + 2"
}
```

Exact escaping and formatting rules should be tested. LaTeX is display data, not
executable code.

### 3.3 Plot payloads

Every plot uses a small shared wrapper; the `data` object is specific to the plot
`type`. There is deliberately no generic series schema.

```json
{
  "id": "bode",
  "type": "bode",
  "title": "Bode Plot",
  "data": {}
}
```

- `id`: unique within the response.
- `type`: plot-type identifier that selects the `data` schema.
- `title`: display title.
- `data`: plot-type-specific payload, specified in the relevant calculator schema
  (Bode, Nyquist, time-domain, sampling, waveform, characteristic curves, etc.).

The backend provides sensible default ranges and point counts; users may
override supported ranges and point counts. The first plot schema to be locked is
Bode (with the first vertical slice, §10).

### 3.4 Table payloads

Tables are structured data, not preformatted UI strings:

```json
{
  "id": "branch-currents",
  "title": "Branch currents",
  "columns": [
    { "key": "element", "label": "Element" },
    { "key": "current", "label": "Current", "unit": "A" }
  ],
  "rows": [
    { "element": "R1", "current": 0.25 }
  ]
}
```

Each table's columns and values are calculator-specific and documented in its
schema.

### 3.5 Warnings and numeric transport

Warnings use a shared shape:

```json
{ "code": "NON_CONVERGENCE", "message": "Newton-Raphson did not converge in 50 iterations." }
```

`code` is a stable identifier defined per calculator; `message` is display text.

Numeric transport rules for responses:

- The backend never emits `NaN` or `Infinity` (they are not valid JSON). A value
  that is undefined or unbounded (for example an infinite gain margin) is
  returned as `null` and explained by a warning or by the calculator schema.
- Complex values are returned as `{ "re": number, "im": number }`.
- Dimensional values are returned in the calculator's documented canonical unit
  (SI base unit unless the calculator schema states otherwise); unit conversion
  for display is done by the frontend (§6.3).

---

## 4. Standard error response

**Locked shape:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more input fields are invalid.",
    "fields": [
      {
        "path": ["system", "denominator"],
        "code": "VALIDATION_ERROR",
        "message": "This field is required."
      }
    ]
  }
}
```

- `code` and `message` are always present. `message` is safe for display and
  never contains stack traces or internal exception text.
- `fields` is present only on `422` responses. Each item has a `path` (array of
  strings and integer row indices), a `code` (`VALIDATION_ERROR` or
  `LIMIT_EXCEEDED`) and a `message`.
- The top-level `code` of a `422` is `LIMIT_EXCEEDED` only when **every** field
  error is a limit error; otherwise it is `VALIDATION_ERROR`.
- The same envelope is used for every error from the API, including framework
  errors (404, 405, malformed JSON) and unhandled exceptions.

### 4.1 HTTP behavior

| HTTP status                 | Error `code`                               | Use                                                                                                      |
| --------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `200 OK`                    | — (success envelope)                       | Valid calculation request, including mathematical outcomes such as instability, non-convergence or approximation limits. Also every `GET /jobs/{job_id}` for a known job, in any job state. |
| `202 Accepted`              | — (acceptance response)                    | Async job accepted (§5.2).                                                                               |
| `404 Not Found`             | `CALCULATOR_UNAVAILABLE`                   | `POST` to a calculator route that is unknown or not currently available.                                 |
| `404 Not Found`             | `NOT_FOUND`                                | Any other unknown path under `/api/v1`.                                                                  |
| `410 Gone`                  | `JOB_UNAVAILABLE`                          | Job ID is unknown, expired, or lost to a backend restart. One shape for all three (§5.3).                |
| `422 Unprocessable Entity`  | `VALIDATION_ERROR` / `LIMIT_EXCEEDED`      | Invalid input, invalid field combinations, unsupported mode, expression validation failure, input limit exceeded, malformed JSON body. |
| `429 Too Many Requests`     | `QUEUE_FULL`                               | New async job rejected because the pending queue is full. Includes a `Retry-After` header.               |
| `4xx` (other)               | `REQUEST_ERROR`                            | Other client errors raised by the framework (e.g. `405`, `415`).                                         |
| `500 Internal Server Error` | `INTERNAL_ERROR`                           | Unexpected server fault. No stack traces or internal details.                                            |
| `504 Gateway Timeout`       | `CALCULATION_TIMEOUT`                      | Synchronous calculation exceeded the sync timeout (§5.7).                                                |

`410` is used for job IDs so that a missing job can never be confused with a
missing calculator route (`404`), and so unknown and expired IDs share one public
response. No authentication is planned in v1, so `401`/`403` handling is not
required.

### 4.2 Validation errors

Use `422` for invalid requests. The response identifies all detectable errors in
one response when feasible. Field paths point to the affected field, table row or
nested object. When a calculator-specific input limit is exceeded, the affected
field error uses `LIMIT_EXCEEDED`.

### 4.3 Error-code catalog (locked)

| Code                     | HTTP | Meaning                                                                                  |
| ------------------------ | ---- | ---------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`       | 422  | General request/schema validation failure.                                               |
| `LIMIT_EXCEEDED`         | 422  | Calculator-specific row, expression, harmonic or other configured input limit exceeded.  |
| `QUEUE_FULL`             | 429  | Async submission rejected because the pending queue is full.                             |
| `INTERNAL_ERROR`         | 500  | Unexpected backend fault. Also used as the code of a generic failed async job.           |
| `CALCULATION_TIMEOUT`    | 504  | Sync: HTTP 504. Async: `error.code` of a failed job (the job endpoint itself returns 200). |
| `JOB_UNAVAILABLE`        | 410  | Job ID is unknown, expired, or lost to a restart. Same code/shape for all cases.         |
| `CALCULATOR_UNAVAILABLE` | 404  | Calculator endpoint is unknown or not available.                                         |
| `NOT_FOUND`              | 404  | Other unknown path.                                                                      |
| `REQUEST_ERROR`          | 4xx  | Other framework-level client error.                                                      |

Names are stable identifiers and are implemented identically in backend and
frontend. Messages never expose technical internals.

### 4.4 Mapping framework validation errors to the contract

FastAPI's default `422` body does not match §4. The backend registers custom
handlers so that **every** error uses the envelope in §4:

- A `RequestValidationError` handler converts each Pydantic error into a field
  item. It strips the leading `"body"` from `loc`, strips union-branch and
  discriminator tags and Pydantic function markers, keeps row indices as
  integers, and produces clean `path` arrays.
- Custom validators that enforce configured limits raise errors carrying a limit
  marker; the handler maps these to `LIMIT_EXCEEDED`. All others map to
  `VALIDATION_ERROR`.
- Handlers for HTTP exceptions (404, 405, 415, …) and for unhandled exceptions
  return the envelope with `NOT_FOUND`/`CALCULATOR_UNAVAILABLE`, `REQUEST_ERROR`
  or `INTERNAL_ERROR`. Unhandled exceptions are logged with their stack trace; the
  response contains only the generic message.
- Golden-file tests (§9) pin the exact mapped output for representative nested,
  union and table-row errors.

---

## 5. Sync and async execution contract

### 5.1 Execution policy

Synchronous execution is the default. Async execution is used only for
calculators/modes explicitly marked async in calculator metadata.

A calculator `POST` returns either:

- `200` with the direct success envelope (`"status": "success"`), or
- `202` with the async acceptance response (`"status": "accepted"`).

The client distinguishes them by the `status` field. All request validation
(including expression allowlist/limit checks) happens **before** a job is
accepted, so an invalid request always gets `422` and is never queued.

**Initial execution assignment (proposed; adjust through metadata):**

| Calculator                      | Mode / operation        | Execution |
| ------------------------------- | ----------------------- | --------- |
| `signals.convolution`           | `continuous`            | async     |
| `signals.convolution`           | `discrete`              | sync      |
| `signals.differential-equation` | `solution_type=numerical` | async   |
| `signals.differential-equation` | `solution_type=symbolic`  | sync    |
| all other calculators           | all                     | sync      |

Rule: any calculator or mode whose measured 95th-percentile time on reference
cases exceeds about 3 seconds is reassigned to async through metadata.

### 5.2 Async acceptance response (locked)

HTTP `202 Accepted`:

```json
{
  "status": "accepted",
  "calculator": "signals.convolution",
  "job_id": "opaque-job-id",
  "job_state": "queued"
}
```

`job_id` is opaque to the client. The response contains no timestamps.

### 5.3 Job status endpoint (locked)

`GET /jobs/{job_id}`

Public job states (field `job_state`) are exactly `queued`, `running`,
`completed`, `failed`. A known job always returns `200`, whatever its state.

Queued or running:

```json
{ "job_id": "opaque-job-id", "job_state": "queued" }
```

Completed:

```json
{
  "job_id": "opaque-job-id",
  "job_state": "completed",
  "result": {
    "status": "success",
    "calculator": "signals.convolution",
    "results": {},
    "plots": [],
    "tables": [],
    "warnings": []
  }
}
```

Failed:

```json
{
  "job_id": "opaque-job-id",
  "job_state": "failed",
  "error": {
    "code": "CALCULATION_TIMEOUT",
    "message": "Calculation failed."
  }
}
```

A failed job's `error.code` is `CALCULATION_TIMEOUT` or `INTERNAL_ERROR`. Mathematical
failures such as non-convergence are not job failures; they complete with
`"status": "success"` and warnings.

Unknown, expired and restart-lost job IDs all return `410` with the standard error
envelope and code `JOB_UNAVAILABLE`:

```json
{ "error": { "code": "JOB_UNAVAILABLE", "message": "This calculation result is no longer available." } }
```

### 5.4 Polling

- Poll every 2 seconds while `job_state` is `queued` or `running`.
- Stop on `completed`, `failed`, `JOB_UNAVAILABLE`, or navigation away.
- Do not resume automatically after returning to the page or refreshing (a manual
  "check previous calculation" action is specified in `architecture.md` §9.4).
- A transient polling error (network failure, `5xx`, malformed response) does not
  mark the job failed. Keep the last known state and retry on the next poll. After
  several consecutive failures the UI may show a non-blocking connection notice;
  polling continues.
- `JOB_UNAVAILABLE` during polling means the result can no longer be retrieved
  (expired, unknown, or backend restarted). The client stops polling and shows
  "The result is no longer available — please recalculate." It does not treat this
  as proof of success or of failure.
- No timestamps are returned in the job status schema.
- No cancellation endpoint exists in v1.

### 5.5 Retention

- A **completed** job's result is retrievable repeatedly for 30 minutes from
  completion.
- A **failed** job's record is retained for the same 30 minutes from failure, so a
  lost "failed" response can be recovered on the next poll.
- Retrieval does not extend the retention period.
- Expired records are removed by a periodic sweep and are also treated as absent
  on access.
- Job storage is in memory only; a backend restart loses all job state.
- Unknown, expired and restart-lost IDs return the same `JOB_UNAVAILABLE`
  response.

### 5.6 Queue policy

- A single global FIFO queue is used for all async calculators.
- The configurable capacity counts pending `queued` jobs only; running jobs do not
  count.
- No reserved capacity or priority scheduling.
- If pending capacity is exhausted, reject a new async submission with HTTP `429`,
  code `QUEUE_FULL`, and a `Retry-After` header (proposed 10 seconds).
- Proposed default capacity: 10 pending jobs (configurable).

### 5.7 Timeouts

Two configurable timeouts apply. Both are enforced by terminating the worker
process, not by abandoning a future.

| Path  | Proposed default | Clock starts                                         | On expiry                                                              |
| ----- | ---------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Sync  | 30 seconds       | When the request is received                         | HTTP `504`, code `CALCULATION_TIMEOUT`; the worker is terminated.      |
| Async | 120 seconds      | When the job starts `running` (queue wait excluded)  | Job moves to `failed` with `CALCULATION_TIMEOUT`; the worker is terminated. |

- No public `timed_out` state exists; the public job states remain the four above.
- Timed-out work is never resubmitted automatically.
- Tests must prove that a timeout actually kills the computation and that the
  pool recovers (§9). Cancelling a waiting future alone does not stop a running
  process task.

---

## 6. Calculator request contract boundaries

Each calculator defines an independent Pydantic request schema and matching
frontend Zod schema. The API does not use one untyped catch-all request object.

Agreed shared conventions:

- Complex values default to rectangular form `{ "re": number, "im": number }`;
  polar conversion is supported where applicable.
- Angle inputs default to degrees, with radians conversion support.
- Dimensional inputs that offer unit selection are sent as
  `{ "value": number, "unit": string }`, the same shape as frequency
  (`{ "value": 50, "unit": "Hz" }`). Allowed units are defined per field and
  include SI prefixes (see §6.3). The backend converts to canonical units.
- Power-system external inputs/outputs use actual units, not per-unit values.
- Empty numeric fields are missing values, not zero.
- Input limits are calculator-specific and enforced by the backend.
- Expression parsing is constrained by a tokenizer/allowlist and safe SymPy
  parsing; unrestricted `eval` is not allowed.
- Shared expression complexity limits have calculator-specific overrides.
- Frontend validation is helpful but the backend remains authoritative.

### 6.1 Expression input

Supported symbols/functions include arithmetic, variables, `pi`, `e`, `j`,
trigonometric and inverse-trigonometric functions, hyperbolic functions, `exp`,
`ln`/`log`, `sqrt`, `abs`, sign, unit step, unit ramp, unit impulse, and sinc,
subject to calculator-specific applicability.

**Scientific notation in expressions is rejected** by the tokenizer. A numeric
literal containing an exponent (`1e-6`, `2.5E3`) is a validation error, and so is
a numeric literal immediately followed by the identifier `e` (for example `2e3`),
which would otherwise silently tokenize as `2*e*3`. The error message tells the
user to write the multiplication explicitly (`2*e`) or use decimal notation.

Proposed shared limits (calculators may override): maximum expression length 500
characters, nesting depth 20, 300 tokens. Exceeding a limit returns `422` with
`LIMIT_EXCEEDED`. Exact field names are specified per calculator.

### 6.2 Numeric input notation

"Decimal notation only" is a **frontend** rule for numeric entry fields and a
**backend** rule for expression text:

- Frontend: numeric text fields reject scientific notation before submission.
- Backend: once a request is parsed as JSON, `0.000001` and `1e-6` are the same
  number, so the backend cannot and does not try to reject exponent notation in
  JSON numbers. It does reject it in every expression string (§6.1).
- Because users cannot type exponents, dimensional fields provide SI prefix unit
  selectors (§6.3), so small and large quantities are entered as, for example,
  `10 pF` or `4.7 kΩ`.

### 6.3 Units and output conversion

- Allowed units per field are listed in the calculator schema. SI prefixes
  (`p`, `n`, `µ`, `m`, `k`, `M`, `G`) are supported where physically sensible.
- Frequency units: `Hz`, `kHz`, `MHz`, `GHz`, `rad/s`.
- Responses return values in the calculator's canonical unit. **Output-unit
  selection is display-only**: the frontend converts an already-computed physical
  quantity for display and never triggers a recomputation. A calculator with a
  clear reason to recompute must say so in its schema.

### 6.4 Structured network inputs

Circuit calculators use a structured netlist with element ID/type, two node
labels, and value/parameters. The ground node is reserved; a separate node list is
not required. Dependent sources are supported and reference their controlling
element or node pair according to source type.

Power-system calculators use a bus-based schema with slack/PV/PQ buses, lines,
generators, loads, two-winding transformers with taps, and shunt
capacitors/reactors.

---

## 7. Calculator-specific constraints that affect API validation

This section lists constraints enforced by the relevant schemas and calculation
logic. It is not a replacement for per-calculator JSON examples.

### Control systems

- SISO only; no MIMO or time delays.
- Continuous systems use s-domain; discrete systems use z-domain.
- Transfer functions are polynomial ratios.
- State-space systems may use A/B/C/D matrices and are converted in the shared
  core.
- Routh-Hurwitz is continuous-time only; z-domain requests return 422.
- Where transfer-function conversion cancels hidden modes, return a warning.
- Time-domain inputs include step, impulse, ramp, user-defined
  expressions/building blocks, and initial conditions. Initial state applies to
  state-space; transfer-function systems start from rest.

### Signals and systems

- Convolution supports continuous and discrete modes.
- Fourier input uses a period plus piecewise interval/expression segments. Return
  `a0`, `an`, and `bn`; initial harmonic default 10, maximum 50. Exceeding the
  maximum returns 422 with `LIMIT_EXCEEDED`.
- Sampling returns Nyquist rate, minimum sampling frequency, a sampling-rate
  check, and a sampled-versus-original plot. If frequency content cannot be
  determined, return 200 with plot and warning, omitting the Nyquist rate.
- Waveform generator supports the specified basic periodic, pulse/test pulse,
  step/ramp/impulse, rectified, and three-phase waveforms. PWM/switching/composite
  signals are excluded.
- ODE solver supports linear constant-coefficient ODEs and general
  first/second-order text ODEs. It attempts a symbolic solution with numerical
  fallback; no systems of ODEs.
- Ideal impulses are approximated by narrow pulses for numerical simulation where
  needed, with warnings when the approximation affects reliability. This is not
  mathematically identical to a Dirac impulse.

### Circuits and power

- Thevenin/Norton requests must supply exactly one of a terminal node pair or a
  load element. Neither or both returns 422.
- Mesh output includes **mesh currents**, branch currents and node voltages. Mesh
  currents are reported with a loop table (which elements each loop contains and
  its reference direction) so they are unambiguous. For planar circuits the loops
  are the meshes; if the circuit is non-planar, a fundamental-loop basis is used
  and a warning says so.
- AC Power supports single-phase and balanced three-phase only; three-phase
  star/delta options are supported.
- Three-phase voltage fields are named `line_voltage` and `phase_voltage`; exactly
  one is required.
- Power-factor correction requires real power, existing PF, target PF, and
  voltage; frequency is required when capacitance is requested. Outputs are
  required kVAR and capacitance only.

### Machines

Transformer, DC machine, induction machine, and synchronous machine use one
endpoint each with an `operation` field and selectors. Request schemas are
operation-specific. A valid-operation/selector matrix must be provided and tested.

- Transformer operations: ideal relations, test parameters, voltage regulation,
  efficiency. Equivalent parameters are referred to primary or secondary
  explicitly. Regulation/efficiency accept equivalent-circuit parameters; test
  data is converted through the test-parameters operation first.
- DC machines: separately excited, shunt, and series. "Starting" means starting
  current and starting torque at standstill for a given external starting
  resistance. No compound machines and no speed-control analysis.
- Induction machines: per-phase equivalent circuit, operating point, torque-slip
  and performance curves for the specified fixed supply conditions, and no-load
  and blocked-rotor parameter derivation. Starting current and torque at slip 1
  are simply a point on the curves. No analysis of starting methods (direct
  on-line, star-delta, autotransformer, soft starter) and no variable-voltage or
  variable-frequency speed control.
- Synchronous machines: cylindrical and salient-pole, power-angle, V-curves,
  capability curves; no parallel-operation analysis.

### Power systems

- Fault calculation starts with three-phase symmetrical faults; the schema leaves
  room for LG, LL and LLG.
- Fault solver uses a classical bus-impedance-matrix method, not pandapower IEC
  60909, for v1.
- Prefault voltage may be flat 1.0 pu by default, supplied by Load Flow, or
  user-specified.
- Load Flow supports slack/PV/PQ buses, lines, generators, loads, two-winding
  transformers with taps, and shunt devices.
- Load-flow methods include Newton-Raphson, Gauss-Seidel, and Fast Decoupled,
  subject to confirmed library support.
- Load Flow returns final results, iteration count, and convergence flag.
  Non-convergence is a valid outcome with warnings.

---

## 8. Frontend contract requirements

- Use Axios through one shared client.
- Use Zod to validate every API response before the UI consumes it.
- Keep a shared response-envelope schema and calculator-specific schemas next to
  their frontend feature.
- Dispatch on `status`, `job_state` and `error.code` (principle 11), not on HTTP
  status alone.
- On malformed responses, show a generic calculation failure, preserve previous
  successful results, and allow manual retry.
- On network failure, preserve prior results and do not automatically resubmit.
  The backend may still be running if the response was lost, so do not claim
  definite server-side failure without evidence.
- `CALCULATOR_UNAVAILABLE` displays a clear unavailable message.
- `QUEUE_FULL` (`429`) displays an actionable message ("The server is busy. Try
  again in a moment.") and re-enables the form. No automatic retry.
- `JOB_UNAVAILABLE` during polling follows §5.4.
- For async jobs, disable duplicate submissions while the page is actively
  calculating; lock inputs during calculation.
- Keep previous results visible while a new calculation runs. If inputs change,
  mark the displayed result stale.
- Do not automatically resume job polling after navigation or refresh. A manual
  "check previous calculation" action is allowed (`architecture.md` §9.4).

---

## 9. Contract testing requirements

A centralized contract test suite exercises every calculator and the shared
job/discovery endpoints.

For each calculator, test:

- Request schema accepts valid examples.
- Missing, malformed, unsupported, and out-of-range fields return the expected 422
  response.
- Input limits return `LIMIT_EXCEEDED`.
- Successful response contains the shared envelope (all six fields) and the
  calculator-specific structure.
- Mathematical warnings and non-convergence use a valid successful response where
  specified.
- Sync/async response shape matches metadata.
- Representative request/response pairs are written to committed fixtures
  (`contracts/fixtures/`), and the frontend Zod schemas are validated against those
  same fixtures in frontend tests.

For the shared error contract, test:

- Golden-file output of the validation-error handler for nested fields, union
  models and table rows (paths contain no `body`, no union tags).
- Framework errors (404, 405, malformed JSON) and unhandled exceptions all return
  the standard envelope with the correct code and HTTP status.
- `404 CALCULATOR_UNAVAILABLE` and `410 JOB_UNAVAILABLE` are distinguishable by
  both status and code.

For async infrastructure, test:

- FIFO scheduling.
- Pending queue limit counts only queued jobs; concurrent submissions cannot
  exceed it.
- Queue-full returns 429 with `QUEUE_FULL` and `Retry-After`.
- State transitions use only `queued`, `running`, `completed`, `failed`
  (`job_state` field).
- Polling interval behavior in the frontend.
- Completed **and failed** results can be retrieved repeatedly during retention.
- Repeated retrieval does not extend retention; expiry returns `JOB_UNAVAILABLE`.
- Unknown, expired and restart-lost IDs share one response.
- Frontend handling of `JOB_UNAVAILABLE` while polling.
- Async timeout: the worker process is actually terminated, the job becomes
  `failed`/`CALCULATION_TIMEOUT`, and the pool accepts new work afterward.
- Sync timeout: a CPU-bound calculation is killed, `504` is returned, and the next
  request succeeds.
- Backend restart clears in-memory jobs.

For input rules, test:

- Scientific notation (`1e-6`, `2.5E3`) and the `2e3` adjacency case are rejected
  in expressions.
- Numeric entry fields in the frontend reject scientific notation.

Mathematical correctness is covered by unit tests, independent reference-value
tests, and API integration tests. Tests run locally in v1; no CI workflow is
required initially.

---

## 10. Remaining decisions

**Locked in v0.2** (previously open): discovery JSON shape; error envelope and
error-code catalog; empty arrays always present; async acceptance discriminator
and job response schemas; calculator ID/slug convention; output-unit semantics
(display-only); proposed initial sync/async assignment.

**Required with the first vertical slice (Bode):**

1. Bode plot `data` schema, default frequency range and point count (the first
   locked plot schema).
2. Bode request schema and worked example, plus its contract fixture.

**Required with the first async slice (Convolution):**

3. Convolution request/response schema, including the time-grid rules for
   continuous mode.
4. Confirm the queue-limit default and `Retry-After` value with real timings.

**Settle per calculator or before release:**

5. Exact per-calculator request and response fields with examples.
6. Final sync/async assignment per calculator and mode (apply the 3-second rule
   from §5.1).
7. Confirmation of the proposed expression limits (§6.1).
8. Exact numeric formatting thresholds. Proposed: 6 significant digits; scientific
   notation when the magnitude is below 0.001 or at least 1,000,000.
9. Remaining plot payload fields, default ranges, and point counts.
10. Compatible-unit lists per field.
11. Exact dependency versions after clean-environment compatibility testing.

The implementation should not invent variants of the locked conventions. Where a
value is still open, record it as a proposed default in the relevant schema/design
note and finalize it before release.

---

## 11. Related documents

- `README.md` — overview and local setup.
- `docs/architecture.md` — system architecture and design decisions.
- `docs/calculator-specifications.md` — per-calculator mathematical specifications.
- `docs/testing.md` — test strategy and local commands.
- `docs/development.md` — repository organization and implementation workflow.
- `docs/configuration.md` — environment variables, defaults, logging, and local
  setup.

---

## 12. Changes from v0.1

- Job responses use `job_state`; `status` is only `success` / `accepted` on
  calculator responses.
- Added HTTP statuses and codes for `JOB_UNAVAILABLE` (410), `CALCULATOR_UNAVAILABLE`
  (404), `CALCULATION_TIMEOUT` (504, sync), plus `NOT_FOUND` and `REQUEST_ERROR`.
- Failed jobs are retained for 30 minutes like completed ones.
- Separate sync (30 s) and async (120 s, from start of running) timeouts, enforced
  by terminating the worker.
- "Decimal notation only" is split into a frontend rule and a backend expression
  rule; added the `2e3` tokenizer trap; added SI-prefix unit selectors.
- Specified the validation-error handler and golden tests.
- Mesh Analysis now returns mesh currents; clarified DC "starting" and the induction
  exclusions.
- Added one ID/slug convention, locked the shared shapes, and added fixtures-based
  Zod/Pydantic alignment tests.

**Approval status:** Revised draft. Shared conventions are locked; per-calculator
schemas are finalized with each calculator's implementation.
