# Reccora Admin

Next.js 15 + Tailwind 4 dashboard. Tokens are stored in httpOnly cookies and every API call goes through the same-origin proxy at `/api/proxy/*`; authorisation is enforced by the API.

```bash
cp .env.example .env.local   # API_URL
npm install
npm run dev                  # http://localhost:3001
```
