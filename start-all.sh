#!/bin/bash

echo "Starting AI Resume Agent Microservices..."

# Create necessary directories
mkdir -p storage/users/default_user/profile
mkdir -p storage/users/default_user/onboarding
mkdir -p storage/users/default_user/master
mkdir -p storage/users/default_user/generated
mkdir -p storage/users/default_user/conversations

# Start AI Service (Python/FastAPI) on port 8000
echo "Starting AI Service (Port 8000)..."
cd ai-service
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
AI_PID=$!
cd ..

# Start Backend (Spring Boot) on port 8080
echo "Starting Backend Service (Port 8080)..."
cd backend
mvn spring-boot:run &
BACKEND_PID=$!
cd ..

# Start Frontend (Next.js) on port 3000
echo "Starting Frontend Service (Port 3000)..."
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!
cd ..

echo "All services started!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8080"
echo "AI Service: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services."

# Trap Ctrl+C to kill all background processes
trap "echo 'Stopping services...'; kill $AI_PID $BACKEND_PID $FRONTEND_PID; exit" INT

wait
