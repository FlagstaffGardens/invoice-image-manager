import reflex as rx
import os

# In production, backend should use same port as frontend
is_prod = os.getenv("ENV") == "prod"

config = rx.Config(
    app_name="invoice_mypak",
    backend_host="0.0.0.0",
    frontend_host="0.0.0.0",
    backend_port=3000 if is_prod else 8000,
    frontend_port=3000,
)
