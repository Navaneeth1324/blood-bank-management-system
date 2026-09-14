#!/usr/bin/env bash

# Start Blood Bank Management System permanently in background
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Check if already running
PID=$(pgrep -f "src/server.js")
if [ -n "$PID" ]; then
  echo "⚠️ Server is already running with PID: $PID"
  echo "🌐 Access it at: http://localhost:3000"
  exit 0
fi

echo "🚀 Starting Blood Bank Management System permanently in background..."
nohup node src/server.js > "$DIR/server.log" 2>&1 &
NEW_PID=$!

echo "✅ Server started with PID: $NEW_PID"
echo "🌐 URL: http://localhost:3000"
echo "📄 Logs: tail -f $DIR/server.log"
echo "🛑 To stop: pkill -f 'src/server.js'"
