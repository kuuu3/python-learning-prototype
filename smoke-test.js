const fs = require("fs");
const path = require("path");
const vm = require("vm");

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.dataset = {};
    this.className = "";
    this.hidden = false;
    this.textContent = "";
    this.innerHTML = "";
    this.style = {};
    this.listeners = {};
    this.classList = {
      toggle: () => {}
    };
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  append() {}

  remove() {}

  click() {}

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }
}

function createDocument() {
  const elements = new Map();
  const ids = [
    "app",
    "modal",
    "modalBody",
    "modalActions",
    "demoBtn",
    "adminBtn",
    "resetBtn",
    "viewRecordBtn",
    "masteryText",
    "masteryBar",
    "riskText",
    "hintText",
    "transferText"
  ];
  ids.forEach((id) => elements.set(`#${id}`, new FakeElement(id)));
  const steps = ["home", "diagnostic", "topic", "summary"].map((screen) => {
    const button = new FakeElement();
    button.dataset.screen = screen;
    return button;
  });

  return {
    hidden: false,
    createElement: () => new FakeElement(),
    addEventListener: () => {},
    querySelector: (selector) => elements.get(selector) || new FakeElement(selector),
    querySelectorAll: (selector) => (selector === ".steps button" ? steps : [])
  };
}

function createLocalStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const context = {
  console,
  window: {
    crypto: {
      randomUUID: () => `test-${Math.random().toString(16).slice(2)}`
    },
    addEventListener: () => {}
  },
  document: createDocument(),
  localStorage: createLocalStorage(),
  Blob: class Blob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
    }
  },
  URL: {
    createObjectURL: () => "blob:test",
    revokeObjectURL: () => {}
  },
  setTimeout: (handler) => {
    handler();
    return 1;
  },
  clearTimeout: () => {}
};

context.window.document = context.document;
context.window.localStorage = context.localStorage;
context.window.URL = context.URL;
context.window.Blob = context.Blob;

vm.createContext(context);

const scripts = [
  "data.js",
  "utils.js",
  "storage.js",
  "timing.js",
  "model.js",
  "assessment.js",
  "practice.js",
  "views.js",
  "admin.js",
  "app.js"
];

scripts.forEach((file) => {
  const source = fs.readFileSync(path.join(__dirname, file), "utf8");
  vm.runInContext(source, context, { filename: file });
});

assert(vm.runInContext("app.innerHTML.includes('找出常見錯誤')", context), "home render failed");

vm.runInContext("setScreen('admin')", context);
assert(vm.runInContext("app.innerHTML.includes('管理')", context), "admin render failed");

vm.runInContext("startDemoMode()", context);
assert(vm.runInContext("state.attempts.length >= 4", context), "demo mode did not create attempts");
assert(vm.runInContext("app.innerHTML.includes('學習摘要')", context), "demo summary render failed");

vm.runInContext("startReview()", context);
assert(vm.runInContext("activePracticeQuestions.length === 8", context), "review set should contain 8 questions");

vm.runInContext("resetAllLearningData({ silent: true }); startTopic('range_loop')", context);
assert(vm.runInContext("activePracticeQuestions.length === 4", context), "topic practice set should contain 4 questions");
assert(vm.runInContext("app.innerHTML.includes('range')", context), "topic render failed");

console.log("Smoke test passed");
