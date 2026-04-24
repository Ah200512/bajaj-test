# BFHL Hierarchy Challenge

Separate frontend and backend implementation for the SRM Full Stack Engineering Challenge.

## Project Structure

```text
.
|-- backend
|   |-- .env.example
|   |-- index.js
|   `-- package.json
|-- frontend
|   |-- app.js
|   |-- config.js
|   |-- index.html
|   `-- styles.css
`-- README.md
```

## Backend

The backend is a small Express API with:

- `POST /bfhl`
- CORS enabled
- request validation for `{ "data": [...] }`
- duplicate edge detection
- multi-parent conflict handling
- cycle detection
- tree depth calculation

### Run Locally

```bash
cd backend
npm install
npm start
```

Default local URL:

```text
http://localhost:3000
```

### Identity Fields

Update these environment variables before deployment:

```text
USER_ID=yourname_ddmmyyyy
EMAIL_ID=your.college@email.com
COLLEGE_ROLL_NUMBER=YOURROLLNUMBER
```

You can copy `backend/.env.example` and use the same values in your hosting provider's environment settings.

## Frontend

The frontend is a static single-page app. It lets users:

- enter node strings
- set the backend base URL
- submit the request
- inspect hierarchies, invalid entries, duplicate edges, and raw JSON

### Run Locally

You can serve `frontend/` with any static server.

Example using Python:

```bash
cd frontend
python -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Deployment

### Backend

Good options:

- Render Web Service
- Railway
- Vercel serverless conversion if you want to adapt it later

For Render:

1. Create a new Web Service from the `backend` folder.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add environment variables:
   - `USER_ID`
   - `EMAIL_ID`
   - `COLLEGE_ROLL_NUMBER`

### Frontend

Good options:

- Vercel
- Netlify
- GitHub Pages

Before deploying, update `frontend/config.js` with your hosted backend base URL.

Example:

```js
window.APP_CONFIG = {
  apiBaseUrl: "https://your-backend-url.onrender.com",
};
```

## GitHub Push

```bash
git init
git add .
git commit -m "Build BFHL hierarchy API and frontend"
git branch -M main
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```
