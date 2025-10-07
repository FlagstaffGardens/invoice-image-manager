import reflex as rx
import os

# In production, use relative URLs so backend is accessed via same domain
api_url = None if os.getenv("REFLEX_ENV") != "prod" else ""

config = rx.Config(
    app_name="invoice_mypak",
    api_url=api_url,
    disable_plugins=['reflex.plugins.sitemap.SitemapPlugin'],
)
