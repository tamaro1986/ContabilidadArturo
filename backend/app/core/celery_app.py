import os
from celery import Celery

REDIS_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.task_routes = {
    "app.worker.tasks.process_financial_csv": "main-queue"
}

# Configuración adicional para evitar problemas de compatibilidad con Windows si fuera necesario
# (aunque es mejor correr Celery con --pool=solo en Windows para desarrollo local)
