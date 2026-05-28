import duckdb
import logging
import re
import psycopg2
import psycopg2.extras
from urllib.parse import urlparse, unquote
from app.core.config import settings

logger = logging.getLogger(__name__)

#
# ── DuckDB (Modo Simulación / MOCK_MODE) ──────────────────────────────────────
#

# Conexión en memoria de DuckDB (instancia global compartida)
duckdb_con = duckdb.connect(database=':memory:')
mock_con = None          # Poblada por mock_data.py en el arranque

#
# ── PgClient Wrapper (Modo Producción) ────────────────────────────────────────
# Proporciona la misma API que DuckDB (.execute().fetchall(), .description)
# para que los endpoints de analytics no requieran cambios.
#

class PgClient:
    """Wrapper de psycopg2 que imita la API de conexión DuckDB."""
    def __init__(self):
        self._conn = None
        self._cur = None
        self.description = None

    def _ensure_conn(self):
        if self._conn is None or self._conn.closed:
            db_url = settings.DATABASE_URL or settings.DIRECT_URL
            self._conn = psycopg2.connect(db_url)
            self._conn.autocommit = True
        return self._conn

    def execute(self, sql: str, params: list = None):
        conn = self._ensure_conn()
        self._cur = conn.cursor()
        # Convertir placeholders DuckDB (?) a psycopg2 (%s)
        if params is not None and "?" in sql:
            sql = self._convert_placeholders(sql)
        # Eliminar prefijo pg. (DuckDB Postgres extension) para PostgreSQL directo
        sql = self._strip_pg_prefix(sql)
        try:
            self._cur.execute(sql, params)
        except Exception:
            self.close()
            raise
        self.description = self._cur.description
        return self

    @staticmethod
    def _strip_pg_prefix(sql: str) -> str:
        """Reemplaza pg.public. por public. (DuckDB → PostgreSQL)."""
        return sql.replace('pg.public.', 'public.')

    @staticmethod
    def _convert_placeholders(sql: str) -> str:
        """Reemplaza ? por %s respetando strings literales."""
        result = []
        in_string = False
        quote_char = None
        i = 0
        while i < len(sql):
            ch = sql[i]
            if in_string:
                result.append(ch)
                if ch == quote_char and (i == 0 or sql[i-1] != '\\'):
                    in_string = False
            elif ch in ("'", '"'):
                in_string = True
                quote_char = ch
                result.append(ch)
            elif ch == '?':
                result.append('%s')
            else:
                result.append(ch)
            i += 1
        return ''.join(result)

    def fetchall(self) -> list:
        return self._cur.fetchall() if self._cur else []

    def fetchone(self):
        return self._cur.fetchone() if self._cur else None

    def close(self):
        if self._cur and not self._cur.closed:
            self._cur.close()
            self._cur = None
        if self._conn and not self._conn.closed:
            self._conn.close()
            self._conn = None


#
# ── Selector de cliente según modo ────────────────────────────────────────────
#

def get_duckdb_client():
    """
    Retorna un cliente de base de datos con API unificada.
    - MOCK_MODE=True  → DuckDB en memoria (pre-poblado por mock_data.py)
    - MOCK_MODE=False → PostgreSQL vía psycopg2 (PgClient wrapper)
    """
    if settings.MOCK_MODE:
        if mock_con:
            return mock_con
        return duckdb_con

    return PgClient()