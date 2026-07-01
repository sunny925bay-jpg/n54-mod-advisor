import { MOD_NAMES } from './constants'
import type { RiskFlag } from './types'

export function humanizeMod(mod: string): string {
  if (mod.startsWith('tune → ')) {
    const key = mod.replace('tune → ', '')
    return `${MOD_NAMES[key] ?? key} Tune`
  }
  if (mod.startsWith('fuel → ')) {
    const fuel = mod.replace('fuel → ', '').toUpperCase()
    return `Switch to ${fuel}`
  }
  if (mod.startsWith('fueling → ')) {
    const key = mod.replace('fueling → ', '')
    return MOD_NAMES[key] ?? key
  }
  return MOD_NAMES[mod] ?? mod
}

export function worstSeverity(flags: RiskFlag[]): 'warning' | 'caution' | 'info' | null {
  if (flags.some(f => f.severity === 'warning')) return 'warning'
  if (flags.some(f => f.severity === 'caution')) return 'caution'
  if (flags.some(f => f.severity === 'info')) return 'info'
  return null
}
