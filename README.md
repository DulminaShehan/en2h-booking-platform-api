# EN2H Booking Platform API

A RESTful Booking Platform API built with **NestJS**, **TypeScript**, **TypeORM**, and **PostgreSQL (Neon)**.

The system allows users to register, authenticate using JWT, manage services, and create bookings. It includes refresh token authentication, validation, Swagger documentation, Docker support, pagination, search, status filtering, and unit testing.

---

# Project Overview

## Technologies Used

- NestJS
- TypeScript
- PostgreSQL (Neon)
- TypeORM
- JWT Authentication
- Refresh Token Authentication
- Passport.js
- bcrypt
- class-validator
- Swagger (OpenAPI)
- Docker & Docker Compose
- Jest

---

# Installation Steps

## 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/en2h-booking-platform-api.git

cd en2h-booking-platform-api
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Configure environment variables

Create a `.env` file.

Example:

```env
PORT=3000

DATABASE_URL=postgresql://...

DIRECT_URL=postgresql://...

JWT_SECRET=your-secret

JWT_EXPIRES_IN=15m

REFRESH_TOKEN_SECRET=your-refresh-secret

REFRESH_TOKEN_EXPIRES_IN=1h

DB_SSL=true
```

---

# Environment Variables

| Variable | Description |
|-----------|-------------|
| PORT | Application port |
| DATABASE_URL | Runtime PostgreSQL connection |
| DIRECT_URL | Direct PostgreSQL connection used for migrations |
| JWT_SECRET | Secret key for Access Tokens |
| JWT_EXPIRES_IN | Access token expiration |
| REFRESH_TOKEN_SECRET | Secret key for Refresh Tokens |
| REFRESH_TOKEN_EXPIRES_IN | Refresh token expiration |
| DB_SSL | Enables SSL for Neon PostgreSQL |

---

# Database Setup

This project uses **PostgreSQL** hosted on **Neon**.

Two database connections are configured:

### DATABASE_URL

Used by the running NestJS application.

### DIRECT_URL

Used only by the TypeORM migration CLI.

This separation follows Neon best practices because migrations require a direct database connection.

---

# Running the Application

## Development

```bash
npm run start:dev
```

Application:

```
http://localhost:3000
```

Swagger:

```
http://localhost:3000/api/docs
```

---

## Docker

```bash
docker compose up --build
```

---

# Running Migrations

Generate a migration:

```bash
npm run migration:generate
```

Run migrations:

```bash
npm run migration:run
```

Revert migration:

```bash
npm run migration:revert
```

---

# API Documentation

Swagger documentation is available at:

```
http://localhost:3000/api/docs
```

The Swagger UI allows developers to:

- Register users
- Login
- Authenticate using JWT
- Test Services endpoints
- Test Booking endpoints

---

# Assumptions Made

During development the following assumptions were made:

- Booking creation is public and does not require authentication.
- Only authenticated users can manage services.
- Bookings are cancelled using a soft-cancel approach instead of deleting records.
- Booking date and time are stored together as a single `bookingDateTime (timestamptz)` field.
- A `COMPLETED` status was added to the booking lifecycle.
- Duplicate bookings are prevented using both application validation and a PostgreSQL partial unique index.
- Refresh tokens are hashed before storage and rotated after every successful refresh.

---

# Future Improvements

Possible future enhancements include:

- Role-Based Access Control (RBAC)
- Email notifications
- Payment gateway integration
- Password reset via email
- CI/CD pipeline
- Cloud deployment (Google Cloud Run or AWS)
- Higher unit test coverage
- Monitoring and centralized logging
- Rate limiting
- API versioning

---

# Project Features

## Authentication

- User Registration
- User Login
- JWT Authentication
- Refresh Token Rotation
- Logout

---

## Services

- Create Service
- View Services
- Update Service
- Delete Service

---

## Bookings

- Public Booking Creation
- Booking Management
- Booking Status Updates
- Pagination
- Search
- Status Filtering
- Duplicate Booking Prevention

---

# Testing

Run all tests:

```bash
npm test
```

Generate coverage report:

```bash
npm run test:cov
```

---

# Docker

Start the application:

```bash
docker compose up --build
```

Stop containers:

```bash
docker compose down
```

---

# Author

Developed by **Dulmina Kulasekara**

Software Engineering Assessment Project
