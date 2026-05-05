# Dockerfile para la API de ContabilidadArturo (Render Deployment)
FROM python:3.10-slim

# Evitar que Python genere archivos .pyc y habilitar logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Directorio de trabajo en el contenedor
WORKDIR /app

# Instalar dependencias del sistema necesarias
# libmagic1 es requerida por la librería python-magic para validación de archivos
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primero para aprovechar el caché de Docker
COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código del backend
COPY . .

# Exponer el puerto configurado para Render (puerto por defecto 10000)
EXPOSE 10000

# Comando para iniciar el servidor con Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]
