const { spawn } = require('node:child_process');

const server = spawn(
  process.execPath,
  [require.resolve('expo/bin/cli'), 'start', '--dev-client', ...process.argv.slice(2)],
  { stdio: 'inherit', env: { ...process.env, APP_VARIANT: 'development' } },
);

server.on('error', error => {
  console.error('Could not start the development server:', error.message);
  process.exitCode = 1;
});
server.on('exit', code => { process.exitCode = code ?? 1; });
