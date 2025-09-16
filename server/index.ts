// Temporary server file to satisfy package.json script
// This is a frontend-only app that should be run with vite

import { spawn } from 'child_process';

console.log('Starting Vite development server...');

// Start vite in the current process with proper stdio handling
const vite = spawn('vite', ['--port', '5000', '--host', '0.0.0.0'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: {
    ...process.env,
    VITE_DEV_SERVER_HOST: '0.0.0.0',
    DANGEROUSLY_DISABLE_HOST_CHECK: 'true'
  }
});

vite.on('error', (error) => {
  console.error(`Error starting vite: ${error}`);
  process.exit(1);
});

vite.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
  process.exit(code);
});