# Mars Abnormal Finding System - Frontend

This is the frontend application for the Mars Abnormal Finding System with LINE LIFF integration.

## Features

- **React 18** with TypeScript
- **Tailwind CSS v3** for styling
- **Vite** for fast development and building
- **LINE LIFF SDK** integration for authentication
- **JWT-based authentication** with backend
- **Role-based access control** (L1, L2, L3)

## Setup Instructions

### 1. Environment Configuration

Copy the environment example file and configure your LINE LIFF ID:

```bash
cp env.example .env.local
```

Edit `.env.local` and set your actual LIFF ID:

```env
VITE_LIFF_ID=your-actual-liff-id-here
VITE_API_URL=http://localhost:3001/api
```

### 2. LINE Developers Console Setup

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Create a new provider or use existing one
3. Create a new Channel (Messaging API)
4. Go to LIFF tab and create a new LIFF app
5. Set the Endpoint URL to your frontend URL (e.g., `http://localhost:5173`)
6. Copy the LIFF ID and paste it in your `.env.local` file

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Test LINE Login

1. Open the app in your browser
2. Click "Login with LINE"
3. Complete LINE authentication
4. The app will authenticate with your backend and display user information

## Project Structure

```
src/
├── components/
│   └── LineLogin.tsx          # LINE login component
├── hooks/
│   └── useLiff.ts            # Custom hook for LIFF integration
├── services/
│   └── authService.ts        # Authentication service
├── types/
│   └── liff.d.ts            # TypeScript declarations for LIFF
├── App.tsx                   # Main application component
└── index.css                 # Tailwind CSS imports
```

## Backend Integration

This frontend integrates with your existing Node.js backend that provides:

- `/api/auth/authenticate` - LINE user authentication
- `/api/auth/verify` - JWT token verification
- `/api/auth/logout` - User logout

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Hot Module Replacement

The development server includes HMR for fast development. Changes to components will automatically refresh in the browser.

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. The built files will be in the `dist/` directory

3. Deploy the `dist/` directory to your web server

4. Update your LINE LIFF endpoint URL to your production domain

## Troubleshooting

### Common Issues

1. **LIFF initialization fails**: Check your LIFF ID and ensure it's correct
2. **Backend connection fails**: Verify your backend is running and the API URL is correct
3. **CORS errors**: Ensure your backend CORS configuration includes your frontend domain

### Debug Mode

Check the browser console for detailed error messages and LIFF initialization logs.

## Security Notes

- Never commit your actual LIFF ID to version control
- Use environment variables for sensitive configuration
- Ensure your backend validates all authentication requests
- Implement proper CORS policies in production
