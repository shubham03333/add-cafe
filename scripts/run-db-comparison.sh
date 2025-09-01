#!/bin/bash

echo "🔍 Database Comparison Tool for Cafe Adda"
echo "=========================================="
echo ""

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file not found!"
    echo ""
    echo "📝 Please create .env.production with your production database credentials:"
    echo "   cp .env.production.example .env.production"
    echo "   # Then edit .env.production with your actual production database details"
    echo ""
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

# Check if mysql2 package is available
if ! node -e "require('mysql2')" &> /dev/null; then
    echo "📦 Installing required dependencies..."
    npm install mysql2 dotenv
fi

echo "🚀 Running database comparison..."
echo ""

# Run the comparison script
node scripts/compare-databases.js

echo ""
echo "✅ Comparison complete!"
echo ""
echo "💡 Next steps:"
echo "   1. Review the output above for any differences"
echo "   2. Check if order statuses differ between dev and prod"
echo "   3. Look for any missing orders or data inconsistencies"
echo "   4. If you find issues, check your production database setup"
