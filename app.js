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


