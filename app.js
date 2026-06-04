const SCHEMA_VERSION = "1.1.0";
const QUESTION_BANK_VERSION = "1.0.0";
const FAST_RESPONSE_MS = 2500;
const KEYS = {
  profile: "pythonTutorProfile",
  progress: "pythonTutorProgress",
  attempts: "pythonTutorAttempts",
  session: "pythonTutorSession",
  summaries: "pythonTutorSummaries"
};

let state = {};
let screen = "home";
let diagnosticIndex = 0;
let practiceIndex = 0;
let activeTopicId = "list_index";
let activePracticeQuestions = practiceQuestions.slice();
let isReviewMode = false;
let selectedOption = "";
let selectedConfidence = "";
let currentHints = 0;
let questionStartedAt = Date.now();
let questionTiming = createQuestionTiming();
let latestFeedback = null;
let storageIssue = null;
const dirtyKeys = new Set();
let storageFlushTimer = null;
let storageStatus = {
  lastFlushAt: null,
  lastFlushMode: null,
  lastFlushKeys: [],
  pendingFlush: false,
  flushCount: 0
};

const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const modalBody = document.querySelector("#modalBody");
const modalActions = document.querySelector("#modalActions");

function defaultTopicProgress() {
  return {
    masteryScore: 0,
    misconceptionRisk: 0,
    independenceLevel: 0,
    transferScore: 0,
    fluencyScore: 0,
    hintDependency: 0,
    evidenceCount: 0,
    status: "not_started",
    completedQuestionIds: [],
    errorTypeCounts: {},
    lastUpdatedAt: null
  };
}

function createDefaultState() {
  const now = new Date().toISOString();
  return {
    profile: {
      schemaVersion: SCHEMA_VERSION,
      questionBankVersion: QUESTION_BANK_VERSION,
      studentId: "local-user",
      createdAt: now,
      lastActiveAt: now,
      settings: { enableFastResponseReminder: true }
    },
    progress: {
      list_index: defaultTopicProgress(),
      range_loop: defaultTopicProgress(),
      conditionals: defaultTopicProgress(),
      type_conversion: defaultTopicProgress()
    },
    attempts: [],
    session: {
      sessionId: createId(),
      topicId: null,
      currentState: "TOPIC_ENTRY",
      overlayState: null,
      currentQuestionId: null,
      sessionTransitionLog: [],
      metrics: {
        hintCount: 0,
        fastResponseCount: 0,
        tabSwitchCount: 0,
        inactiveTimeMs: 0,
        fastModalVisibleTimeMs: 0
      }
    },
    summaries: []
  };
}

function loadState() {
  try {
    if (localStorage.getItem("pythonTutorState")) {
      storageIssue = "偵測到舊版學習紀錄格式。";
      return false;
    }
    const profile = JSON.parse(localStorage.getItem(KEYS.profile));
    const progress = JSON.parse(localStorage.getItem(KEYS.progress));
    const attempts = JSON.parse(localStorage.getItem(KEYS.attempts));
    const session = JSON.parse(localStorage.getItem(KEYS.session));
    const summaries = JSON.parse(localStorage.getItem(KEYS.summaries));
    if (!profile && !progress && !attempts && !session && !summaries) {
      return false;
    }
    if (!profile || profile.schemaVersion !== SCHEMA_VERSION || profile.questionBankVersion !== QUESTION_BANK_VERSION) {
      storageIssue = "偵測到版本不相容或必要欄位缺失。";
      return false;
    }
    state = { profile, progress, attempts, session, summaries };
    return true;
  } catch {
    storageIssue = "偵測到學習紀錄 JSON 損毀。";
    return false;
  }
}

function markStateDirty(keys = Object.keys(KEYS)) {
  keys.forEach((key) => dirtyKeys.add(key));
}

function saveState(options = {}) {
  markStateDirty(options.keys);
  flushStateToLocalStorage(options);
}

function flushStateToLocalStorage(options = {}) {
  const { force = false } = options;
  if (storageFlushTimer) {
    clearTimeout(storageFlushTimer);
    storageFlushTimer = null;
  }
  if (!force) {
    storageStatus.pendingFlush = true;
    storageFlushTimer = setTimeout(() => flushStateToLocalStorage({ force: true, mode: "debounced" }), 350);
    return;
  }
  const keysToWrite = dirtyKeys.size ? Array.from(dirtyKeys) : Object.keys(KEYS);
  state.profile.lastActiveAt = new Date().toISOString();
  const writers = {
    profile: () => localStorage.setItem(KEYS.profile, JSON.stringify(state.profile)),
    progress: () => localStorage.setItem(KEYS.progress, JSON.stringify(state.progress)),
    attempts: () => localStorage.setItem(KEYS.attempts, JSON.stringify(state.attempts)),
    session: () => localStorage.setItem(KEYS.session, JSON.stringify(state.session)),
    summaries: () => localStorage.setItem(KEYS.summaries, JSON.stringify(state.summaries))
  };
  keysToWrite.forEach((key) => writers[key]?.());
  dirtyKeys.clear();
  storageStatus = {
    lastFlushAt: new Date().toISOString(),
    lastFlushMode: options.mode || "force",
    lastFlushKeys: keysToWrite,
    pendingFlush: false,
    flushCount: storageStatus.flushCount + 1
  };
}

function resetAllLearningData(options = {}) {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem("pythonTutorState");
  state = createDefaultState();
  markStateDirty(Object.keys(KEYS));
  flushStateToLocalStorage({ force: true, mode: "reset" });
  diagnosticIndex = 0;
  practiceIndex = 0;
  screen = "home";
  if (!options.silent) render();
}

function init() {
  if (!loadState()) {
    state = createDefaultState();
    markStateDirty(Object.keys(KEYS));
    flushStateToLocalStorage({ force: true, mode: "init" });
  }
  bindGlobalEvents();
  render();
  showStorageIssueIfNeeded();
}

function bindGlobalEvents() {
  document.querySelector("#demoBtn").addEventListener("click", () => {
    showModal("展示模式會建立一組可重現的示範紀錄：學生把 len(list) 誤認為最後索引，經過提示與修正後完成遷移題。", [
      ["取消", hideModal, "ghost"],
      ["開始展示", startDemoMode, ""]
    ]);
  });
  document.querySelector("#adminBtn").addEventListener("click", () => {
    screen = "admin";
    render();
  });
  document.querySelector("#resetBtn").addEventListener("click", () => {
    showModal("清除學習紀錄後會重新建立本機資料。", [
      ["取消", hideModal, "ghost"],
      ["清除", resetAllLearningData, "danger"]
    ]);
  });
  document.querySelector("#viewRecordBtn").addEventListener("click", () => {
    screen = "records";
    render();
  });
  document.querySelectorAll(".steps button").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.screen;
      if (target === "diagnostic") return startDiagnostic();
      if (target === "topic") return startTopic("list_index");
      if (target === "summary") return setScreen("summary");
      setScreen(target);
    });
  });
  window.addEventListener("pagehide", () => {
    markStateDirty(Object.keys(KEYS));
    flushStateToLocalStorage({ force: true, mode: "pagehide" });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseQuestionTiming();
    } else {
      resumeQuestionTiming();
    }
  });
  modal.addEventListener("click", (event) => {
    if (event.target === modal) hideModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) hideModal();
  });
}

function showModal(body, actions) {
  modalBody.textContent = body;
  modalActions.innerHTML = "";
  actions.forEach(([label, handler, className]) => {
    const button = document.createElement("button");
    button.textContent = label;
    if (className) button.className = className;
    button.addEventListener("click", () => {
      hideModal();
      handler();
    });
    modalActions.append(button);
  });
  modal.hidden = false;
}

function hideModal() {
  modal.hidden = true;
}

function showStorageIssueIfNeeded() {
  if (!storageIssue) return;
  const message = `${storageIssue} 為避免頁面錯誤，系統已先建立新的本機資料。你可以繼續使用，或清除舊資料後重新開始。`;
  showModal(message, [
    ["繼續使用", () => { storageIssue = null; }, "ghost"],
    ["清除並重設", () => { storageIssue = null; resetAllLearningData(); }, "danger"]
  ]);
}

function logTransition(event, nextState, payload = {}) {
  state.session.currentState = nextState || state.session.currentState || "SAFE_RECOVERY";
  state.session.sessionTransitionLog.push({
    at: new Date().toISOString(),
    event,
    state: state.session.currentState,
    topicId: state.session.topicId,
    questionId: state.session.currentQuestionId,
    ...payload
  });
  state.session.sessionTransitionLog = state.session.sessionTransitionLog.slice(-100);
}

function createQuestionTiming() {
  const now = Date.now();
  return {
    startedAt: now,
    pausedAt: null,
    pausedMs: 0,
    fastConfirmed: false
  };
}

function resetQuestionTiming() {
  questionTiming = createQuestionTiming();
  questionStartedAt = questionTiming.startedAt;
}

function pauseQuestionTiming() {
  if (!questionTiming || questionTiming.pausedAt) return;
  questionTiming.pausedAt = Date.now();
  state.session.metrics.tabSwitchCount = (state.session.metrics.tabSwitchCount || 0) + 1;
}

function resumeQuestionTiming() {
  if (!questionTiming?.pausedAt) return;
  const pausedFor = Date.now() - questionTiming.pausedAt;
  questionTiming.pausedMs += pausedFor;
  questionTiming.pausedAt = null;
  state.session.metrics.inactiveTimeMs = (state.session.metrics.inactiveTimeMs || 0) + pausedFor;
}

function getQuestionTimingSnapshot() {
  const now = Date.now();
  const currentPauseMs = questionTiming.pausedAt ? now - questionTiming.pausedAt : 0;
  const rawMs = now - questionTiming.startedAt;
  const inactiveMs = questionTiming.pausedMs + currentPauseMs;
  const effectiveMs = Math.max(0, rawMs - inactiveMs);
  return { rawMs, inactiveMs, effectiveMs };
}

function setScreen(nextScreen) {
  screen = nextScreen;
  selectedOption = "";
  selectedConfidence = "";
  currentHints = 0;
  latestFeedback = null;
  resetQuestionTiming();
  render();
}

function updateSidebar() {
  const listProgress = state.progress[activeTopicId] || state.progress.list_index;
  document.querySelector("#masteryText").textContent = `${Math.round(listProgress.masteryScore)}%`;
  document.querySelector("#masteryBar").style.width = `${listProgress.masteryScore}%`;
  document.querySelector("#riskText").textContent = riskLabel(listProgress.misconceptionRisk);
  document.querySelector("#hintText").textContent = String(listProgress.hintDependency);
  document.querySelector("#transferText").textContent = listProgress.transferScore ? `${listProgress.transferScore}%` : "尚未評估";
  document.querySelectorAll(".steps button").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === screen);
  });
}

function riskLabel(value) {
  if (value >= 60) return "偏高";
  if (value >= 30) return "中";
  return "低";
}

function render() {
  updateSidebar();
  const renderers = {
    home: renderHome,
    diagnostic: renderDiagnostic,
    status: renderStatus,
    topic: renderTopic,
    self: renderSelfAssessment,
    summary: renderSummary,
    reviewSummary: renderReviewSummary,
    admin: renderAdmin,
    records: renderRecords
  };
  app.innerHTML = renderers[screen]();
  bindScreenEvents();
}

function renderHome() {
  return `
    <article class="screen">
      <div class="screen-header">
        <div>
          <h2>找出常見錯誤，完成適合你的練習</h2>
          <p>先做診斷，再進入建議主題練習；完成幾個主題後，用總複習檢查概念能否跨情境遷移。</p>
        </div>
        <div class="actions">
          <button data-action="start-diagnostic" type="button">開始診斷</button>
          <button class="ghost" data-action="start-topic" type="button">選主題練習</button>
          <button class="ghost" data-action="start-review" type="button">總複習</button>
          <button class="ghost" data-action="summary" type="button">學習摘要</button>
        </div>
      </div>
      <div class="note-box">
        <strong>建議流程</strong>
        <p>1. 初始診斷找到可能弱點。2. 依建議或自行選主題練習。3. 用總複習混合四個主題。4. 回到學習摘要查看下一步。</p>
      </div>
      <div class="compare-grid">
        ${Object.entries(topics).map(([id, topic]) => `
          <section class="question-box">
            <h3>${topic.name}</h3>
            <p>${topic.goal}</p>
            <p class="inline-help">目前題庫：${questionBankByTopic[id]?.length || 0} 題，每次抽出 4 題形成練習路徑。</p>
            <button class="ghost" data-topic="${id}" type="button">進入主題</button>
          </section>
        `).join("")}
      </div>
    </article>
  `;
}

function renderDiagnostic() {
  const question = diagnosticFlowQuestions[diagnosticIndex];
  if (!question) return renderStatus();
  return renderQuestion({
    heading: "初始診斷",
    subheading: `第 ${diagnosticIndex + 1} / ${diagnosticFlowQuestions.length} 題`,
    question,
    allowHint: false,
    submitAction: "submit-diagnostic"
  });
}

function renderStatus() {
  const recommended = recommendTopic();
  return `
    <article class="screen">
      <div>
        <h2>初步學習狀況</h2>
        <p>根據目前診斷，你可以優先練習 ${topics[recommended].name}。後續練習會持續更新判斷。</p>
      </div>
      <div class="result-box warning">
        <h3>建議優先複習：${topics[recommended].name}</h3>
        <p>${recommendReason(recommended)}</p>
      </div>
      <div class="actions">
        <button data-action="start-topic" type="button">依建議開始</button>
        <button class="ghost" data-action="home" type="button">自行選擇主題</button>
      </div>
    </article>
  `;
}

function renderTopic() {
  const question = activePracticeQuestions[practiceIndex];
  if (!question) return isReviewMode ? renderReviewSummary() : renderSelfAssessment();
  const topic = isReviewMode ? { name: "總複習" } : topics[activeTopicId];
  const topicLabel = isReviewMode ? `｜${topics[question.topicId].name}` : "";
  return `
    ${renderQuestion({
      heading: topic.name,
      subheading: `${question.title}${topicLabel}，第 ${practiceIndex + 1} / ${activePracticeQuestions.length} 題`,
      question,
      allowHint: true,
      submitAction: "submit-practice"
    })}
    ${latestFeedback ? renderFeedback(latestFeedback) : ""}
    ${currentHints ? `<section class="hint-list">${question.hints.slice(0, currentHints).map((hint, i) => `<div class="hint-card"><strong>Level ${i + 1}</strong><p>${hint}</p></div>`).join("")}</section>` : ""}
    ${activeTopicId === "list_index" && practiceIndex === 2 ? renderComparison() : ""}
  `;
}

function renderQuestion({ heading, subheading, question, allowHint, submitAction }) {
  return `
    <article class="screen">
      <div class="screen-header">
        <div>
          <h2>${heading}</h2>
          <p>${subheading}</p>
        </div>
        ${allowHint ? `<button class="ghost" data-action="hint" type="button" ${currentHints >= question.hints.length ? "disabled" : ""}>顯示提示</button>` : ""}
      </div>
      <section class="question-box">
        <h3>${question.prompt}</h3>
        <pre><code>${question.code}</code></pre>
        <div class="options">
          ${question.options.map((option) => `
            <label class="option">
              <input name="answer" value="${escapeAttr(option)}" type="radio" ${selectedOption === option ? "checked" : ""} />
              <span>${option}</span>
            </label>
          `).join("")}
        </div>
        <div class="confidence" aria-label="信心程度">
          <button class="pill ${selectedConfidence === "sure" ? "selected" : ""}" data-confidence="sure" type="button" ${isUnknownSelected() ? "disabled" : ""}>確定</button>
          <button class="pill ${selectedConfidence === "unsure" ? "selected" : ""}" data-confidence="unsure" type="button" ${isUnknownSelected() ? "disabled" : ""}>不太確定</button>
        </div>
        ${isUnknownSelected() ? `<p class="inline-help">選擇「我不知道」時，系統會直接視為知識不足，不需要填信心程度。</p>` : ""}
      </section>
      <div class="actions">
        <button data-action="${submitAction}" type="button" ${latestFeedback ? "disabled" : ""}>提交答案</button>
      </div>
    </article>
  `;
}

function renderComparison() {
  return `
    <section class="note-box">
      <h3>對比案例</h3>
      <div class="compare-grid">
        <div>
          <p>元素值是 list 裡存放的資料。</p>
          <pre><code>numbers = [5, 6, 7]\n# 7 是元素值</code></pre>
        </div>
        <div>
          <p>索引值是位置編號，從 0 開始。</p>
          <pre><code>numbers[2]\n# 2 是索引，會取出 7</code></pre>
        </div>
      </div>
    </section>
  `;
}

function renderFeedback(feedback) {
  const tone = feedback.kind === "correct" ? "" : feedback.kind === "unknown" ? "warning" : "bad";
  return `
    <section class="result-box ${tone}">
      <h3>${feedback.title}</h3>
      <p>${feedback.body}</p>
      ${feedback.repair ? renderRepairCard(feedback.repair) : ""}
      <div class="actions">
        ${feedback.showHintButton ? `<button class="ghost" data-action="hint" type="button">看一層提示</button>` : ""}
        ${feedback.allowRetry ? `<button class="ghost" data-action="retry-question" type="button">重新作答</button>` : ""}
        <button data-action="next-practice" type="button">${feedback.nextLabel}</button>
      </div>
    </section>
  `;
}

function renderRepairCard(repair) {
  return `
    <div class="repair-card">
      <strong>${repair.title}</strong>
      <p>${repair.focus}</p>
      <div class="compare-grid">
        <div>
          <span class="mini-label">對比案例</span>
          <p>${repair.contrast}</p>
        </div>
        <div>
          <span class="mini-label">下一步</span>
          <p>${repair.next}</p>
        </div>
      </div>
    </div>
  `;
}

function renderSelfAssessment() {
  const reflection = getReflectionPrompt(activeTopicId);
  const conceptFeedback = detectConcepts(activeTopicId, state.session.selfExplanation || "");
  return `
    <article class="screen">
      <div>
        <h2>自我說明與評量</h2>
        <p>${reflection.prompt}</p>
      </div>
      <textarea id="selfExplanation" placeholder="寫下你的理解...">${state.session.selfExplanation || ""}</textarea>
      ${renderConceptFeedback(conceptFeedback)}
      <section class="note-box">
        <strong>參考重點</strong>
        <p>${reflection.reference}</p>
      </section>
      <div class="confidence">
        <button class="pill ${state.session.selfAssessment === "needs-practice" ? "selected" : ""}" data-self="needs-practice" type="button">仍不熟悉</button>
        <button class="pill ${state.session.selfAssessment === "mostly" ? "selected" : ""}" data-self="mostly" type="button">大致理解，還要練習</button>
        <button class="pill ${state.session.selfAssessment === "independent" ? "selected" : ""}" data-self="independent" type="button">可以獨立完成新題目</button>
      </div>
      <div class="actions">
        <button data-action="finish-summary" type="button">完成並查看摘要</button>
      </div>
    </article>
  `;
}

function renderSummary() {
  const topicId = getSummaryTopicId();
  if (!topicId) return renderSummaryEmpty();
  const topic = topics[topicId];
  const progress = state.progress[topicId];
  const attempts = state.attempts.filter((item) => item.topicId === topicId);
  if (!attempts.length) return renderSummaryEmpty();
  const correct = attempts.filter((item) => item.isCorrect).length;
  const transfer = attempts.find((item) => getQuestionById(item.questionId)?.state === "TRANSFER");
  return `
    <article class="screen">
      <div>
        <h2>${topic.name}學習摘要</h2>
        <p>${recommendReason(topicId)}</p>
      </div>
      ${state.session.demoMode ? `<section class="note-box"><strong>展示模式</strong><p>這是一組預先建立的示範路徑：高信心答錯、錯誤概念修正、提示輔助、遷移題通過。</p></section>` : ""}
      <div class="stats">
        <div class="stat"><span>完成題數</span><strong>${attempts.length}</strong></div>
        <div class="stat"><span>正確率</span><strong>${attempts.length ? Math.round(correct / attempts.length * 100) : 0}%</strong></div>
        <div class="stat"><span>提示次數</span><strong>${progress.hintDependency}</strong></div>
        <div class="stat"><span>遷移題</span><strong>${transfer?.isCorrect ? "通過" : "待加強"}</strong></div>
      </div>
      <section class="result-box ${progress.misconceptionRisk >= 50 ? "bad" : ""}">
        <h3>建議下一步</h3>
        <p>${nextStepText(topicId)}</p>
      </section>
      ${renderMisconceptionBreakdown(progress)}
      ${renderLearningPath(attempts)}
      <div class="actions">
        <button data-topic="${topicId}" type="button">重新挑戰${topic.name}</button>
        <button class="ghost" data-action="start-review" type="button">前往總複習</button>
        <button class="ghost" data-action="home" type="button">回首頁</button>
      </div>
    </article>
  `;
}

function renderSummaryEmpty() {
  return `
    <article class="screen">
      <div>
        <h2>學習摘要</h2>
        <p>尚未完成任何主題練習，因此還沒有可以整理的學習摘要。</p>
      </div>
      <section class="note-box">
        <strong>下一步</strong>
        <p>建議先完成初始診斷，或直接選一個主題開始練習。完成主題後，這裡會顯示正確率、提示使用、錯誤概念與建議下一步。</p>
      </section>
      <div class="actions">
        <button data-action="start-diagnostic" type="button">開始診斷</button>
        <button class="ghost" data-action="start-topic" type="button">練習 list 與索引</button>
        <button class="ghost" data-action="home" type="button">回首頁</button>
      </div>
    </article>
  `;
}

function renderReviewSummary() {
  const reviewIds = new Set(activePracticeQuestions.map((question) => question.id));
  const attempts = state.attempts.filter((item) => reviewIds.has(item.questionId));
  const rows = Object.keys(topics).map((topicId) => {
    const topicAttempts = attempts.filter((item) => item.topicId === topicId);
    const correct = topicAttempts.filter((item) => item.isCorrect).length;
    const accuracy = topicAttempts.length ? Math.round((correct / topicAttempts.length) * 100) : 0;
    const errors = countErrors(topicAttempts);
    const topError = Object.entries(errors).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { topicId, total: topicAttempts.length, correct, accuracy, topError };
  });
  const priority = rows
    .filter((row) => row.total > 0)
    .sort((a, b) => a.accuracy - b.accuracy || state.progress[b.topicId].misconceptionRisk - state.progress[a.topicId].misconceptionRisk)[0];

  return `
    <article class="screen">
      <div>
        <h2>總複習摘要</h2>
        <p>這次總複習混合四個主題，目標是檢查概念能否在不同 Python 基礎情境中遷移。</p>
      </div>
      <div class="stats">
        <div class="stat"><span>完成題數</span><strong>${attempts.length}</strong></div>
        <div class="stat"><span>整體正確率</span><strong>${attempts.length ? Math.round(attempts.filter((item) => item.isCorrect).length / attempts.length * 100) : 0}%</strong></div>
        <div class="stat"><span>使用提示</span><strong>${attempts.reduce((sum, item) => sum + item.hintCount, 0)}</strong></div>
        <div class="stat"><span>優先複習</span><strong>${priority ? topics[priority.topicId].name : "尚無"}</strong></div>
      </div>
      <section class="question-box">
        <h3>跨主題表現</h3>
        <div class="breakdown-list">
          ${rows.map((row) => `
            <div class="breakdown-item">
              <span>${topics[row.topicId].name}：${row.correct} / ${row.total} 題，${row.topError ? errorLabel(row.topError) : "未見明顯錯誤"}</span>
              <strong>${row.accuracy}%</strong>
            </div>
          `).join("")}
        </div>
      </section>
      <section class="result-box ${priority && priority.accuracy < 70 ? "bad" : ""}">
        <h3>建議下一步</h3>
        <p>${priority ? `建議先回到「${topics[priority.topicId].name}」做主題練習，原因是這次總複習中該主題正確率較低或錯誤概念較集中。` : "目前尚無足夠紀錄，建議先完成一輪總複習。"}</p>
      </section>
      ${renderLearningPath(attempts)}
      <div class="actions">
        <button data-action="start-review" type="button">再做一次總複習</button>
        ${priority ? `<button class="ghost" data-topic="${priority.topicId}" type="button">練習${topics[priority.topicId].name}</button>` : ""}
        <button class="ghost" data-action="home" type="button">回首頁</button>
      </div>
    </article>
  `;
}

function getSummaryTopicId() {
  const latestSummary = state.summaries
    .slice()
    .reverse()
    .find((item) => topics[item.topicId]);
  if (latestSummary) return latestSummary.topicId;

  const latestAttempt = state.attempts
    .slice()
    .reverse()
    .find((item) => topics[item.topicId]);
  if (latestAttempt) return latestAttempt.topicId;

  if (topics[state.session.topicId]) return state.session.topicId;
  if (topics[activeTopicId] && state.attempts.some((item) => item.topicId === activeTopicId)) return activeTopicId;
  return null;
}

function renderAdmin() {
  const checks = buildAcceptanceChecks();
  const scenarios = buildScenarioChecks();
  const passed = checks.filter((item) => item.status === "pass").length;
  const partial = checks.filter((item) => item.status === "partial").length;
  const topicCounts = Object.fromEntries(Object.keys(topics).map((topicId) => [topicId, questionBankByTopic[topicId]?.length || 0]));
  const storageKeys = Object.entries(KEYS).map(([name, key]) => ({
    name,
    key,
    exists: Boolean(localStorage.getItem(key))
  }));
  const pendingDirtyKeys = Array.from(dirtyKeys);
  return `
    <article class="screen">
      <div>
        <h2>管理</h2>
        <p>管理 prototype 的展示資料、驗收狀態、題庫統計與本機儲存。</p>
      </div>
      <div class="stats">
        <div class="stat"><span>驗收通過</span><strong>${passed}</strong></div>
        <div class="stat"><span>部分完成</span><strong>${partial}</strong></div>
        <div class="stat"><span>作答紀錄</span><strong>${state.attempts.length}</strong></div>
        <div class="stat"><span>版本</span><strong>${SCHEMA_VERSION}</strong></div>
      </div>
      <section class="question-box">
        <h3>管理操作</h3>
        <div class="actions">
          <button data-action="demo-mode" type="button">建立展示資料</button>
          <button class="ghost" data-action="start-review" type="button">執行總複習</button>
          <button class="ghost" data-action="export-records" type="button" ${state.attempts.length ? "" : "disabled"}>匯出 JSON</button>
          <button class="danger" data-action="reset-data" type="button">清除紀錄</button>
        </div>
      </section>
      <section class="question-box">
        <h3>題庫統計</h3>
        <div class="breakdown-list">
          ${Object.entries(topicCounts).map(([topicId, count]) => `
            <div class="breakdown-item">
              <span>${topics[topicId].name}</span>
              <strong>${count} 題</strong>
            </div>
          `).join("")}
        </div>
      </section>
      <section class="question-box">
        <h3>localStorage</h3>
        <div class="breakdown-list">
          ${storageKeys.map((item) => `
            <div class="breakdown-item">
              <span>${item.key}</span>
              <strong>${item.exists ? "存在" : "缺少"}</strong>
            </div>
          `).join("")}
        </div>
        <div class="note-box storage-note">
          <strong>儲存狀態</strong>
          <p>Dirty keys：${pendingDirtyKeys.length ? pendingDirtyKeys.join(", ") : "無"}；pending flush：${storageStatus.pendingFlush ? "是" : "否"}；最後寫入：${storageStatus.lastFlushAt ? formatTime(storageStatus.lastFlushAt) : "尚無"}；模式：${storageStatus.lastFlushMode || "尚無"}；次數：${storageStatus.flushCount}</p>
        </div>
      </section>
      <section class="question-box">
        <h3>檢查清單</h3>
        <div class="acceptance-list">
          ${checks.map((item) => `
            <div class="acceptance-item ${item.status}">
              <span>${statusText(item.status)}</span>
              <div>
                <strong>${item.title}</strong>
                <p>${item.detail}</p>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
      <section class="question-box">
        <h3>測試情境 T01-T10</h3>
        <div class="acceptance-list">
          ${scenarios.map((item) => `
            <div class="acceptance-item ${item.status}">
              <span>${statusText(item.status)}</span>
              <div>
                <strong>${item.id} ${item.title}</strong>
                <p>${item.detail}</p>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
      <div class="actions">
        <button class="ghost" data-action="home" type="button">回首頁</button>
      </div>
    </article>
  `;
}

function renderRecords() {
  const records = state.attempts.slice().reverse();
  const transitions = state.session.sessionTransitionLog.slice().reverse();
  return `
    <article class="screen">
      <div>
        <h2>學習紀錄</h2>
        <p>紀錄答題結果、信心程度、提示使用與有效作答時間。</p>
      </div>
      <div class="record-list">
        ${records.length ? records.map((item) => `
          <div class="record-item">
            <div class="record-head">
              <strong>${questionTitle(item.questionId)} ${item.isCorrect ? "答對" : item.isUnknown ? "我不知道" : "需修正"}</strong>
              <span>${formatTime(item.createdAt)}</span>
            </div>
            <p>答案：${item.answer}，信心：${confidenceLabel(item.confidence)}，提示：${item.hintCount}，有效時間：${item.durationSeconds} 秒，離開：${item.inactiveSeconds || 0} 秒${item.fastResponseConfirmed ? "，已確認過快作答" : ""}</p>
            ${item.errorType ? `<span class="tag">${errorLabel(item.errorType)}</span>` : `<span class="tag good">概念通過</span>`}
          </div>
        `).join("") : `<p>尚無紀錄。</p>`}
      </div>
      <section class="question-box">
        <h3>狀態轉移</h3>
        <div class="record-list">
          ${transitions.length ? transitions.map((item) => `
            <div class="record-item">
              <div class="record-head">
                <strong>${item.event}</strong>
                <span>${formatTime(item.at)}</span>
              </div>
              <p>狀態：${item.state}，主題：${item.topicId || "無"}${item.questionId ? `，題目：${item.questionId}` : ""}</p>
              ${item.result ? `<span class="tag ${item.result === "correct" ? "good" : ""}">${item.result}</span>` : ""}
            </div>
          `).join("") : `<p>尚無狀態轉移紀錄。</p>`}
        </div>
      </section>
      <div class="actions">
        <button data-action="export-records" type="button" ${records.length ? "" : "disabled"}>匯出 JSON</button>
        <button class="ghost" data-action="home" type="button">回首頁</button>
      </div>
    </article>
  `;
}

function renderMisconceptionBreakdown(progress) {
  const entries = Object.entries(progress.errorTypeCounts).filter(([, count]) => count > 0);
  if (!entries.length) {
    return `
      <section class="question-box">
        <h3>錯誤概念觀察</h3>
        <p>目前沒有累積到明顯錯誤概念。若要展示修正流程，可以在練習題故意選一個錯誤答案並選「確定」。</p>
      </section>
    `;
  }
  const topError = entries.slice().sort((a, b) => b[1] - a[1])[0]?.[0];
  const repair = repairContentByError[topError];
  return `
    <section class="question-box">
      <h3>錯誤概念觀察</h3>
      <div class="breakdown-list">
        ${entries.map(([type, count]) => `
          <div class="breakdown-item">
            <span>${errorLabel(type)}</span>
            <strong>${count} 次</strong>
          </div>
        `).join("")}
      </div>
      ${repair ? renderRepairCard(repair) : ""}
    </section>
  `;
}

function renderLearningPath(attempts) {
  if (!attempts.length) return "";
  return `
    <section class="question-box">
      <h3>學習路徑</h3>
      <div class="timeline">
        ${attempts.slice(-8).map((item) => `
          <div class="timeline-item ${item.isCorrect ? "done" : "repair"}">
            <span>${item.mode === "diagnostic" ? "診斷" : "練習"}</span>
            <strong>${questionTitle(item.questionId)}</strong>
            <p>${item.isCorrect ? "答對" : item.isUnknown ? "知識不足" : errorLabel(item.errorType)}，提示 ${item.hintCount} 層</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function bindScreenEvents() {
  app.querySelectorAll("input[name='answer']").forEach((input) => {
    input.addEventListener("change", (event) => {
      selectedOption = event.target.value;
      if (selectedOption === "我不知道") selectedConfidence = "";
      render();
    });
  });
  app.querySelectorAll("[data-confidence]").forEach((button) => {
    button.addEventListener("click", () => {
      if (isUnknownSelected()) return;
      selectedConfidence = button.dataset.confidence;
      render();
    });
  });
  app.querySelectorAll("[data-self]").forEach((button) => {
    button.addEventListener("click", () => {
      state.session.selfAssessment = button.dataset.self;
      updateProgressFromSelf(button.dataset.self);
      saveState();
      render();
    });
  });
  const explanationBox = app.querySelector("#selfExplanation");
  if (explanationBox) {
    explanationBox.addEventListener("input", () => {
      state.session.selfExplanation = explanationBox.value;
    });
    explanationBox.addEventListener("blur", () => {
      saveState();
      render();
    });
  }
  app.querySelectorAll("[data-topic]").forEach((button) => {
    button.addEventListener("click", () => {
      startTopic(button.dataset.topic);
    });
  });
  app.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
}

function handleAction(action) {
  if (action === "start-diagnostic") return startDiagnostic();
  if (action === "demo-mode") return startDemoMode();
  if (action === "start-topic") return startTopic("list_index");
  if (action === "start-review") return startReview();
  if (action === "home") return setScreen("home");
  if (action === "summary") return setScreen("summary");
  if (action === "hint") return showHint();
  if (action === "submit-diagnostic") return submitDiagnostic();
  if (action === "submit-practice") return submitPractice();
  if (action === "retry-question") return retryQuestion();
  if (action === "next-practice") return nextPracticeQuestion();
  if (action === "finish-summary") return finishSummary();
  if (action === "restart-topic") return restartTopic();
  if (action === "export-records") return exportLearningRecords();
  if (action === "reset-data") {
    return showModal("清除學習紀錄後會重新建立本機資料。", [
      ["取消", () => {}, "ghost"],
      ["清除", resetAllLearningData, "danger"]
    ]);
  }
}

function startDiagnostic() {
  diagnosticIndex = 0;
  state.session.topicId = "diagnostic";
  logTransition("START_DIAGNOSTIC", "CHECKPOINT");
  saveState();
  setScreen("diagnostic");
}

function startDemoMode() {
  resetAllLearningData({ silent: true });
  const demoAttempts = [
    {
      mode: "diagnostic",
      topicId: "list_index",
      questionId: "d-list-2",
      answer: "3",
      confidence: "sure",
      isCorrect: false,
      isUnknown: false,
      errorType: "len_is_last_index",
      hintCount: 0,
      durationSeconds: 4
    },
    {
      mode: "practice",
      topicId: "list_index",
      questionId: "vf-1",
      answer: "letters[len(letters)]",
      confidence: "sure",
      isCorrect: false,
      isUnknown: false,
      errorType: "len_is_last_index",
      hintCount: 1,
      durationSeconds: 6
    },
    {
      mode: "practice",
      topicId: "list_index",
      questionId: "cr-1",
      answer: "print(numbers[len(numbers) - 1])",
      confidence: "unsure",
      isCorrect: true,
      isUnknown: false,
      errorType: null,
      hintCount: 2,
      durationSeconds: 12
    },
    {
      mode: "practice",
      topicId: "list_index",
      questionId: "tr-3",
      answer: "temps[len(temps) - 1]",
      confidence: "sure",
      isCorrect: true,
      isUnknown: false,
      errorType: null,
      hintCount: 1,
      durationSeconds: 9
    }
  ];

  state.session.topicId = "list_index";
  state.session.demoMode = true;
  state.session.currentState = "TOPIC_SUMMARY";
  state.session.selfExplanation = "len(numbers) 是 list 的長度，不是最後索引。因為索引從 0 開始，所以最後一個位置要用 len(numbers) - 1。";
  state.session.selfAssessment = "mostly";
  demoAttempts.forEach((item, index) => {
    const attempt = {
      id: createId(),
      ...item,
      rawDurationSeconds: item.durationSeconds + (index === 1 ? 4 : 0),
      inactiveSeconds: index === 1 ? 4 : 0,
      fastResponseConfirmed: index === 0,
      createdAt: new Date(Date.now() - (demoAttempts.length - index) * 45000).toISOString()
    };
    state.attempts.push(attempt);
    updateProgress(attempt);
  });
  updateProgressFromSelf("mostly");
  state.session.metrics.fastResponseCount = 1;
  state.session.metrics.tabSwitchCount = 1;
  state.session.metrics.inactiveTimeMs = 4000;
  state.summaries.push({
    id: createId(),
    topicId: "list_index",
    createdAt: new Date().toISOString(),
    masteryScore: state.progress.list_index.masteryScore,
    misconceptionRisk: state.progress.list_index.misconceptionRisk,
    selfAssessment: state.session.selfAssessment
  });
  saveState();
  screen = "summary";
  render();
}

function startTopic(topicId = "list_index") {
  isReviewMode = false;
  activeTopicId = topicId;
  state.session.topicId = topicId;
  logTransition("START_TOPIC", "TOPIC_ENTRY", { topicId });
  if (state.progress[topicId].status === "not_started") {
    state.progress[topicId].status = "in_progress";
  }
  saveState();
  activePracticeQuestions = buildPracticeSet(topicId);
  practiceIndex = 0;
  setScreen("topic");
}

function restartTopic() {
  if (isReviewMode) {
    return startReview();
  }
  activePracticeQuestions = buildPracticeSet(activeTopicId);
  practiceIndex = 0;
  setScreen("topic");
}

function startReview() {
  isReviewMode = true;
  activeTopicId = "list_index";
  state.session.topicId = "review";
  logTransition("START_REVIEW", "REVIEW");
  activePracticeQuestions = buildReviewSet();
  practiceIndex = 0;
  selectedOption = "";
  selectedConfidence = "";
  currentHints = 0;
  latestFeedback = null;
  saveState();
  setScreen("topic");
}

function buildReviewSet() {
  const recentIds = new Set(state.attempts.slice(-10).map((item) => item.questionId));
  return Object.keys(topics).flatMap((topicId) => {
    const bank = questionBankByTopic[topicId] || [];
    const candidates = bank.filter((question) => question.state !== "CHECKPOINT" || topicId === "list_index");
    const pool = candidates.length ? candidates : bank;
    return pickManyPreferUnseen(pool, 2, recentIds);
  });
}

function pickManyPreferUnseen(items, count, recentIds) {
  const unseen = items.filter((item) => !recentIds.has(item.id));
  const pool = shuffle(unseen.length >= count ? unseen : items);
  return pool.slice(0, count);
}

function buildPracticeSet(topicId = activeTopicId) {
  const order = ["CHECKPOINT", "VERIFY", "CORRECTION", "TRANSFER"];
  const recentIds = new Set(
    state.attempts
      .filter((item) => item.topicId === topicId)
      .slice(-6)
      .map((item) => item.questionId)
  );
  const bank = questionBankByTopic[topicId] || questionBankByTopic.list_index;
  const topError = Object.entries(state.progress[topicId].errorTypeCounts)
    .filter(([type]) => type !== "unknown")
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  return order.map((stateId) => {
    const candidates = bank.filter((question) => question.state === stateId);
    const unseen = candidates.filter((question) => !recentIds.has(question.id));
    const pool = unseen.length ? unseen : candidates;
    const weighted = topError
      ? pool.filter((question) => Object.values(question.errorMap || {}).includes(topError))
      : [];
    return pickOne(weighted.length ? weighted : pool);
  });
}

function pickOne(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showHint() {
  const question = activePracticeQuestions[practiceIndex];
  currentHints = Math.min(currentHints + 1, question.hints.length);
  state.session.metrics.hintCount += 1;
  state.progress[question.topicId || activeTopicId].hintDependency += 1;
  logTransition(`SHOW_HINT_LEVEL_${currentHints}`, `HINT_LEVEL_${currentHints}`, {
    hintLevel: currentHints,
    questionId: question.id
  });
  saveState();
  render();
}

function submitDiagnostic() {
  const question = diagnosticFlowQuestions[diagnosticIndex];
  if (!validateAnswer()) return;
  state.session.currentQuestionId = question.id;
  recordAttempt(question, "diagnostic");
  diagnosticIndex += 1;
  if (diagnosticIndex >= diagnosticFlowQuestions.length) {
    setScreen("status");
  } else {
    setScreen("diagnostic");
  }
}

function submitPractice() {
  const question = activePracticeQuestions[practiceIndex];
  if (!validateAnswer()) return;
  const wasSure = selectedConfidence === "sure";
  const attempt = recordAttempt(question, "practice");
  latestFeedback = buildFeedback(question, attempt);
  selectedOption = "";
  selectedConfidence = "";
  if (!attempt.isCorrect && wasSure) {
    state.session.currentState = "MISCONCEPTION_REPAIR";
    showModal("你很有把握但答案需要修正。這通常代表有特定錯誤概念，建議先看提示再試一次。", [["留下來修正", () => render(), "ghost"], ["下一題", nextPracticeQuestion, ""]]);
    saveState();
    return;
  }
  render();
}

function nextPracticeQuestion() {
  practiceIndex += 1;
  if (practiceIndex >= activePracticeQuestions.length) {
    setScreen(isReviewMode ? "reviewSummary" : "self");
  } else {
    setScreen("topic");
  }
}

function retryQuestion() {
  selectedOption = "";
  selectedConfidence = "";
  latestFeedback = null;
  logTransition("RETRY_QUESTION", state.session.currentState, {
    questionId: activePracticeQuestions[practiceIndex]?.id
  });
  saveState();
  resetQuestionTiming();
  render();
}

function buildFeedback(question, attempt) {
  if (attempt.isCorrect) {
    return {
      kind: "correct",
      title: "答對了",
      body: attempt.hintCount > 0 ? "概念方向正確。你這次有使用提示，下一題可以試著少看一層。" : "概念方向正確，而且這題沒有依賴提示。",
      nextLabel: "前往下一題",
      allowRetry: false,
      showHintButton: false
    };
  }
  if (attempt.isUnknown) {
    return {
      kind: "unknown",
      title: "先補核心概念",
      body: "選擇「我不知道」代表目前需要基礎教學。建議先看提示，再重新作答一次。",
      nextLabel: "先跳下一題",
      allowRetry: true,
      showHintButton: true
    };
  }
  const label = errorLabel(attempt.errorType);
  const repair = repairContentByError[attempt.errorType];
  return {
    kind: "wrong",
    title: "發現可能的錯誤概念",
    body: `${label}。先看提示或對比案例，再試著重新作答。`,
    nextLabel: "前往下一題",
    allowRetry: true,
    showHintButton: true,
    repair
  };
}

function validateAnswer() {
  if (!selectedOption) {
    showModal("請先選擇一個答案。", [["知道了", () => {}, "ghost"]]);
    return false;
  }
  if (isUnknownSelected()) {
    selectedConfidence = "";
  } else if (!selectedConfidence) {
    showModal("請選擇你對答案的把握程度。", [["知道了", () => {}, "ghost"]]);
    return false;
  }
  const { effectiveMs } = getQuestionTimingSnapshot();
  if (effectiveMs < FAST_RESPONSE_MS && state.profile.settings.enableFastResponseReminder && !questionTiming.fastConfirmed) {
    state.session.metrics.fastResponseCount += 1;
    logTransition("FAST_RESPONSE_WARNING", "FAST_RESPONSE_CONFIRM", {
      effectiveMs
    });
    showModal("你答得很快。請確認這是理解後的答案，而不是直覺猜測。確認後請再按一次提交。", [
      ["回去檢查", () => {}, "ghost"],
      ["我確認過了", () => {
        questionTiming.fastConfirmed = true;
        logTransition("FAST_RESPONSE_CONFIRMED", state.session.currentState);
        saveState();
      }, ""]
    ]);
    saveState();
    return false;
  }
  return true;
}

function isUnknownSelected() {
  return selectedOption === "我不知道";
}

function recordAttempt(question, mode) {
  const isUnknown = selectedOption === "我不知道";
  const isCorrect = selectedOption === question.answer;
  const errorType = isUnknown ? "unknown" : question.errorMap?.[selectedOption] || null;
  resumeQuestionTiming();
  const timing = getQuestionTimingSnapshot();
  const durationSeconds = Math.max(1, Math.round(timing.effectiveMs / 1000));
  const attempt = {
    id: createId(),
    mode,
    topicId: question.topicId || state.session.topicId || activeTopicId,
    questionId: question.id,
    answer: selectedOption,
    confidence: selectedConfidence,
    isCorrect,
    isUnknown,
    errorType,
    hintCount: currentHints,
    durationSeconds,
    rawDurationSeconds: Math.max(1, Math.round(timing.rawMs / 1000)),
    inactiveSeconds: Math.round(timing.inactiveMs / 1000),
    fastResponseConfirmed: questionTiming.fastConfirmed,
    createdAt: new Date().toISOString()
  };
  state.attempts.push(attempt);
  updateProgress(attempt);
  state.session.currentQuestionId = question.id;
  logTransition("SUBMIT_ANSWER", question.state || state.session.currentState, {
    questionId: question.id,
    result: isCorrect ? "correct" : isUnknown ? "unknown" : "wrong",
    confidence: selectedConfidence || null,
    hintCount: currentHints,
    effectiveSeconds: durationSeconds,
    errorType
  });
  saveState();
  return attempt;
}

function updateProgress(attempt) {
  const progress = state.progress[attempt.topicId];
  progress.evidenceCount += 1;
  progress.lastUpdatedAt = new Date().toISOString();
  progress.status = "in_progress";
  if (!progress.completedQuestionIds.includes(attempt.questionId)) {
    progress.completedQuestionIds.push(attempt.questionId);
  }
  if (attempt.errorType) {
    progress.errorTypeCounts[attempt.errorType] = (progress.errorTypeCounts[attempt.errorType] || 0) + 1;
  }
  const topicAttempts = state.attempts.filter((item) => item.topicId === attempt.topicId);
  const correct = topicAttempts.filter((item) => item.isCorrect).length;
  progress.masteryScore = Math.min(100, Math.round((correct / topicAttempts.length) * 100));
  progress.misconceptionRisk = Math.min(100, Object.values(progress.errorTypeCounts).reduce((sum, count) => sum + count, 0) * 18);
  const transfer = topicAttempts.find((item) => item.questionId === "tr-1");
  progress.transferScore = transfer ? (transfer.isCorrect && transfer.hintCount < 3 ? 100 : 40) : progress.transferScore;
  progress.fluencyScore = Math.max(0, 100 - Math.round(average(topicAttempts.map((item) => item.durationSeconds)) * 5));
}

function updateProgressFromSelf(value) {
  const progress = state.progress[state.session.topicId || activeTopicId];
  progress.independenceLevel = value === "independent" ? 100 : value === "mostly" ? 65 : 30;
  progress.status = "completed";
  logTransition("SELF_ASSESSMENT", "SELF_ASSESSMENT", {
    selfAssessment: value
  });
}

function finishSummary() {
  const textarea = document.querySelector("#selfExplanation");
  state.session.selfExplanation = textarea?.value.trim() || "";
  const conceptFeedback = detectConcepts(state.session.topicId || activeTopicId, state.session.selfExplanation);
  state.session.detectedConcepts = conceptFeedback.detected.map((item) => item.id);
  state.session.missingConcepts = conceptFeedback.missing.map((item) => item.id);
  if (!state.session.selfAssessment) {
    showModal("請先選擇一個自我評量。", [["知道了", () => {}, "ghost"]]);
    return;
  }
  const summary = {
    id: createId(),
    topicId: state.session.topicId || activeTopicId,
    createdAt: new Date().toISOString(),
    masteryScore: state.progress[state.session.topicId || activeTopicId].masteryScore,
    misconceptionRisk: state.progress[state.session.topicId || activeTopicId].misconceptionRisk,
    selfAssessment: state.session.selfAssessment,
    firstExplanation: state.session.selfExplanation,
    detectedConcepts: state.session.detectedConcepts,
    missingConcepts: state.session.missingConcepts
  };
  state.summaries.push(summary);
  logTransition("FINISH_SUMMARY", "TOPIC_SUMMARY", {
    summaryId: summary.id,
    detectedConcepts: state.session.detectedConcepts,
    missingConcepts: state.session.missingConcepts
  });
  saveState();
  setScreen("summary");
}

function exportLearningRecords() {
  const payload = {
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    progress: state.progress,
    attempts: state.attempts,
    summaries: state.summaries
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `python-tutor-records-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function recommendTopic() {
  const entries = Object.entries(state.progress);
  entries.sort((a, b) => b[1].misconceptionRisk - a[1].misconceptionRisk || a[1].masteryScore - b[1].masteryScore);
  return entries[0]?.[0] || "list_index";
}

function recommendReason(topicId) {
  const progress = state.progress[topicId];
  const topError = Object.entries(progress.errorTypeCounts).sort((a, b) => b[1] - a[1])[0];
  if (topError) {
    return `你目前最常出現的是「${errorLabel(topError[0])}」。建議先透過修正題與遷移題確認概念。`;
  }
  if (progress.hintDependency > 2) return "你已能完成部分題目，但仍較依賴提示。建議重新挑戰一次，嘗試少用提示。";
  return "目前沒有明顯高風險錯誤。可以直接進入遷移題，確認能否在新情境中使用概念。";
}

function nextStepText(topicId = activeTopicId) {
  const progress = state.progress[topicId];
  if (progress.misconceptionRisk >= 50) return `先重做 ${topics[topicId].name} 的修正題，特別留意「${dominantErrorText(topicId)}」。`;
  if (progress.hintDependency >= 3) return "再做一次同組題目，目標是 Level 2 以前完成。";
  if (progress.transferScore < 100) return `補一題新的遷移題，確認能把「${topics[topicId].name}」用到不同情境。`;
  return "可以切換到其他主題，檢查概念能否在不同 Python 基礎情境中遷移。";
}

function questionTitle(questionId) {
  const question = getQuestionById(questionId);
  return question?.title || questionId;
}

function getQuestionById(questionId) {
  return [...diagnosticQuestions, ...allPracticeQuestions, ...supplementalTopicQuestions].find((item) => item.id === questionId);
}

function detectConcepts(topicId, text) {
  const normalized = String(text || "").toLowerCase().replace(/\s+/g, "");
  const rules = conceptRulesByTopic[topicId] || [];
  const detected = [];
  const missing = [];
  rules.forEach((rule) => {
    const matched = rule.patterns.some((pattern) => normalized.includes(String(pattern).toLowerCase().replace(/\s+/g, "")));
    if (matched) detected.push(rule);
    else missing.push(rule);
  });
  return { detected, missing };
}

function renderConceptFeedback(feedback) {
  const hasText = state.session.selfExplanation?.trim();
  if (!hasText) {
    return `
      <section class="note-box">
        <strong>概念檢查</strong>
        <p>寫下說明後，系統會提示你已提到哪些關鍵概念，以及還可以補充哪些概念。這不是自動評分。</p>
      </section>
    `;
  }
  return `
    <section class="question-box">
      <h3>概念檢查</h3>
      <div class="compare-grid">
        <div>
          <strong>已提到</strong>
          <div class="concept-list">
            ${feedback.detected.length ? feedback.detected.map((item) => `<span class="tag good">${item.label}</span>`).join("") : `<p>尚未偵測到明確關鍵概念。</p>`}
          </div>
        </div>
        <div>
          <strong>可以再補充</strong>
          <div class="concept-list">
            ${feedback.missing.length ? feedback.missing.map((item) => `<span class="tag">${item.label}</span>`).join("") : `<p>關鍵概念已大致涵蓋。</p>`}
          </div>
        </div>
      </div>
    </section>
  `;
}

function countErrors(attempts) {
  return attempts.reduce((acc, item) => {
    if (item.errorType) acc[item.errorType] = (acc[item.errorType] || 0) + 1;
    return acc;
  }, {});
}

function buildAcceptanceChecks() {
  const keysReady = Object.values(KEYS).every((key) => localStorage.getItem(key));
  const topicCounts = Object.fromEntries(Object.keys(topics).map((topicId) => [topicId, questionBankByTopic[topicId]?.length || 0]));
  const allTopicCountsReady = Object.values(topicCounts).every((count) => count >= 8);
  const attempts = state.attempts || [];
  const hasHints = attempts.some((item) => item.hintCount > 0) || Object.values(state.progress).some((topic) => topic.hintDependency > 0);
  const hasEffectiveTiming = attempts.some((item) => Number.isFinite(item.rawDurationSeconds) && Number.isFinite(item.inactiveSeconds));
  const hasFastResponseSignal = attempts.some((item) => item.fastResponseConfirmed) || (state.session.metrics.fastResponseCount || 0) > 0;
  const hasError = attempts.some((item) => item.errorType && item.errorType !== "unknown");
  const hasTransfer = attempts.some((item) => getQuestionById(item.questionId)?.state === "TRANSFER");
  const hasReview = state.session.topicId === "review" || attempts.some((item) => item.mode === "review");
  const hasSummary = state.summaries.length > 0;
  const transitionCount = state.session.sessionTransitionLog.length;
  const hasCoreRepairContent = ["index_start_from_one", "len_is_last_index", "value_index_confusion"].every((key) => repairContentByError[key]);
  const hasStorageStrategy = Boolean(storageStatus.lastFlushMode);

  return [
    {
      title: "localStorage 五個主要 key",
      detail: keysReady ? "profile、progress、attempts、session、summaries 都已建立。" : "尚未建立完整 key，可重新整理或開始一次練習。",
      status: keysReady ? "pass" : "partial"
    },
    {
      title: "Dirty flags / debounce / force flush",
      detail: hasStorageStrategy ? `目前儲存策略已啟用；最後寫入模式為 ${storageStatus.lastFlushMode}，最近寫入 keys：${storageStatus.lastFlushKeys.join(", ") || "無"}。` : "儲存策略已實作，需重新整理或操作後才會出現 flush 紀錄。",
      status: hasStorageStrategy ? "pass" : "partial"
    },
    {
      title: "版本與題庫版本",
      detail: `schemaVersion ${state.profile.schemaVersion}，questionBankVersion ${state.profile.questionBankVersion}。`,
      status: state.profile.schemaVersion === SCHEMA_VERSION && state.profile.questionBankVersion === QUESTION_BANK_VERSION ? "pass" : "fail"
    },
    {
      title: "題庫數量",
      detail: Object.entries(topicCounts).map(([id, count]) => `${topics[id].name} ${count} 題`).join("；"),
      status: allTopicCountsReady ? "pass" : "partial"
    },
    {
      title: "初始診斷",
      detail: `目前診斷題 ${diagnosticFlowQuestions.length} 題，可記錄答案與信心程度。`,
      status: diagnosticFlowQuestions.length >= 4 ? "pass" : "partial"
    },
    {
      title: "答題紀錄",
      detail: attempts.length ? `目前已有 ${attempts.length} 筆作答紀錄。` : "尚無作答紀錄。",
      status: attempts.length ? "pass" : "partial"
    },
    {
      title: "狀態轉移紀錄",
      detail: transitionCount ? `目前已有 ${transitionCount} 筆狀態轉移紀錄，系統會保留最近 100 筆。` : "尚無狀態轉移紀錄。",
      status: transitionCount > 0 && transitionCount <= 100 ? "pass" : "partial"
    },
    {
      title: "有效作答時間",
      detail: hasEffectiveTiming ? "作答紀錄包含有效時間、原始時間與離開頁面時間。" : "新作答紀錄會保存有效時間、原始時間與離開頁面時間。",
      status: hasEffectiveTiming ? "pass" : "partial"
    },
    {
      title: "過快作答提醒",
      detail: hasFastResponseSignal ? "已觸發過快作答提醒或確認紀錄。" : `有效作答時間低於 ${FAST_RESPONSE_MS / 1000} 秒時會要求確認。`,
      status: hasFastResponseSignal ? "pass" : "partial"
    },
    {
      title: "三層提示與提示依賴",
      detail: hasHints ? "已有提示使用紀錄，會反映在學生模型與摘要。" : "尚未使用提示，可在主題練習中點「顯示提示」。",
      status: hasHints ? "pass" : "partial"
    },
    {
      title: "錯誤概念映射",
      detail: hasError ? "已記錄至少一種錯誤概念。" : "尚未累積錯誤概念，可用展示模式快速建立。",
      status: hasError ? "pass" : "partial"
    },
    {
      title: "錯誤概念補救內容",
      detail: hasCoreRepairContent ? "list_index 三種核心錯誤概念都有專屬補救卡。" : "核心錯誤概念仍缺少補救內容。",
      status: hasCoreRepairContent ? "pass" : "fail"
    },
    {
      title: "遷移題",
      detail: hasTransfer ? "已有遷移題作答紀錄。" : "尚未完成遷移題。",
      status: hasTransfer ? "pass" : "partial"
    },
    {
      title: "總複習",
      detail: hasReview ? "已進入或完成過總複習流程。" : "尚未執行總複習。",
      status: hasReview ? "pass" : "partial"
    },
    {
      title: "學習摘要",
      detail: hasSummary ? `已有 ${state.summaries.length} 筆摘要。` : "尚未產生摘要。",
      status: hasSummary ? "pass" : "partial"
    },
    {
      title: "紀錄匯出",
      detail: "學習紀錄頁可匯出 JSON，包含 profile、progress、attempts、summaries。",
      status: "pass"
    },
    {
      title: "展示模式",
      detail: "可一鍵建立高信心答錯、提示修正、遷移通過的示範資料。",
      status: "pass"
    }
  ];
}

function buildScenarioChecks() {
  const attempts = state.attempts || [];
  const transitions = state.session.sessionTransitionLog || [];
  const hasAllCorrectHighConfidence = attempts.length >= 4 && attempts.slice(-4).every((item) => item.isCorrect && item.confidence === "sure");
  const hasCorrectLowConfidence = attempts.some((item) => item.isCorrect && item.confidence === "unsure");
  const hasWrongHighConfidence = attempts.some((item) => !item.isCorrect && !item.isUnknown && item.confidence === "sure");
  const hasUnknown = attempts.some((item) => item.isUnknown || item.errorType === "unknown");
  const hasFastResponse = attempts.some((item) => item.fastResponseConfirmed) || (state.session.metrics.fastResponseCount || 0) > 0;
  const hasTabAway = attempts.some((item) => (item.inactiveSeconds || 0) > 0) || (state.session.metrics.tabSwitchCount || 0) > 0;
  const repeatedError = Object.values(
    attempts.reduce((acc, item) => {
      if (item.errorType && item.errorType !== "unknown") acc[item.errorType] = (acc[item.errorType] || 0) + 1;
      return acc;
    }, {})
  ).some((count) => count >= 3);
  const hasTransferFail = attempts.some((item) => getQuestionById(item.questionId)?.state === "TRANSFER" && !item.isCorrect);

  return [
    {
      id: "T01",
      title: "全部答對且信心高",
      detail: hasAllCorrectHighConfidence ? "最近一組作答可呈現快速通過路徑。" : "可用主題練習連續答對並選「確定」測試。",
      status: hasAllCorrectHighConfidence ? "pass" : "partial"
    },
    {
      id: "T02",
      title: "答對但信心低",
      detail: hasCorrectLowConfidence ? "已有答對但不太確定的紀錄。" : "答對並選「不太確定」可測試補一題驗證路徑。",
      status: hasCorrectLowConfidence ? "pass" : "partial"
    },
    {
      id: "T03",
      title: "答錯且信心高",
      detail: hasWrongHighConfidence ? "已有高信心答錯紀錄，可展示錯誤概念修正。" : "可用展示模式或故意答錯並選「確定」。",
      status: hasWrongHighConfidence ? "pass" : "partial"
    },
    {
      id: "T04",
      title: "選擇我不知道",
      detail: hasUnknown ? "已有知識不足紀錄。" : "選「我不知道」可測試基礎教學路徑。",
      status: hasUnknown ? "pass" : "partial"
    },
    {
      id: "T05",
      title: "過快作答提醒",
      detail: hasFastResponse ? "已觸發過快作答提醒或確認。" : "2.5 秒內提交會觸發確認提醒。",
      status: hasFastResponse ? "pass" : "partial"
    },
    {
      id: "T06",
      title: "分頁切換暫停有效時間",
      detail: hasTabAway ? "已有分頁離開或 inactive time 紀錄。" : "切到其他分頁再回來作答，可測試暫停有效時間。",
      status: hasTabAway ? "pass" : "partial"
    },
    {
      id: "T07",
      title: "同一錯誤連續多次",
      detail: repeatedError ? "已有同一錯誤概念累積三次以上。" : "同一錯誤概念累積後，摘要會集中顯示補救建議。",
      status: repeatedError ? "pass" : "partial"
    },
    {
      id: "T08",
      title: "localStorage JSON 損毀",
      detail: "loadState() 已支援 JSON 解析失敗偵測，會顯示重設提示。",
      status: "pass"
    },
    {
      id: "T09",
      title: "schemaVersion 不同",
      detail: "loadState() 已檢查 schemaVersion 與 questionBankVersion，不相容時會提示重設。",
      status: "pass"
    },
    {
      id: "T10",
      title: "遷移題失敗",
      detail: hasTransferFail ? "已有遷移題失敗紀錄，可展示補強建議。" : "在遷移題答錯可測試推薦補強同概念。",
      status: hasTransferFail ? "pass" : "partial"
    }
  ];
}

function statusText(status) {
  if (status === "pass") return "通過";
  if (status === "fail") return "需修正";
  return "部分";
}

function confidenceLabel(value) {
  if (value === "sure") return "確定";
  if (value === "unsure") return "不太確定";
  return "未填";
}

function errorLabel(type) {
  const labels = {
    unknown: "知識不足",
    index_start_from_one: "把索引誤認為從 1 開始",
    len_is_last_index: "把 len(list) 誤認為最後索引",
    value_index_confusion: "混淆元素值與索引值",
    range_includes_stop: "誤以為 range 會包含結束值",
    range_start_confusion: "混淆 range 的起始值",
    condition_boundary_confusion: "混淆條件邊界",
    comparison_operator_confusion: "混淆比較運算子",
    value_output_confusion: "混淆輸出值與條件值",
    condition_reversed: "條件方向相反",
    input_is_number: "誤以為 input() 會直接得到數字",
    conversion_direction_confusion: "混淆型態轉換方向",
    input_conversion_confusion: "混淆 input 與型態轉換",
    string_concat_confusion: "混淆字串串接與數字加法",
    string_number_operation: "直接對字串做數字運算"
  };
  return labels[type] || "答案需要修正";
}

function dominantErrorText(topicId) {
  const topError = Object.entries(state.progress[topicId].errorTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return errorLabel(topError);
}

function getReflectionPrompt(topicId) {
  const prompts = {
    list_index: {
      prompt: "請用自己的話說明：為什麼 numbers[len(numbers)] 會出錯？",
      reference: "list 索引從 0 開始。若 numbers 有 3 個元素，len(numbers) 是 3，但最後一個索引是 2，也就是 len(numbers) - 1。"
    },
    range_loop: {
      prompt: "請用自己的話說明：為什麼 range(1, 5) 不會印出 5？",
      reference: "range(start, stop) 會包含 start，但不包含 stop。若要印出 1 到 5，停止值需要寫成 6。"
    },
    conditionals: {
      prompt: "請用自己的話說明：為什麼「包含 60 分」時要用 >= 60？",
      reference: "> 60 只包含大於 60 的數字，不包含 60 本身。若 60 也算通過，就要使用 >= 60。"
    },
    type_conversion: {
      prompt: "請用自己的話說明：為什麼 input() 取得的數字常常要先用 int()？",
      reference: "input() 回傳的是字串。若要做加減乘除等數字運算，需要先用 int() 或 float() 轉成數字。"
    }
  };
  return prompts[topicId] || prompts.list_index;
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

init();

