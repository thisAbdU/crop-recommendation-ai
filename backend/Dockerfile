FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app
ENV FLASK_ENV=production

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project (this should include ai_model folder)
COPY . .

# Create necessary directories
RUN mkdir -p /app/prompts /app/logs /app/ai_model

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# Ensure all directories have correct permissions
RUN chown -R appuser:appuser /app/prompts && chmod 755 /app/prompts
RUN chown -R appuser:appuser /app/logs && chmod 755 /app/logs
RUN chown -R appuser:appuser /app/ai_model && chmod 755 /app/ai_model

USER appuser

# Expose port
EXPOSE 5000

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "--reload", "run:app"] 