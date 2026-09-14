// Validates the JSON Schema subset used by this project's four schemas.
export function validateSchema(value, schema, location = '$') {
  const errors = [];
  const add = message => errors.push(`${location}: ${message}`);
  const types = schema.type ? (Array.isArray(schema.type) ? schema.type : [schema.type]) : [];
  const matchesType = type => ({
    null: value === null,
    object: value !== null && typeof value === 'object' && !Array.isArray(value),
    array: Array.isArray(value),
    string: typeof value === 'string',
    boolean: typeof value === 'boolean',
    number: typeof value === 'number' && Number.isFinite(value),
    integer: Number.isInteger(value)
  })[type];
  if (types.length && !types.some(matchesType)) { add('字段类型不符合要求'); return errors; }
  if ('const' in schema && value !== schema.const) add('固定字段不符合要求');
  if (schema.enum && !schema.enum.includes(value)) add('字段值不在允许范围内');
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && [...value].length < schema.minLength) add('文本过短');
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) add('字段格式不符合要求');
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) add('数值低于最小值');
    if (schema.maximum !== undefined && value > schema.maximum) add('数值高于最大值');
    if (schema.multipleOf && Math.abs(value / schema.multipleOf - Math.round(value / schema.multipleOf)) > 1e-8) add('分数步长不符合要求');
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) add('数组项目过少');
    if (schema.maxItems !== undefined && value.length > schema.maxItems) add('数组项目过多');
    if (schema.items) value.forEach((item, index) => errors.push(...validateSchema(item, schema.items, `${location}[${index}]`)));
  } else if (value !== null && typeof value === 'object') {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) add(`缺少 ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (Object.hasOwn(schema.properties || {}, key)) errors.push(...validateSchema(item, schema.properties[key], `${location}.${key}`));
      else if (schema.additionalProperties === false) add('含有未定义字段');
    }
  }
  return errors;
}

export function schemaExample(schema, key = '') {
  if ('const' in schema) return schema.const;
  if (schema.enum) return schema.enum[0];
  const type = Array.isArray(schema.type) ? schema.type.find(type => type !== 'null') : schema.type;
  if (type === 'object') return Object.fromEntries(Object.entries(schema.properties || {}).map(([key, value]) => [key, schemaExample(value, key)]));
  if (type === 'array') return Array.from({ length: schema.minItems ?? 1 }, () => schemaExample(schema.items));
  if (type === 'boolean') return false;
  if (type === 'number' || type === 'integer') return schema.minimum ?? 1;
  if (key === 'evidence_id') return 'ev_01';
  if (key === 'competency_id') return 'cp_01';
  if (key === 'question_id') return 'q_01';
  return '格式示例，请根据本次输入填写真实内容';
}
