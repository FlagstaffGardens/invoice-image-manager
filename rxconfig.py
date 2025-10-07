import reflex as rx
import os

# In production, API is accessible via same domain through nginx
api_url = os.getenv("API_URL", "")

config = rx.Config(
    app_name="invoice_mypak",
    api_url=api_url if api_url else None,
    disable_plugins=['reflex.plugins.sitemap.SitemapPlugin'],
)
