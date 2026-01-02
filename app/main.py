from __future__ import annotations

import csv
import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any

from fastapi import Depends, FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.db import ensure_data_dir, get_db
from app.models import Base, OutsourcingPayment, SalesDaily
from app.db import engine


app = FastAPI(title="Sales Tracker (Local)")
templates = Jinja2Templates(directory="app/templates")
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.on_event("startup")
def _startup() -> None:
    ensure_data_dir()
    Base.metadata.create_all(bind=engine)


def _parse_month(month: str | None) -> date:
    # month: "YYYY-MM"
    if not month:
        today = date.today()
        return date(today.year, today.month, 1)
    try:
        dt = datetime.strptime(month, "%Y-%m").date()
        return date(dt.year, dt.month, 1)
    except ValueError:
        today = date.today()
        return date(today.year, today.month, 1)


def _month_range(month_start: date) -> tuple[date, date]:
    if month_start.month == 12:
        next_month = date(month_start.year + 1, 1, 1)
    else:
        next_month = date(month_start.year, month_start.month + 1, 1)
    return month_start, next_month


def _d(value: str | None, *, default: Decimal | None = Decimal("0")) -> Decimal | None:
    if value is None:
        return default
    s = value.strip()
    if s == "":
        return default
    try:
        return Decimal(s)
    except InvalidOperation:
        raise ValueError(f"Invalid decimal: {value}")


def _i(value: str | None, *, default: int = 0) -> int:
    if value is None:
        return default
    s = value.strip()
    if s == "":
        return default
    try:
        return int(s)
    except ValueError:
        raise ValueError(f"Invalid integer: {value}")


def _calc_unit_price(sales: Decimal, customers: int) -> Decimal | None:
    if customers <= 0:
        return None
    return (sales / Decimal(customers)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _as_money(v: Any) -> Decimal:
    # SQLAlchemy Numeric may come back as Decimal already
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


_NUM_RE = re.compile(r"-?\d[\d,]*(?:\.\d+)?")


def _parse_outsourcing_breakdown(text: str | None) -> list[tuple[str, Decimal]]:
    """
    Parses multi-line breakdown text into [(name, amount), ...].
    Supported examples per line:
      - A 10000
      - A: 10,000
      - Aさんは10,000円
    """
    if text is None:
        return []
    lines = [ln.strip() for ln in text.splitlines()]
    items: list[tuple[str, Decimal]] = []
    for ln in lines:
        if ln == "":
            continue
        matches = list(_NUM_RE.finditer(ln))
        if not matches:
            raise ValueError("外注費内訳の形式が不正です。例: A 10000")
        num = matches[-1].group(0).replace(",", "")
        try:
            amount = Decimal(num).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except InvalidOperation:
            raise ValueError("外注費内訳の金額が不正です。例: A 10000")

        name = (ln[: matches[-1].start()] + ln[matches[-1].end() :]).strip()
        name = name.replace(":", " ").replace("：", " ").replace(",", " ").replace("円", " ").strip()
        name = re.sub(r"\s+", " ", name).strip()
        if name == "":
            name = "（名前なし）"

        items.append((name, amount))
    return items


def _format_outsourcing_breakdown(payments: list[OutsourcingPayment]) -> str:
    return "\n".join([f"{p.staff_name} {p.amount}" for p in payments])


def _validate_payments(store_sales_raw: str | None, cash: Decimal, card: Decimal, qr: Decimal) -> str | None:
    # If store_sales was provided (non-empty), ensure payments sum matches.
    if store_sales_raw is None or store_sales_raw.strip() == "":
        return None
    try:
        store_sales = _d(store_sales_raw, default=None)
    except ValueError:
        return "店舗売上が不正な値です。"
    if store_sales is None:
        return "店舗売上が不正な値です。"
    if (cash + card + qr) != store_sales:
        return "店舗売上と、現金+カード+QRの合計が一致しません。"
    return None


@app.get("/", response_class=HTMLResponse)
def root(request: Request) -> HTMLResponse:
    month = date.today().strftime("%Y-%m")
    return RedirectResponse(url=f"/entries?month={month}", status_code=303)


@app.get("/entries", response_class=HTMLResponse)
def entries(request: Request, month: str | None = None, msg: str | None = None, err: str | None = None, db: Session = Depends(get_db)) -> HTMLResponse:
    month_start = _parse_month(month)
    start, end = _month_range(month_start)

    rows = (
        db.execute(
            select(SalesDaily)
            .options(selectinload(SalesDaily.outsourcing_payments))
            .where(SalesDaily.happened_on >= start, SalesDaily.happened_on < end)
            .order_by(SalesDaily.happened_on.desc())
        )
        .scalars()
        .all()
    )

    total_sales = sum((_as_money(r.sales) for r in rows), Decimal("0"))
    total_customers = sum((r.customers for r in rows), 0)
    total_outsourcing = sum((_as_money(r.outsourcing_cost) for r in rows), Decimal("0"))
    total_points = sum((_as_money(r.used_points) for r in rows), Decimal("0"))
    total_store_sales = sum((_as_money(r.store_sales) for r in rows), Decimal("0"))
    total_cash = sum((_as_money(r.cash_payment) for r in rows), Decimal("0"))
    total_card = sum((_as_money(r.card_payment) for r in rows), Decimal("0"))
    total_qr = sum((_as_money(r.qr_payment) for r in rows), Decimal("0"))

    avg_unit_price = _calc_unit_price(total_sales, total_customers)

    ctx = {
        "request": request,
        "month": month_start.strftime("%Y-%m"),
        "rows": rows,
        "msg": msg,
        "err": err,
        "summary": {
            "total_sales": total_sales,
            "total_customers": total_customers,
            "avg_unit_price": avg_unit_price,
            "total_outsourcing": total_outsourcing,
            "total_points": total_points,
            "total_store_sales": total_store_sales,
            "total_cash": total_cash,
            "total_card": total_card,
            "total_qr": total_qr,
        },
        "today": date.today().isoformat(),
    }
    return templates.TemplateResponse("entries.html", ctx)


@app.post("/entries")
def create_or_update_entry(
    request: Request,
    month: str = Form(...),
    happened_on: str = Form(...),
    sales: str = Form("0"),
    customers: str = Form("0"),
    outsourcing_cost: str = Form("0"),
    outsourcing_breakdown: str = Form(""),
    used_points: str = Form("0"),
    store_sales: str = Form(""),
    cash_payment: str = Form("0"),
    card_payment: str = Form("0"),
    qr_payment: str = Form("0"),
    note: str = Form(""),
    db: Session = Depends(get_db),
):
    try:
        dt = datetime.strptime(happened_on, "%Y-%m-%d").date()
        sales_d = _d(sales) or Decimal("0")
        customers_i = _i(customers)
        outsourcing_d = _d(outsourcing_cost) or Decimal("0")
        points_d = _d(used_points) or Decimal("0")
        cash_d = _d(cash_payment) or Decimal("0")
        card_d = _d(card_payment) or Decimal("0")
        qr_d = _d(qr_payment) or Decimal("0")
    except (ValueError, InvalidOperation):
        return RedirectResponse(url=f"/entries?month={month}&err=入力値が不正です。", status_code=303)

    breakdown_items: list[tuple[str, Decimal]] | None
    if outsourcing_breakdown.strip() == "":
        breakdown_items = None  # treat as "no change" when overwriting an existing date
    else:
        try:
            breakdown_items = _parse_outsourcing_breakdown(outsourcing_breakdown)
        except ValueError as e:
            return RedirectResponse(url=f"/entries?month={month}&err={str(e)}", status_code=303)

    pay_err = _validate_payments(store_sales, cash_d, card_d, qr_d)
    if pay_err:
        return RedirectResponse(url=f"/entries?month={month}&err={pay_err}", status_code=303)

    try:
        store_sales_d = _d(store_sales, default=None)
    except ValueError:
        return RedirectResponse(url=f"/entries?month={month}&err=店舗売上が不正な値です。", status_code=303)
    unit_price_d = _calc_unit_price(sales_d, customers_i)
    note_v = note.strip() or None

    existing = db.execute(select(SalesDaily).where(SalesDaily.happened_on == dt)).scalar_one_or_none()
    if existing:
        existing.sales = sales_d
        existing.customers = customers_i
        existing.unit_price = unit_price_d
        existing.used_points = points_d
        existing.store_sales = store_sales_d
        existing.cash_payment = cash_d
        existing.card_payment = card_d
        existing.qr_payment = qr_d
        existing.note = note_v
        if breakdown_items is not None:
            db.execute(delete(OutsourcingPayment).where(OutsourcingPayment.sales_daily_id == existing.id))
            for name, amount in breakdown_items:
                db.add(OutsourcingPayment(sales_daily_id=existing.id, staff_name=name, amount=amount))
            existing.outsourcing_cost = sum((amt for _, amt in breakdown_items), Decimal("0"))
        else:
            has_existing_breakdown = (
                db.execute(select(OutsourcingPayment.id).where(OutsourcingPayment.sales_daily_id == existing.id).limit(1)).first()
                is not None
            )
            if not has_existing_breakdown:
                existing.outsourcing_cost = outsourcing_d
        msg = "同日のデータを更新しました。"
    else:
        new_row = SalesDaily(
            happened_on=dt,
            sales=sales_d,
            customers=customers_i,
            unit_price=unit_price_d,
            outsourcing_cost=outsourcing_d,
            used_points=points_d,
            store_sales=store_sales_d,
            cash_payment=cash_d,
            card_payment=card_d,
            qr_payment=qr_d,
            note=note_v,
        )
        db.add(new_row)
        db.flush()  # get new_row.id
        if breakdown_items:
            for name, amount in breakdown_items:
                db.add(OutsourcingPayment(sales_daily_id=new_row.id, staff_name=name, amount=amount))
            new_row.outsourcing_cost = sum((amt for _, amt in breakdown_items), Decimal("0"))
        msg = "保存しました。"

    db.commit()
    return RedirectResponse(url=f"/entries?month={month}&msg={msg}", status_code=303)


@app.get("/entries/{entry_id}/edit", response_class=HTMLResponse)
def edit_entry(entry_id: int, request: Request, month: str | None = None, err: str | None = None, db: Session = Depends(get_db)) -> HTMLResponse:
    row = (
        db.execute(select(SalesDaily).options(selectinload(SalesDaily.outsourcing_payments)).where(SalesDaily.id == entry_id))
        .scalars()
        .first()
    )
    if not row:
        m = _parse_month(month).strftime("%Y-%m")
        return RedirectResponse(url=f"/entries?month={m}&err=対象データが見つかりません。", status_code=303)

    month_start = _parse_month(month) if month else date(row.happened_on.year, row.happened_on.month, 1)
    ctx = {
        "request": request,
        "month": month_start.strftime("%Y-%m"),
        "row": row,
        "outsourcing_breakdown": _format_outsourcing_breakdown(row.outsourcing_payments or []),
        "err": err,
    }
    return templates.TemplateResponse("edit.html", ctx)


@app.post("/entries/{entry_id}/edit")
def update_entry(
    entry_id: int,
    month: str = Form(...),
    happened_on: str = Form(...),
    sales: str = Form("0"),
    customers: str = Form("0"),
    outsourcing_cost: str = Form("0"),
    outsourcing_breakdown: str = Form(""),
    used_points: str = Form("0"),
    store_sales: str = Form(""),
    cash_payment: str = Form("0"),
    card_payment: str = Form("0"),
    qr_payment: str = Form("0"),
    note: str = Form(""),
    db: Session = Depends(get_db),
):
    row = db.get(SalesDaily, entry_id)
    if not row:
        return RedirectResponse(url=f"/entries?month={month}&err=対象データが見つかりません。", status_code=303)

    try:
        dt = datetime.strptime(happened_on, "%Y-%m-%d").date()
        sales_d = _d(sales) or Decimal("0")
        customers_i = _i(customers)
        outsourcing_d = _d(outsourcing_cost) or Decimal("0")
        points_d = _d(used_points) or Decimal("0")
        cash_d = _d(cash_payment) or Decimal("0")
        card_d = _d(card_payment) or Decimal("0")
        qr_d = _d(qr_payment) or Decimal("0")
    except (ValueError, InvalidOperation):
        return RedirectResponse(url=f"/entries/{entry_id}/edit?month={month}&err=入力値が不正です。", status_code=303)

    try:
        breakdown_items = _parse_outsourcing_breakdown(outsourcing_breakdown)
    except ValueError as e:
        return RedirectResponse(url=f"/entries/{entry_id}/edit?month={month}&err={str(e)}", status_code=303)

    pay_err = _validate_payments(store_sales, cash_d, card_d, qr_d)
    if pay_err:
        return RedirectResponse(url=f"/entries/{entry_id}/edit?month={month}&err={pay_err}", status_code=303)

    try:
        store_sales_d = _d(store_sales, default=None)
    except ValueError:
        return RedirectResponse(url=f"/entries/{entry_id}/edit?month={month}&err=店舗売上が不正な値です。", status_code=303)
    unit_price_d = _calc_unit_price(sales_d, customers_i)
    note_v = note.strip() or None

    # If happened_on changes, enforce uniqueness by date.
    other = db.execute(select(SalesDaily).where(SalesDaily.happened_on == dt, SalesDaily.id != entry_id)).scalar_one_or_none()
    if other:
        return RedirectResponse(url=f"/entries/{entry_id}/edit?month={month}&err=同じ発生日のデータが既に存在します。", status_code=303)

    row.happened_on = dt
    row.sales = sales_d
    row.customers = customers_i
    row.unit_price = unit_price_d
    row.outsourcing_cost = outsourcing_d
    row.used_points = points_d
    row.store_sales = store_sales_d
    row.cash_payment = cash_d
    row.card_payment = card_d
    row.qr_payment = qr_d
    row.note = note_v
    db.execute(delete(OutsourcingPayment).where(OutsourcingPayment.sales_daily_id == row.id))
    if breakdown_items:
        for name, amount in breakdown_items:
            db.add(OutsourcingPayment(sales_daily_id=row.id, staff_name=name, amount=amount))
        row.outsourcing_cost = sum((amt for _, amt in breakdown_items), Decimal("0"))
    db.commit()

    return RedirectResponse(url=f"/entries?month={month}&msg=更新しました。", status_code=303)


@app.post("/entries/{entry_id}/delete")
def delete_entry(entry_id: int, month: str = Form(...), db: Session = Depends(get_db)):
    row = db.get(SalesDaily, entry_id)
    if row:
        db.execute(delete(OutsourcingPayment).where(OutsourcingPayment.sales_daily_id == row.id))
        db.delete(row)
        db.commit()
    return RedirectResponse(url=f"/entries?month={month}&msg=削除しました。", status_code=303)


@app.get("/export.csv")
def export_csv(month: str | None = None, db: Session = Depends(get_db)):
    month_start = _parse_month(month)
    start, end = _month_range(month_start)
    rows = (
        db.execute(
            select(SalesDaily)
            .options(selectinload(SalesDaily.outsourcing_payments))
            .where(SalesDaily.happened_on >= start, SalesDaily.happened_on < end)
            .order_by(SalesDaily.happened_on.asc())
        )
        .scalars()
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "発生日",
            "売上",
            "客数",
            "客単価",
            "外注費",
            "外注費内訳",
            "利用ポイント",
            "店舗売上",
            "現金決済",
            "カード決済",
            "QR決済",
            "備考",
        ]
    )
    for r in rows:
        writer.writerow(
            [
                r.happened_on.isoformat(),
                str(_as_money(r.sales)),
                r.customers,
                "" if r.unit_price is None else str(_as_money(r.unit_price)),
                str(_as_money(r.outsourcing_cost)),
                "; ".join([f"{p.staff_name}:{p.amount}" for p in (r.outsourcing_payments or [])]),
                str(_as_money(r.used_points)),
                "" if r.store_sales is None else str(_as_money(r.store_sales)),
                str(_as_money(r.cash_payment)),
                str(_as_money(r.card_payment)),
                str(_as_money(r.qr_payment)),
                r.note or "",
            ]
        )

    output.seek(0)
    filename = f"sales_{month_start.strftime('%Y_%m')}.csv"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv; charset=utf-8", headers=headers)

