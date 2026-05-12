import redis
import json
import inspect
from functools import wraps
from app.core.config import settings

# Conexión global a Redis (Sincrónico para simplificar con endpoints def)
try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
except Exception as e:
    print(f"--- REDIS CONNECTION FAILED: {e} ---")
    redis_client = None

def generate_cache_key(func_name, args, kwargs):
    """
    Genera una clave de cache inteligente. 
    Intenta extraer el tenant_id si está presente en los argumentos.
    """
    # Intentar encontrar tenant_id en user_data (común en este proyecto)
    tenant_id = "global"
    for arg in args:
        if isinstance(arg, dict) and "tenant_id" in arg:
            tenant_id = arg["tenant_id"]
            break
    if tenant_id == "global" and "user_data" in kwargs:
        tenant_id = kwargs["user_data"].get("tenant_id", "global")
    
    # Filtrar kwargs para remover objetos no serializables como duck_con
    filtered_kwargs = {k: v for k, v in kwargs.items() if k not in ["duck_con", "user_data"]}
    
    return f"cache:{func_name}:{tenant_id}:{json.dumps(filtered_kwargs, sort_keys=True)}"

def cache_response(expire: int = 3600):
    """
    Decorador para cachear respuestas de endpoints en Redis.
    Soporta tanto funciones sincrónicas como asincrónicas.
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if not redis_client or settings.MOCK_MODE:
                return await func(*args, **kwargs)

            cache_key = generate_cache_key(func.__name__, args, kwargs)
            
            try:
                cached_data = redis_client.get(cache_key)
                if cached_data:
                    return json.loads(cached_data)
            except Exception as e:
                print(f"Error reading from cache: {e}")

            result = await func(*args, **kwargs)

            try:
                redis_client.setex(cache_key, expire, json.dumps(result))
            except Exception as e:
                print(f"Error writing to cache: {e}")

            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            if not redis_client or settings.MOCK_MODE:
                return func(*args, **kwargs)

            cache_key = generate_cache_key(func.__name__, args, kwargs)
            
            try:
                cached_data = redis_client.get(cache_key)
                if cached_data:
                    return json.loads(cached_data)
            except Exception as e:
                print(f"Error reading from cache: {e}")

            result = func(*args, **kwargs)

            try:
                redis_client.setex(cache_key, expire, json.dumps(result))
            except Exception as e:
                print(f"Error writing to cache: {e}")

            return result

        return async_wrapper if inspect.iscoroutinefunction(func) else sync_wrapper
    return decorator

