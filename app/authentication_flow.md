Register
   ↓
Password → pwdlib → hashed password
   ↓
PostgreSQL

Login
   ↓
Verify password
   ↓
Create JWT
   ↓
Client receives access_token

Protected API
   ↓
Authorization: Bearer <token>
   ↓
JWT validation
   ↓
Current User
   ↓
Service
   ↓
Repository