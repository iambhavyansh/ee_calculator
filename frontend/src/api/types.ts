export interface CalculatorModeMetadata {
  id: string;
  label: string;
  execution: "sync" | "async";
}

export interface CalculatorMetadata {
  id: string;
  name: string;
  category: string;
  category_label: string;
  description: string;
  endpoint: string;
  execution: "sync" | "async";
  mode_field: string | null;
  modes: CalculatorModeMetadata[];
}

export interface DiscoveryResponse {
  calculators: CalculatorMetadata[];
}

export interface TransferFunctionInput {
  type: "tf";
  numerator: number[];
  denominator: number[];
  dt?: number | null;
}

export interface StateSpaceInput {
  type: "ss";
  A: number[][];
  B: number[][];
  C: number[][];
  D: number[][];
  dt?: number | null;
}

export type SystemInput = TransferFunctionInput | StateSpaceInput;

export interface NyquistRequest {
  system: SystemInput;
  omega_start?: number | null;
  omega_end?: number | null;
  num_points?: number;
}

export interface ComplexNumber {
  re: number;
  im: number;
}

export interface WarningItem {
  code: string;
  message: string;
}

export interface NyquistBranch {
  omega: (number | null)[];
  real: (number | null)[];
  imag: (number | null)[];
}

export interface NyquistPlotData {
  positive_branch: NyquistBranch;
  negative_branch: NyquistBranch;
}

export interface PlotWrapper<T = NyquistPlotData> {
  id: string;
  type: string;
  title: string;
  data: T;
}

export interface TableColumn {
  key: string;
  label: string;
  unit?: string;
}

export interface TableWrapper {
  id: string;
  title: string;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
}

export interface NyquistResults {
  poles: ComplexNumber[];
  zeros: ComplexNumber[];
  num_open_loop_rhp_poles: number;
  num_encirclements: number;
  is_stable: boolean;
  gain_margin_db: number | null;
  gain_margin_freq: number | null;
  phase_margin_deg: number | null;
  phase_margin_freq: number | null;
}

export interface ResponseEnvelope<T> {
  status: "success";
  calculator: string;
  results: T;
  plots: PlotWrapper[];
  tables: TableWrapper[];
  warnings: WarningItem[];
}

export type NyquistResponse = ResponseEnvelope<NyquistResults>;

export interface FieldError {
  path: (string | number)[];
  code: string;
  message: string;
}

export interface ErrorDetail {
  code: string;
  message: string;
  fields?: FieldError[];
}

export interface ErrorResponse {
  error: ErrorDetail;
}

