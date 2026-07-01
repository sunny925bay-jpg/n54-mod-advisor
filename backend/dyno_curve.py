"""
N54 dyno curve shape generator.
Curve SHAPE is templated from N54 domain knowledge (turbo spool, plateau, taper).
Peak WHP and WTQ are model-predicted. This is a projection, not a measured pull.
"""


def _torque_shape(rpm: int) -> float:
    """Normalized 0–1 torque curve representing N54 twin-scroll boost behavior."""
    if rpm < 2000:
        return 0.28 * (rpm / 2000)
    elif rpm < 3000:
        t = (rpm - 2000) / 1000
        return 0.28 + 0.67 * (t ** 0.55)  # rapid spool 2000–3000
    elif rpm < 3600:
        t = (rpm - 3000) / 600
        return 0.95 + 0.05 * t             # approach peak 3000–3600
    elif rpm < 5200:
        t = (rpm - 3600) / 1600
        return 1.00 - 0.045 * t            # flat plateau 3600–5200
    elif rpm < 6000:
        t = (rpm - 5200) / 800
        return 0.955 - 0.22 * t            # taper 5200–6000
    else:
        t = (rpm - 6000) / 1000
        return 0.735 - 0.24 * t            # drop toward redline


def generate_curve(peak_whp: float, peak_wtq: float) -> list[dict]:
    """
    Return [{rpm, whp, wtq}] from 2000–7000 rpm in 100-rpm steps.
    WTQ is scaled directly to peak_wtq via the shape function.
    WHP = WTQ × RPM / 5252, then rescaled so its peak hits peak_whp.
    """
    rpms = list(range(2000, 7100, 100))
    raw_wtq = [_torque_shape(rpm) * peak_wtq for rpm in rpms]
    raw_whp = [wtq * rpm / 5252 for rpm, wtq in zip(rpms, raw_wtq)]
    hp_scale = peak_whp / max(raw_whp)
    return [
        {"rpm": rpm, "whp": round(hp * hp_scale, 1), "wtq": round(tq, 1)}
        for rpm, hp, tq in zip(rpms, raw_whp, raw_wtq)
    ]
