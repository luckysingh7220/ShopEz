# ShopEZ - Full-Stack E-commerce Website

ShopEZ is a complete e-commerce starter app with:

- User authentication (buyer/seller)
- Product catalog with search, filters, and discounts
- Cart and secure checkout flow
- Instant order confirmation
- Seller dashboard analytics
- MongoDB database integration

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Auth: JWT

## Project Structure

- `client/` React frontend (Vite)
- `routes/`, `models/`, `middleware/` Express API
- `server.js` API + production static hosting

## 1. Setup

```bash
npm install
```

## 2. Start MongoDB

Option A: Local MongoDB service running on `mongodb://127.0.0.1:27017`

Option B: Docker (recommended)

```bash
docker compose up -d
```

Mongo Express UI will be available at http://localhost:8081

Create a `.env` file from `.env.example`:

```bash
copy .env.example .env
```

Update values if needed.

## 3. Seed Database

```bash
npm run seed
```

Default test users:

- Seller: `seller@shopez.com` / `password123`
- Buyer: `buyer@shopez.com` / `password123`

## 4. Run App (Local Development)

Run backend:

```bash
npm run dev
```

In a second terminal, run React frontend:

```bash
npm run client:dev
```

Frontend: http://localhost:5173
Backend API: http://localhost:5000

## 5. Production Build (Local Check)

```bash
npm --prefix client install
npm run build
set NODE_ENV=production
npm start
```

Open http://localhost:5000

## Render Deployment

This repo includes `render.yaml` for one-service deployment.

- Build command: `npm install ; npm --prefix client install ; npm run build`
- Start command: `npm start`
- Required Render env vars:
	- `NODE_ENV=production`
	- `MONGO_URI`
	- `JWT_SECRET`
	- `STRIPE_SECRET`
	- `STRIPE_PUBLISHABLE`
	- `SMTP_USER`
	- `SMTP_PASS`

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (seller only)
- `POST /api/products/:id/reviews` (buyer only)
- `POST /api/orders` (buyer only)
- `GET /api/orders/my` (buyer only)
- `GET /api/seller/overview` (seller only)

## Notes

- This project is ready to extend with payments and admin features.
- For production, use HTTPS, stronger JWT secret handling, and payment provider integration.
