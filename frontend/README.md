# Frontend (React)

## Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```

## Production (with Docker)

1. Build and run with Docker:
   ```bash
   docker build -t omani-therapist-frontend .
   docker run -p 3000:3000 omani-therapist-frontend
   ```

Or use `docker-compose` from the project root:

```bash
docker-compose up --build
``` 