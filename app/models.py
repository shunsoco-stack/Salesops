from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class SalesDaily(Base):
    __tablename__ = "sales_daily"
    __table_args__ = (UniqueConstraint("happened_on", name="uq_sales_daily_happened_on"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    happened_on: Mapped[date] = mapped_column(Date, nullable=False)

    sales: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    customers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    outsourcing_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    used_points: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))

    store_sales: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    cash_payment: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    card_payment: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    qr_payment: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))

    note: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    outsourcing_payments: Mapped[list["OutsourcingPayment"]] = relationship(
        back_populates="sales_daily",
        cascade="all, delete-orphan",
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


class OutsourcingPayment(Base):
    __tablename__ = "outsourcing_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sales_daily_id: Mapped[int] = mapped_column(ForeignKey("sales_daily.id"), nullable=False)

    staff_name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)

    sales_daily: Mapped[SalesDaily] = relationship(back_populates="outsourcing_payments")
