import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deepseekJson, DEFAULT_MODEL, ProviderError } from './lib/deepseek-client.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
loadLocalEnv(path.join(ROOT, '.env.local'));

const PORT = Number(process.env.PORT || 4180);
const MODEL = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
const API_KEY = process.env.DEEPSEEK_API_KEY;
const MAX_BODY_BYTES = 1_000_000;

const schemas = {
  analysis: await loadSchema('01-analysis.schema.json'),
  questions: await loadSchema('02-question-set.schema.json'),
  diagnosis: await loadSchema('03-answer-diagnosis.schema.json'),
  report: await loadSchema('04-report.schema.json')
};

const prompts = {
  analysis: await loadPrompt('01-分析简历与JD.md'),
  questions: await loadPrompt('02-生成面试问题.md'),
  diagnosis: await loadPrompt('03-诊断回答与追问.md'),
  report: await loadPrompt('04-生成面试报告.md')
};

function loadLocalEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function loadSchema(name) {
  const raw = JSON.parse(await readFile(path.join(ROOT, 'ai-interview-coach', 'schemas', name), 'utf8'));
  delete raw.$schema;
  delete raw.$id;
  delete raw.title;
  return raw;
}

async function loadPrompt(name) {
  return readFile(path.join(ROOT, 'ai-interview-coach', 'prompts', name), 'utf8');
}

async function modelJson(options) {
  return deepseekJson({ apiKey: API_KEY, model: MODEL, ...options });
}

async function analyzeInterview(body) {
  const resume = requireText(body.resume, '简历文本', 30, 50_000);
  const jd = requireText(body.jd, '岗位 JD', 30, 30_000);
  const analysis = await modelJson({
    instructions: prompts.analysis,
    input: `【简历文本】\n${resume}\n\n【目标岗位 JD】\n${jd}`,
    schema: schemas.analysis,
    name: 'interview_analysis'
  });
  const questionSet = await modelJson({
    instructions: prompts.questions,
    input: JSON.stringify(analysis),
    schema: schemas.questions,
    name: 'interview_question_set'
  });
  return { analysis, questions: questionSet.questions, model: MODEL };
}

async function diagnoseAnswer(body) {
  const answer = requireText(body.answer, '回答', 5, 10_000);
  const followUpCount = Math.max(0, Math.min(2, Number(body.follow_up_count) || 0));
  return modelJson({
    instructions: prompts.diagnosis,
    input: [
      `【问题】\n${JSON.stringify(body.question || {})}`,
      `【已确认简历证据】\n${JSON.stringify(body.relevant_evidence || [])}`,
      `【本题历史回答】\n${JSON.stringify(body.answer_history || [])}`,
      `【当前回答】\n${answer}`,
      `【已经追问次数】\n${followUpCount}`
    ].join('\n\n'),
    schema: schemas.diagnosis,
    name: 'answer_diagnosis'
  });
}

async function buildReport(body) {
  if (!Array.isArray(body.transcript) || body.transcript.length === 0) {
    throw new AppError(400, '缺少面试回答，无法生成报告。');
  }
  return modelJson({
    instructions: prompts.report,
    input: [
      `【岗位与证据分析】\n${JSON.stringify(body.analysis || {})}`,
      `【问题与全部回答】\n${JSON.stringify(body.transcript)}`,
      `【单题诊断】\n${JSON.stringify(body.diagnoses || [])}`
    ].join('\n\n'),
    schema: schemas.report,
    name: 'interview_report'
  });
}

function requireText(value, label, min, max) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < min) throw new AppError(400, `${label}信息过少。`);
  if (text.length > max) throw new AppError(400, `${label}过长，请控制在 ${max} 字以内。`);
  return text;
}

class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new AppError(403, '只允许本机访问。');
    if (req.method === 'POST') {
      if (req.headers.origin && req.headers.origin !== url.origin) throw new AppError(403, '禁止跨站请求。');
      if (!req.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new AppError(415, '请使用 JSON 格式提交。');
    }
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, configured: Boolean(API_KEY), provider: 'DeepSeek', model: MODEL });
    }
    if (req.method === 'POST' && url.pathname === '/api/interview/analyze') {
      return sendJson(res, 200, await analyzeInterview(await readJson(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/interview/diagnose') {
      return sendJson(res, 200, await diagnoseAnswer(await readJson(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/interview/report') {
      return sendJson(res, 200, await buildReport(await readJson(req)));
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: '不支持的请求方法。' });
    await serveStatic(url.pathname, res, req.method === 'HEAD');
  } catch (error) {
    const knownError = error instanceof AppError || error instanceof ProviderError;
    const status = knownError ? error.status : 500;
    const message = knownError ? error.message : '服务暂时不可用，请稍后重试。';
    if (status >= 500) console.error(`本地服务错误：${message}`);
    sendJson(res, status, { error: message });
  }
});

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new AppError(413, '提交内容过大。');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new AppError(400, '请求内容不是有效 JSON。');
  }
}

async function serveStatic(pathname, res, headOnly) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const decoded = decodeURIComponent(requested);
  const filePath = path.resolve(ROOT, `.${decoded}`);
  if (!isPublicFile(filePath)) throw new AppError(403, '禁止访问私有文件。');
  try {
    const resolvedPath = await realpath(filePath);
    if (!isPublicFile(resolvedPath)) throw new AppError(403, '禁止访问私有文件。');
    const data = await readFile(resolvedPath);
    res.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Cache-Control': filePath.endsWith('.html') || filePath.endsWith('.js') ? 'no-store' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(headOnly ? undefined : data);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') throw new AppError(404, '页面不存在。');
    throw error;
  }
}

function isPublicFile(filePath) {
  const relative = path.relative(ROOT, filePath);
  const parts = relative.split(path.sep);
  if (path.isAbsolute(relative) || parts.some(part => part.startsWith('.') || part.includes(':'))) return false;
  const ext = path.extname(filePath).toLowerCase();
  if (parts.length === 1) {
    if (['index.html', 'ai-interview.html'].includes(relative)) return true;
    if (['script.js', 'ai-interview.js', 'ballpit.js', 'ballpit-three.js', 'glow-cursor.js'].includes(relative)) return true;
    return ['.css', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico'].includes(ext);
  }
  return parts[0] === 'assets' && ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico', '.woff', '.woff2'].includes(ext);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function contentType(file) {
  return ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `端口 ${PORT} 已被占用。请关闭之前的面试陪练窗口后重新启动。` : `启动失败：${error.code || '未知错误'}`);
  process.exitCode = 1;
});

server.listen(PORT, '127.0.0.1', () => {
  const pageUrl = `http://127.0.0.1:${server.address().port}/ai-interview.html`;
  console.log(`AI 面试陪练已启动：${pageUrl}`);
  console.log(`模型：${MODEL}｜API Key：${API_KEY ? '已加载' : '未配置'}`);
  if (process.argv.includes('--open-browser') && process.platform === 'win32') {
    execFile('rundll32.exe', ['url.dll,FileProtocolHandler', pageUrl], { windowsHide: true }, error => {
      if (error) console.error(`浏览器未自动打开，请手动访问：${pageUrl}`);
    });
  }
});
