# EE Calculator — Architecture and Technical Design

**Document status:** Revised draft (review fixes applied)\
**Version:** 0.2\
**Scope:** Version 1, local-first academic project\
**Application type:** Full-stack electrical engineering calculator platform

The API contract (`docs/api-contract.md`) is the single source of truth for
response/error shapes, async job behavior, retention, queue and timeout rules.
This document describes how those are built and refers to the contract instead of
repeating it.

---

## 1. Purpose and goals

EE Calculator is a modular web application for students learning and applying
electrical engineering calculations. It combines mathematical calculators,
interactive plots, structured engineering inputs, and numerical results behind a
consistent interface.

The first release is intended for academic use and local deployment. Live hosting,
authentication, user accounts, a database, and persistent job storage are outside
the v1 scope.

### Goals

- Deliver 25 calculators across control systems, signals and systems, circuits,
  power systems, and electrical machines.
- Keep calculator APIs and response structures consistent.
- Reuse shared mathematical and engineering engines where doing so improves
  correctness and maintainability.
- Support both fast synchronous calculations and selected longer-running
  asynchronous calculations.
- Provide interactive client-side plotting and responsive calculator workspaces.
- Validate inputs at both frontend and backend boundaries.
- Make local setup reproducible and document architecture decisions.

### Non-goals for v1

- User accounts or authentication.
- Database-backed job persistence.
- Docker or Docker Compose.
- Hosted production deployment.
- Result export or download features.
- Calculation history or named saved configurations.
- Background completion notifications.
- General-purpose MIMO control analysis, time delays, or unbalanced three-phase
  power analysis.

---

## 2. Calculator inventory

The v1 catalog contains the following 25 calculators. The photovoltaic calculator
is excluded. IDs, slugs, endpoints and category labels are defined once in the API
contract §2.3–2.4; the table below uses the same names.

| #  | Calculator                       | ID                                         | Category (label)    |
| -- | -------------------------------- | ------------------------------------------ | ------------------- |
| 1  | Nyquist Plot                     | `control.nyquist`                          | Control Systems     |
| 2  | Bode Plot                        | `control.bode`                             | Control Systems     |
| 3  | Root Locus                       | `control.root-locus`                       | Control Systems     |
| 4  | Pole-Zero Plot                   | `control.pole-zero`                        | Control Systems     |
| 5  | Routh-Hurwitz Stability          | `control.routh-hurwitz`                    | Control Systems     |
| 6  | State Space to Transfer Function | `control.state-space-to-transfer-function` | Control Systems     |
| 7  | Time-Domain Response             | `control.time-domain`                      | Control Systems     |
| 8  | Convolution Response             | `signals.convolution`                      | Signals and Systems |
| 9  | Fourier Series Calculator        | `signals.fourier-series`                   | Signals and Systems |
| 10 | Laplace Transform                | `signals.laplace`                          | Signals and Systems |
| 11 | Z-Transform                      | `signals.z-transform`                      | Signals and Systems |
| 12 | Sampling Calculator              | `signals.sampling`                         | Signals and Systems |
| 13 | EE Waveform Generator            | `signals.waveform`                         | Signals and Systems |
| 14 | Differential Equation Solver     | `signals.differential-equation`            | Signals and Systems |
| 15 | Thevenin Equivalent              | `circuits.thevenin`                        | Circuit Analysis    |
| 16 | Norton Equivalent                | `circuits.norton`                          | Circuit Analysis    |
| 17 | Mesh Analysis                    | `circuits.mesh`                            | Circuit Analysis    |
| 18 | AC Power Calculator              | `power-energy.ac-power`                    | Power and Energy    |
| 19 | Power-Factor Correction          | `power-energy.pf-correction`               | Power and Energy    |
| 20 | Transformer Calculator           | `machines.transformer`                     | Electrical Machines |
| 21 | DC Motor/Generator Calculator    | `machines.dc-machine`                      | Electrical Machines |
| 22 | Induction Motor Calculator       | `machines.induction-machine`               | Electrical Machines |
| 23 | Synchronous Machine Calculator   | `machines.synchronous-machine`             | Electrical Machines |
| 24 | Fault Calculation                | `power-systems.fault`                      | Power Systems       |
| 25 | Load Flow Analysis               | `power-systems.load-flow`                  | Power Systems       |

The catalog API is the source of truth for calculator discovery. The frontend
should not maintain a separate hard-coded list as its authoritative catalog.

---

## 3. High-level architecture

The application is a **modular monolith**:

- One FastAPI backend application, run as a **single Uvicorn process**.
- One React frontend application.
- One versioned HTTP API.
- Shared mathematical engines inside the backend codebase.
- Separate worker processes (process pools) that run all calculator computation.
- No microservices and no database in v1.

```text
Browser
  |
  | React + Vite
  | React Router / React Hook Form / Zod / Plotly.js
  |
  | HTTP (Axios)
  v
FastAPI application (single process; no heavy math here)
  |
  +-- API v1 routers (control, signals, circuits, power-energy,
  |     machines, power-systems, discovery, job status)
  |
  +-- Boundary layer: Pydantic validation, expression tokenizer/limits,
  |     error handlers (contract §4.4), response envelope
  |
  +-- Execution layer
  |     +-- Sync worker pool   (terminable processes)
  |     +-- Async worker pool  (terminable processes)
  |     +-- Job manager: FIFO pending queue, in-memory job records
  |
  +-- Calculator feature modules + shared engineering core
        (symbolic, control, circuit/network, numerical, plotting)
        -- these run inside the worker processes
```

### Architectural principles

1. **Feature-oriented organization:** calculator-specific behavior stays with its
   calculator module.
2. **Shared engines, independent contracts:** calculations may reuse internal
   engines while each calculator retains a clear API schema.
3. **Explicit metadata:** discovery and execution-mode metadata are registered
   centrally.
4. **Validation at boundaries:** validate requests before computation and validate
   API responses in the frontend.
5. **No silent mathematical claims:** non-convergence, instability, approximation,
   and other limitations must be represented in results or warnings.
6. **Keep v1 operationally simple:** avoid infrastructure that is not necessary for
   the initial local academic release.
7. **Computation never runs in the web process:** every calculation runs in a worker
   process so that a timeout can actually kill it and so that slow math cannot
   block the event loop (§5).
8. **One source for shared rules:** error shapes, retention, queue and timeout
   rules live in the API contract only.

---

## 4. Backend design

### 4.1 Technology

Core backend technologies:

- Python. **Python 3.12 is the baseline.** Python 3.14 is an optional upgrade, adopted
  only after the complete dependency set (including `pandapower` and
  `python-control`) is verified together on 3.14 in a clean environment.
- FastAPI.
- Uvicorn (single process; see §13.2).
- Pydantic schemas through FastAPI.
- SymPy for symbolic mathematics and expression processing.
- NumPy and SciPy for numerical work.
- `python-control` for supported control-system functionality.
- `pandapower` where useful for supported load-flow calculations.
- A terminable process pool for worker execution (for example `pebble.ProcessPool`;
  the standard `ProcessPoolExecutor` cannot kill a running task).
- `pytest` for tests.

Exact versions must be verified together in a clean environment before pinning
`requirements.txt`. The final dependency list should include only libraries
actually used by the implementation.

### 4.2 Suggested backend layout

```text
backend/
  app/
    main.py
    config.py
    api/
      v1/
        router.py
        discovery.py
        jobs.py
    registry/
      calculator_registry.py
    core/
      errors.py                 # error codes, exception handlers (contract §4.4)
      validation/
      expressions/
      symbolic_engine.py
      control_engine.py
      circuit_engine.py
      numerical.py
      plotting.py
      units.py
      execution/
        pools.py                # sync/async worker pools, start method, timeouts
        worker.py               # top-level, picklable worker entry points
    calculators/
      control/
        nyquist/ bode/ root_locus/ pole_zero/ routh_hurwitz/
        state_space_to_transfer_function/ time_domain/
      signals/
        convolution/ fourier_series/ laplace/ z_transform/
        sampling/ waveform/ differential_equation/
      circuits/
        thevenin/ norton/ mesh/
      power_energy/
        ac_power/ pf_correction/
      machines/
        transformer/ dc_machine/ induction_machine/ synchronous_machine/
      power_systems/
        fault/ load_flow/
        # each calculator folder: router.py, schemas.py, logic.py, metadata.py
    jobs/
      manager.py
      models.py
    logging_config.py
  tests/
    unit/
    reference/
    api/
    contracts/
  requirements.txt
  .env.example
contracts/
  fixtures/                     # shared request/response examples (see §11.2)
```

Folder names are the calculator slugs with hyphens replaced by underscores
(`power-energy` → `power_energy`); the registry derives IDs and endpoints from them
(contract §2.3). This is a proposed layout, not a requirement to create empty files
immediately. Calculator modules are added as implementation proceeds.

### 4.3 Calculator module responsibilities

Each calculator module contains:

- `router.py`: endpoint and HTTP-level integration.
- `schemas.py`: independent request and response schemas for that calculator.
- `logic.py`: calculator-specific orchestration and mathematical rules. This is the
  code that runs inside a worker process.
- `metadata.py`: name, category, description, endpoint, supported modes, and
  execution-mode metadata.

The shared core contains reusable engines and utilities. Calculator modules do not
import one another's private implementation details; common functionality belongs
in the core.

### 4.4 Calculator registry and discovery

Use a centralized registry populated from standardized calculator metadata, shaped
as in the API contract §2.5 (`GET /api/v1/calculators`). Startup performs
required-metadata checks. Any registered calculator initialization failure stops
startup rather than silently exposing a partial application.

### 4.5 API routing

One endpoint per calculator, grouped by category (contract §2.4), plus the shared
`GET /api/v1/jobs/{job_id}`. A calculator that supports both fast and slow modes
uses the same URL; the response `status` field (`success` or `accepted`) makes the
outcome unambiguous (contract §5.1–5.2).

### 4.6 Response envelope and error contract

All calculators use the common envelope and the single error envelope defined in
the API contract §3 and §4, including the custom exception handlers in §4.4 there.
The backend must not return FastAPI's default error bodies on any route. Calculator
code never builds HTTP errors itself; it raises typed exceptions that
`core/errors.py` maps to the contract.

---

## 5. Execution architecture

### 5.1 Execution policy

Calculations run synchronously by default (the HTTP request waits for the result).
Only calculators or modes marked async in metadata return a job (contract §5.1,
initial assignment table). The choice is explicit metadata, not a runtime guess.

### 5.2 Process pools

**All calculator computation runs in worker processes.** The web process only does
cheap boundary work: Pydantic validation, tokenizer allowlist and limit checks,
parsing of an already-limited expression, dispatch, and response serialization.
Simplification, transforms, solving, numerics and plotting run in workers. This
removes event-loop blocking by heavy SymPy/SciPy calls and makes timeouts
enforceable.

- **Two pools:** a small **sync pool** (proposed default 2 workers) so interactive
  requests are never queued behind long async jobs, and an **async pool**
  (proposed default `max(1, CPU cores - 1)`). Both sizes are configurable.
- **Terminable workers:** the pool must be able to kill a running task and
  replace the worker (for example `pebble.ProcessPool`). Cancelling a waiting
  future alone is not enough.
- **Explicit start method:** create pools from `multiprocessing.get_context("spawn")`
  on every platform instead of relying on the interpreter default (which differs by
  OS and Python version, e.g. Python 3.14 changed the Linux default to
  `forkserver`). This gives identical behavior across 3.12/3.14 and Windows/Linux.
- **Worker contract:** workers receive a calculator ID and a plain, picklable
  request payload and call a top-level function resolved from the registry. No
  closures, lambdas or open resources cross the process boundary. Workers return a
  plain result dict or a typed failure; the parent builds the envelope.
- **Warm workers:** a pool initializer pre-imports the heavy libraries (SymPy,
  NumPy, SciPy, `control`, and `pandapower` where used) so spawn cost is paid once
  at startup, not on the first request. Pool creation is part of startup and a
  failure stops startup.
- **Logging from workers:** workers send log records to the parent through a
  `QueueHandler`; the parent's `QueueListener` writes the log file (§12.4).

### 5.3 Job manager (async path)

The job manager owns the single global FIFO queue, job records, and the transition
from `queued` to `running` to a terminal state. Public states, retention, queue
capacity and polling are defined in contract §5.3–5.6.

Implementation notes:

- The pending limit counts `queued` jobs only. Admission (check count, enqueue) and
  the `queued → running` transition must be one atomic operation under a lock so
  concurrent submissions cannot exceed the limit.
- A job record stores state, result or error, and its completion/failure time for
  retention. Expired records are removed by a periodic sweep and are also treated
  as missing on access.
- Failed jobs keep their record for the retention period (contract §5.5), so a
  lost response is recoverable.
- Async validation happens before admission; invalid requests never become jobs.

### 5.4 Timeouts

Timeout values, clocks and responses are in contract §5.7 (sync 30 s from request
receipt; async 120 s from start of running). Architecture requirements:

- Both are enforced by terminating the worker process and letting the pool respawn
  it, never by abandoning a future.
- The sync path waits on the sync pool with an overall deadline; on expiry it cancels
  the task (which kills the worker) and returns `504 CALCULATION_TIMEOUT`.
- Required tests (contract §9) prove that a CPU-bound task is actually killed and
  that the pool still serves requests afterward.

---

## 6. Input validation and expression safety

### 6.1 Layered validation

Use shared validation infrastructure and calculator-specific Pydantic schemas and
reusable validators.

- Centralized definitions for general input limits.
- Calculator-specific limits in a shared configuration pattern.
- Frontend validation with Zod and React Hook Form.
- Backend validation is authoritative.
- Run validation when the user submits, rather than aggressively rejecting partial
  table rows while the user is still editing.
- Return all detectable validation errors together, with paths to fields or rows
  (contract §4, §4.4).

No global request-size cap is defined for v1. Calculator-specific limits apply;
exceeding one returns `422` with `LIMIT_EXCEEDED`.

### 6.2 Numeric input rules

- **Decimal notation only in the UI.** Numeric text fields reject scientific
  notation (`1e-6`, `2.5E3`) before submission. The backend cannot detect this for
  JSON numbers (both spellings parse to the same float), so it enforces the rule
  only for expression strings (§6.3).
- Users cannot type exponents, so dimensional fields provide **SI-prefix unit
  selectors** (p, n, µ, m, k, M, G where sensible): `10 pF`, `4.7 kΩ`, not
  `0.00000000001`.
- Empty numeric fields remain missing values, distinct from zero.
- Requiredness and range checks occur on Calculate.
- Units are displayed beside dimensional inputs. Compatible unit selectors are
  provided where supported; dimensional inputs are sent as `{ value, unit }`
  (contract §6).
- Duplicate engineering identifiers and broken references are validated on
  Calculate.
- Dynamic tables support add/remove operations, sensible initial rows, and
  calculator-specific row limits. At maximum capacity, disable Add and explain the
  limit.
- Removing a row is immediate. Do not automatically cascade-delete references;
  report broken references on validation.

### 6.3 Expression parser

Expressions are checked by a tokenizer/allowlist before symbolic parsing. The
approach is constrained SymPy parsing, never arbitrary Python evaluation.

- The tokenizer rejects scientific-notation literals and also a numeric literal
  directly followed by the identifier `e` (e.g. `2e3`, which would silently become
  `2*e*3`), with a message telling the user to write `2*e` or use decimal notation.
- Length, nesting-depth and token-count limits are applied **before** any SymPy
  call (proposed shared defaults: 500 characters, depth 20, 300 tokens;
  per-calculator overrides allowed).
- Only an expression that passes the tokenizer and limits is parsed in the web
  process (cheap because it is bounded); all simplification and solving happens in
  workers.

Supported functions and symbols include arithmetic operators, variables, `pi`, `e`,
`j`, trigonometric and inverse-trigonometric functions, hyperbolic functions, `exp`,
`ln`/`log`, `sqrt`, `abs`, sign, unit step, unit ramp, unit impulse, and sinc,
subject to calculator-specific applicability. Limits are tested with adversarial
inputs. Never evaluate user expressions with unrestricted `eval`.

### 6.4 Units and angles

- Complex values use rectangular form by default: `{re, im}`, with polar conversion
  support.
- Angle inputs default to degrees, with radians conversion support.
- Every frequency input carries an explicit unit, such as
  `{value: 50, unit: "Hz"}`.
- Power-system calculator inputs/outputs use actual units; per-unit values are not
  the external contract.
- Every dimensional result displays its unit. Dimensionless results remain unitless
  unless engineering convention requires a label.
- Output conversions are calculator-specific and only allow compatible units.
- **Output-unit selection is display-only:** the frontend converts an already
  computed quantity; it does not recompute. A calculator with a clear reason to
  recompute states so in its schema.
- Selected output units persist with the calculator's local draft and reset to
  documented defaults on Reset.

---

## 7. Shared mathematical and engineering engines

### 7.1 Symbolic engine

Centralize safe expression parsing, symbolic simplification/transform support, and
a shared symbolic-result object containing plain text and LaTeX. Calculator modules
remain responsible for choosing mathematically appropriate operations and
explaining unsupported cases.

### 7.2 Control-system engine

- Continuous-time systems use the s-domain; discrete-time systems use the z-domain.
- All control calculators are SISO in v1.
- No time delays or MIMO analysis.
- Transfer functions are polynomial ratios.
- A shared `system` input may be transfer-function or state-space data.
- State-space inputs are converted to transfer functions in the shared core where
  required.
- Routh-Hurwitz is continuous-time only; z-domain input returns 422.
- Routh, pole-zero, and root-locus calculations that depend on converted transfer
  functions warn when conversion cancels hidden modes.

### 7.3 Circuit/network engine

Use a structured circuit netlist for Mesh, Thevenin, and Norton:

- Each element has an ID, type, two node labels, and value/parameters.
- No separate node list is required.
- Ground is reserved.
- DC and AC phasor modes are supported, with frequency for AC.
- Independent and dependent sources are supported: VCVS, VCCS, CCVS, CCCS.
- Dependent sources reference the controlling element or node pair according to the
  source type.
- Thevenin/Norton require exactly one terminal specification: a node pair or a load
  element. Supplying both or neither returns 422.
- **Mesh Analysis returns mesh currents**, branch currents and node voltages. The
  shared solver may be nodal internally; mesh currents are derived from a documented
  independent-loop basis and returned with a loop table (elements and reference
  direction per loop) so they are unambiguous. For planar circuits the loops are
  the meshes. For a non-planar circuit a fundamental-loop basis is used and a
  warning says so. No planarity limit is imposed on the circuit itself.

### 7.4 Power-system schema and engines

Use a bus-based schema for Fault and Load Flow. Supported model elements include:

- Slack, PV, and PQ buses.
- Lines.
- Generators and loads.
- Two-winding transformers with tap settings.
- Shunt capacitors/reactors.

Three-winding transformers and phase shifters are out of scope for v1.

**Fault calculation**

- Three-phase symmetrical fault is the first supported fault type.
- Schema permits future line-to-ground, line-to-line, and double-line-to-ground
  fault types.
- Use a dedicated classical fault solver based on a bus-impedance matrix; do not
  rely on pandapower's IEC 60909 calculation as the v1 fault algorithm.
- Prefault voltage may come from flat 1.0 pu defaults, Load Flow results, or
  user-supplied values.
- External input/output contract uses actual units.

**Load Flow**

- Use a library such as pandapower where appropriate.
- Methods include Newton-Raphson, Gauss-Seidel, and Fast Decoupled, subject to
  verified library support.
- Return final results, iteration count, and convergence status.
- Non-convergence is a valid calculation outcome with warnings, not an HTTP server
  error.

---

## 8. Calculator-specific behavior

This section records scope boundaries that affect implementation. Detailed
equations, request/response examples, and reference cases belong in
calculator-specific design notes and the API contract.

### Control systems

- Nyquist, Bode, Root Locus, Pole-Zero, Routh-Hurwitz, State Space to Transfer
  Function, and Time-Domain Response are separate calculator features.
- Plot data is returned from the backend; Plotly renders it in the browser.
- Backend plotting-density defaults are provided, with optional range and
  point-count overrides.
- Time-domain response supports step, impulse, ramp, user-defined input
  expressions/building blocks, and initial conditions.
- State-space inputs use A/B/C/D matrices. Initial state applies to state-space
  systems; transfer-function systems start from rest.
- Routh-Hurwitz is continuous-time only.

### Signals and systems

- Laplace, Z-transform, Fourier Series, Differential Equation, and Convolution
  support text expressions and standard building-block menus.
- Convolution supports continuous and discrete modes. Continuous mode is async,
  discrete mode is sync (initial assignment, contract §5.1).
- Fourier input is a structured piecewise signal: period plus segment
  interval/expression table. Common square, triangle, sawtooth, half-wave, and
  full-wave forms are available as building blocks. Return trigonometric
  coefficients `a0`, `an`, and `bn`. Initial harmonic default: 10, maximum: 50;
  exceeding it returns 422 `LIMIT_EXCEEDED`.
- Sampling returns Nyquist rate, minimum sampling frequency, a check against a
  supplied sampling rate, and a sampled-versus-original plot. It does not implement
  aliasing simulation, reconstruction, or quantization. If frequency content cannot
  be determined, return a successful response with a plot and warning, omitting the
  Nyquist rate.
- Waveform generator supports periodic sine, square, triangle, sawtooth; pulse/test
  pulse trains, step, ramp, impulse; half/full-wave rectification; and three-phase
  waveforms. PWM, switching waveforms, and composite waveforms are excluded. Output
  is plot data and is not a reusable input object for other calculators.
- Differential equation solver supports linear constant-coefficient ODEs with
  coefficient input and forcing expression/building blocks, plus general
  first/second-order text ODEs. It attempts symbolic solutions and can fall back to
  numerical solutions. Systems of ODEs are out of scope. `solution_type` selects
  symbolic or numerical output. Numerical output is async (initial assignment) and
  returns plot data and an approximation warning.
- For numerical ODE ranges, estimate from time constants for linear equations; use a
  documented fixed default and warning otherwise. Return the actual range and allow
  user override.

**Impulse approximation decision:** ideal impulses are approximated numerically as
narrow pulses when numerical simulation requires it. Pulse width and time-step
resolution must be chosen and tested carefully. Warn users when this approximation
can affect results. Do not imply a finite pulse is mathematically identical to a
Dirac impulse.

### Circuits and power/energy

- Mesh Analysis returns mesh currents, branch currents and node voltages (§7.3).
- Thevenin and Norton use the common netlist and exact-one-terminal-selection rule.
- AC Power supports single-phase and balanced three-phase calculations. Three-phase
  configuration supports star/delta; unbalanced three-phase analysis is excluded.
- Three-phase calculators name `line_voltage` and `phase_voltage`; exactly one is
  required.
- Power-Factor Correction takes real power, existing PF, target PF, voltage, and
  frequency when capacitance is requested. It returns required kVAR and capacitance
  only. No bank sizing, cost, or before/after comparison in v1.

### Electrical machines

Transformer, DC machine, induction machine, and synchronous machine each use one
endpoint with an `operation` field and selectors. Separate request schemas apply to
each operation. Valid combinations must be defined in a table and tested.

**Transformer**

- Operations: ideal relations, test parameters, voltage regulation, efficiency.
- Open-circuit/short-circuit test data can derive equivalent parameters.
- Regulation/efficiency accept equivalent-circuit parameters; test data must first be
  converted through the test-parameters operation.
- `referred_to=primary|secondary` states which side the equivalent parameters refer
  to; output specifies the requested side.
- Approximate circuit with magnetizing branch at input terminals and lumped
  `R_eq`/`X_eq` referred to one side.
- No three-phase connections or autotransformers.

**DC motor/generator**

- Separately excited, shunt, and series types.
- Steady-state operating point, regulation, characteristic curves, and **starting**,
  meaning starting current and starting torque at standstill for a given external
  starting resistance.
- No compound machines or speed-control analysis.

**Induction motor**

- Per-phase equivalent-circuit operating point.
- Torque-slip and performance curves for the specified fixed supply conditions.
- Parameters from no-load and blocked-rotor tests.
- Speed/slip/frequency relations.
- Starting current and torque at slip 1 appear as a point on the curves. **No
  analysis of starting methods** (direct on-line, star-delta, autotransformer, soft
  starter) and no variable-voltage or variable-frequency speed control.
- Approximate per-phase circuit, magnetizing branch at supply terminals.

**Synchronous machine**

- Cylindrical and salient-pole types.
- Power-angle characteristic, V-curves, and capability curve.
- No test-derived parameters or parallel-operation analysis.

### Fault and Load Flow

The bus-based power-system schema and solver scope are described in §7.4. Keep the
external schema in actual units; any internal per-unit conversions must be explicit
and consistent.

---

## 9. Frontend design

### 9.1 Technology and structure

- React with JavaScript, not TypeScript.
- Vite.
- React Router.
- Tailwind CSS and shadcn/ui.
- Plotly.js with React.
- Axios with a shared API client.
- React Hook Form and Zod.
- React state and Context API where shared state is necessary; calculator inputs
  remain local to each calculator feature.

Suggested structure:

```text
frontend/
  src/
    app/
      router.jsx
      providers/
    api/
      client.js
      schemas/
      jobs.js
    components/
      layout/ forms/ tables/ plots/ feedback/
    features/
      catalog/ control/ signals/ circuits/
      power-energy/ machines/ power-systems/
    hooks/
    settings/
    styles/
  .env.example
  package.json
  package-lock.json
```

Commit `package-lock.json` and use `npm ci` for reproducible installs.

### 9.2 Navigation and catalog

- Default route: `/calculators`.
- Dedicated route per calculator with shared layout.
- Collapsible left sidebar with categories and calculator links.
- Search by calculator name and description.
- Keyboard shortcut: Ctrl+K on Windows/Linux and Cmd+K on macOS.
- Catalog supports grouped-by-category and flat/all-calculator views.
- Responsive card grid under category headings. Compact cards show name, short
  description, and category icon.
- Skeleton cards while loading.
- Catalog load failure displays an error and manual Retry; no automatic retry.
- Empty successful catalog displays: "No calculators are currently available."
- Unknown frontend routes display a custom Not Found page with a link to
  `/calculators`.

### 9.3 Calculator workspace

- Desktop: input panel on the left, results panel on the right.
- Mobile/tablet: stack inputs and results vertically.
- Normal page scrolling; panels are not independently scrollable, sticky,
  resizable, or collapsible.
- Long forms use labeled sections, not a wizard or accordion by default.
- Large input tables support Add/Remove row with sensible initial rows and
  calculator-specific maximums.
- Inputs are editable until calculation begins. During calculation, lock inputs and
  disable Calculate and Reset.
- Calculate is the primary action. Reset is secondary and always asks for
  confirmation.
- Reset restores documented defaults, clears validation errors, restores default
  table rows, updates the saved draft, and does not run a calculation.
- No auto-calculation when inputs change.

### 9.4 Drafts and browser navigation

- Persist one latest input draft per calculator locally in browser storage.
- Persist selected output units alongside the draft.
- Restore draft when returning to a calculator.
- Reset replaces the stored draft with defaults.
- Do not automatically calculate or resume an interrupted job after a refresh or
  return.
- **Manual check of a previous async calculation:** for async calculators the draft
  also stores the last submitted `job_id`. On return, the page shows a compact notice
  with a "Check previous calculation" button. Clicking it polls that job once and
  resumes normal polling if it is still queued or running, or shows the result if
  it finished. If the job is gone (`JOB_UNAVAILABLE`) the notice says the result is
  no longer available. Nothing happens unless the user clicks, so there is no
  automatic resume and no background notification. This lets a user recover work
  instead of resubmitting it and filling the queue. Reset and a new successful
  submission clear the stored `job_id`.
- Browser-storage failures are silent; the calculator remains usable with in-memory
  values.
- No named saved configurations, history, or explicit Clear Drafts control.
- On navigation away, stop frontend polling; the backend job may continue.
- Browser Back/Forward follows normal routing behavior.
- No recently-used section and no background-completion notifications.

### 9.5 Calculation and result behavior

- While calculating synchronously, show a compact spinner and "Calculating...".
- Async jobs show `Queued…` or a running state. Show percentages only when real
  progress is available.
- Poll as specified in contract §5.4.
- Only one active calculation per calculator page; disable duplicate submissions.
- Preserve prior successful results while a new calculation runs and after a failed
  attempt.
- If inputs change, mark displayed results stale: "Inputs changed — recalculate."
- On success, replace prior results and clear stale status.
- Results appear in this order where applicable: primary numerical outputs, plots,
  tables. No dedicated equations section.
- Show units beside dimensional outputs. Output-unit changes are display-only (§6.4).
- Show assumptions only when a warning or limitation makes them relevant.
- Distinguish field validation errors, calculation failures, and non-blocking
  warnings.
- Plots can expand in-page. No plot downloads or user-controlled overlays.
- No CSV, PNG, JSON, or PDF result export; no copy-to-clipboard feature.

### 9.6 Frontend API validation and errors

Use Zod at the API boundary:

- Shared response-envelope schema (success, accepted, job-status, error) in the API
  layer.
- Independent calculator-specific response schemas alongside each feature.
- Validate every API response before using it.
- Dispatch on `status`, `job_state` and `error.code`, not HTTP status alone
  (contract principle 11).
- Malformed responses display a generic calculation failure, preserve previous
  results, and permit manual retry.
- Network failures and timeouts preserve previous results and never trigger
  automatic resubmission.
- If a request loses its connection, the backend may still be running; do not claim
  the calculation definitely failed when the outcome is unknown.
- `CALCULATOR_UNAVAILABLE` displays a clear unavailable message.
- `QUEUE_FULL` (429) displays "The server is busy. Try again in a moment." and
  re-enables the form. No automatic retry.
- `CALCULATION_TIMEOUT` (sync 504 or a failed job) displays a generic failure
  message and permits manual retry.
- `JOB_UNAVAILABLE` while polling stops polling and shows "The result is no longer
  available — please recalculate."
- No special v1 handling is required for 401/403.
- No React Error Boundaries or application-specific diagnostic logging in v1.

### 9.7 Appearance and accessibility

- Minimalist, premium visual direction.
- Light and dark themes; light is the default for a fresh session.
- Theme and accent reset on each new session.
- Black/white/gray base palette with a curated accent-color selector in a compact
  settings popover.
- Accent applies consistently to active navigation, buttons, focus states, controls,
  and plot highlights in both themes.
- Required fields marked `*`, with a `* Required` legend where appropriate.
- Visible keyboard focus, accessible labels and validation, keyboard-operable
  dialogs/popovers.
- Errors and warnings must not rely on color alone.
- Basic readability is a goal; a formal WCAG contrast target or audit is not part
  of v1.
- Support current stable Chrome, Edge, Firefox, and Safari. No outdated-browser
  support.
- Responsive core workflows on mobile and tablet; tables may scroll horizontally
  when necessary, and plots resize to their container.

---

## 10. Units, precision, and plotting defaults

### 10.1 Shared defaults

Use centralized numerical defaults with calculator-specific overrides. This includes
common numerical tolerances, plotting defaults, and result formatting policy. Exact
values should be established in code and reference tests rather than scattered as
magic numbers.

### 10.2 Result precision

- Keep full internal precision for calculations.
- Format displayed values using adaptive significant digits (proposed: 6 significant
  digits; scientific notation when the magnitude is below 0.001 or at least
  1,000,000).
- Avoid unnecessary trailing zeros.
- No user-adjustable precision setting in v1.

### 10.3 Plot generation

- Backend returns structured plot data using the shared wrapper (contract §3.3).
- Frontend renders plots with Plotly.js.
- Plot `data` schemas are specific to each plot type.
- Backend defines sensible default ranges and point counts.
- Users may override supported ranges and point counts.
- Plot density, numerical tolerance, and response range should be independently
  configurable where appropriate.
- Every plot-heavy calculator needs reference cases that verify data shape, range
  behavior, and numerical plausibility.

---

## 11. Testing strategy

Testing is local in v1; no CI workflow is required initially.

### 11.1 Three mathematical test layers

1. **Unit tests:** isolated engine and calculator logic.
2. **Independent reference-value tests:** compare selected results against trusted
   hand calculations, textbook examples, or independent reference implementations.
3. **API integration tests:** exercise routing, validation, error mapping, and
   response structure.

### 11.2 Contract tests and Pydantic/Zod alignment

Create a centralized contract test suite for every calculator (required cases are
listed in contract §9).

Pydantic and Zod schemas are written separately for each calculator, so alignment
must be mechanical rather than manual:

- Backend contract tests write one valid request and the matching success response
  per calculator (and per mode) into `contracts/fixtures/`, which is committed.
- Frontend tests validate every fixture against the corresponding Zod schema, so a
  backend change that breaks a frontend schema fails a test immediately.
- FastAPI's generated `openapi.json` is exported for reference. Generating Zod
  schemas from it is an optional later improvement, not a v1 requirement.

Independent calculator schemas remain in place even where fields repeat. The
registry remains separate from response schemas.

### 11.3 Required edge cases

At minimum, test:

- Missing and out-of-range values.
- Empty numeric fields versus zero.
- Scientific-notation rejection in the frontend and in expressions, including `2e3`.
- Expression allowlist and complexity limits.
- Singular or ill-conditioned numerical problems where relevant.
- Instability and non-convergence.
- Validation-error handler golden output (no `body` or union tags in paths).
- Async FIFO ordering, queue capacity, 429 behavior, state transitions, retention
  expiry for completed and failed jobs, repeated result retrieval, unknown/expired
  IDs.
- Timeout kill behavior for both the sync and async pools, and pool recovery.
- Backend restart clearing in-memory job data.
- Malformed API responses in frontend tests where feasible.
- Unit conversion consistency and output-unit persistence.
- Circuit references, duplicate IDs, terminal-selection rules, mesh loop table, and
  table row limits.

Do not define a numeric test-coverage percentage as a v1 gate. Prioritize
mathematical correctness, required scenarios, edge cases, and contract completeness.

---

## 12. Configuration, environment, and logging

### 12.1 Configuration

Use centralized typed backend configuration and validate it at startup. Invalid
configuration stops startup and logs the setting name and expected value without
exposing secrets.

Initial configurable settings include:

- Allowed CORS origins.
- Sync pool size and async pool size.
- Global pending-job queue limit and `Retry-After` value.
- Sync timeout and async timeout.
- Completed/failed job retention period.
- Shared expression limits.
- Any shared numerical defaults that need operational configuration.

Frontend API base URL comes from `VITE_API_BASE_URL`. This is a public URL, not a
secret.

### 12.2 Environment files

- Commit `.env.example` for backend and frontend.
- Ignore actual `.env` files in version control.
- Do not put secrets in example files.
- Document local environment setup.

### 12.3 CORS

- Explicit allowed origins from backend environment variables.
- Include the local Vite development origin.
- No wildcard origin.
- Cross-origin credentials are disabled by default.
- Expose the `Retry-After` header to the browser (`Access-Control-Expose-Headers`)
  if the frontend reads it.

### 12.4 Logging

- Backend log level: fixed `INFO` in v1.
- Human-readable text logs, not JSON.
- Log calculator ID, timestamp, duration, sync/async mode, outcome, and relevant
  error details.
- Do not log complete input payloads or expressions by default.
- No request IDs or diagnostic reference IDs in user-facing errors.
- **Retention:** daily rotation with the last 7 files kept
  (`TimedRotatingFileHandler`, `when="midnight"`, `backupCount=7`), so logs older
  than 7 days are deleted automatically. Size-based rotation cannot be combined with
  time-based deletion in the standard handlers, so v1 uses time-based rotation only.
- **Worker processes** log through a `QueueHandler` to the parent's
  `QueueListener`, which is the only writer of the log file (§5.2).
- Stack traces and technical details remain in backend logs, not user-facing
  responses.

Example format:

```text
2026-10-11 14:32:10 INFO control.bode Calculation completed in 0.42s
```

No dedicated health-check endpoint is planned for v1.

---

## 13. Local development and deployment

### 13.1 Local workflow

Run the backend and frontend in separate terminals. No root-level orchestrator
command is required.

The exact commands should be verified against the final repository layout, but the
workflow is expected to be similar to:

**Backend**

1. Create and activate a Python 3.12 virtual environment.
2. Install pinned dependencies from `requirements.txt`.
3. Configure environment variables from `.env.example`.
4. Start the FastAPI application with Uvicorn as a single process.

**Frontend**

1. Install the supported Node.js version.
2. Run `npm ci`.
3. Configure `VITE_API_BASE_URL`.
4. Start Vite's development server.

Document supported Python/Node versions and verify the complete stack in a clean
environment. Python 3.12 is the baseline; move to 3.14 only after the whole
dependency set is verified on it (§4.1).

### 13.2 Operational limitations of v1

- A backend restart clears all asynchronous jobs and retained results.
- Run Uvicorn with a **single worker process** (no `--workers N`). Job state is held
  in that process's memory, so multiple web workers would not see each other's
  jobs. Calculation parallelism comes from the worker pools (§5.2), not from
  multiple web processes.
- There is no durable job recovery.
- There is no distributed queue.
- There is no database.
- There is no container-based deployment requirement.
- Live hosting and production hardening are future work.

---

## 14. Security and reliability baseline

Even for a local-first academic application:

- Never execute unrestricted user-provided Python.
- Restrict expression parsing to explicitly allowed tokens, functions, and symbols.
- Apply expression-complexity limits before expensive symbolic operations.
- Run all calculator computation in terminable worker processes.
- Validate every request with calculator-specific schemas.
- Enforce row counts and input limits on the backend, not only in the UI.
- Do not expose stack traces or internal exception text through API responses.
- Do not log full input payloads by default.
- Keep CORS origins explicit.
- Validate configuration at startup.
- Fail fast if a registered calculator cannot initialize.
- Test timeout behavior and process-pool cleanup; do not assume a timed-out request
  stops its computation.
- Treat numerical warnings and approximation limits as first-class output
  information.

---

## 15. Defaults and items to finalize

Values marked "proposed" are defaults to confirm during implementation. Shared
policies (queue, retention, polling, timeouts, error shapes) are defined in the API
contract §5; this table lists only their configurable values.

| Item                         | Value / policy                                                          | Status                |
| ---------------------------- | ----------------------------------------------------------------------- | --------------------- |
| Python version               | 3.12 baseline; 3.14 optional after dependency verification              | Decided               |
| Worker execution             | Terminable process pools, `spawn` start method                          | Decided               |
| Sync pool size               | 2 workers, configurable                                                 | Proposed              |
| Async pool size              | `max(1, CPU cores - 1)`, configurable                                   | Proposed              |
| Pending queue                | One global FIFO queue; only `queued` jobs count                         | Agreed                |
| Queue limit                  | 10 pending jobs, configurable                                           | Proposed              |
| Queue-full response          | 429 `QUEUE_FULL` + `Retry-After` 10 s                                   | Agreed / proposed value |
| Sync timeout                 | 30 s from request receipt                                               | Proposed              |
| Async timeout                | 120 s from start of running                                             | Agreed value, clock clarified |
| Retention (completed, failed)| 30 minutes, no extension on retrieval                                   | Agreed (failed changed from immediate removal) |
| Job storage                  | In-memory; cleared on restart                                           | Agreed                |
| Polling interval             | 2 seconds                                                               | Agreed                |
| Fourier harmonics            | Default 10; maximum 50                                                  | Proposed              |
| Expression limits            | 500 chars, depth 20, 300 tokens; per-calculator overrides               | Proposed              |
| Numeric display              | 6 significant digits; scientific below 0.001 or at least 1,000,000      | Proposed              |
| Output-unit conversion       | Display-only                                                            | Decided               |
| Log retention                | Daily rotation, 7 files kept                                            | Decided               |
| Frontend state               | React state/Context; calculator state local                             | Agreed                |
| Browser draft storage        | Latest draft per calculator, plus last async `job_id`                   | Agreed / extended     |
| Test execution               | Local, no CI in v1                                                      | Agreed                |
| Database / Docker / hosting  | None in v1                                                              | Agreed                |

### Open implementation details that should not block architecture approval

1. Exact default plot point counts and calculator-specific ranges (Bode first).
2. Final sync/async assignment per calculator and mode, using the 3-second rule.
3. Compatible-unit lists per field.
4. Exact supported dependency versions after a clean-environment compatibility test.
5. Per-calculator equations, worked examples, and reference test values.
6. Exact pulse width and sampling/time-step rules for impulse approximation.
7. Confirm pool sizes, queue limit and timeouts against real timings from the first
   two slices.

Resolve these as implementation settings and calculator design notes. Reopen an
architecture decision only if a concrete contradiction, dependency limitation, or
correctness issue is found.

---

## 16. Recommended implementation sequence

Build thin vertical slices rather than all backends first. The execution layer
shapes how calculator functions are written, so it is proven early.

1. **Foundations.** Repository skeletons, typed configuration, logging (including the
   worker log queue), `.env.example`, local startup instructions.
2. **Shared contract plumbing.** Response and error envelopes, custom exception
   handlers, calculator registry and discovery endpoint, execution layer (sync pool,
   terminable workers, spawn context) and the contract-test + fixtures framework.
   Lock the remaining first-slice items from contract §10.
3. **Slice 1 — Bode, end to end (sync).** Shared expression parser, control engine,
   Bode backend with reference tests, frontend foundation (routing, layout, catalog,
   settings, API client, Zod envelope schemas, draft persistence), Bode UI with
   Plotly, stale-result and error behavior, fixtures validated on both sides. Verify
   the sync timeout-kill test here.
4. **Slice 2 — Convolution, end to end (async).** Job manager, bounded FIFO queue,
   async pool, polling, retention (completed and failed), `JOB_UNAVAILABLE` handling,
   manual "check previous calculation", and all async tests. Verify the async
   timeout-kill test.
5. **Fan out by category,** each calculator delivered as backend + reference tests +
   contract fixtures + frontend UI together:
   1. Remaining control calculators (reuse the control engine).
   2. Signals and systems (transforms, Fourier, sampling, waveform, ODE, impulse
      approximation).
   3. Circuit analysis (netlist model and solver, then Mesh, Thevenin, Norton).
   4. Power and machines (AC power, PF correction, machine operations with
      valid-operation tables).
   5. Power systems (bus schema, load-flow integration, classical fault solver).
6. **End-to-end verification.** Verify every calculator against reference cases, run
   the full contract suite, re-measure timings to confirm sync/async assignments and
   limits, verify a clean setup, and review documentation.

Shared contracts and engine boundaries are settled in steps 1–4 before many
calculators are built in parallel.

---

## 17. Documentation deliverables

- `README.md`: project overview, prerequisites, local setup, and run instructions.
- `docs/architecture.md`: this architecture and technical design.
- `docs/api-contract.md`: routes, request/response examples, error catalog, job
  responses, and schema conventions.
- `docs/calculator-specifications.md`: calculator inputs, equations/conventions,
  supported modes, assumptions, limits, and expected outputs.
- `docs/testing.md`: test layers, reference-case policy, contract tests, fixtures,
  and local commands.
- `docs/development.md`: code organization, shared engines, contribution
  conventions, and implementation sequence.
- `docs/configuration.md`: environment variables, defaults, validation, logging, and
  local deployment settings.

Review and approve the Markdown documents first. Convert the approved versions to
PDF afterward; the Markdown files remain the editable source of truth.

---

## 18. Review checklist

Before approving, review the following high-impact points:

- [ ] All 25 calculators and their scope boundaries are correct.
- [ ] The locked API response, error and job shapes are acceptable.
- [ ] Sync/async timeouts, terminable pools and the failed-job retention change are
      acceptable.
- [ ] Numerical impulse approximation is clearly labeled as an approximation.
- [ ] Units, SI-prefix selectors and display-only conversion are unambiguous.
- [ ] The proposed repository layout fits the intended implementation workflow.
- [ ] Python 3.12 baseline is confirmed; 3.14 only after dependency verification.
- [ ] The vertical-slice sequence supports mathematical validation throughout
      development.
- [ ] All proposed defaults are confirmed or replaced before the relevant feature is
      released.

---

## 19. Changes from v0.1

- Python 3.12 is the baseline; the spawn start method is set explicitly.
- All computation runs in terminable worker processes (separate sync and async
  pools); sync and async timeouts are separate and kill the worker.
- Failed jobs are retained like completed ones; `JOB_UNAVAILABLE` has a defined
  status (410) and UI behavior.
- Duplicated error, retention, queue and polling rules now live only in the API
  contract.
- Decimal-notation rule is split between frontend entry fields and backend
  expressions; SI-prefix unit selectors added; `2e3` tokenizer trap added.
- Mesh Analysis returns mesh currents; DC "starting" and induction exclusions
  reworded.
- Logging uses daily rotation with 7 files kept and a worker log queue.
- One ID/slug/folder naming convention and one set of category labels.
- Implementation sequence rebuilt as vertical slices (Bode, then Convolution).
- Pydantic/Zod alignment via committed fixtures.
- Manual "check previous calculation" for async calculators and an actionable
  `QUEUE_FULL` message.

**Approval status:** Revised draft. This document records the agreed architecture
and distinguishes decided items from proposed defaults. Review it before treating it
as the final implementation specification.
