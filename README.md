# DataLogger Website

This frontend is a Vite + React application for the DataLogger dashboard.

## Production checklist before building

- Set `VITE_API_BASE` to the production API base URL.
- If you are using a local dev proxy, set `VITE_BACKEND_URL` to the backend host.
- Make sure the backend CORS policy allows your frontend domain.
- Ensure your login and API requests use the production URL rather than `localhost`.

## Build for production

```bash
npm install
VITE_API_BASE=https://your-api-domain.com/api npm run build
```

## Deploy to EC2

- Copy the generated `dist` contents to your web server root.
- Serve them with nginx as a SPA.
- Point the API base URL to your EC2-hosted backend.
