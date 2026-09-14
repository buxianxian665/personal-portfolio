import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('static pages, private-file protection, and local API validation', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: '0', DEEPSEEK_API_KEY: 'test-placeholder-not-a-real-key' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  try {
    const base = await new Promise((resolve, reject) => {
      let stdout = '';
      const timer = setTimeout(() => reject(new Error('Local test server did not start')), 15000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
        const match = stdout.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
        if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); }
      });
    });
    for (const pathname of ['/index.html', '/ai-interview.html', '/ai-interview.js', '/ai-interview.css', '/assets/hero-photo.jpg']) {
      assert.equal((await fetch(base + pathname)).status, 200, pathname);
    }
    for (const pathname of ['/.env.local', '/%2eenv.local', '/.git/config', '/server.js', '/package.json', '/resume-output/report.html', '/ai-interview-coach/schemas/01-analysis.schema.json', '/启动AI面试陪练.cmd']) {
      assert.equal((await fetch(base + pathname)).status, 403, pathname);
    }
    assert.equal((await fetch(base + '/api/health')).status, 200);
    assert.equal((await fetch(base + '/api/interview/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://untrusted.example' }, body: '{}'
    })).status, 403);
    assert.equal((await fetch(base + '/api/interview/analyze', {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}'
    })).status, 415);
    assert.equal((await fetch(base + '/api/interview/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
    })).status, 400);
  } finally {
    if (child.exitCode === null) {
      await new Promise(resolve => { child.once('exit', resolve); child.kill(); });
    }
  }
});
