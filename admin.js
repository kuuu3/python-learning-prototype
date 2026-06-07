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
