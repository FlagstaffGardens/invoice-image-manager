FROM python:3.13-slim

WORKDIR /app

# Install system dependencies including nginx and supervisor
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Initialize Reflex
RUN reflex init

# Create upload directory
RUN mkdir -p uploaded_files

# Copy nginx and supervisor configs
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose single port for Traefik
EXPOSE 80

# Set environment to production
ENV REFLEX_ENV=prod

# Run supervisor to manage nginx, frontend, and backend
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
