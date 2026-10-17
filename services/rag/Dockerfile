FROM python:3.12-slim

# LibreOffice converts legacy .ppt decks to .pptx; fonts keep conversion faithful.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libreoffice-impress fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv==0.12.21
ENV UV_PYTHON_DOWNLOADS=never UV_LINK_MODE=copy PYTHONUNBUFFERED=1 PORT=8080

WORKDIR /app
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev
COPY app ./app
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8080
# One worker per instance; PDF parsing is CPU-bound, so scale with instances instead.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
