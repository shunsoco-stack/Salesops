from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PayoutResult:
    unit_payout_yen: int
    total_payout_yen: int
    total_sales_yen: int


def calc_unit_payout_yen(
    payout_type: str,
    payout_value: float,
    unit_price_yen: int,
) -> int:
    if payout_type == "fixed":
        return max(0, int(round(payout_value)))
    if payout_type == "percent":
        # payout_value is 0-100
        return max(0, int(round(unit_price_yen * (float(payout_value) / 100.0))))
    raise ValueError(f"Unknown payout_type: {payout_type}")


def calc_totals(
    *,
    quantity: int,
    unit_price_yen: int,
    payout_type: str,
    payout_value: float,
    commission_multiplier: float = 1.0,
) -> PayoutResult:
    qty = max(0, int(quantity))
    price = max(0, int(unit_price_yen))
    unit_payout = calc_unit_payout_yen(payout_type, payout_value, price)

    sales = price * qty
    payout = int(round(unit_payout * qty * float(commission_multiplier)))
    return PayoutResult(unit_payout_yen=unit_payout, total_payout_yen=payout, total_sales_yen=sales)

