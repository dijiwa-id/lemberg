FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user and set up necessary directories
RUN adduser --disabled-password --gecos '' lemberg && \
    mkdir -p /data /app/uploads

COPY . .

# Ensure the non-root user owns the application directory and data directory
RUN chown -R lemberg:lemberg /app /data

# Switch to the non-root user
USER lemberg

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
