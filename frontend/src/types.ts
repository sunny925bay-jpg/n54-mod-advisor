export interface GraphPoint {
  rpm: number
  whp: number
  wtq: number
}

export interface GraphResponse {
  peak_whp: number
  peak_wtq: number
  points: GraphPoint[]
}

export interface RiskFlag {
  id: string
  severity: 'info' | 'caution' | 'warning'
  message: string
}

export interface PartOption {
  brand: string
  name: string
  price_usd: number
  vendor_url: string
  pros: string[]
  cons: string[]
}

export interface Recommendation {
  mod: string
  predicted_whp_gain: number
  predicted_wtq_gain: number
  cost_usd: number
  hp_per_dollar: number
  reasoning: string
  explanation: string
  parts: PartOption[]
  risk_flags: RiskFlag[]
  risk_score: number
}

export interface BuildStep {
  mod: string
  cumulative_whp: number
  cumulative_wtq: number
  cost_usd: number
}

export interface BuildPlan {
  steps: BuildStep[]
  final_whp: number
  final_wtq: number
  total_cost_usd: number
  risk_flags: RiskFlag[]
  reachable: boolean
  message: string
}

export interface RecommendResponse {
  current_whp: number
  current_wtq: number
  model: string
  recommendations: Recommendation[]
  build_plan?: BuildPlan
}
