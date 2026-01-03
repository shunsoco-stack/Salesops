from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Therapist(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    active: bool = Field(default=True, index=True)
    commission_multiplier: float = Field(default=1.0)
    notes: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MenuItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    price_yen: int = Field(default=0)
    payout_type: str = Field(default="fixed")  # "fixed" or "percent"
    payout_value: float = Field(default=0.0)  # fixed: yen, percent: 0-100
    active: bool = Field(default=True, index=True)
    notes: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TreatmentRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    treatment_date: date = Field(index=True)
    therapist_id: int = Field(index=True, foreign_key="therapist.id")
    menu_item_id: int = Field(index=True, foreign_key="menuitem.id")

    quantity: int = Field(default=1)

    # Snapshots for auditability (menu changes won't affect historical payouts)
    unit_price_yen_snapshot: int = Field(default=0)
    payout_type_snapshot: str = Field(default="fixed")
    payout_value_snapshot: float = Field(default=0.0)

    memo: str = Field(default="")

    paid_out: bool = Field(default=False, index=True)
    paid_out_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

