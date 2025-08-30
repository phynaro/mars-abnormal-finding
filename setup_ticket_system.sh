#!/bin/bash

echo "🚀 Setting up Mars Abnormal Finding Ticket System"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "backend/package.json" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo ""
echo "📋 Step 1: Database Setup"
echo "-------------------------"
echo "Please run the SQL script in backend/database/ticket_system_tables.sql"
echo "This will create all necessary database tables."
echo ""

echo "📋 Step 2: Backend Setup"
echo "------------------------"
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
else
    echo "Backend dependencies already installed"
fi

echo ""
echo "📋 Step 3: Frontend Setup"
echo "-------------------------"
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
else
    echo "Frontend dependencies already installed"
fi

echo ""
echo "📋 Step 4: Testing Database Connection"
echo "-------------------------------------"
cd ../backend
echo "Testing database connection..."
node test_ticket_system.js

echo ""
echo "📋 Step 5: Starting the System"
echo "------------------------------"
echo ""
echo "To start the system, run these commands in separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "🎉 Setup complete! The ticket system will be available at:"
echo "   Frontend: http://localhost:3000/tickets"
echo "   Backend API: http://localhost:3001/api/tickets"
echo ""
echo "📚 For more information, see TICKET_SYSTEM_README.md"
