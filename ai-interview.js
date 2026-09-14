const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const resumeFile = $('#resumeFile');
const fileStatus = $('#fileStatus');
const resumeText = $('#resumeText');
const jdText = $('#jdText');
const formError = $('#formError');
const analyzeButton = $('#analyzeButton');

const sampleResume = `虚构测试候选人｜研究生一年级｜目标：AI产品经理实习
示例科技公司｜产品研究实习生（仅为虚构测试资料）
- 分析10款AI学习工具，整理20条功能体验记录
- 访谈5名同学，记录学习场景、问题频率和替代方案
- 输出需求清单和原型草稿，未开发上线，效果数据未知
项目经历
- 使用Excel清理模拟问卷，整理用户反馈分类
- 设计文案生成功能的评测方案，尚未组织正式评测
技能：Excel、Python、数据分析、用户研究、Prompt设计`;

const sampleJd = `AI产品实习生
1. 参与AI生成入口的产品设计，完善从首页进入、素材上传、AI生成到结果展示的完整链路；
2. 梳理不同生成场景的用户需求、使用流程和功能规则，输出产品需求文档、流程图和交互说明；
3. 跟进图片、文字及多模态输入能力，设计上传、编辑、生成、重试和失败处理；
4. 参与用户行为数据分析，搭建访问、上传、生成、结果查看及转化漏斗；
5. 进行竞品调研、用户反馈整理和可用性测试；
6. 跟进需求评审、设计、开发、测试和上线，完成验收与复盘；
7. 协助建立AI生成内容质量评估标准，关注成功率、耗时、满意度和后续转化。`;


let questions = [];
let currentAnalysis = null;
let diagnoses = [];
const state = { step: 'setup', questionIndex: 0, stage: 0, answers: [], startedAt: null };

async function apiPost(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function checkApi() {
  const status = $('#apiStatus');
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    if (!response.ok) throw new Error('服务不可用');
    const data = await response.json();
    status.innerHTML = `<i></i> ${data.configured ? 'DeepSeek 已配置 · Key 待验证' : 'DeepSeek Key 未配置'}`;
    status.classList.toggle('is-error', !data.configured);
  } catch {
    const staticPreview = location.hostname.endsWith('.github.io');
    status.innerHTML = `<i></i> ${staticPreview ? 'GitHub Pages 静态预览' : '服务未启动'}`;
    status.classList.add('is-error');
    if (staticPreview) {
      analyzeButton.disabled = true;
      formError.textContent = 'GitHub Pages 只能展示前端，不能运行模型后端。请从仓库下载代码并本地启动；在线真实调用需要另行部署 Node 服务。';
    }
  }
}

checkApi();

resumeFile?.addEventListener('change', () => {
  const file = resumeFile.files?.[0];
  fileStatus.textContent = file ? `已选择：${file.name}（暂不支持 PDF 解析，请同时粘贴文本）` : '或在下方粘贴简历文本';
});

$('#loadSample')?.addEventListener('click', () => {
  resumeText.value = sampleResume;
  jdText.value = sampleJd;
  formError.textContent = '';
});

analyzeButton?.addEventListener('click', async () => {
  if (!resumeText.value.trim() || !jdText.value.trim()) {
    formError.textContent = '请填写简历文本和岗位 JD；也可以先载入测试样本。';
    return;
  }
  formError.textContent = '';
  analyzeButton.disabled = true;
  analyzeButton.innerHTML = 'AI 正在分析简历与 JD…';
  try {
    const result = await apiPost('/api/interview/analyze', {
      resume: resumeText.value,
      jd: jdText.value
    });
    $('#apiStatus').innerHTML = `<i></i> 模型调用成功 · ${escapeHtml(result.model)}`;
    $('#apiStatus').classList.remove('is-error');
    currentAnalysis = result.analysis;
    questions = result.questions.map(item => normalizeQuestion(item, result.analysis));
    diagnoses = [];
    analyzeButton.disabled = false;
    analyzeButton.innerHTML = '分析匹配关系 <span>→</span>';
    renderAnalysis();
    goTo('analysis');
  } catch (error) {
    analyzeButton.disabled = false;
    analyzeButton.innerHTML = '重新分析 <span>→</span>';
    formError.textContent = error.status ? error.message : '无法连接本地服务。请双击启动文件，并访问 http://127.0.0.1:4180/ai-interview.html。';
  }
});

function normalizeQuestion(item, analysis) {
  const typeMap = {
    resume_verification: '简历证据核验',
    jd_competency: 'JD 能力匹配',
    scenario_transfer: '场景迁移'
  };
  const competencyMap = new Map((analysis.competencies || []).map(item => [item.competency_id, item.name]));
  const evidenceMap = new Map((analysis.resume_evidence || []).map(item => [item.evidence_id, item.claim]));
  return {
    api: item,
    questionId: item.question_id,
    sourceEvidenceIds: item.source_evidence_ids,
    id: item.question_id,
    raw: item,
    type: typeMap[item.question_type] || '针对性问题',
    competency: item.competency_ids.map(id => competencyMap.get(id)).filter(Boolean).join(' · ') || '综合能力',
    source: item.source_evidence_ids.map(id => evidenceMap.get(id)).filter(Boolean).join('；') || item.reason,
    prompt: item.question,
    expected: item.expected_evidence,
    followup: '',
    gap: '',
    score: null
  };
}

function goTo(step) {
  state.step = step;
  $$('.view').forEach(view => view.classList.toggle('is-visible', view.id === `${step}View`));
  $$('.step-item').forEach(item => {
    const allowed = ['setup', 'analysis', 'interview', 'report'].indexOf(item.dataset.step) <= ['setup', 'analysis', 'interview', 'report'].indexOf(step);
    item.disabled = !allowed;
    item.classList.toggle('is-active', item.dataset.step === step);
    item.toggleAttribute('aria-current', item.dataset.step === step);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('.step-item').forEach(item => item.addEventListener('click', () => !item.disabled && goTo(item.dataset.step)));

function renderAnalysis() {
  const analysis = currentAnalysis;
  const competencyMap = new Map((analysis?.competencies || []).map(item => [item.competency_id, item]));
  const evidenceMap = new Map((analysis?.resume_evidence || []).map(item => [item.evidence_id, item]));
  const matches = analysis?.matches || [];
  const evidenceCount = new Set(matches.flatMap(item => item.evidence_ids || [])).size;
  const gapCount = matches.filter(item => item.match_level === 'weak' || item.match_level === 'missing').length;
  const matchLabels = { strong: '强匹配', medium: '中等匹配', weak: '证据较弱', missing: '证据缺口' };
  const matchClasses = { strong: 'strong', medium: 'medium', weak: 'weak', missing: 'gap' };
  const topRisks = [...matches]
    .sort((a, b) => ({ high: 3, medium: 2, low: 1 }[b.interview_risk] - ({ high: 3, medium: 2, low: 1 }[a.interview_risk])))
    .slice(0, 3);
  $('#analysisView').innerHTML = `
    <div class="view-heading compact-heading">
      <p>02 / EVIDENCE MAP</p>
      <h1 id="analysisTitle">先看匹配，<br>再决定问什么。</h1>
      <span>以下结论由 AI 根据本次提交的简历与 JD 生成，请核对证据边界。</span>
    </div>
    <div class="analysis-summary">
      <div><small>目标岗位</small><strong>${escapeHtml(analysis?.target_role || 'AI 产品经理实习生')}</strong></div>
      <div><small>岗位能力</small><strong>${analysis?.competencies?.length || 0} 项</strong></div>
      <div><small>有效证据</small><strong>${evidenceCount} 项</strong></div>
      <div><small>重点缺口</small><strong class="accent-orange">${gapCount} 项</strong></div>
    </div>
    <div class="evidence-layout">
      <section class="evidence-table">
        <div class="table-title"><strong>能力证据匹配</strong><span>按面试风险排序</span></div>
        ${matches.map(match => {
          const competency = competencyMap.get(match.competency_id);
          const evidence = (match.evidence_ids || []).map(id => evidenceMap.get(id)?.claim).filter(Boolean).join('；');
          return `<div class="evidence-row"><div><strong>${escapeHtml(competency?.name || match.competency_id)}</strong><small>${escapeHtml(evidence || match.reason)}</small></div><span class="match ${matchClasses[match.match_level]}">${matchLabels[match.match_level]}</span></div>`;
        }).join('')}
      </section>
      <aside class="risk-panel">
        <p>优先追问</p>
        <h2>${escapeHtml(topRisks[0]?.reason || '系统将优先验证证据较弱和岗位重要度较高的能力。')}</h2>
        <ul>
          ${topRisks.map((risk, index) => `<li><span>0${index + 1}</span>${escapeHtml(risk.gaps?.[0] || risk.reason)}</li>`).join('')}
        </ul>
        <div class="truth-note"><i>!</i><p>系统不会把“计划验证”改写成“已经上线”，也不会要求你补造未知结果。</p></div>
      </aside>
    </div>
    <div class="page-actions"><button class="text-button" type="button" data-back="setup">修改资料</button><button class="primary-button" id="startInterview" type="button">开始 5 题面试 <span>→</span></button></div>`;
  $('[data-back="setup"]')?.addEventListener('click', () => goTo('setup'));
  $('#startInterview')?.addEventListener('click', () => {
    state.questionIndex = 0;
    state.stage = 0;
    state.answers = [];
    state.startedAt = Date.now();
    renderInterview();
    goTo('interview');
  });
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function renderInterview() {
  const q = questions[state.questionIndex];
  const progress = ((state.questionIndex + (state.stage ? .55 : 0)) / questions.length) * 100;
  $('#interviewView').innerHTML = `
    <div class="interview-top">
      <div><p>03 / INTERVIEW</p><strong>问题 ${state.questionIndex + 1} <span>/ ${questions.length}</span></strong></div>
      <div class="progress-track" aria-label="面试进度"><i style="width:${progress}%"></i></div>
      <span>${escapeHtml(q.type)}</span>
    </div>
    <div class="interview-layout">
      <section class="conversation-panel">
        <div class="question-block">
          <div class="speaker"><span>AI</span><small>${escapeHtml(state.stage ? '动态追问' : q.competency)}</small></div>
          <h1 id="interviewTitle">${escapeHtml(state.stage ? q.followup : q.prompt)}</h1>
          ${state.stage ? `<div class="gap-alert"><span>发现的主要缺口</span><p>${escapeHtml(getGapText(state.questionIndex))}</p></div>` : ''}
        </div>
        <label class="answer-label" for="answerText">你的回答</label>
        <textarea id="answerText" class="answer-box" rows="9" placeholder="先讲真实情况；不确定的结果可以明确说明……"></textarea>
        <div class="answer-actions">
          ${q.sample ? '<button class="text-button" id="sampleAnswer" type="button">载入真实测试回答</button>' : '<span></span>'}
          <div><span id="answerHint">建议 80—300 字</span><button class="primary-button" id="submitAnswer" type="button">${state.stage ? '完成本题' : '提交回答'} <span>→</span></button></div>
        </div>
        <p class="form-error" id="answerError" role="alert"></p>
      </section>
      <aside class="question-aside">
        <p>考察证据</p>
        <div class="evidence-chips">${q.expected.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>
        <div class="source-card"><small>问题来源</small><p>${escapeHtml(q.source)}</p></div>
        <div class="rule-card"><small>回答原则</small><p>不知道可以明确说不知道。系统更关注证据边界，而不是强行完整。</p></div>
      </aside>
    </div>`;

  $('#sampleAnswer')?.addEventListener('click', () => {
    $('#answerText').value = state.stage ? q.followupSample : q.sample;
    $('#answerError').textContent = '';
  });
  $('#submitAnswer').addEventListener('click', submitAnswer);
}

function getGapText(index) {
  if (questions[index]?.gap) return questions[index].gap;
  return [
    '已有策略结论，但样本依据、个人职责与建议是否落地仍不清楚。',
    '主流程已建立，但仅靠重试无法避免事实识别错误进入文案。',
    '用户行为指标不足以判断内容质量，评分一致性需要校准。',
    '“回答笼统”需要具体到上下文利用和建议可执行性。',
    '团队任务仍偏抽象，需要在时间约束下明确优先级与验收指标。'
  ][index];
}

async function submitAnswer() {
  const answer = $('#answerText').value.trim();
  if (answer.length < 20) {
    $('#answerError').textContent = '回答信息较少。请补充一个具体事实，或载入真实测试回答继续演示。';
    return;
  }
  const button = $('#submitAnswer');
  const answerHistory = state.answers.filter(item => item.question === state.questionIndex).map(item => item.text);
  button.disabled = true;
  button.textContent = 'AI 正在分析回答…';
  try {
    const q = questions[state.questionIndex];
    const relevantEvidence = (currentAnalysis?.resume_evidence || []).filter(item => q.sourceEvidenceIds?.includes(item.evidence_id));
    const diagnosis = await apiPost('/api/interview/diagnose', {
      question: q.api || q,
      relevant_evidence: relevantEvidence,
      answer_history: answerHistory,
      answer,
      follow_up_count: state.stage
    });
    state.answers.push({ question: state.questionIndex, question_id: qfinder(q), stage: state.stage, text: answer });
    if (state.stage === 0 && diagnosis.follow_up.needed && diagnosis.follow_up.question) {
      q.followup = diagnosis.follow_up.question;
      q.gap = diagnosis.main_gap;
      q.firstDiagnosis = diagnosis;
      state.stage = 1;
      renderInterview();
      return;
    }
    diagnoses[state.questionIndex] = diagnosis;
    showQuestionResult();
  } catch (error) {
    button.disabled = false;
    button.innerHTML = `${state.stage ? '完成本题' : '提交回答'} <span>→</span>`;
    $('#answerError').textContent = error.message;
  }
}

function qfinder(q) {
  return q.questionId || q.api?.question_id || `q_${String(state.questionIndex + 1).padStart(2, '0')}`;
}

function showQuestionResult() {
  const q = questions[state.questionIndex];
  const diagnosis = diagnoses[state.questionIndex];
  const coach = diagnosis.review;
  const lastAnswer = state.answers[state.answers.length - 1]?.text || '';
  const explicitBoundary = /(不知道|未参与|无法确认|没有上线|没有采用|不确定)/.test(lastAnswer);
  const score = diagnosis?.scores?.length ? diagnosis.scores.reduce((sum, item) => sum + item.score, 0) / diagnosis.scores.length : q.score;
  q.score = score;
  const feedback = diagnosis ? [
    diagnosis.strongest_evidence?.[0] || '回答已完成证据检查',
    diagnosis.main_gap,
    diagnosis.credibility?.reason
  ].filter(Boolean) : q.feedback;
  const structure = Array.isArray(coach.optional_structure) ? coach.optional_structure.join(' → ') : coach.structure;
  const reference = coach.reference_answer ?? coach.reference;
  $('#interviewView').innerHTML = `
    <div class="question-result">
      <span class="result-kicker">QUESTION ${String(state.questionIndex + 1).padStart(2, '0')} / COMPLETE</span>
      <div class="score-orbit"><strong>${score.toFixed(1)}</strong><small>/ 5.0</small></div>
      <h1>${explicitBoundary ? '边界说清楚，反而让经历更可信。' : '证据链已经比初始回答完整。'}</h1>
      <div class="feedback-list">${feedback.map((item, index) => `<div><span>0${index + 1}</span><p>${escapeHtml(item)}</p></div>`).join('')}</div>
      <section class="coaching-panel">
        <div class="coaching-title"><span>REVIEW</span><strong>本题复盘</strong></div>
        <p class="diagnosis-copy">${escapeHtml(coach.diagnosis)}</p>
        <div class="action-grid">${coach.actions.map((item, index) => `<div><b>0${index + 1}</b><span>${escapeHtml(item)}</span></div>`).join('')}</div>
        <div class="answer-structure"><small>可尝试的组织方式</small><p>${escapeHtml(structure)}</p></div>
        ${reference ? `<details class="reference-answer">
          <summary>查看基于真实信息的参考回答 <span>＋</span></summary>
          <p>${escapeHtml(reference)}</p>
          <small>${escapeHtml(coach.reference_answer_notice || '参考回答只重组本次提供的信息，没有添加不存在的经历和结果。')}</small>
        </details>` : ''}
      </section>
      <div class="result-actions">
        <button class="text-button" id="reviewAgain" type="button">返回修改回答</button>
        <button class="primary-button" id="nextQuestion" type="button">${state.questionIndex === questions.length - 1 ? '生成能力报告' : '下一道问题'} <span>→</span></button>
      </div>
    </div>`;
  $('#reviewAgain').addEventListener('click', renderInterview);
  $('#nextQuestion').addEventListener('click', () => {
    if (state.questionIndex === questions.length - 1) {
      generateReport();
    } else {
      state.questionIndex += 1;
      state.stage = 0;
      renderInterview();
    }
  });
}


async function generateReport() {
  const button = $('#nextQuestion');
  button.disabled = true;
  button.textContent = 'AI 正在生成完整报告…';
  try {
    const transcript = questions.map((question, index) => ({
      question_id: qfinder(question),
      question: question.prompt,
      answers: state.answers.filter(item => item.question === index).map(item => item.text)
    }));
    const report = await apiPost('/api/interview/report', {
      analysis: currentAnalysis,
      transcript,
      diagnoses
    });
    renderReport(report);
    goTo('report');
  } catch (error) {
    button.disabled = false;
    button.innerHTML = '生成能力报告 <span>→</span>';
    const existing = $('.form-error', $('#interviewView'));
    if (existing) existing.textContent = error.message;
    else button.insertAdjacentHTML('beforebegin', `<p class="form-error">${escapeHtml(error.message)}</p>`);
  }
}

function renderReport(report) {
  const quick = report.quick_report;
  const deep = report.deep_report;
  const overall = report.overall_score;
  const dimensionRows = quick.dimension_scores.map(item => `
    <div class="dimension-row"><span>${escapeHtml(item.dimension)}</span><div><i style="width:${item.score / 5 * 100}%"></i></div><strong>${item.score.toFixed(1)}</strong></div>`).join('');
  const strengths = quick.strongest_evidence.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const gaps = quick.main_gaps.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const reviews = deep.question_reviews.map((review, index) => {
    const question = questions.find(item => qfinder(item) === review.question_id) || questions[index];
    return `<article class="question-review">
      <div class="review-index"><span>0${index + 1}</span><strong>${review.score.toFixed(1)}</strong></div>
      <div><small>${escapeHtml(question?.competency || '能力诊断')}</small><h3>${escapeHtml(question?.prompt || review.question_id)}</h3>
      <p><b>主要判断：</b>${escapeHtml(review.main_judgment)}</p>
      <p><b>证据：</b>${escapeHtml(review.evidence_quotes.join('；') || '本题未形成充分证据')}</p>
      <p><b>下一步：</b>${escapeHtml(review.next_actions.join('；'))}</p></div>
    </article>`;
  }).join('');
  const audit = deep.evidence_audit;
  const trainingPlan = deep.training_plan.map(item => `<div><b>优先级 ${item.priority}</b><strong>${escapeHtml(item.task)}</strong><p>${escapeHtml(item.deliverable)}｜完成标准：${escapeHtml(item.completion_criteria)}</p></div>`).join('');

  $('#reportView').innerHTML = `
    <div class="report-header">
      <div><p>04 / REPORT</p><h1 id="reportTitle">${escapeHtml(quick.summary)}</h1></div>
      <div class="overall-score"><small>综合表现</small><strong>${overall.toFixed(1)}</strong><span>/ 5.0</span><em>基于本次 5 道回答</em></div>
    </div>
    <div class="report-switch" role="tablist" aria-label="报告深度">
      <button class="is-active" type="button" role="tab" aria-selected="true" data-report-mode="quick">快速总结 <span>2分钟</span></button>
      <button type="button" role="tab" aria-selected="false" data-report-mode="deep">深度分析 <span>含逐题诊断</span></button>
    </div>
    <div class="report-panel is-visible" id="quickReport" role="tabpanel">
      <div class="report-grid">
        <section class="dimension-card"><div class="section-title"><strong>能力雷达</strong><span>基于 5 道回答</span></div><div class="dimension-list">${dimensionRows}</div></section>
        <section class="report-card strength-card"><div class="section-title"><strong>最强证据</strong><span>STRENGTH</span></div><ul>${strengths}</ul></section>
        <section class="report-card gap-card"><div class="section-title"><strong>主要缺口</strong><span>GAPS</span></div><ul>${gaps}</ul></section>
        <section class="next-card"><p>NEXT ACTION</p><h2>${escapeHtml(quick.next_action)}</h2></section>
      </div>
    </div>
    <div class="report-panel" id="deepReport" role="tabpanel">
      <section class="deep-summary"><p>CORE DIAGNOSIS</p><h2>${escapeHtml(deep.core_diagnosis)}</h2></section>
      <section class="deep-section"><div class="section-title"><strong>逐题诊断</strong><span>5 QUESTIONS</span></div><div class="question-review-list">${reviews}</div></section>
      <section class="deep-section evidence-audit">
        <div class="section-title"><strong>证据边界审计</strong><span>FACT / INFERENCE / UNKNOWN</span></div>
        <div class="audit-grid">
          <div><span class="audit-label fact">可以确认</span><p>${escapeHtml(audit.confirmed.join('；') || '暂无')}</p></div>
          <div><span class="audit-label inference">属于推断</span><p>${escapeHtml(audit.inferences.join('；') || '暂无')}</p></div>
          <div><span class="audit-label unknown">目前未知</span><p>${escapeHtml(audit.unknowns.join('；') || '暂无')}</p></div>
        </div>
      </section>
      <section class="deep-section action-plan"><div class="section-title"><strong>训练计划</strong><span>ACTION PLAN</span></div><div class="plan-grid">${trainingPlan}</div></section>
      <section class="deep-section methodology-note"><strong>评分说明</strong><p>${escapeHtml(report.disclaimer)}</p></section>
    </div>
    <div class="report-footer"><p>${escapeHtml(report.disclaimer)}</p><div><button class="text-button" id="restartInterview" type="button">重新开始</button><button class="primary-button" id="copySummary" type="button">复制报告摘要</button></div></div>
    <div class="toast" id="toast" role="status">报告摘要已复制</div>`;

  $('#restartInterview').addEventListener('click', () => goTo('setup'));
  $$('[data-report-mode]').forEach(button => button.addEventListener('click', () => {
    const deepMode = button.dataset.reportMode === 'deep';
    $$('[data-report-mode]').forEach(item => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });
    $('#quickReport').classList.toggle('is-visible', !deepMode);
    $('#deepReport').classList.toggle('is-visible', deepMode);
  }));
  $('#copySummary').addEventListener('click', async () => {
    const summary = `AI面试陪练报告｜综合 ${overall.toFixed(1)}/5\n${quick.summary}\n优势：${quick.strongest_evidence.join('；')}\n缺口：${quick.main_gaps.join('；')}\n下一步：${quick.next_action}`;
    try { await navigator.clipboard.writeText(summary); } catch { /* 浏览器可能限制剪贴板 */ }
    $('#toast').classList.add('show');
    window.setTimeout(() => $('#toast')?.classList.remove('show'), 1800);
  });
}
