from app.main import app

if __name__ == "__main__":
    import uvicorn
    # Se usa el formato de cadena "app.main:app" para permitir 'reload=True'
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
