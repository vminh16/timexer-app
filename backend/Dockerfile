FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy model, layers, utils, checkpoints, data, and app
COPY models /app/models
COPY layers /app/layers
COPY utils /app/utils
COPY checkpoints /app/checkpoints
COPY data /app/data
COPY app /app/app

ENV PYTHONPATH=/app
EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
