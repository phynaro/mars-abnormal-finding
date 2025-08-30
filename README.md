# Mars Abnormal Finding CMMS System

A comprehensive web-based abnormal finding reporting system for plant operations with role-based access control and SQL Server integration.

## 🚀 Features

### Authentication System
- **User Registration & Login**: Secure username/password authentication
- **Role-Based Access Control**: Three user levels (L1 Operators, L2 Engineers, L3 Managers)
- **Session Management**: JWT-based authentication with database session tracking
- **Password Management**: Secure password hashing and change functionality
- **Logout**: Secure session termination

### User Interface
- **Modern Design**: Clean, responsive interface built with React and Tailwind CSS
- **Dark/Light Mode**: Theme switching with persistent preferences
- **Multi-Language Support**: English and Thai language support
- **Responsive Layout**: Works on desktop, tablet, and mobile devices

### CMMS System
- **Dashboard**: Real-time overview of system status and metrics
- **Ticket Management**: Create, track, and manage abnormal finding tickets
- **Machine Management**: Equipment tracking and maintenance scheduling
- **Reporting & Analytics**: Performance metrics and data analysis
- **User Management**: Admin tools for user and role management

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Authentication API**: Registration, login, logout, password management
- **Database Integration**: SQL Server with MSSQL driver
- **JWT Security**: Secure token-based authentication
- **Role-Based Middleware**: Permission-based route protection
- **Session Management**: Database-backed session tracking

### Frontend (React + TypeScript)
- **Context Providers**: Authentication, theme, and language management
- **Component Library**: Reusable UI components with Tailwind CSS
- **Responsive Design**: Mobile-first approach with dark mode support
- **Internationalization**: Multi-language support with context

### Database (SQL Server)
- **Users Table**: User accounts with role assignments
- **Roles Table**: Permission levels and role definitions
- **UserSessions Table**: Active session tracking
- **Integration Ready**: Compatible with existing Cedar CMMS system

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- SQL Server 2019+ (Express or Standard)
- Windows environment (for SQL Server)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure database connection**
   - Update `src/config/dbConfig.js` with your SQL Server details
   - Ensure the database server is accessible
   - Set appropriate SQL Server credentials

4. **Set environment variables**
   ```bash
   # Create .env file
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   NODE_ENV=development
   PORT=3001
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   # Copy env.example to .env
   cp env.example .env
   
   # Update API URL if needed
   VITE_API_URL=http://localhost:3001/api
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Setup

The system automatically creates the necessary tables on first run. The database schema includes:

### Users Table
- User authentication and profile information
- Role assignments and permissions
- Department and shift information
- Audit timestamps

### Roles Table
- Role definitions (L1_Operator, L2_Engineer, L3_Manager)
- Permission levels (1, 2, 3)
- Role descriptions and metadata

### UserSessions Table
- Active session tracking
- JWT token management
- Session expiration handling

## 🔐 Authentication Flow

1. **Registration**: Users create accounts with required information
2. **Login**: Username/password authentication with JWT token generation
3. **Session Management**: Tokens stored in database with expiration
4. **Authorization**: Role-based access control for all protected routes
5. **Logout**: Token invalidation and session cleanup

## 🎨 User Interface Features

### Top Navigation Bar
- **User Profile**: Display name, role, and quick actions
- **Language Switching**: English/Thai toggle
- **Theme Toggle**: Dark/light mode switching
- **Search**: Global search functionality
- **Notifications**: System notification center

### Left Sidebar
- **CMMS Menu**: Hierarchical navigation structure
- **Role-Based Access**: Menu items filtered by user permissions
- **User Info**: Current user details at bottom
- **Collapsible Sections**: Expandable menu categories

### Main Content Area
- **Responsive Layout**: Adapts to different screen sizes
- **Card-Based Design**: Clean, organized information display
- **Interactive Elements**: Hover effects and transitions
- **Loading States**: Smooth loading animations

## 🌐 Internationalization

### Supported Languages
- **English**: Primary language with full feature support
- **Thai**: Complete translation for Thai users
- **Extensible**: Easy to add more languages

### Translation Features
- **Context-Aware**: Language-specific content and formatting
- **Persistent**: Language preference saved per user
- **Dynamic**: Real-time language switching

## 🎯 User Roles & Permissions

### L1 Operators (Permission Level 1)
- Create and view tickets
- Basic dashboard access
- Profile management

### L2 Engineers (Permission Level 2)
- All L1 permissions
- Ticket management and assignment
- Machine maintenance access
- Basic reporting

### L3 Managers (Permission Level 3)
- All L2 permissions
- User management
- System configuration
- Advanced analytics and reporting

## 🔧 Development

### Project Structure
```
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Authentication controllers
│   │   ├── middleware/     # Auth and role middleware
│   │   ├── routes/         # API route definitions
│   │   └── config/         # Database configuration
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── services/       # API services
│   └── package.json
└── README.md
```

### Key Technologies
- **Backend**: Node.js, Express, MSSQL, JWT, bcrypt
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Database**: Microsoft SQL Server
- **Authentication**: JWT with database session tracking

## 🚀 Deployment

### Production Considerations
- **Environment Variables**: Secure JWT secrets and database credentials
- **HTTPS**: Enable SSL/TLS for production
- **Database Security**: Use dedicated database user with minimal permissions
- **Session Management**: Configure appropriate session timeouts
- **Monitoring**: Implement logging and error tracking

### On-Premises Deployment
- **Network Access**: Ensure SQL Server is accessible from the web server
- **Firewall Configuration**: Open necessary ports (3001 for API)
- **Database Backup**: Regular backup procedures for SQL Server
- **User Management**: Integrate with existing LDAP/Active Directory if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For technical support or questions:
- Check the documentation
- Review the code comments
- Create an issue in the repository

## 🔄 Updates

### Recent Changes
- ✅ Removed LINE LIFF integration
- ✅ Implemented SQL Server authentication
- ✅ Added role-based access control
- ✅ Created modern UI with dark mode
- ✅ Added multi-language support
- ✅ Implemented comprehensive CMMS menu structure

### Roadmap
- [ ] Ticket management system
- [ ] Image upload functionality
- [ ] Cedar CMMS integration
- [ ] Advanced reporting dashboard
- [ ] Email notification system
- [ ] Mobile app development 
