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

function riskLabel(value) {
  if (value >= 60) return "偏高";
  if (value >= 30) return "中";
  return "低";
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

function dominantErrorText(topicId) {
  const topError = Object.entries(state.progress[topicId].errorTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  return errorLabel(topError);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
