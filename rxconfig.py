import reflex as rx
import os

# In production, backend should be accessed via same domain (Traefik routes internally)
api_url = None if os.getenv("REFLEX_ENV") != "prod" else "/"

config = rx.Config(
    app_name="invoice_mypak",
    api_url=api_url,
    disable_plugins=['reflex.plugins.sitemap.SitemapPlugin'],
)
