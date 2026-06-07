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


