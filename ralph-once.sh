#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi
echo "Running $1 iterations..."

for ((i=1; i<=$1; i++)); do
  echo "Running $i"
  result=$(claude --permission-mode acceptEdits -p "@prd.json @progress.md \
  1. Find the highest-priority task and implement it. \
  2. Run your tests and type checks. \
  3. Update the PRD with what was done. \
  4. Append your progress to progress.md. \
  5. Update the PRD.json with the new task as completed. \
  5. Commit your changes. \
  6. Push your changes. \
  ONLY WORK ON A SINGLE TASK. \
  If the PRD is complete, output <promise>COMPLETE</promise>.")

  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $i iterations."
    exit 0
  fi
done