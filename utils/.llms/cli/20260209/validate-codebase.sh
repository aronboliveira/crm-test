#!/bin/bash

# Codebase Syntax and Basic Validation Script
echo "=== Codebase Validation Report ===" > validation-report.txt
echo "Generated: $(date)" >> validation-report.txt
echo "" >> validation-report.txt

# Check TypeScript syntax for packages
echo "--- TypeScript Build Check (packages) ---" >> validation-report.txt
cd packages/contracts && npm run build >> ../../validation-report.txt 2>&1
if [ $? -eq 0 ]; then
  echo "✓ @corp/contracts build: SUCCESS" >> ../../validation-report.txt
else
  echo "✗ @corp/contracts build: FAILED" >> ../../validation-report.txt
fi

cd ../foundations && npm run build >> ../../validation-report.txt 2>&1
if [ $? -eq 0 ]; then
  echo "✓ @corp/foundations build: SUCCESS" >> ../../validation-report.txt
else
  echo "✗ @corp/foundations build: FAILED" >> ../../validation-report.txt
fi

cd ../..

echo "" >> validation-report.txt
echo "--- Linting Check ---" >> validation-report.txt

# Lint packages
npm run lint -w @corp/contracts >> validation-report.txt 2>&1
npm run lint -w @corp/foundations >> validation-report.txt 2>&1

echo "" >> validation-report.txt
echo "--- Test Results ---" >> validation-report.txt

# Run tests
npm test >> validation-report.txt 2>&1

echo "" >> validation-report.txt
echo "=== Validation Complete ===" >> validation-report.txt

cat validation-report.txt
