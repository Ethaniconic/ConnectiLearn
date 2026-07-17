# Production Dockerfile for ConnectiLearn FastAPI Backend

FROM python:3.10-slim

WORKDIR /app

# Prevent byte-compiling & ensure unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy server application files under /app/server
COPY . ./server

# Ensure upload media directory exists
RUN mkdir -p /app/uploads

# Expose port 8000
EXPOSE 8000

# Start production server
CMD sh -c "uvicorn server.main:app --host 0.0.0.0 --port ${PORT:-8000}"
