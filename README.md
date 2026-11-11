# ShopSathi (Shop Companion) 🛒🇮🇳
> **Your Digital Shop Assistant** — A modern, full-stack business management web application tailored for local retailers and grocery stores across India. Features inventory tracking, fast point-of-sale billing, and a customer credit ledger.

---

## 🛠️ Tech Stack

- **Database:** MongoDB with Mongoose (compatible with MongoDB Atlas & local MongoDB)
- **Backend:** Node.js + Express.js REST API
- **Frontend:** React 18 (Vite) + Tailwind CSS + React Router v6 + Axios + Lucide Icons
- **Authentication:** JWT (JSON Web Tokens) + bcryptjs password hashing
- **Authorization:** Role-Based Access Control (`owner` and `staff`)

---

## 📁 Project Structure

```text
shopsathi/
├── client/                     # Frontend (React + Vite + Tailwind CSS)
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js        # Axios instance with JWT interceptors
│   │   ├── components/
│   │   │   ├── Navbar.jsx      # Top navigation with role & shop badges
│   │   │   └── ProtectedRoute.jsx # Route guard with role validation
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Authentication state & methods
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   # Shop overview and stats landing page
│   │   │   ├── Login.jsx       # Shopkeeper / Staff sign-in page
│   │   │   ├── Register.jsx    # Shop registration page
│   │   │   └── NotFound.jsx    # 404 handler
│   │   ├── App.jsx             # React Router configuration
│   │   ├── index.css           # Tailwind CSS directives
│   │   └── main.jsx            # React root entry point
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── .env.example
│   └── .env
│
├── server/                     # Backend (Node.js + Express + Mongoose)
│   ├── config/
│   │   └── db.js               # MongoDB connection logic
│   ├── controllers/
│   │   └── authController.js   # register, login, getMe handlers
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT authentication verification
│   │   ├── roleMiddleware.js   # Role-based access control (RBAC)
│   │   └── errorMiddleware.js  # Global error handler and 404 catcher
│   ├── models/
│   │   ├── User.js             # Shop owner and staff schema
│   │   ├── Product.js          # Inventory product item schema
│   │   ├── Customer.js         # Customer ledger schema
│   │   ├── Bill.js             # Invoices / POS bills schema
│   │   └── LedgerEntry.js      # Customer debit/credit ledger schema
│   ├── routes/
│   │   └── authRoutes.js       # Auth API endpoints
│   ├── utils/
│   │   └── generateToken.js    # JWT generation utility
│   ├── package.json
│   ├── server.js               # Express application entry point
│   ├── .env.example
│   └── .env
│
├── .gitignore
└── README.md
```

---

## ⚙️ Environment Variables

### Server (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```env
PORT=5000
NODE_ENV=development

# MongoDB Atlas URI (or local MongoDB)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/shopsathi?retryWrites=true&w=majority

# JWT Settings
JWT_SECRET=shopsathi_super_secret_jwt_key_change_in_production_123456
JWT_EXPIRE=30d

# Allowed Frontend Origin
CLIENT_URL=http://localhost:5173
```

### Client (`client/.env`)
Copy `client/.env.example` to `client/.env`:
```env
# Backend API Base URL
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v20+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local Community Server or free [MongoDB Atlas](https://www.mongodb.com/atlas) Cluster)

### 2. Backend Setup
```bash
# Navigate to server directory
cd server

# Install dependencies (already installed)
npm install

# Configure your environment variables
# Edit server/.env with your MongoDB Atlas connection string

# Run the backend in development mode (with nodemon)
npm run dev

# Or run in production mode
npm start
```
The server will start on `http://localhost:5000`.

### 3. Frontend Setup
```bash
# In a new terminal, navigate to client directory
cd client

# Install dependencies (already installed)
npm install

# Start the Vite development server
npm run dev
```
The client will start on `http://localhost:5173`.

---

## 🚀 Production Deployment (Vercel + Render + MongoDB Atlas)

1. Create a MongoDB Atlas database and allow connections from Render. Keep the connection string private.
2. In Render, create a Blueprint from this repository and select the root `render.yaml`. Set `MONGO_URI` to the Atlas connection string. Render generates `JWT_SECRET`.
3. After the Render service is created, copy its public URL (for example, `https://shopsathi-api.onrender.com`).
4. In the Vercel project, import this repository and set **Root Directory** to `client`. Use `npm run build` as the build command and `dist` as the output directory.
5. Add the Vercel environment variable `VITE_API_URL` with the Render URL followed by `/api`, for example `https://shopsathi-api.onrender.com/api`, then deploy.
6. Copy the deployed Vercel origin (for example, `https://shopsathi.vercel.app`) into the Render service's `CLIENT_URL` environment variable and redeploy the Render service. Use the exact origin without a trailing path.

The Render blueprint is configured in [`render.yaml`](./render.yaml); [`client/vercel.json`](./client/vercel.json) provides client-side route fallback for React Router. If a custom domain is used, update `CLIENT_URL` to that exact origin.

---

## 🗄️ Database Models Overview

| Model | Description | Key Relationships |
| :--- | :--- | :--- |
| **`User`** | Shop Owners and Staff members | Referenced by Products, Customers, Bills, LedgerEntries |
| **`Product`** | Inventory items (name, purchase & selling price, stock, unit: pcs/kg/l/etc., low stock alert) | `owner -> User` |
| **`Customer`** | Customers with contact info, credit limit, and running credit balance | `owner -> User` |
| **`Bill`** | POS bills & invoices with line items, tax, discount, payment methods (Cash, UPI, customer credit) | `owner -> User`, `customer -> Customer`, `createdBy -> User` |
| **`LedgerEntry`** | Customer ledger entries: `DEBIT` (credit issued) or `CREDIT` (payment received) | `owner -> User`, `customer -> Customer`, `bill -> Bill` |

---

## 🔐 Auth API Endpoints

### 1. Register Account
- **Endpoint:** `POST /api/auth/register`
- **Access:** Public
- **Request Body (Owner):**
  ```json
  {
    "name": "Ramesh Kumar",
    "email": "ramesh@example.com",
    "password": "Password@123",
    "phone": "9876543210",
    "role": "owner",
    "shopName": "Gupta Grocery Store",
    "shopAddress": "Main Market, Ward 4, Indore"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Account created successfully.",
    "token": "eyJhbGciOi...",
    "user": {
      "_id": "67...",
      "name": "Ramesh Kumar",
      "email": "ramesh@example.com",
      "phone": "9876543210",
      "role": "owner",
      "shopName": "Gupta Grocery Store",
      "shopAddress": "Main Market, Ward 4, Indore"
    }
  }
  ```

### 2. Login
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "ramesh@example.com",
    "password": "Password@123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "token": "eyJhbGciOi...",
    "user": {
      "_id": "67...",
      "name": "Ramesh Kumar",
      "email": "ramesh@example.com",
      "phone": "9876543210",
      "role": "owner",
      "shopName": "Gupta Grocery Store"
    }
  }
  ```

### 3. Get Current User Profile
- **Endpoint:** `GET /api/auth/me`
- **Access:** Private (`Authorization: Bearer <token>`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "_id": "67...",
      "name": "Ramesh Kumar",
      "email": "ramesh@example.com",
      "phone": "9876543210",
      "role": "owner",
      "shopName": "Gupta Grocery Store",
      "shopAddress": "Main Market, Ward 4, Indore",
      "isActive": true
    }
  }
  ```

---

## 🛡️ Role-Based Access Control (RBAC)

- **`owner`**:
  - Full administrative access
  - Can manage store settings, inventory, bills, ledger, and staff members
- **`staff`**:
  - Operational access
  - Can perform sales billing and view inventory
  - Restricted from sensitive store financial settings and staff management

Middleware available:
- `protect`: Verifies JWT and attaches current user to `req.user`
- `authorize('owner')`: Restricts endpoint to store owners
