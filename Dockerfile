# ==============================================================================
# TimeXer AI - Production Multi-Stage Dockerfile (Render / Cloud Deployment)
# Stage 1: Build React Vite Mobile Web UI
# Stage 2: Serve Unified FastAPI + PyTorch AI + Static Frontend
# ==============================================================================

# Stage 1: Build React Vite Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend with TimeXer AI
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOME=/home/appuser \
    PATH=/home/appuser/.local/bin:$PATH \
    PYTHONPATH=/app/backend \
    FRONTEND_DIST=/app/frontend/dist

# Create dedicated non-root user
RUN useradd -m -u 1000 appuser
WORKDIR /app

# Install minimal system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU (lightweight ~180MB for fast build & low memory on Render Free 512MB)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install application dependencies (safely filtering out torch without deleting reformer-pytorch)
COPY backend/requirements.txt ./
RUN grep -v -E '^torch([>=<~]|$)|^--extra-index-url' requirements.txt > reqs_clean.txt && \
    pip install --no-cache-dir -r reqs_clean.txt && \
    pip install --no-cache-dir reformer-pytorch

# Copy backend application and pre-built frontend assets
COPY --chown=appuser:appuser backend/ ./backend/
COPY --from=frontend-builder --chown=appuser:appuser /app/frontend/dist ./frontend/dist

# Ensure proper permissions
RUN chown -R appuser:appuser /app

USER appuser
EXPOSE 8000

# Launch Uvicorn server dynamically on $PORT (set by Render/Cloud platforms)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
