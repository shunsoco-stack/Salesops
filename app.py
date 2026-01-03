import csv
import json
import os
import re
import sqlite3
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


ROOT_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT_DIR / "public"
DATA_DIR = ROOT_DIR / "data"
DB_PATH = Path(os.environ.get("SALON_DB", str(ROOT_DIR / "salon.db")))


def now_iso() -> str:
    # ISO-8601, seconds precision, local time
    return datetime.now().replace(microsecond=0).isoformat()


def db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db_connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS menus (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name_ja TEXT NOT NULL,
              name_th TEXT,
              price_yen INTEGER NOT NULL,
              share_percent INTEGER NOT NULL DEFAULT 50,
              active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS therapists (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name_ja TEXT NOT NULL,
              name_th TEXT,
              active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS entries (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              date TEXT NOT NULL, -- YYYY-MM-DD
              therapist_id INTEGER NOT NULL,
              menu_id INTEGER NOT NULL,
              menu_name_ja_snapshot TEXT NOT NULL,
              menu_name_th_snapshot TEXT,
              price_yen_snapshot INTEGER NOT NULL,
              payout_yen_snapshot INTEGER NOT NULL,
              created_at TEXT NOT NULL,
              FOREIGN KEY (therapist_id) REFERENCES therapists(id),
              FOREIGN KEY (menu_id) REFERENCES menus(id)
            );

            CREATE INDEX IF NOT EXISTS idx_entries_day ON entries(date, therapist_id);
            """
        )


def seed_initial_menus_if_empty() -> None:
    csv_path = DATA_DIR / "initial_menus.csv"
    if not csv_path.exists():
        return

    with db_connect() as conn:
        cur = conn.execute("SELECT COUNT(*) AS c FROM menus;")
        count = int(cur.fetchone()["c"])
        if count > 0:
            return

        ts = now_iso()
        with csv_path.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = []
            for r in reader:
                name_ja = (r.get("menu_name_ja") or "").strip()
                name_th = (r.get("menu_name_th") or "").strip() or None
                price = int((r.get("price_yen") or "0").replace(",", "").strip() or "0")
                if not name_ja or price < 0:
                    continue
                rows.append((name_ja, name_th, price, 50, 1, ts, ts))

        conn.executemany(
            """
            INSERT INTO menus (name_ja, name_th, price_yen, share_percent, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """,
            rows,
        )


DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class Handler(BaseHTTPRequestHandler):
    server_version = "SalonPayout/0.1"

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, obj) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self._send(status, body, "application/json; charset=utf-8")

    def _text(self, status: int, text: str) -> None:
        self._send(status, text.encode("utf-8"), "text/plain; charset=utf-8")

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length") or "0")
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return None

    def _serve_file(self, path: Path) -> None:
        if not path.exists() or not path.is_file():
            self._text(404, "Not Found")
            return
        data = path.read_bytes()
        ctype = "application/octet-stream"
        if path.suffix == ".html":
            ctype = "text/html; charset=utf-8"
        elif path.suffix == ".css":
            ctype = "text/css; charset=utf-8"
        elif path.suffix == ".js":
            ctype = "application/javascript; charset=utf-8"
        self._send(200, data, ctype)

    def do_GET(self):
        u = urlparse(self.path)
        path = u.path
        qs = parse_qs(u.query)

        if path == "/":
            return self._serve_file(PUBLIC_DIR / "index.html")
        if path == "/admin":
            return self._serve_file(PUBLIC_DIR / "admin.html")
        if path in ("/styles.css", "/app.js", "/admin.js"):
            return self._serve_file(PUBLIC_DIR / path.lstrip("/"))
        if path.startswith("/api/"):
            return self._handle_api_get(path, qs)

        self._text(404, "Not Found")

    def do_POST(self):
        u = urlparse(self.path)
        path = u.path
        if not path.startswith("/api/"):
            return self._text(404, "Not Found")
        return self._handle_api_post(path)

    def do_PUT(self):
        u = urlparse(self.path)
        path = u.path
        if not path.startswith("/api/"):
            return self._text(404, "Not Found")
        return self._handle_api_put(path)

    def do_DELETE(self):
        u = urlparse(self.path)
        path = u.path
        if not path.startswith("/api/"):
            return self._text(404, "Not Found")
        return self._handle_api_delete(path)

    # --- API GET ---
    def _handle_api_get(self, path: str, qs) -> None:
        if path == "/api/menus":
            include_all = (qs.get("all") or ["0"])[0] == "1"
            with db_connect() as conn:
                if include_all:
                    rows = conn.execute(
                        """
                        SELECT id, name_ja, name_th, price_yen, share_percent, active
                        FROM menus
                        ORDER BY id ASC;
                        """
                    ).fetchall()
                else:
                    rows = conn.execute(
                        """
                        SELECT id, name_ja, name_th, price_yen, share_percent, active
                        FROM menus
                        WHERE active = 1
                        ORDER BY id ASC;
                        """
                    ).fetchall()
            return self._json(200, {"items": [dict(r) | {"active": bool(r["active"])} for r in rows]})

        if path == "/api/therapists":
            include_all = (qs.get("all") or ["0"])[0] == "1"
            with db_connect() as conn:
                if include_all:
                    rows = conn.execute(
                        """
                        SELECT id, name_ja, name_th, active
                        FROM therapists
                        ORDER BY id ASC;
                        """
                    ).fetchall()
                else:
                    rows = conn.execute(
                        """
                        SELECT id, name_ja, name_th, active
                        FROM therapists
                        WHERE active = 1
                        ORDER BY id ASC;
                        """
                    ).fetchall()
            return self._json(200, {"items": [dict(r) | {"active": bool(r["active"])} for r in rows]})

        if path == "/api/day":
            date = (qs.get("date") or [""])[0]
            therapist_id = (qs.get("therapist_id") or [""])[0]
            if not DATE_RE.match(date):
                return self._text(400, "Invalid date")
            try:
                therapist_id_int = int(therapist_id)
            except Exception:
                return self._text(400, "Invalid therapist_id")

            with db_connect() as conn:
                rows = conn.execute(
                    """
                    SELECT id, menu_name_ja_snapshot, menu_name_th_snapshot, price_yen_snapshot, payout_yen_snapshot
                    FROM entries
                    WHERE date = ? AND therapist_id = ?
                    ORDER BY id ASC;
                    """,
                    (date, therapist_id_int),
                ).fetchall()
                totals = conn.execute(
                    """
                    SELECT
                      COALESCE(SUM(price_yen_snapshot), 0) AS sales_yen,
                      COALESCE(SUM(payout_yen_snapshot), 0) AS payout_yen
                    FROM entries
                    WHERE date = ? AND therapist_id = ?;
                    """,
                    (date, therapist_id_int),
                ).fetchone()

            return self._json(
                200,
                {
                    "entries": [dict(r) for r in rows],
                    "totals": {"sales_yen": int(totals["sales_yen"]), "payout_yen": int(totals["payout_yen"])},
                },
            )

        return self._text(404, "Not Found")

    # --- API POST ---
    def _handle_api_post(self, path: str) -> None:
        body = self._read_json_body()
        if body is None:
            return self._text(400, "Invalid JSON")

        if path == "/api/therapists":
            name_ja = str(body.get("name_ja") or "").strip()
            name_th = str(body.get("name_th") or "").strip() or None
            if not name_ja:
                return self._text(400, "name_ja is required")
            ts = now_iso()
            with db_connect() as conn:
                cur = conn.execute(
                    """
                    INSERT INTO therapists (name_ja, name_th, active, created_at, updated_at)
                    VALUES (?, ?, 1, ?, ?);
                    """,
                    (name_ja, name_th, ts, ts),
                )
                therapist_id = int(cur.lastrowid)
            return self._json(201, {"id": therapist_id})

        if path == "/api/menus":
            name_ja = str(body.get("name_ja") or "").strip()
            name_th = str(body.get("name_th") or "").strip() or None
            try:
                price_yen = int(body.get("price_yen"))
                share_percent = int(body.get("share_percent", 50))
            except Exception:
                return self._text(400, "Invalid price/share")
            if not name_ja:
                return self._text(400, "name_ja is required")
            if price_yen < 0:
                return self._text(400, "price_yen must be >= 0")
            if share_percent < 0 or share_percent > 100:
                return self._text(400, "share_percent must be 0..100")

            ts = now_iso()
            with db_connect() as conn:
                cur = conn.execute(
                    """
                    INSERT INTO menus (name_ja, name_th, price_yen, share_percent, active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 1, ?, ?);
                    """,
                    (name_ja, name_th, price_yen, share_percent, ts, ts),
                )
                menu_id = int(cur.lastrowid)
            return self._json(201, {"id": menu_id})

        if path == "/api/entries":
            date = str(body.get("date") or "").strip()
            if not DATE_RE.match(date):
                return self._text(400, "Invalid date")
            try:
                therapist_id = int(body.get("therapist_id"))
                menu_id = int(body.get("menu_id"))
            except Exception:
                return self._text(400, "Invalid therapist_id/menu_id")

            with db_connect() as conn:
                therapist = conn.execute(
                    "SELECT id, active FROM therapists WHERE id = ?;", (therapist_id,)
                ).fetchone()
                if therapist is None:
                    return self._text(400, "Therapist not found")
                if int(therapist["active"]) != 1:
                    return self._text(400, "Therapist is inactive")

                menu = conn.execute(
                    """
                    SELECT id, name_ja, name_th, price_yen, share_percent, active
                    FROM menus WHERE id = ?;
                    """,
                    (menu_id,),
                ).fetchone()
                if menu is None:
                    return self._text(400, "Menu not found")
                if int(menu["active"]) != 1:
                    return self._text(400, "Menu is inactive")

                price = int(menu["price_yen"])
                share = int(menu["share_percent"])
                payout = int((price * share) // 100)
                ts = now_iso()
                cur = conn.execute(
                    """
                    INSERT INTO entries (
                      date, therapist_id, menu_id,
                      menu_name_ja_snapshot, menu_name_th_snapshot,
                      price_yen_snapshot, payout_yen_snapshot,
                      created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        date,
                        therapist_id,
                        menu_id,
                        str(menu["name_ja"]),
                        str(menu["name_th"]) if menu["name_th"] is not None else None,
                        price,
                        payout,
                        ts,
                    ),
                )
                entry_id = int(cur.lastrowid)
            return self._json(201, {"id": entry_id})

        return self._text(404, "Not Found")

    # --- API PUT ---
    def _handle_api_put(self, path: str) -> None:
        body = self._read_json_body()
        if body is None:
            return self._text(400, "Invalid JSON")

        m = re.match(r"^/api/menus/(\d+)$", path)
        if m:
            menu_id = int(m.group(1))
            name_ja = str(body.get("name_ja") or "").strip()
            name_th = str(body.get("name_th") or "").strip() or None
            try:
                price_yen = int(body.get("price_yen"))
                share_percent = int(body.get("share_percent", 50))
                active = 1 if bool(body.get("active", True)) else 0
            except Exception:
                return self._text(400, "Invalid fields")
            if not name_ja:
                return self._text(400, "name_ja is required")
            if price_yen < 0:
                return self._text(400, "price_yen must be >= 0")
            if share_percent < 0 or share_percent > 100:
                return self._text(400, "share_percent must be 0..100")
            ts = now_iso()
            with db_connect() as conn:
                cur = conn.execute(
                    """
                    UPDATE menus
                    SET name_ja = ?, name_th = ?, price_yen = ?, share_percent = ?, active = ?, updated_at = ?
                    WHERE id = ?;
                    """,
                    (name_ja, name_th, price_yen, share_percent, active, ts, menu_id),
                )
                if cur.rowcount == 0:
                    return self._text(404, "Menu not found")
            return self._json(200, {"ok": True})

        t = re.match(r"^/api/therapists/(\d+)$", path)
        if t:
            therapist_id = int(t.group(1))
            name_ja = str(body.get("name_ja") or "").strip()
            name_th = str(body.get("name_th") or "").strip() or None
            active = 1 if bool(body.get("active", True)) else 0
            if not name_ja:
                return self._text(400, "name_ja is required")
            ts = now_iso()
            with db_connect() as conn:
                cur = conn.execute(
                    """
                    UPDATE therapists
                    SET name_ja = ?, name_th = ?, active = ?, updated_at = ?
                    WHERE id = ?;
                    """,
                    (name_ja, name_th, active, ts, therapist_id),
                )
                if cur.rowcount == 0:
                    return self._text(404, "Therapist not found")
            return self._json(200, {"ok": True})

        return self._text(404, "Not Found")

    # --- API DELETE ---
    def _handle_api_delete(self, path: str) -> None:
        m = re.match(r"^/api/entries/(\d+)$", path)
        if m:
            entry_id = int(m.group(1))
            with db_connect() as conn:
                cur = conn.execute("DELETE FROM entries WHERE id = ?;", (entry_id,))
                if cur.rowcount == 0:
                    return self._text(404, "Entry not found")
            return self._json(200, {"ok": True})
        return self._text(404, "Not Found")

    def log_message(self, format, *args):
        # Keep logs concise
        return


def main() -> None:
    init_db()
    seed_initial_menus_if_empty()

    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"Salon payout app running: http://{host}:{port}")
    print(f"DB: {DB_PATH}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()

