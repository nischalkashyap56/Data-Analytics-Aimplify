import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get environment variables
port = int(os.getenv("PORT", "8000"))
host = os.getenv("HOST", "0.0.0.0")

if __name__ == "__main__":
    print(f"Starting server at {host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port, reload=True) 