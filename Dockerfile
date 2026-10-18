# ==============================================================================
# TimeXer AI - Production Multi-Stage Dockerfile for Hugging Face Spaces
# 1. Builds React Vite Mobile UI
# 2. Serves unified FastAPI + PyTorch AI + Static Frontend on port 7860
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
    PORT=7860 \
    HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONPATH=/app/backend \
    FRONTEND_DIST=/app/frontend/dist

# Create non-root user matching Hugging Face Spaces requirements (UID 1000)
RUN useradd -m -u 1000 user
WORKDIR /app

# Install minimal system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU (fast, lightweight ~180MB wheel)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install application dependencies
COPY backend/requirements.txt ./
RUN sed -i '/torch/d' requirements.txt && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application and pre-built frontend assets
COPY --chown=user:user backend/ ./backend/
COPY --from=frontend-builder --chown=user:user /app/frontend/dist ./frontend/dist

# Ensure proper permissions for UID 1000
RUN chown -R user:user /app

USER user
EXPOSE 7860

# Launch Uvicorn server on Hugging Face Spaces port 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
