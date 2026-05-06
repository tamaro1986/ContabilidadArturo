# Estructura del Proyecto: ContabilidadArturo

El proyecto **ContabilidadArturo** está dividido en dos grandes bloques principales: un **backend** desarrollado con Python (FastAPI) enfocado en análisis de datos usando DuckDB y Machine Learning, y un **frontend** desarrollado con Next.js (React y TypeScript) para la visualización interactiva. Además, hace uso de **Supabase** para la autenticación o gestión de base de datos relacional.

A continuación, se detalla la estructura de carpetas y la función de cada archivo y directorio:

### 📁 Directorio Raíz
Contiene archivos generales del proyecto, plantillas de Hacienda y configuraciones globales.
* **`ANEXO.RENTA.F14v9.0.xlsm` / `PLANTILLAS IVA F-07v11.7.4.xlsm`**: Plantillas oficiales de Excel (El Salvador) utilizadas como esquemas para la extracción, importación o validación de los datos contables y tributarios.
* **`pruebas.docx` / `pruebas.pdf` / `files simulador ventas.zip`**: Archivos de prueba utilizados durante el desarrollo.
* **`.gitignore`**: Define qué archivos o carpetas debe ignorar el control de versiones de Git.

---

### ⚙️ `backend/` - Lógica de Servidor y API (Python / FastAPI)
Toda la lógica de procesamiento de datos fiscales, Inteligencia Artificial y la API que sirve al frontend.
* **`requirements.txt`**: Lista de dependencias y librerías de Python.
* **`.env`**: Variables de entorno del backend (credenciales, URLs de bases de datos, llaves secretas).
* **`Dockerfile`**: Instrucciones para empaquetar el backend en un contenedor de Docker.
* **`app/main.py`**: El archivo principal que inicializa y arranca la aplicación de FastAPI.

**Dentro de `backend/app/`:**
* **`api/routes/`**: Controladores que definen las URLs de la API REST.
  * **`analytics.py`**: Endpoints que devuelven los datos financieros calculados para los gráficos.
  * **`ai.py`**: Endpoints para interactuar con los modelos de inteligencia artificial (detección de anomalías).
  * **`auth.py`**: Rutas de autenticación de usuarios.
  * **`financial_data.py`**: Endpoints para operaciones directas (CRUD) sobre los registros financieros.
* **`api/dependencies/roles.py`**: Funciones para validar permisos y controlar qué puede hacer cada usuario según su rol (RBAC).
* **`core/`**: Configuración fundamental de la aplicación.
  * **`config.py`**: Carga centralizada de variables de entorno y configuraciones de la app.
  * **`security.py`**: Utilidades para manejo de contraseñas, encriptación y tokens.
  * **`celery_app.py`**: Configuración de Celery para ejecutar tareas asíncronas en segundo plano.
* **`db/`**: Gestión de la base de datos analítica local.
  * **`duckdb.db`**: Archivo físico de la base de datos analítica, ultra-rápida para consultas financieras.
  * **`mock_data.py`**: Script que genera datos aleatorios de prueba.
  * **`seeder.py`**: Script determinista para poblar la base de datos con información real basada en los CSVs de Hacienda para la simulación de auditorías.
* **`schemas/`**: Modelos Pydantic. Sirven para validar la estructura de los datos de entrada y salida de la API (ej. `auth.py` define qué debe venir en un login).
* **`services/`**: Donde reside la lógica dura de la aplicación (los "cerebros" detrás de los endpoints).
  * **`anomaly_engine.py`**: Motor de IA (generalmente *Isolation Forest* u otro algoritmo) para detectar fraude o errores en declaraciones de impuestos.
  * **`duckdb_client.py`**: Funciones auxiliares para interactuar eficientemente con DuckDB.
  * **`supabase_client.py`**: Conexión entre el backend de Python y el servicio de Supabase.
* **`worker/tasks.py`**: Definición de los procesos pesados que se ejecutan en segundo plano.

---

### 🖥️ `frontend/` - Interfaz de Usuario (Next.js / TypeScript)
Aplicación web moderna donde interactúa el usuario. Organizada utilizando el "App Router" de Next.js.
* **`package.json`**: Dependencias de Node.js, scripts de arranque (`npm run dev`) e información del proyecto.
* **`next.config.ts`**: Archivo de configuración principal del framework Next.js.
* **`tailwind.config.ts` / `globals.css`**: Configuración y directivas globales de diseño usando Tailwind CSS v4.
* **`AGENTS.md` / `CLAUDE.md`**: Instrucciones específicas de sistema para asistentes IA que interactúen con el proyecto.

**Dentro de `frontend/src/`:**
* **`app/`**: Define la navegación y el enrutamiento de la web. Cada carpeta es una ruta de la aplicación.
  * **`page.tsx`**: La página de inicio (Landing page).
  * **`layout.tsx`**: La estructura base o "cáscara" general que envuelve a todas las páginas (Navbar, Footer, etc.).
  * **`dashboard/page.tsx`**: La pantalla principal del sistema analítico contable (el Dashboard corporativo/fiscal).
  * **`login/page.tsx` & `register/page.tsx`**: Pantallas de autenticación de usuarios.
* **`components/`**: Pequeñas piezas de interfaz reutilizables.
  * **`ai/AnomalyAlertPanel.tsx`**: Un panel de UI encargado de alertar a los contadores sobre transacciones de alto riesgo, brindando "Explainable AI" (explicando por qué es un riesgo).
  * **`analytics/`**: Un conjunto de componentes de Recharts y Tablas (ej. `CustomerSegmentChart.tsx`, `TopEntitiesChart.tsx`, `TaxLiquidationCard.tsx`, etc.) que renderizan la información financiera bajo el diseño de "Integridad Fiscal".
* **`types/analytics.ts`**: Definición estática de tipos e interfaces de TypeScript para prevenir errores asegurando que el frontend sepa exactamente qué formato tienen los datos que manda el backend.
* **`utils/supabase.ts`**: Funciones del cliente de Supabase para manejar el inicio de sesión y sincronización desde el lado del frontend.

---

### 🧪 `scratch/` - Pruebas y Tareas Aisladas
Directorio utilizado para hacer *scripts experimentales* o tareas únicas que no son parte directa del código en producción.
* **`extract_headers.py`, `list_sheets.py`, `inspect_excel.py`**: Scripts de Python creados específicamente para leer, extraer estructura y automatizar la comprensión técnica de los documentos masivos de Excel de la Hacienda salvadoreña sin afectar al backend.
* **`find_colors.py` / `fix_colors.py`**: Scripts de utilidad para manipular o analizar gamas de colores (probablemente del diseño o CSS).

### 🗄️ `supabase/` 
Directorio destinado a configuraciones de contenedores locales, funciones Serverless (Edge Functions) y archivos de migración de base de datos de PostgreSQL proporcionados por Supabase.
