FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["adk", "api_server", "--host", "0.0.0.0", "--port", "8080", "--with_ui", "--allow_origins", "*"]
