from __future__ import annotations

from datetime import date, datetime, timedelta

import pandas as pd
import streamlit as st
from sqlmodel import Session

from salon_app.db import get_engine, init_db
from salon_app.models import MenuItem, Therapist
from salon_app.repository import (
    add_treatment_record,
    build_lookup,
    list_active_menus,
    list_active_therapists,
    list_menus,
    list_records,
    list_therapists,
    mark_paid_out,
    record_to_calc_row,
    upsert_menu,
    upsert_therapist,
)


st.set_page_config(page_title="サロン施術・日払い管理", page_icon="🧾", layout="wide")


@st.cache_resource
def _engine():
    engine = get_engine()
    init_db(engine)
    return engine


def yen(n: int) -> str:
    try:
        return f"{int(n):,}円"
    except Exception:
        return f"{n}円"


def payout_type_label(x: str) -> str:
    return {"fixed": "固定(円)", "percent": "％(売上に対して)"}.get(x, x)


def payout_type_from_label(label: str) -> str:
    inv = {"固定(円)": "fixed", "％(売上に対して)": "percent"}
    return inv.get(label, label)


def page_entry(session: Session) -> None:
    st.subheader("施術の入力")

    therapists = list_active_therapists(session)
    menus = list_active_menus(session)

    if not therapists:
        st.info("セラピストが未登録です。先に「マスタ（セラピスト）」で登録してください。")
        return
    if not menus:
        st.info("メニューが未登録です。先に「マスタ（メニュー）」で登録してください。")
        return

    therapist_map = {t.name: t for t in therapists}
    menu_map = {m.name: m for m in menus}

    with st.form("entry_form", clear_on_submit=True):
        col1, col2, col3, col4 = st.columns([1.1, 1.2, 1.2, 0.8])
        with col1:
            treatment_date = st.date_input("日付", value=date.today())
        with col2:
            therapist_name = st.selectbox("セラピスト", options=list(therapist_map.keys()))
        with col3:
            menu_name = st.selectbox("メニュー", options=list(menu_map.keys()))
        with col4:
            quantity = st.number_input("数量", min_value=1, max_value=50, value=1, step=1)

        therapist = therapist_map[therapist_name]
        menu = menu_map[menu_name]

        st.caption("※ 価格と歩合はメニュー設定を自動で使用します（必要なら下で上書きできます）。")
        override = st.checkbox("メニュー設定を上書きする", value=False)

        col5, col6, col7 = st.columns([1, 1, 1])
        with col5:
            unit_price = st.number_input("単価(円)", min_value=0, max_value=500000, value=int(menu.price_yen), step=100)
        with col6:
            payout_type_label_sel = st.selectbox("歩合種別", options=["固定(円)", "％(売上に対して)"], index=0 if menu.payout_type == "fixed" else 1)
        with col7:
            default_step = 100 if payout_type_from_label(payout_type_label_sel) == "fixed" else 5
            payout_value = st.number_input(
                "歩合値",
                min_value=0.0,
                max_value=1000000.0,
                value=float(menu.payout_value),
                step=float(default_step),
            )

        memo = st.text_input("メモ（任意）", value="")

        submitted = st.form_submit_button("登録する")

    if submitted:
        pt = menu.payout_type
        pv = menu.payout_value
        up = menu.price_yen
        if override:
            pt = payout_type_from_label(payout_type_label_sel)
            pv = float(payout_value)
            up = int(unit_price)

        add_treatment_record(
            session,
            treatment_date=treatment_date,
            therapist=therapist,
            menu=menu,
            quantity=int(quantity),
            unit_price_yen=int(up),
            payout_type=pt,
            payout_value=float(pv),
            memo=memo,
        )
        st.success("登録しました。")


def page_daily(session: Session) -> None:
    st.subheader("日次集計（支払い計算）")

    therapists = list_therapists(session, include_inactive=False)
    menus = list_menus(session, include_inactive=False)
    t_lookup = build_lookup(therapists)
    m_lookup = build_lookup(menus)

    col1, col2, col3 = st.columns([1.1, 1.3, 1.2])
    with col1:
        target_date = st.date_input("対象日", value=date.today())
    with col2:
        therapist_options = ["全員"] + [t.name for t in therapists]
        therapist_sel = st.selectbox("セラピスト絞り込み", therapist_options)
    with col3:
        include_paid = st.checkbox("支払い済みも表示", value=True)

    therapist_id = None
    if therapist_sel != "全員":
        therapist_id = next((t.id for t in therapists if t.name == therapist_sel), None)

    records = list_records(session, from_date=target_date, to_date=target_date, therapist_id=therapist_id, include_paid=include_paid)

    rows = []
    for r in records:
        t = t_lookup.get(r.therapist_id)
        m = m_lookup.get(r.menu_item_id)
        if not t or not m:
            continue
        rows.append(record_to_calc_row(record=r, therapist=t, menu=m))

    if not rows:
        st.info("該当データがありません。")
        return

    df = pd.DataFrame(rows)
    # Human-friendly labels for payout type
    df["歩合種別"] = df["歩合種別"].map(payout_type_label)

    total_sales = int(df["売上(円)"].sum())
    total_payout = int(df["支払額(円)"].sum())

    k1, k2, k3 = st.columns(3)
    k1.metric("売上合計", yen(total_sales))
    k2.metric("支払い合計（歩合）", yen(total_payout))
    k3.metric("件数", int(len(df)))

    st.dataframe(
        df[
            [
                "日付",
                "セラピスト",
                "メニュー",
                "数量",
                "単価(円)",
                "売上(円)",
                "歩合種別",
                "歩合値",
                "支払額(円)",
                "支払い済み",
                "メモ",
            ]
        ],
        use_container_width=True,
        hide_index=True,
    )

    st.divider()
    col_a, col_b = st.columns([1, 2])
    with col_a:
        if st.button("この日の未支払いを「支払い済み」にする"):
            updated = mark_paid_out(session, target_date=target_date, therapist_id=therapist_id)
            st.success(f"{updated}件を支払い済みに更新しました。画面を再読み込みしてください。")
    with col_b:
        st.caption("※ 日払い運用向け：対象日の未支払いレコードだけをまとめて支払い済みにできます。")


def page_master_therapists(session: Session) -> None:
    st.subheader("マスタ（セラピスト）")

    therapists = list_therapists(session, include_inactive=True)
    df = pd.DataFrame(
        [
            {
                "id": t.id,
                "名前": t.name,
                "稼働中": t.active,
                "歩合倍率": t.commission_multiplier,
                "メモ": t.notes,
            }
            for t in therapists
        ]
    )
    st.dataframe(df, use_container_width=True, hide_index=True)

    st.divider()
    st.caption("新規追加 / 更新")
    with st.form("therapist_form"):
        col1, col2, col3 = st.columns([1, 1, 1])
        with col1:
            tid = st.number_input("id（新規は0）", min_value=0, max_value=999999, value=0, step=1)
        with col2:
            name = st.text_input("名前", value="")
        with col3:
            active = st.checkbox("稼働中", value=True)
        col4, col5 = st.columns([1, 2])
        with col4:
            multiplier = st.number_input("歩合倍率（例: 1.0）", min_value=0.0, max_value=10.0, value=1.0, step=0.1)
        with col5:
            notes = st.text_input("メモ", value="")

        submitted = st.form_submit_button("保存")

    if submitted:
        if not name.strip():
            st.error("名前は必須です。")
            return
        t = Therapist(id=int(tid) or None, name=name.strip(), active=bool(active), commission_multiplier=float(multiplier), notes=notes or "")
        upsert_therapist(session, t)
        st.success("保存しました。画面を再読み込みしてください。")


def page_master_menus(session: Session) -> None:
    st.subheader("マスタ（メニュー）")

    menus = list_menus(session, include_inactive=True)
    df = pd.DataFrame(
        [
            {
                "id": m.id,
                "名前": m.name,
                "価格(円)": m.price_yen,
                "歩合種別": payout_type_label(m.payout_type),
                "歩合値": m.payout_value,
                "有効": m.active,
                "メモ": m.notes,
            }
            for m in menus
        ]
    )
    st.dataframe(df, use_container_width=True, hide_index=True)

    st.divider()
    st.caption("新規追加 / 更新")
    with st.form("menu_form"):
        col1, col2, col3 = st.columns([1, 1.2, 1.2])
        with col1:
            mid = st.number_input("id（新規は0）", min_value=0, max_value=999999, value=0, step=1)
        with col2:
            name = st.text_input("メニュー名", value="")
        with col3:
            active = st.checkbox("有効", value=True)

        col4, col5, col6 = st.columns([1, 1, 1])
        with col4:
            price = st.number_input("価格(円)", min_value=0, max_value=500000, value=0, step=100)
        with col5:
            pt_label = st.selectbox("歩合種別", options=["固定(円)", "％(売上に対して)"], index=0)
        with col6:
            step = 100 if payout_type_from_label(pt_label) == "fixed" else 5
            pv = st.number_input("歩合値", min_value=0.0, max_value=1000000.0, value=0.0, step=float(step))

        notes = st.text_input("メモ", value="")
        submitted = st.form_submit_button("保存")

    if submitted:
        if not name.strip():
            st.error("メニュー名は必須です。")
            return
        menu = MenuItem(
            id=int(mid) or None,
            name=name.strip(),
            price_yen=int(price),
            payout_type=payout_type_from_label(pt_label),
            payout_value=float(pv),
            active=bool(active),
            notes=notes or "",
        )
        upsert_menu(session, menu)
        st.success("保存しました。画面を再読み込みしてください。")


def page_export(session: Session) -> None:
    st.subheader("エクスポート（CSV）")

    col1, col2, col3 = st.columns([1.2, 1.2, 1])
    with col1:
        from_date = st.date_input("開始日", value=date.today() - timedelta(days=30))
    with col2:
        to_date = st.date_input("終了日", value=date.today())
    with col3:
        include_paid = st.checkbox("支払い済みも含める", value=True)

    therapists = list_therapists(session, include_inactive=True)
    menus = list_menus(session, include_inactive=True)
    t_lookup = build_lookup(therapists)
    m_lookup = build_lookup(menus)

    records = list_records(session, from_date=from_date, to_date=to_date, therapist_id=None, include_paid=include_paid)
    rows = []
    for r in records:
        t = t_lookup.get(r.therapist_id)
        m = m_lookup.get(r.menu_item_id)
        if not t or not m:
            continue
        rows.append(record_to_calc_row(record=r, therapist=t, menu=m))

    if not rows:
        st.info("該当データがありません。")
        return

    df = pd.DataFrame(rows)
    df["歩合種別"] = df["歩合種別"].map(payout_type_label)

    st.dataframe(df, use_container_width=True, hide_index=True)

    csv_bytes = df.to_csv(index=False).encode("utf-8-sig")
    filename = f"salon_records_{from_date}_{to_date}.csv"
    st.download_button("CSVをダウンロード", data=csv_bytes, file_name=filename, mime="text/csv")

    st.caption("※ 文字化けしにくいように UTF-8 (BOM付き) で出力します。")


def seed_if_empty(session: Session) -> None:
    # Minimal sample data for first-time usage (only if empty)
    if list_therapists(session, include_inactive=True) or list_menus(session, include_inactive=True):
        return

    upsert_therapist(session, Therapist(name="セラピストA", commission_multiplier=1.0))
    upsert_therapist(session, Therapist(name="セラピストB", commission_multiplier=1.0))
    upsert_menu(session, MenuItem(name="もみほぐし 60分", price_yen=6000, payout_type="percent", payout_value=60))
    upsert_menu(session, MenuItem(name="オイル 60分", price_yen=8000, payout_type="percent", payout_value=60))
    upsert_menu(session, MenuItem(name="延長 10分", price_yen=1000, payout_type="fixed", payout_value=500))


def main() -> None:
    st.title("サロン施術・日払い管理（MVP）")
    st.caption("紙のメニュー記録と日払い計算を、入力→集計→支払い済み更新→CSV出力まで一元化します。")

    engine = _engine()
    with Session(engine) as session:
        seed_if_empty(session)

        page = st.sidebar.radio(
            "メニュー",
            options=["施術の入力", "日次集計", "マスタ（セラピスト）", "マスタ（メニュー）", "エクスポート"],
        )

        if page == "施術の入力":
            page_entry(session)
        elif page == "日次集計":
            page_daily(session)
        elif page == "マスタ（セラピスト）":
            page_master_therapists(session)
        elif page == "マスタ（メニュー）":
            page_master_menus(session)
        elif page == "エクスポート":
            page_export(session)

        st.sidebar.divider()
        st.sidebar.caption(f"DB: data/salon.db  |  起動: {datetime.now().strftime('%Y-%m-%d %H:%M')}")


if __name__ == "__main__":
    main()

