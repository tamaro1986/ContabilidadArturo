import logging
from typing import Optional, Tuple, List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.core.config import settings

logger = logging.getLogger(__name__)

# Inicialización perezosa del LLM para evitar errores al arranque si falta la API Key
_llm: Optional[ChatOpenAI] = None

def get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        if not settings.OPENAI_API_KEY:
            # Si no hay key, lanzamos un error descriptivo en tiempo de ejecución, no al arranque
            raise ValueError("OPENAI_API_KEY no configurada en el servidor backend.")
        
        _llm = ChatOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_API_BASE,
            model=settings.LLM_MODEL_NAME,
            temperature=0
        )
    return _llm

def get_table_schema(duck_con) -> str:
    """
    Obtiene el esquema de la tabla financial_records para enviarlo al prompt.
    """
    try:
        # Intentamos obtener las columnas de la tabla en el esquema 'pg'
        columns = duck_con.execute("DESCRIBE pg.financial_records;").fetchall()
        schema_desc = "\n".join([f"- {col[0]} ({col[1]})" for col in columns])
        return schema_desc
    except Exception as e:
        logger.error(f"Error al obtener esquema de DuckDB: {e}")
        return "- id (BIGINT)\n- amount (DOUBLE)\n- customer_name (VARCHAR)\n- status (VARCHAR)\n- tenant_id (VARCHAR)\n- date (TIMESTAMP)"

def ask_financial_assistant(question: str, tenant_id: str, duck_con) -> Tuple[str, Optional[str], Optional[List]]:
    """
    Flujo RAG personalizado:
    1. Generar SQL a partir de la pregunta.
    2. Ejecutar SQL en DuckDB (filtrando por tenant_id).
    3. Generar respuesta final en lenguaje natural.
    """
    schema = get_table_schema(duck_con)
    
    # --- PASO 1: Texto a SQL ---
    sql_prompt = ChatPromptTemplate.from_messages([
        ("system", f"""Eres un experto en SQL para DuckDB. Tu tarea es convertir preguntas de usuarios en consultas SQL válidas.
La base de datos tiene una tabla llamada `pg.financial_records` con las siguientes columnas:
{schema}

REGLAS CRÍTICAS:
1. DEBES filtrar SIEMPRE por `tenant_id = '{{tenant_id}}'`.
2. Retorna ÚNICAMENTE el código SQL, sin bloques de código markdown, sin explicaciones.
3. Si la pregunta no se puede responder con SQL, retorna 'NO_SQL'.
4. Usa funciones de DuckDB si es necesario (ej. date_trunc para meses).
"""),
        ("human", "{question}")
    ])
    
    try:
        chain_sql = sql_prompt | get_llm()
        response_sql = chain_sql.invoke({
            "question": question,
            "tenant_id": tenant_id
        }).content.strip()
        
        if "NO_SQL" in response_sql or not response_sql:
            return "Lo siento, no puedo procesar esa consulta financiera en este momento.", None, None

        # Limpiar posibles backticks si el LLM ignoró la instrucción
        clean_sql = response_sql.replace("```sql", "").replace("```", "").strip()
        
        # --- PASO 2: Ejecutar SQL ---
        logger.info(f"Ejecutando SQL generado: {clean_sql}")
        results_raw = duck_con.execute(clean_sql).fetchall()
        
        # Obtener nombres de columnas para el contexto
        column_names = [desc[0] for desc in duck_con.description]
        results = [dict(zip(column_names, row)) for row in results_raw]

        # --- PASO 3: Generar Respuesta Final ---
        answer_prompt = ChatPromptTemplate.from_messages([
            ("system", """Eres un Asistente Financiero Senior inteligente y analítico.
Tu objetivo es responder la pregunta del usuario basándote EXCLUSIVAMENTE en los datos proporcionados por la base de datos.
Si los datos están vacíos, indícalo educadamente.
Mantén un tono profesional, claro y orientado a la contabilidad/finanzas.
"""),
            ("human", """Pregunta del usuario: {question}
Datos obtenidos de la base de datos: {results}

Respuesta Final:""")
        ])
        
        chain_answer = answer_prompt | get_llm()
        final_answer = chain_answer.invoke({
            "question": question,
            "results": str(results)
        }).content
        
        return final_answer, clean_sql, results

    except Exception as e:
        logger.error(f"Error en el servicio RAG: {e}")
        return f"Hubo un error técnico al procesar tu solicitud: {str(e)}", None, None
