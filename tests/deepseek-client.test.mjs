import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { deepseekJson, DEEPSEEK_BASE_URL, DEFAULT_MODEL, ProviderError } from '../lib/deepseek-client.js';
import { validateSchema, schemaExample } from '../lib/schema-validator.js';

const schema = { type: 'object', additionalProperties: false, required: ['score'], properties: { score: { type: 'number', minimum: 1, maximum: 5, multipleOf: 0.5 } } };
const options = { apiKey: 'fake-test-key', instructions: '评价回答', input: '虚构测试回答', schema, name: 'test' };
const completion = (content, finishReason = 'stop') => new Response(JSON.stringify({ choices: [{ finish_reason: finishReason, message: { content } }] }), { status: 200 });

test('uses DeepSeek chat API and JSON mode, not OpenAI Responses parameters', async () => {
  const result = await deepseekJson({ ...options, fetchImpl: async (url, init) => {
    assert.equal(url, `${DEEPSEEK_BASE_URL}/chat/completions`);
    assert.equal(init.headers.Authorization, 'Bearer fake-test-key');
    const body = JSON.parse(init.body);
    assert.equal(body.model, DEFAULT_MODEL);
    assert.equal(body.thinking.type, 'disabled');
    assert.deepEqual(body.response_format, { type: 'json_object' });
    assert.match(body.messages[0].content, /JSON Schema/);
    for (const oldField of ['store', 'reasoning', 'text', 'input', 'instructions']) assert.equal(Object.hasOwn(body, oldField), false);
    return completion('{"score":3.5}');
  } });
  assert.deepEqual(result, { score: 3.5 });
});

test('missing key fails before any request', async () => {
  await assert.rejects(deepseekJson({ ...options, apiKey: '', fetchImpl: () => { throw new Error('Should not send'); } }), error => error.status === 503 && /DEEPSEEK_API_KEY/.test(error.message));
});

for (const [status, expected] of [[401, /Key 无效/], [402, /余额不足/], [404, /模型或接口/], [429, /过于频繁/]]) {
  test(`safe error for HTTP ${status}`, async () => {
    await assert.rejects(deepseekJson({ ...options, fetchImpl: async () => new Response('SECRET-NEVER-ECHO', { status }) }), error => error instanceof ProviderError && error.status === status && expected.test(error.message) && !error.message.includes('SECRET'));
  });
}

for (const [label, content, finishReason] of [
  ['invalid JSON', 'not JSON', 'stop'],
  ['empty content', '', 'stop'],
  ['out of range', '{"score":9}', 'stop'],
  ['wrong type', '{"score":"3"}', 'stop'],
  ['extra field', '{"score":3,"invented":true}', 'stop'],
  ['truncated', '{"score":3}', 'length']
]) {
  test(`rejects ${label} rather than rendering a broken report`, async () => {
    await assert.rejects(deepseekJson({ ...options, fetchImpl: async () => completion(content, finishReason) }), error => error.status === 502);
  });
}

test('network failures are actionable without leaking request details', async () => {
  await assert.rejects(deepseekJson({ ...options, fetchImpl: async () => { throw new Error('secret transport details'); } }), error => error.status === 502 && /网络/.test(error.message) && !error.message.includes('secret'));
});

for (const name of ['01-analysis', '02-question-set', '03-answer-diagnosis', '04-report']) {
  test(`local schema validator covers ${name}`, async () => {
    const raw = JSON.parse(await readFile(new URL(`../ai-interview-coach/schemas/${name}.schema.json`, import.meta.url), 'utf8'));
    const example = schemaExample(raw);
    assert.deepEqual(validateSchema(example, raw), []);
    delete example[raw.required[0]];
    assert.ok(validateSchema(example, raw).length > 0);
  });
}
