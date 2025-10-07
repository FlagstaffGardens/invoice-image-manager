#!/bin/bash

echo "🚀 Invoice Image Manager - Docker Test Script"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ ERROR: Docker is not running!"
    echo "   Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  WARNING: .env file not found"
    echo "   Creating from .env.example..."
    cp .env.example .env
    echo "   ⚠️  IMPORTANT: Edit .env with your API key before continuing!"
    echo "   Press Ctrl+C to exit and edit .env, or Enter to continue..."
    read
fi

echo "✅ .env file exists"
echo ""

# Stop any existing containers
echo "🧹 Cleaning up old containers..."
docker-compose down 2>/dev/null

# Build and start
echo ""
echo "🔨 Building Docker image (this may take 2-3 minutes)..."
docker-compose up --build -d

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Container is running"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Wait 10-15 seconds for initialization"
    echo "   2. Open: http://localhost:3000"
    echo "   3. Drop an invoice image to test"
    echo ""
    echo "📊 View logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "🛑 Stop container:"
    echo "   docker-compose down"
else
    echo ""
    echo "❌ BUILD FAILED!"
    echo "   Check the error messages above"
    echo "   Common fixes:"
    echo "   - Verify .env has valid API key"
    echo "   - Check internet connection"
    echo "   - Try: docker-compose down && docker-compose up --build"
fi
