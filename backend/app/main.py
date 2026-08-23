from dotenv import load_dotenv

load_dotenv()

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

app = FastAPI(title="Grounded Policy QA")

origins = [origin for origin in [os.environ.get("FRONTEND_ORIGIN", "*")] if origin]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
