FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . /app/

# Create unprivileged system user and group
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

# Set proper ownership and permissions for media and static directories
RUN mkdir -p /app/media /app/staticfiles && \
    chown -R appuser:appuser /app && \
    chmod -R 755 /app/media /app/staticfiles

USER appuser

EXPOSE 8000

CMD ["gunicorn", "smartats.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "2"]
