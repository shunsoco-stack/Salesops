from __future__ import annotations

from datetime import date, datetime
from typing import Iterable, Optional

from sqlmodel import Session, col, select

from salon_app.logic import calc_totals
from salon_app.models import MenuItem, Therapist, TreatmentRecord


def list_active_therapists(session: Session) -> list[Therapist]:
    stmt = select(Therapist).where(Therapist.active == True).order_by(col(Therapist.name))  # noqa: E712
    return list(session.exec(stmt).all())


def list_active_menus(session: Session) -> list[MenuItem]:
    stmt = select(MenuItem).where(MenuItem.active == True).order_by(col(MenuItem.name))  # noqa: E712
    return list(session.exec(stmt).all())


def list_therapists(session: Session, *, include_inactive: bool = True) -> list[Therapist]:
    stmt = select(Therapist).order_by(col(Therapist.active).desc(), col(Therapist.name))
    items = list(session.exec(stmt).all())
    if include_inactive:
        return items
    return [t for t in items if t.active]


def list_menus(session: Session, *, include_inactive: bool = True) -> list[MenuItem]:
    stmt = select(MenuItem).order_by(col(MenuItem.active).desc(), col(MenuItem.name))
    items = list(session.exec(stmt).all())
    if include_inactive:
        return items
    return [m for m in items if m.active]


def upsert_therapist(session: Session, therapist: Therapist) -> Therapist:
    session.add(therapist)
    session.commit()
    session.refresh(therapist)
    return therapist


def upsert_menu(session: Session, menu: MenuItem) -> MenuItem:
    session.add(menu)
    session.commit()
    session.refresh(menu)
    return menu


def get_therapist(session: Session, therapist_id: int) -> Optional[Therapist]:
    return session.get(Therapist, therapist_id)


def get_menu(session: Session, menu_id: int) -> Optional[MenuItem]:
    return session.get(MenuItem, menu_id)


def add_treatment_record(
    session: Session,
    *,
    treatment_date: date,
    therapist: Therapist,
    menu: MenuItem,
    quantity: int,
    unit_price_yen: int,
    payout_type: str,
    payout_value: float,
    memo: str = "",
) -> TreatmentRecord:
    record = TreatmentRecord(
        treatment_date=treatment_date,
        therapist_id=therapist.id or 0,
        menu_item_id=menu.id or 0,
        quantity=max(1, int(quantity)),
        unit_price_yen_snapshot=max(0, int(unit_price_yen)),
        payout_type_snapshot=payout_type,
        payout_value_snapshot=float(payout_value),
        memo=memo or "",
    )
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def list_records(
    session: Session,
    *,
    from_date: date,
    to_date: date,
    therapist_id: Optional[int] = None,
    include_paid: bool = True,
) -> list[TreatmentRecord]:
    stmt = select(TreatmentRecord).where(
        TreatmentRecord.treatment_date >= from_date,
        TreatmentRecord.treatment_date <= to_date,
    )
    if therapist_id is not None:
        stmt = stmt.where(TreatmentRecord.therapist_id == therapist_id)
    if not include_paid:
        stmt = stmt.where(TreatmentRecord.paid_out == False)  # noqa: E712
    stmt = stmt.order_by(col(TreatmentRecord.treatment_date), col(TreatmentRecord.created_at))
    return list(session.exec(stmt).all())


def mark_paid_out(
    session: Session,
    *,
    target_date: date,
    therapist_id: Optional[int] = None,
) -> int:
    records = list_records(session, from_date=target_date, to_date=target_date, therapist_id=therapist_id, include_paid=False)
    now = datetime.utcnow()
    count = 0
    for r in records:
        r.paid_out = True
        r.paid_out_at = now
        session.add(r)
        count += 1
    session.commit()
    return count


def record_to_calc_row(
    *,
    record: TreatmentRecord,
    therapist: Therapist,
    menu: MenuItem,
) -> dict:
    totals = calc_totals(
        quantity=record.quantity,
        unit_price_yen=record.unit_price_yen_snapshot,
        payout_type=record.payout_type_snapshot,
        payout_value=record.payout_value_snapshot,
        commission_multiplier=therapist.commission_multiplier,
    )
    return {
        "id": record.id,
        "日付": str(record.treatment_date),
        "セラピスト": therapist.name,
        "メニュー": menu.name,
        "数量": record.quantity,
        "単価(円)": record.unit_price_yen_snapshot,
        "売上(円)": totals.total_sales_yen,
        "歩合種別": record.payout_type_snapshot,
        "歩合値": record.payout_value_snapshot,
        "支払額(円)": totals.total_payout_yen,
        "メモ": record.memo,
        "支払い済み": record.paid_out,
        "支払い日時(UTC)": record.paid_out_at.isoformat() if record.paid_out_at else "",
        "登録日時(UTC)": record.created_at.isoformat() if record.created_at else "",
    }


def build_lookup(items: Iterable) -> dict[int, object]:
    d: dict[int, object] = {}
    for x in items:
        if getattr(x, "id", None) is not None:
            d[int(x.id)] = x
    return d

