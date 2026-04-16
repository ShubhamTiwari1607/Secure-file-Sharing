# VaultFlow Frontend

This is a standalone frontend for the secure file sharing backend in this repository.

## Features

- User signup
- User login with JWT storage in the browser
- Backend health check
- Authenticated file upload
- Authenticated file list
- Download by file ID
- One-click download from the latest upload or the file list

## Run It

1. Start the Spring Boot backend on `http://localhost:8080`
2. Open a terminal in `D:\secure-file-sharing\frontend`
3. Serve the folder on port `5173` so it matches the backend CORS config

Example with Python:

```bash
python -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

If you use another static server, make sure it serves from `http://localhost:5173` or update the backend CORS config.
