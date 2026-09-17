import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build', ...process.argv.slice(2)], {
  stdio: 'inherit', env: { ...process.env, TIMELINE_EXPERIMENTS: '1', ASTRO_TELEMETRY_DISABLED: '1' },
});
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
