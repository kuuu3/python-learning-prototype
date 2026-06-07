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
