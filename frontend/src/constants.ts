export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const CHASSIS_OPTIONS = [
  { value: 'e92', label: 'E92 335i (coupe)' },
  { value: 'e90', label: 'E90 335i (sedan)' },
  { value: 'e93', label: 'E93 335i (vert)' },
  { value: 'e82', label: 'E82 135i (coupe)' },
  { value: 'e88', label: 'E88 135i (vert)' },
  { value: 'e89', label: 'E89 Z4 35i' },
  { value: 'f10', label: 'F10 535i' },
]

export const FUEL_OPTIONS = [
  { value: '91', label: '91 oct' },
  { value: '93', label: '93 oct' },
  { value: 'e30', label: 'E30' },
  { value: 'e50', label: 'E50' },
  { value: 'e85', label: 'E85' },
]

export const FUELING_OPTIONS = [
  { value: 'stock_hpfp', label: 'Stock HPFP' },
  { value: 'upg_hpfp', label: 'Upgraded HPFP' },
  { value: 'meth', label: 'Meth Injection' },
  { value: 'port_inj', label: 'Port Injection' },
  { value: 'port_inj_meth', label: 'Port Inj + Meth' },
]

export const TUNE_OPTIONS = [
  { value: 'stock', label: 'Stock' },
  { value: 'jb4_s1', label: 'JB4 Stage 1' },
  { value: 'mhd_s1', label: 'MHD Stage 1' },
  { value: 'jb4_s2', label: 'JB4 Stage 2' },
  { value: 'mhd_s2', label: 'MHD Stage 2' },
  { value: 'mhd_s2plus', label: 'MHD Stage 2+' },
  { value: 'mhd_custom', label: 'MHD Custom' },
  { value: 'cobb', label: 'COBB' },
  { value: 'custom', label: 'Custom' },
]

export const BINARY_MODS = [
  { id: 'downpipe', label: 'Downpipe' },
  { id: 'charge_pipes', label: 'Charge Pipes' },
  { id: 'intercooler', label: 'Intercooler' },
  { id: 'intake', label: 'Intake' },
  { id: 'catback', label: 'Cat-back' },
  { id: 'bov_delete', label: 'BOV Delete' },
  { id: 'oil_cooler', label: 'Oil Cooler' },
]

export const GOALS = [
  { value: 'max_power', label: 'Max Power' },
  { value: 'best_value', label: 'Best Value' },
  { value: 'reliability', label: 'Reliability' },
  { value: 'target_hp', label: 'Target HP' },
]

export const MOD_NAMES: Record<string, string> = {
  downpipe: 'Downpipe',
  charge_pipes: 'Charge Pipes',
  intercooler: 'Intercooler',
  intake: 'Intake',
  catback: 'Cat-back Exhaust',
  bov_delete: 'BOV Delete',
  oil_cooler: 'Oil Cooler',
  jb4_s1: 'JB4 Stage 1',
  jb4_s2: 'JB4 Stage 2',
  mhd_s1: 'MHD Stage 1',
  mhd_s2: 'MHD Stage 2',
  mhd_s2plus: 'MHD Stage 2+',
  mhd_custom: 'MHD Custom',
  cobb: 'COBB',
  custom: 'Custom Tune',
  upg_hpfp: 'Upgraded HPFP',
  port_inj: 'Port Injection',
  meth: 'Meth Injection',
  port_inj_meth: 'Port Inj + Meth',
}
