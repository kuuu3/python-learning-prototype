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
