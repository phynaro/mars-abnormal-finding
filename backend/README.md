# Mars Abnormal Finding - Backend API

This is the backend API for the Mars Abnormal Finding system with Line Login integration for LIFF applications.

## Features

- Line Login authentication
- LIFF token verification
- JWT-based session management
- Role-based access control (L1, L2, L3)
- RESTful API endpoints

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   - Copy `.env.example` to `.env`
   - Fill in your Line Login credentials:
     - `LINE_CHANNEL_ID`: Your Line Login channel ID
     - `LINE_CHANNEL_SECRET`: Your Line Login channel secret
     - `LINE_REDIRECT_URI`: Your callback URL
     - `LIFF_ID`: Your LIFF application ID
     - `JWT_SECRET`: A secure random string for JWT signing

3. **Line Login Setup:**
   - Create a Line Login channel in the Line Developers Console
   - Set the callback URL to: `http://localhost:3001/api/auth/line/callback`
   - Create a LIFF application and note the LIFF ID

4. **Run the server:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `GET /api/auth/line/url` - Get Line Login URL
- `GET /api/auth/line/callback` - Line Login callback
- `POST /api/auth/line/verify` - Verify LIFF token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verify JWT token

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/role` - Get user role

### Health Check
- `GET /api/health` - Server health status

## Environment Variables

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_REDIRECT_URI=http://localhost:3001/api/auth/line/callback
LIFF_ID=your_liff_id
```

## Next Steps

1. Implement database integration (SQL Server for Cedar CMMS)
2. Add user role management
3. Implement ticket creation and management
4. Add notification system (Line OA, Email)
5. Add audit trail logging 