from __future__ import annotations

import csv
import io
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any

from fastapi import Depends, FastAPI, File, Form, Request, UploadFile
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


def _parse_outsourcing_amounts(text: str | None) -> list[Decimal]:
    """
    Parses outsourcing breakdown text into [amount, ...].

    Examples:
      - 10000+5000+5000
      - 10000
        5000
        5000
    """
    if text is None:
        return []
    matches = _NUM_RE.findall(text)
    if not matches:
        raise ValueError("外注費内訳の形式が不正です。例: 10000+5000+5000")
    amounts: list[Decimal] = []
    for m in matches:
        num = m.replace(",", "")
        try:
            amt = Decimal(num).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except InvalidOperation:
            raise ValueError("外注費内訳の金額が不正です。例: 10000+5000+5000")
        amounts.append(amt)
    return amounts


def _format_outsourcing_amounts(payments: list[OutsourcingPayment]) -> str:
    # textarea shows one amount per line
    return "\n".join([str(p.amount) for p in payments])


def _parse_money_like(value: str | None) -> Decimal:
    if value is None:
        return Decimal("0")
    s = value.strip()
    if s == "":
        return Decimal("0")
    s = s.replace(",", "")
    try:
        return Decimal(s)
    except InvalidOperation:
        raise ValueError("金額が不正です。")


def _parse_date_like(value: str) -> date:
    v = value.strip()
    if v == "":
        raise ValueError("日付が空です。")
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d"):
        try:
            return datetime.strptime(v, fmt).date()
        except ValueError:
            continue
    raise ValueError("日付形式が不正です（例: 2026-01-02）。")


def _decode_csv_bytes(data: bytes) -> str:
    for enc in ("utf-8-sig", "cp932", "utf-8"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    # last resort
    return data.decode("utf-8", errors="replace")


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
    total_store_sales = sum((_as_money(r.computed_store_sales) for r in rows), Decimal("0"))
    total_cash = sum((_as_money(r.computed_cash_payment) for r in rows), Decimal("0"))
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
        card_d = _d(card_payment) or Decimal("0")
        qr_d = _d(qr_payment) or Decimal("0")
    except (ValueError, InvalidOperation):
        return RedirectResponse(url=f"/entries?month={month}&err=入力値が不正です。", status_code=303)

    breakdown_items: list[Decimal] | None
    if outsourcing_breakdown.strip() == "":
        breakdown_items = None  # treat as "no change" when overwriting an existing date
    else:
        try:
            breakdown_items = _parse_outsourcing_amounts(outsourcing_breakdown)
        except ValueError as e:
            return RedirectResponse(url=f"/entries?month={month}&err={str(e)}", status_code=303)

    unit_price_d = _calc_unit_price(sales_d, customers_i)
    note_v = note.strip() or None
    computed_cash = sales_d - points_d - card_d - qr_d
    if computed_cash < 0:
        return RedirectResponse(url=f"/entries?month={month}&err=カード+QR+ポイントが売上を超えています。", status_code=303)

    existing = db.execute(select(SalesDaily).where(SalesDaily.happened_on == dt)).scalar_one_or_none()
    if existing:
        existing.sales = sales_d
        existing.customers = customers_i
        existing.unit_price = unit_price_d
        existing.used_points = points_d
        existing.card_payment = card_d
        existing.qr_payment = qr_d
        existing.note = note_v
        if breakdown_items is not None:
            db.execute(delete(OutsourcingPayment).where(OutsourcingPayment.sales_daily_id == existing.id))
            for amount in breakdown_items:
                db.add(OutsourcingPayment(sales_daily_id=existing.id, staff_name="", amount=amount))
            existing.outsourcing_cost = sum((amt for amt in breakdown_items), Decimal("0"))
        else:
            has_existing_breakdown = (
                db.execute(select(OutsourcingPayment.id).where(OutsourcingPayment.sales_daily_id == existing.id).limit(1)).first()
                is not None
            )
            if not has_existing_breakdown:
                existing.outsourcing_cost = outsourcing_d
        # computed fields
        existing.store_sales = existing.computed_store_sales
        existing.cash_payment = existing.computed_cash_payment
        msg = "同日のデータを更新しました。"
    else:
        new_row = SalesDaily(
            happened_on=dt,
            sales=sales_d,
            customers=customers_i,
            unit_price=unit_price_d,
            outsourcing_cost=outsourcing_d,
            used_points=points_d,
            card_payment=card_d,
            qr_payment=qr_d,
            note=note_v,
        )
        db.add(new_row)
        db.flush()  # get new_row.id
        if breakdown_items:
            for amount in breakdown_items:
                db.add(OutsourcingPayment(sales_daily_id=new_row.id, staff_name="", amount=amount))
            new_row.outsourcing_cost = sum((amt for amt in breakdown_items), Decimal("0"))
        new_row.store_sales = new_row.computed_store_sales
        new_row.cash_payment = new_row.computed_cash_payment
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
        "outsourcing_breakdown": _format_outsourcing_amounts(row.outsourcing_payments or []),
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
        card_d = _d(card_payment) or Decimal("0")
        qr_d = _d(qr_payment) or Decimal("0")
    except (ValueError, InvalidOperation):
        return RedirectResponse(url=f"/entries/{entry_id}/edit?month={month}&err=入力値が不正です。", status_code=303)

    if outsourcing_breakdown.strip() == "":
        breakdown_items = []  # allow clearing breakdown
    else:
        try:
            breakdown_items = _parse_outsourcing_amounts(outsourcing_breakdown)
        except ValueError as e:
            return RedirectResponse(url=f"/entries/{entry_id}/edit?month={month}&err={str(e)}", status_code=303)

    computed_cash = sales_d - points_d - card_d - qr_d
    if computed_cash < 0:
        return RedirectResponse(url=f"/entries/{entry_id}/edit?month={month}&err=カード+QR+ポイントが売上を超えています。", status_code=303)
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
    row.card_payment = card_d
    row.qr_payment = qr_d
    row.note = note_v
    db.execute(delete(OutsourcingPayment).where(OutsourcingPayment.sales_daily_id == row.id))
    if breakdown_items:
        for amount in breakdown_items:
            db.add(OutsourcingPayment(sales_daily_id=row.id, staff_name="", amount=amount))
        row.outsourcing_cost = sum((amt for amt in breakdown_items), Decimal("0"))
    row.store_sales = row.computed_store_sales
    row.cash_payment = row.computed_cash_payment
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
                "+".join([str(p.amount) for p in (r.outsourcing_payments or [])]),
                str(_as_money(r.used_points)),
                str(_as_money(r.computed_store_sales)),
                str(_as_money(r.computed_cash_payment)),
                str(_as_money(r.card_payment)),
                str(_as_money(r.qr_payment)),
                r.note or "",
            ]
        )

    output.seek(0)
    filename = f"sales_{month_start.strftime('%Y_%m')}.csv"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv; charset=utf-8", headers=headers)


@app.post("/import-payments")
async def import_payments(month: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".csv"):
        return RedirectResponse(url=f"/entries?month={month}&err=CSVファイルを選んでください。", status_code=303)

    raw = await file.read()
    text = _decode_csv_bytes(raw)
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        return RedirectResponse(url=f"/entries?month={month}&err=CSVのヘッダーが読み取れません。", status_code=303)

    # header variants
    def pick(row: dict[str, str], *keys: str) -> str | None:
        for k in keys:
            if k in row and row[k] is not None and str(row[k]).strip() != "":
                return str(row[k])
        return None

    updated = 0
    skipped = 0
    errors = 0
    for r in reader:
        try:
            d_raw = pick(r, "発生日", "日付", "date", "Date")
            if not d_raw:
                errors += 1
                continue
            dt = _parse_date_like(d_raw)
            card_raw = pick(r, "カード決済", "card_payment", "カード", "Card")
            qr_raw = pick(r, "QR決済", "qr_payment", "QR", "Qr")
            card = _parse_money_like(card_raw)
            qr = _parse_money_like(qr_raw)
        except ValueError:
            errors += 1
            continue

        row = db.execute(select(SalesDaily).where(SalesDaily.happened_on == dt)).scalar_one_or_none()
        if not row:
            skipped += 1
            continue

        row.card_payment = card
        row.qr_payment = qr
        # recompute derived fields
        row.cash_payment = row.computed_cash_payment
        row.store_sales = row.computed_store_sales
        updated += 1

    db.commit()
    if errors:
        return RedirectResponse(url=f"/entries?month={month}&msg=取り込み: 更新{updated}件 / スキップ{skipped}件 / エラー{errors}件", status_code=303)
    return RedirectResponse(url=f"/entries?month={month}&msg=取り込み: 更新{updated}件 / スキップ{skipped}件", status_code=303)

