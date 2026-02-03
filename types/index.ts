export type Mode = "road" | "sea";

export type AllocationMethod = "by_value" | "by_weight" | "by_volume";

export type NodeType = "country" | "factory" | "port" | "hub";

export interface TransportNode {
  id: string;
  label: string;
  type: NodeType;
  lat: number;
  lng: number;
}

export interface EdgeOverrides {
  cost_per_km?: number;
  avg_speed_kmph?: number;
  fixed_fee?: number;
  dwell_hours?: number;
}

export interface TransportEdge {
  id: string;
  from: string;
  to: string;
  mode: Mode;
  distance_km: number;
  overrides?: EdgeOverrides;
}

export interface CustomsGroup {
  id: string;
  label: string;
  hsCodes?: string[];
  notes?: string;
}

export interface Product {
  id: string;
  label: string;
  hsCode?: string;
  defaultDeclaredValue?: number;
  defaultCustomsGroupId?: string;
  weight_kg?: number;
  volume_m3?: number;
}

export interface GroupRate {
  duty_rate_pct: number;
  vat_rate_pct: number;
  other_taxes_pct?: number;
}

export interface ProductRate {
  duty_rate_pct: number;
  vat_rate_pct: number;
  extra_fees_fixed?: number;
  note?: string;
}

export interface CountryCustoms {
  clearance_fee: number;
  insurance_rate: number;
  allocation_method: AllocationMethod;
  default_duty_rate_pct: number;
  default_vat_rate_pct: number;
  groupRates: Record<string, GroupRate>;
  productRates: Record<string, ProductRate>;
}

export interface CountryTrade {
  incoterms_allowed: string[];
  required_documents: string[];
  import_restrictions: string[];
  export_restrictions: string[];
}

export type RegulationSeverity = "info" | "warning" | "block";

export interface Regulation {
  id: string;
  title: string;
  severity: RegulationSeverity;
  appliesToProducts?: string[];
  appliesToGroups?: string[];
  message: string;
}

export interface CountryProfile {
  id: string;
  name: string;
  currency: string;
  customs: CountryCustoms;
  trade: CountryTrade;
  regulations: Regulation[];
}

export interface GlobalParams {
  road: EdgeOverrides;
  sea: EdgeOverrides;
}

export interface ProductLineInput {
  productId: string;
  qty: number;
  declaredValueOverride?: number;
  weight_kg?: number;
  volume_m3?: number;
}

export interface TransportTotals {
  total_cost: number;
  total_time_days: number;
}

export interface TransportLeg {
  edgeId: string;
  from: string;
  to: string;
  mode: Mode;
  distance_km: number;
  cost: number;
  time_days: number;
}

export interface TransportRoute {
  nodes: TransportNode[];
  edges: TransportLeg[];
  totals: TransportTotals;
}

export interface CustomsLineDetail {
  productId: string;
  qty: number;
  declared_value: number;
  insurance: number;
  transport_alloc: number;
  cif: number;
  duty: number;
  vat: number;
  extra: number;
  total_customs_product: number;
  rate_source: string;
}

export interface CustomsSummary {
  clearance_fee: number;
  total_customs: number;
  lines: CustomsLineDetail[];
}

export interface RegulationAlert {
  id: string;
  title: string;
  severity: RegulationSeverity;
  message: string;
}

export interface SimulationResult {
  route: TransportRoute | null;
  customs: CustomsSummary | null;
  regulations: RegulationAlert[];
  grand_total: number;
}
