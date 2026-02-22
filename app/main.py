from __future__ import annotations

import csv
import io
import re
import unicodedata
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


def _yen(value: Any) -> str:
    if value is None:
        return ""
    v = _as_money(value).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return f"{int(v):,}円"


templates.env.filters["yen"] = _yen


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


def _days_in_month(month_start: date) -> int:
    start, end = _month_range(month_start)
    return (end - start).days


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
    for fmt in (
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y.%m.%d",
        "%Y-%m-%d %H:%M",
        "%Y/%m/%d %H:%M",
        "%Y.%m.%d %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
        "%Y.%m.%d %H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%dT%H:%M:%S",
    ):
        try:
            return datetime.strptime(v, fmt).date()
        except ValueError:
            continue
    m = re.search(r"\d{4}[-/.]\d{1,2}[-/.]\d{1,2}", v)
    if m:
        raw = m.group(0)
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d"):
            try:
                return datetime.strptime(raw, fmt).date()
            except ValueError:
                continue
    raise ValueError("日付形式が不正です（例: 2026-01-02）。")


def _parse_day(day: str | None) -> date:
    if not day:
        return date.today()
    try:
        return _parse_date_like(day)
    except ValueError:
        return date.today()


def _decode_csv_bytes(data: bytes) -> str:
    for enc in ("utf-8-sig", "cp932", "utf-8"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    # last resort
    return data.decode("utf-8", errors="replace")


_CSV_DATE_KEYS = ("発生日", "日付", "date", "Date", "決済日時", "決済日", "利用日時", "取引日時")
_CSV_CARD_KEYS = ("カード決済", "card_payment", "カード", "Card")
_CSV_QR_KEYS = ("QR決済", "qr_payment", "QR", "Qr")
_CSV_POINTS_KEYS = ("利用ポイント", "ポイント", "used_points", "points", "Points")
_CSV_GIFT_KEYS = ("利用ギフト券", "ギフト券", "gift", "used_gift")
_CSV_AMOUNT_KEYS = ("決済金額", "決済金額(税込)", "決済金額（税抜）", "請求金額", "支払金額", "取引金額")


def _pick_csv_value(row: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    for key in keys:
        if key in row and row[key] is not None and str(row[key]).strip() != "":
            return str(row[key])
    return None


def _has_any_csv_header(fieldnames: set[str], keys: tuple[str, ...]) -> bool:
    return any(k in fieldnames for k in keys)


def _csv_value_by_index(row: dict[str, Any], fieldnames: list[str], idx: int) -> str | None:
    if idx < 0 or idx >= len(fieldnames):
        return None
    key = fieldnames[idx]
    if key not in row or row[key] is None:
        return None
    value = str(row[key]).strip()
    if value == "":
        return None
    return value


def _looks_like_statement_csv(fieldnames: list[str], rows: list[dict[str, Any]]) -> bool:
    # Heuristic for settlement statement format:
    # [id, datetime, name, amount, used_points, ...]
    if len(fieldnames) < 5:
        return False
    checked = 0
    for row in rows:
        dt = _csv_value_by_index(row, fieldnames, 1)
        amount = _csv_value_by_index(row, fieldnames, 3)
        if not dt or not amount:
            continue
        checked += 1
        try:
            _parse_date_like(dt or "")
            _parse_money_like(amount)
            return True
        except ValueError:
            if checked >= 5:
                break
            continue
    return False


def _infer_amount_target(filename: str | None) -> str:
    normalized = unicodedata.normalize("NFKC", filename or "").lower()
    if "qr" in normalized:
        return "qr"
    return "card"


def _new_daily_payment_bucket() -> dict[str, Decimal]:
    return {
        "card": Decimal("0"),
        "qr": Decimal("0"),
        "points": Decimal("0"),
    }


def _new_daily_presence_bucket() -> dict[str, bool]:
    return {
        "card": False,
        "qr": False,
        "points": False,
    }


@app.get("/", response_class=HTMLResponse)
def root(request: Request) -> HTMLResponse:
    month = date.today().strftime("%Y-%m")
    ctx = {
        "request": request,
        "month": month,
        "title": "トップ - 売上・客数管理",
    }
    return templates.TemplateResponse("top.html", ctx)


@app.get("/entries", response_class=HTMLResponse)
def entries(
    request: Request,
    month: str | None = None,
    day: str | None = None,
    msg: str | None = None,
    err: str | None = None,
    db: Session = Depends(get_db),
) -> HTMLResponse:
    month_start = _parse_month(month)
    start, end = _month_range(month_start)
    dim = _days_in_month(month_start)
    selected_day = _parse_day(day)

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

    # Forecast: average(actual entries) * days_in_month
    forecast_sales: Decimal | None = None
    forecast_customers: int | None = None
    if len(rows) > 0:
        avg_sales_per_entry = (total_sales / Decimal(len(rows)))
        forecast_sales = (avg_sales_per_entry * Decimal(dim)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        avg_customers_per_entry = (Decimal(total_customers) / Decimal(len(rows)))
        forecast_customers = int((avg_customers_per_entry * Decimal(dim)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))

    # Yearly summary (Jan-Dec of selected month year)
    year = month_start.year
    year_start = date(year, 1, 1)
    year_end = date(year + 1, 1, 1)
    year_rows = (
        db.execute(
            select(SalesDaily).where(SalesDaily.happened_on >= year_start, SalesDaily.happened_on < year_end).order_by(SalesDaily.happened_on.asc())
        )
        .scalars()
        .all()
    )

    # monthly buckets
    buckets: dict[int, dict[str, Any]] = {}
    for m in range(1, 13):
        buckets[m] = {
            "month": m,
            "sales": Decimal("0"),
            "customers": 0,
            "outsourcing": Decimal("0"),
            "points": Decimal("0"),
            "store_sales": Decimal("0"),
            "cash": Decimal("0"),
            "card": Decimal("0"),
            "qr": Decimal("0"),
        }
    for r in year_rows:
        m = r.happened_on.month
        b = buckets[m]
        b["sales"] += _as_money(r.sales)
        b["customers"] += int(r.customers or 0)
        b["outsourcing"] += _as_money(r.outsourcing_cost)
        b["points"] += _as_money(r.used_points)
        b["store_sales"] += _as_money(r.computed_store_sales)
        b["cash"] += _as_money(r.computed_cash_payment)
        b["card"] += _as_money(r.card_payment)
        b["qr"] += _as_money(r.qr_payment)

    yearly_total_sales = sum((buckets[m]["sales"] for m in range(1, 13)), Decimal("0"))
    yearly_total_customers = sum((buckets[m]["customers"] for m in range(1, 13)), 0)
    yearly_avg_unit_price = _calc_unit_price(yearly_total_sales, yearly_total_customers)
    yearly_total_outsourcing = sum((buckets[m]["outsourcing"] for m in range(1, 13)), Decimal("0"))
    yearly_total_points = sum((buckets[m]["points"] for m in range(1, 13)), Decimal("0"))
    yearly_total_store_sales = sum((buckets[m]["store_sales"] for m in range(1, 13)), Decimal("0"))
    yearly_total_cash = sum((buckets[m]["cash"] for m in range(1, 13)), Decimal("0"))
    yearly_total_card = sum((buckets[m]["card"] for m in range(1, 13)), Decimal("0"))
    yearly_total_qr = sum((buckets[m]["qr"] for m in range(1, 13)), Decimal("0"))

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
            "forecast_sales": forecast_sales,
            "forecast_customers": forecast_customers,
            "days_in_month": dim,
            "total_outsourcing": total_outsourcing,
            "total_points": total_points,
            "total_store_sales": total_store_sales,
            "total_cash": total_cash,
            "total_card": total_card,
            "total_qr": total_qr,
        },
        "year": year,
        "yearly": {
            "total_sales": yearly_total_sales,
            "total_customers": yearly_total_customers,
            "avg_unit_price": yearly_avg_unit_price,
            "total_outsourcing": yearly_total_outsourcing,
            "total_points": yearly_total_points,
            "total_store_sales": yearly_total_store_sales,
            "total_cash": yearly_total_cash,
            "total_card": yearly_total_card,
            "total_qr": yearly_total_qr,
        },
        "yearly_months": [buckets[m] for m in range(1, 13)],
        "selected_day": selected_day.isoformat(),
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
    except ValueError:
        return RedirectResponse(url=f"/entries?month={month}&err=入力値が不正です。", status_code=303)

    try:
        sales_d = _d(sales) or Decimal("0")
        customers_i = _i(customers)
        outsourcing_d = _d(outsourcing_cost) or Decimal("0")
        points_d = _d(used_points) or Decimal("0")
        card_d = _d(card_payment) or Decimal("0")
        qr_d = _d(qr_payment) or Decimal("0")
    except (ValueError, InvalidOperation):
        return RedirectResponse(url=f"/entries?month={month}&day={dt.isoformat()}&err=入力値が不正です。", status_code=303)

    breakdown_items: list[Decimal] | None
    if outsourcing_breakdown.strip() == "":
        breakdown_items = None  # treat as "no change" when overwriting an existing date
    else:
        try:
            breakdown_items = _parse_outsourcing_amounts(outsourcing_breakdown)
        except ValueError as e:
            return RedirectResponse(url=f"/entries?month={month}&day={dt.isoformat()}&err={str(e)}", status_code=303)

    unit_price_d = _calc_unit_price(sales_d, customers_i)
    note_v = note.strip() or None
    computed_cash = sales_d - points_d - card_d - qr_d
    if computed_cash < 0:
        return RedirectResponse(
            url=f"/entries?month={month}&day={dt.isoformat()}&err=カード+QR+ポイントが売上を超えています。",
            status_code=303,
        )

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
    return RedirectResponse(url=f"/entries?month={month}&day={dt.isoformat()}&msg={msg}", status_code=303)


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
async def import_payments(month: str = Form(...), files: list[UploadFile] = File(...), db: Session = Depends(get_db)):
    if not files:
        return RedirectResponse(url=f"/entries?month={month}&err=CSVファイルを選んでください。", status_code=303)

    invalid_files = [f.filename or "(ファイル名なし)" for f in files if not (f.filename or "").lower().endswith(".csv")]
    if invalid_files:
        names = ", ".join(invalid_files)
        return RedirectResponse(url=f"/entries?month={month}&err=CSV以外のファイルがあります: {names}", status_code=303)

    daily_totals: dict[date, dict[str, Decimal]] = {}
    daily_presence: dict[date, dict[str, bool]] = {}
    row_errors = 0
    file_errors = 0

    for file in files:
        raw = await file.read()
        text = _decode_csv_bytes(raw)
        reader = csv.DictReader(io.StringIO(text))
        if reader.fieldnames is None:
            file_errors += 1
            continue

        rows = list(reader)
        fieldnames = [f or "" for f in reader.fieldnames]
        fieldname_set = set(fieldnames)

        has_card = _has_any_csv_header(fieldname_set, _CSV_CARD_KEYS)
        has_qr = _has_any_csv_header(fieldname_set, _CSV_QR_KEYS)
        has_points = _has_any_csv_header(fieldname_set, _CSV_POINTS_KEYS)
        has_gift = _has_any_csv_header(fieldname_set, _CSV_GIFT_KEYS)
        has_amount = _has_any_csv_header(fieldname_set, _CSV_AMOUNT_KEYS)
        is_statement = False
        amount_target: str | None = None
        if not (has_card or has_qr):
            is_statement = _looks_like_statement_csv(fieldnames, rows)
            if has_amount or is_statement:
                amount_target = _infer_amount_target(file.filename)

        if not (has_card or has_qr or has_points or has_gift or has_amount or is_statement):
            file_errors += 1
            continue

        for r in rows:
            try:
                d_raw = _pick_csv_value(r, _CSV_DATE_KEYS)
                if not d_raw and (has_amount or is_statement):
                    d_raw = _csv_value_by_index(r, fieldnames, 1)
                if not d_raw:
                    raise ValueError("日付が空です。")
                dt = _parse_date_like(d_raw)
                bucket = daily_totals.setdefault(dt, _new_daily_payment_bucket())
                presence = daily_presence.setdefault(dt, _new_daily_presence_bucket())

                if has_card:
                    bucket["card"] += _parse_money_like(_pick_csv_value(r, _CSV_CARD_KEYS))
                    presence["card"] = True
                if has_qr:
                    bucket["qr"] += _parse_money_like(_pick_csv_value(r, _CSV_QR_KEYS))
                    presence["qr"] = True
                if has_points:
                    bucket["points"] += _parse_money_like(_pick_csv_value(r, _CSV_POINTS_KEYS))
                    presence["points"] = True
                if has_gift:
                    # 利用ギフト券も「利用ポイント」と同じ扱いで合算する。
                    bucket["points"] += _parse_money_like(_pick_csv_value(r, _CSV_GIFT_KEYS))
                    presence["points"] = True

                if amount_target is not None:
                    amount_raw = _pick_csv_value(r, _CSV_AMOUNT_KEYS)
                    if amount_raw is None and is_statement:
                        amount_raw = _csv_value_by_index(r, fieldnames, 3)
                    if amount_raw is not None:
                        bucket[amount_target] += _parse_money_like(amount_raw)
                        presence[amount_target] = True

                    if is_statement and not has_points and not has_gift:
                        points_raw = _csv_value_by_index(r, fieldnames, 4)
                        gift_raw = _csv_value_by_index(r, fieldnames, 5)
                        bucket["points"] += _parse_money_like(points_raw) + _parse_money_like(gift_raw)
                        presence["points"] = True
            except ValueError:
                row_errors += 1
                continue

    if not daily_totals:
        total_errors = row_errors + file_errors
        if total_errors > 0:
            return RedirectResponse(url=f"/entries?month={month}&err=有効なCSVデータがありません。エラー{total_errors}件", status_code=303)
        return RedirectResponse(url=f"/entries?month={month}&err=CSVに取り込み対象データがありません。", status_code=303)

    auto_note = "CSV取込で自動作成（売上は決済合計）"
    updated = 0
    created = 0
    skipped = 0
    adjusted_sales = 0

    for dt in sorted(daily_totals.keys()):
        totals = daily_totals[dt]
        presence = daily_presence.get(dt, _new_daily_presence_bucket())
        row = db.execute(select(SalesDaily).where(SalesDaily.happened_on == dt)).scalar_one_or_none()
        card_total = totals["card"] if presence["card"] else Decimal("0")
        qr_total = totals["qr"] if presence["qr"] else Decimal("0")
        points_total = totals["points"] if presence["points"] else Decimal("0")

        if row is None:
            payments_total = card_total + qr_total + points_total
            row = SalesDaily(
                happened_on=dt,
                sales=payments_total,
                customers=0,
                unit_price=None,
                outsourcing_cost=Decimal("0"),
                used_points=points_total,
                card_payment=card_total,
                qr_payment=qr_total,
                note=auto_note,
            )
            row.store_sales = row.computed_store_sales
            row.cash_payment = row.computed_cash_payment
            db.add(row)
            created += 1
            continue

        new_card = card_total if presence["card"] else _as_money(row.card_payment)
        new_qr = qr_total if presence["qr"] else _as_money(row.qr_payment)
        new_points = points_total if presence["points"] else _as_money(row.used_points)
        payments_total = new_card + new_qr + new_points
        current_sales = _as_money(row.sales)

        if current_sales < payments_total:
            # 自動作成に近い行のみ売上を補正し、それ以外は不整合としてスキップする。
            can_adjust_sales = (
                int(row.customers or 0) == 0
                and _as_money(row.outsourcing_cost) == Decimal("0")
                and ((row.note or "").strip() in ("", auto_note))
            )
            if can_adjust_sales:
                row.sales = payments_total
                row.unit_price = None
                if not (row.note or "").strip():
                    row.note = auto_note
                adjusted_sales += 1
            else:
                skipped += 1
                continue

        row.card_payment = new_card
        row.qr_payment = new_qr
        row.used_points = new_points
        row.cash_payment = row.computed_cash_payment
        row.store_sales = row.computed_store_sales
        updated += 1

    db.commit()
    parts = [f"取り込み(日次集計): 更新{updated}件", f"新規{created}件"]
    if adjusted_sales:
        parts.append(f"売上補正{adjusted_sales}件")
    if skipped:
        parts.append(f"スキップ{skipped}件")
    total_errors = row_errors + file_errors
    if total_errors:
        parts.append(f"エラー{total_errors}件")
    msg = " / ".join(parts)
    return RedirectResponse(url=f"/entries?month={month}&msg={msg}", status_code=303)

