#!/usr/bin/env node

// Parse autocannon JSON output and emit CSV fields
// Usage: autocannon -j ... | node parse-autocannon.js [label]

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let jsonData = '';

rl.on('line', (line) => {
  jsonData += line + '\n';
});

rl.on('close', () => {
  try {
    // Find JSON object in output (autocannon might output other lines)
    const lines = jsonData.trim().split('\n');
    let jsonLine = '';
    
    // Look for a line that starts with { (JSON object)
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('{')) {
        jsonLine = trimmed;
        break;
      }
    }
    
    if (!jsonLine) {
      throw new Error('No JSON object found in autocannon output');
    }
    
    const result = JSON.parse(jsonLine);
    
    // Extract required fields from autocannon result object
    // Based on autocannon docs: result has requests, throughput, errors, duration
    const timestamp = new Date().toISOString();
    const label = process.argv[2] || '';
    
    // requests is a histogram object with total, average, etc.
    const totalRequests = result.requests?.total || 0;
    const requestsPerSecond = result.requests?.average || 0;
    
    // throughput is a histogram object with total (bytes)
    const totalBytes = result.throughput?.total || 0;
    
    const errors = result.errors || 0;
    const duration = result.duration || 0;
    
    // Output CSV: timestamp, label, total_requests, requests_per_second, total_bytes, errors, duration
    console.log(`${timestamp},${label},${totalRequests},${requestsPerSecond},${totalBytes},${errors},${duration}`);
  } catch (error) {
    console.error('Error parsing autocannon output:', error.message);
    console.error('Raw output:', jsonData);
    process.exit(1);
  }
});
