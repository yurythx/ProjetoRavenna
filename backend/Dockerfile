FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

ARG APP_VERSION=""
ARG APP_BUILD_SHA=""
ARG APP_BUILD_TIME=""

ENV APP_VERSION=${APP_VERSION}
ENV APP_BUILD_SHA=${APP_BUILD_SHA}
ENV APP_BUILD_TIME=${APP_BUILD_TIME}

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/keys

EXPOSE 8000

CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]
