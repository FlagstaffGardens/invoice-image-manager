FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create upload directory
RUN mkdir -p uploaded_files

# Expose ports (internal to container)
EXPOSE 3000 8000

# Set environment to production
ENV REFLEX_ENV=prod

# Run reflex in production mode (frontend 3000, backend 8000)
CMD ["reflex", "run", "--env", "prod", "--backend-host", "0.0.0.0"]
