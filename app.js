const SCHEMA_VERSION = "1.1.0";
const QUESTION_BANK_VERSION = "1.0.0";
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
let latestFeedback = null;
let storageIssue = null;
const app = document.querySelector("#app");
const modal = document.querySelector("#modal");
const modalBody = document.querySelector("#modalBody");
const modalActions = document.querySelector("#modalActions");

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

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

init();


