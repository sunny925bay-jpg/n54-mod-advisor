# Dyno Data Schema

Each row is one dyno pull from a specific car at a specific point in time.
One car can contribute multiple rows (e.g., before and after a mod).

## CSV column order

```
id,chassis,year,turbo_setup,fuel,fueling_hw,tune,downpipe,charge_pipes,intercooler,intake,catback,bov_delete,oil_cooler,whp,wtq,dyno_type,source_url,notes
```

---

## Controlled Vocabulary

### `chassis`
| Value | Description |
|-------|-------------|
| `e90` | E90 335i sedan |
| `e92` | E92 335i coupe |
| `e93` | E93 335i cabriolet |
| `e82` | E82 135i coupe |
| `e88` | E88 135i convertible |
| `e89` | E89 Z4 35i roadster |
| `f10` | F10 535i (early build, N54) |

### `fuel`
| Value | Description |
|-------|-------------|
| `91` | 91 AKI pump gas |
| `93` | 93 AKI pump gas |
| `e30` | ~30% ethanol blend |
| `e50` | ~50% ethanol blend |
| `e85` | ~85% ethanol (flex-fuel fill) |

### `fueling_hw`
| Value | Description |
|-------|-------------|
| `stock_hpfp` | OEM high-pressure fuel pump |
| `upg_hpfp` | Upgraded HPFP (BMS, Fuel-It, etc.) |
| `port_inj` | Port injection kit added |
| `meth` | Water-methanol injection |
| `port_inj_meth` | Port injection + meth combo |

### `tune`
| Value | Description |
|-------|-------------|
| `stock` | OEM DME, no tune |
| `jb4_s1` | JB4 piggyback Stage 1 |
| `jb4_s2` | JB4 piggyback Stage 2 |
| `mhd_s1` | MHD flash Stage 1 |
| `mhd_s2` | MHD flash Stage 2 |
| `mhd_s2plus` | MHD flash Stage 2+ |
| `mhd_custom` | MHD pro/custom tune |
| `cobb` | COBB Accessport tune |
| `custom` | Custom standalone tune (e.g., Bootmod3, EWS) |

### `turbo_setup`
| Value | Description |
|-------|-------------|
| `stock` | OEM twin-scroll turbos |
| `hybrid_small` | Hybrid turbos — small frame (e.g., IS20, IS38 swap) |
| `hybrid_large` | Hybrid turbos — large frame (e.g., GT28, GT30) |
| `single` | Single turbo conversion |

**MVP uses `stock` only. Other values reserved for Phase 2.**

### `dyno_type`
| Value | Description |
|-------|-------------|
| `mustang` | Mustang MD-AWD / MD-250 |
| `dynojet` | Dynojet 224x / 248 |
| `dynapack` | Dynapack hub dyno |
| `hub` | Other hub dyno |
| `other` | Unknown or other |

---

## Boolean mod columns (0 = not installed, 1 = installed at time of pull)

| Column | Description |
|--------|-------------|
| `downpipe` | Aftermarket downpipe (catted or catless; note in `notes`) |
| `charge_pipes` | Upgraded charge pipes (silicone / aluminum) |
| `intercooler` | Front-mount intercooler (FMIC) |
| `intake` | Aftermarket intake (CAI or short-ram) |
| `catback` | Cat-back exhaust |
| `bov_delete` | BOV/BPV delete or atmospheric BOV conversion |
| `oil_cooler` | Aftermarket oil cooler |

---

## Output columns

| Column | Type | Unit | Notes |
|--------|------|------|-------|
| `whp` | float | wheel HP | Target metric; standardize to Mustang-equivalent where possible |
| `wtq` | float | wheel lb-ft | |

---

## Metadata columns

| Column | Type | Notes |
|--------|------|-------|
| `id` | int | Auto-incrementing; assign sequentially when adding rows |
| `source_url` | string | Forum post or dyno sheet link (optional, leave blank if none) |
| `notes` | string | Free text — catted vs catless DP, ethanol %, anomalies (optional) |

---

## Data collection guidelines

1. Record the best clean pull from a minimum 3-run session.
2. All `whp`/`wtq` are **wheel** numbers, not crank.
3. Note whether SAE correction was applied (`notes` field).
4. Dynojet reads ~5–10% higher than Mustang on the same car. If converting, multiply by ~0.92 and note it.
5. List only mods **installed at time of the dyno pull** — not the car's full lifetime build.
6. One row per dyno session; if mods changed between sessions add a new row.
