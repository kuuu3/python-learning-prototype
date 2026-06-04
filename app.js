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

const topics = {
  list_index: {
    name: "list 與索引",
    goal: "分辨第幾個元素、索引值、len(list) 與最後索引之間的差異。",
    misconceptions: {
      index_start_from_one: "把索引誤認為從 1 開始",
      len_is_last_index: "把 len(list) 誤認為最後一個索引",
      value_index_confusion: "混淆元素值與索引值"
    }
  },
  range_loop: { name: "迴圈與 range()", goal: "理解 range 的起點、終點與不包含結束值。" },
  conditionals: { name: "條件判斷", goal: "理解 if / elif / else 的判斷順序。" },
  type_conversion: { name: "變數與型態", goal: "理解字串、整數與轉型時機。" }
};

const diagnosticQuestions = [
  {
    id: "d-list-1",
    topicId: "list_index",
    prompt: "numbers = [10, 20, 30]，numbers[1] 會得到什麼？",
    code: "numbers = [10, 20, 30]\nprint(numbers[1])",
    options: ["10", "20", "30", "我不知道"],
    answer: "20",
    errorMap: { "10": "index_start_from_one" }
  },
  {
    id: "d-list-2",
    topicId: "list_index",
    prompt: "items = ['a', 'b', 'c']，最後一個元素的索引是多少？",
    code: "items = ['a', 'b', 'c']",
    options: ["1", "2", "3", "我不知道"],
    answer: "2",
    errorMap: { "3": "len_is_last_index" }
  },
  {
    id: "d-range-1",
    topicId: "range_loop",
    prompt: "range(1, 4) 會依序產生哪些數字？",
    code: "for i in range(1, 4):\n    print(i)",
    options: ["1, 2, 3", "1, 2, 3, 4", "0, 1, 2, 3", "我不知道"],
    answer: "1, 2, 3",
    errorMap: { "1, 2, 3, 4": "range_includes_stop" }
  },
  {
    id: "d-type-1",
    topicId: "type_conversion",
    prompt: "input() 取得的資料預設是什麼型態？",
    code: "age = input('age: ')",
    options: ["int", "str", "bool", "我不知道"],
    answer: "str",
    errorMap: { int: "input_is_number" }
  },
  {
    id: "rg-cp-2",
    topicId: "range_loop",
    state: "CHECKPOINT",
    title: "概念檢核",
    prompt: "range(4) 會產生哪些數字？",
    code: "for i in range(4):\n    print(i)",
    options: ["0, 1, 2, 3", "1, 2, 3, 4", "0, 1, 2, 3, 4", "我不知道"],
    answer: "0, 1, 2, 3",
    errorMap: { "1, 2, 3, 4": "range_start_confusion", "0, 1, 2, 3, 4": "range_includes_stop" },
    hints: ["只有一個參數時，range 會從 0 開始。", "range(4) 的停止點是 4，但不包含 4。", "所以結果是 0, 1, 2, 3。"]
  },
  {
    id: "rg-vf-2",
    topicId: "range_loop",
    state: "VERIFY",
    title: "驗證理解",
    prompt: "len(list(range(1, 5))) 的值是多少？",
    code: "numbers = list(range(1, 5))\nprint(len(numbers))",
    options: ["3", "4", "5", "我不知道"],
    answer: "4",
    errorMap: { "5": "range_includes_stop", "3": "range_start_confusion" },
    hints: ["先列出 range(1, 5) 的內容。", "它是 1, 2, 3, 4，不包含 5。", "共有 4 個數字。"]
  },
  {
    id: "rg-cr-2",
    topicId: "range_loop",
    state: "CORRECTION",
    title: "修正題",
    prompt: "想印出 0 到 9，共 10 個數字，哪個寫法最合理？",
    code: "# 目標輸出：0, 1, 2, ..., 9",
    options: ["range(9)", "range(10)", "range(1, 10)", "我不知道"],
    answer: "range(10)",
    errorMap: { "range(9)": "range_includes_stop", "range(1, 10)": "range_start_confusion" },
    hints: ["要從 0 開始，可以只寫停止點。", "停止點 10 不包含，所以最後會到 9。", "答案是 range(10)。"]
  },
  {
    id: "rg-tr-2",
    topicId: "range_loop",
    state: "TRANSFER",
    title: "遷移題",
    prompt: "要讓迴圈執行 5 次，通常可以用哪個寫法？",
    code: "# 執行 5 次，不在意 i 的實際值",
    options: ["range(5)", "range(1, 5)", "range(6)", "我不知道"],
    answer: "range(5)",
    errorMap: { "range(1, 5)": "range_start_confusion", "range(6)": "range_includes_stop" },
    hints: ["range(5) 會產生 5 個值。", "這 5 個值是 0 到 4。", "因此迴圈會執行 5 次。"]
  },
  {
    id: "cd-cp-2",
    topicId: "conditionals",
    state: "CHECKPOINT",
    title: "概念檢核",
    prompt: "x = 5 時，下面程式會印出什麼？",
    code: "x = 5\nif x == 5:\n    print('same')\nelse:\n    print('different')",
    options: ["same", "different", "5", "我不知道"],
    answer: "same",
    errorMap: { different: "comparison_operator_confusion", "5": "value_output_confusion" },
    hints: ["== 是用來比較是否相等。", "x 的值確實是 5。", "所以會印出 same。"]
  },
  {
    id: "cd-vf-2",
    topicId: "conditionals",
    state: "VERIFY",
    title: "驗證理解",
    prompt: "n = 3 時，下面程式會印出什麼？",
    code: "n = 3\nif n % 2 == 0:\n    print('even')\nelse:\n    print('odd')",
    options: ["even", "odd", "0", "我不知道"],
    answer: "odd",
    errorMap: { even: "condition_reversed", "0": "value_output_confusion" },
    hints: ["n % 2 會看除以 2 的餘數。", "3 除以 2 的餘數是 1，不等於 0。", "所以會走 else，印出 odd。"]
  },
  {
    id: "cd-cr-2",
    topicId: "conditionals",
    state: "CORRECTION",
    title: "修正題",
    prompt: "想判斷密碼長度至少 8 碼，條件應該是哪個？",
    code: "password = 'abc12345'",
    options: ["len(password) > 8", "len(password) >= 8", "len(password) < 8", "我不知道"],
    answer: "len(password) >= 8",
    errorMap: { "len(password) > 8": "comparison_operator_confusion", "len(password) < 8": "condition_reversed" },
    hints: ["至少 8 碼代表 8 也符合。", "> 8 不包含剛好 8。", "所以要用 len(password) >= 8。"]
  },
  {
    id: "cd-tr-2",
    topicId: "conditionals",
    state: "TRANSFER",
    title: "遷移題",
    prompt: "temperature = 30，若 30 度以上顯示 hot，條件應該是哪個？",
    code: "temperature = 30",
    options: ["temperature > 30", "temperature >= 30", "temperature < 30", "我不知道"],
    answer: "temperature >= 30",
    errorMap: { "temperature > 30": "comparison_operator_confusion", "temperature < 30": "condition_reversed" },
    hints: ["30 度以上包含 30。", "包含邊界要用 >=。", "所以是 temperature >= 30。"]
  },
  {
    id: "tc-cp-2",
    topicId: "type_conversion",
    state: "CHECKPOINT",
    title: "概念檢核",
    prompt: "'7' + '3' 的結果是什麼？",
    code: "print('7' + '3')",
    options: ["10", "73", "錯誤", "我不知道"],
    answer: "73",
    errorMap: { "10": "string_concat_confusion", "錯誤": "string_number_operation" },
    hints: ["兩邊都是字串。", "+ 對字串會做串接。", "所以結果是 '73'。"]
  },
  {
    id: "tc-vf-2",
    topicId: "type_conversion",
    state: "VERIFY",
    title: "驗證理解",
    prompt: "float('3.5') 會得到什麼？",
    code: "value = float('3.5')",
    options: ["字串 '3.5'", "浮點數 3.5", "整數 3", "我不知道"],
    answer: "浮點數 3.5",
    errorMap: { "字串 '3.5'": "conversion_direction_confusion", "整數 3": "conversion_direction_confusion" },
    hints: ["float() 會嘗試轉成小數型態。", "'3.5' 可以被轉成浮點數。", "結果是浮點數 3.5。"]
  },
  {
    id: "tc-cr-2",
    topicId: "type_conversion",
    state: "CORRECTION",
    title: "修正題",
    prompt: "下面程式想計算兩個輸入數字總和，哪個修改合理？",
    code: "a = input('a: ')\nb = input('b: ')\nprint(a + b)",
    options: ["print(int(a) + int(b))", "print(str(a) + str(b))", "print(a + b)", "我不知道"],
    answer: "print(int(a) + int(b))",
    errorMap: { "print(str(a) + str(b))": "conversion_direction_confusion", "print(a + b)": "string_concat_confusion" },
    hints: ["input 得到的是字串。", "字串相加會串接，不是數字加法。", "要先把兩個輸入都轉成 int。"]
  },
  {
    id: "tc-tr-2",
    topicId: "type_conversion",
    state: "TRANSFER",
    title: "遷移題",
    prompt: "height = '1.75'，要把它當小數計算，哪個寫法合理？",
    code: "height = '1.75'",
    options: ["float(height)", "int(height)", "str(height)", "我不知道"],
    answer: "float(height)",
    errorMap: { "int(height)": "conversion_direction_confusion", "str(height)": "conversion_direction_confusion" },
    hints: ["1.75 有小數點。", "要保留小數，應該轉成 float。", "所以使用 float(height)。"]
  }
];

const diagnosticFlowQuestions = diagnosticQuestions.filter((question) => question.id.startsWith("d-"));

const practiceQuestions = [
  {
    id: "cp-1",
    state: "CHECKPOINT",
    title: "概念檢核",
    prompt: "scores = [70, 80, 90, 100]，scores[0] 是哪一個值？",
    code: "scores = [70, 80, 90, 100]\nprint(scores[0])",
    options: ["70", "80", "0", "我不知道"],
    answer: "70",
    errorMap: { "80": "index_start_from_one", "0": "value_index_confusion" },
    hints: [
      "先看中括號裡的數字，它是位置編號，不是元素值。",
      "Python list 的第一個位置是索引 0。",
      "scores[0] 代表第一個元素，所以答案是 70。"
    ]
  },
  {
    id: "vf-1",
    state: "VERIFY",
    title: "驗證理解",
    prompt: "letters = ['p', 'y', 't']，哪個寫法會取出最後一個元素？",
    code: "letters = ['p', 'y', 't']",
    options: ["letters[3]", "letters[len(letters)]", "letters[len(letters) - 1]", "我不知道"],
    answer: "letters[len(letters) - 1]",
    errorMap: {
      "letters[3]": "len_is_last_index",
      "letters[len(letters)]": "len_is_last_index"
    },
    hints: [
      "先算 list 長度，再想最後索引是不是同一個數字。",
      "長度是 3，但索引是 0、1、2。",
      "最後索引是 len(letters) - 1，所以是 letters[len(letters) - 1]。"
    ]
  },
  {
    id: "cr-1",
    state: "CORRECTION",
    title: "修正題",
    prompt: "下面程式會出錯，哪個修改最合理？",
    code: "numbers = [5, 6, 7]\nprint(numbers[len(numbers)])",
    options: ["print(numbers[len(numbers) - 1])", "print(numbers[3])", "print(numbers[5])", "我不知道"],
    answer: "print(numbers[len(numbers) - 1])",
    errorMap: {
      "print(numbers[3])": "len_is_last_index",
      "print(numbers[5])": "value_index_confusion"
    },
    hints: [
      "錯誤出在索引超出範圍。",
      "numbers 有 3 個元素，索引只到 2。",
      "用 len(numbers) - 1 才能取得最後一個索引。"
    ]
  },
  {
    id: "tr-1",
    state: "TRANSFER",
    title: "遷移題",
    prompt: "names = ['Ann', 'Bo', 'Cy', 'Dee']，要印出 Cy，應該使用哪一行？",
    code: "names = ['Ann', 'Bo', 'Cy', 'Dee']",
    options: ["print(names[2])", "print(names[3])", "print(names['Cy'])", "我不知道"],
    answer: "print(names[2])",
    errorMap: {
      "print(names[3])": "index_start_from_one",
      "print(names['Cy'])": "value_index_confusion"
    },
    hints: [
      "先數 Cy 是第幾個元素，再轉成索引。",
      "第一個 Ann 的索引是 0，所以 Cy 是索引 2。",
      "答案是 print(names[2])。"
    ]
  }
];

const extraPracticeQuestions = [
  {
    id: "cp-2",
    state: "CHECKPOINT",
    title: "概念檢核",
    prompt: "colors = ['red', 'green', 'blue']，colors[2] 是哪一個值？",
    code: "colors = ['red', 'green', 'blue']\nprint(colors[2])",
    options: ["green", "blue", "2", "我不知道"],
    answer: "blue",
    errorMap: { green: "index_start_from_one", "2": "value_index_confusion" },
    hints: [
      "中括號裡的 2 是索引，不是要輸出的值。",
      "索引從 0 開始，所以 red 是 0、green 是 1、blue 是 2。",
      "colors[2] 會取出 blue。"
    ]
  },
  {
    id: "cp-3",
    state: "CHECKPOINT",
    title: "概念檢核",
    prompt: "prices = [15, 30, 45, 60]，第二個元素應該用哪個索引？",
    code: "prices = [15, 30, 45, 60]",
    options: ["0", "1", "2", "我不知道"],
    answer: "1",
    errorMap: { "2": "index_start_from_one", "0": "value_index_confusion" },
    hints: [
      "題目問的是第二個元素，不是索引值 2。",
      "第一個元素索引是 0，第二個元素索引是 1。",
      "第二個元素應該用 prices[1]。"
    ]
  },
  {
    id: "vf-2",
    state: "VERIFY",
    title: "驗證理解",
    prompt: "data = [3, 6, 9, 12, 15]，最後一個元素的索引是多少？",
    code: "data = [3, 6, 9, 12, 15]",
    options: ["4", "5", "15", "我不知道"],
    answer: "4",
    errorMap: { "5": "len_is_last_index", "15": "value_index_confusion" },
    hints: [
      "先算 data 有幾個元素。",
      "長度是 5，但索引從 0 開始，所以最後索引不是 5。",
      "最後索引是 len(data) - 1，也就是 4。"
    ]
  },
  {
    id: "vf-3",
    state: "VERIFY",
    title: "驗證理解",
    prompt: "words = ['hi', 'python']，words[len(words)] 會發生什麼？",
    code: "words = ['hi', 'python']\nprint(words[len(words)])",
    options: ["印出 python", "印出 hi", "索引超出範圍", "我不知道"],
    answer: "索引超出範圍",
    errorMap: { "印出 python": "len_is_last_index", "印出 hi": "index_start_from_one" },
    hints: [
      "len(words) 的值是 2。",
      "words 的合法索引只有 0 和 1。",
      "words[2] 超出範圍，所以會出錯。"
    ]
  },
  {
    id: "cr-2",
    state: "CORRECTION",
    title: "修正題",
    prompt: "下面程式想印出最後一個分數，哪個修改最合理？",
    code: "scores = [88, 92, 76, 81]\nprint(scores[len(scores)])",
    options: ["print(scores[len(scores) - 1])", "print(scores[4])", "print(scores[81])", "我不知道"],
    answer: "print(scores[len(scores) - 1])",
    errorMap: {
      "print(scores[4])": "len_is_last_index",
      "print(scores[81])": "value_index_confusion"
    },
    hints: [
      "scores 有 4 個元素，最後索引不是 4。",
      "最後索引應該是長度減 1。",
      "所以要寫 scores[len(scores) - 1]。"
    ]
  },
  {
    id: "cr-3",
    state: "CORRECTION",
    title: "修正題",
    prompt: "下面程式把元素值當成索引，哪個版本比較合理？",
    code: "numbers = [2, 4, 6]\nfor x in numbers:\n    print(numbers[x])",
    options: ["for x in numbers: print(x)", "for x in numbers: print(numbers[x])", "for x in numbers: print(numbers[6])", "我不知道"],
    answer: "for x in numbers: print(x)",
    errorMap: {
      "for x in numbers: print(numbers[x])": "value_index_confusion",
      "for x in numbers: print(numbers[6])": "value_index_confusion"
    },
    hints: [
      "for x in numbers 時，x 代表元素值，不是索引。",
      "這個 list 的元素值是 2、4、6，其中 4 和 6 不能當合法索引。",
      "如果只是要印出每個元素，直接 print(x) 就好。"
    ]
  },
  {
    id: "tr-2",
    state: "TRANSFER",
    title: "遷移題",
    prompt: "tasks = ['read', 'code', 'test', 'submit']，要取出 test 應該用哪一行？",
    code: "tasks = ['read', 'code', 'test', 'submit']",
    options: ["print(tasks[2])", "print(tasks[3])", "print(tasks['test'])", "我不知道"],
    answer: "print(tasks[2])",
    errorMap: {
      "print(tasks[3])": "index_start_from_one",
      "print(tasks['test'])": "value_index_confusion"
    },
    hints: [
      "先找 test 是第幾個元素。",
      "read 是索引 0，code 是索引 1，test 是索引 2。",
      "所以要用 print(tasks[2])。"
    ]
  },
  {
    id: "tr-3",
    state: "TRANSFER",
    title: "遷移題",
    prompt: "temps = [21, 23, 19, 25, 22]，要取出倒數第一個值，哪個寫法合理？",
    code: "temps = [21, 23, 19, 25, 22]",
    options: ["temps[len(temps)]", "temps[len(temps) - 1]", "temps[22]", "我不知道"],
    answer: "temps[len(temps) - 1]",
    errorMap: {
      "temps[len(temps)]": "len_is_last_index",
      "temps[22]": "value_index_confusion"
    },
    hints: [
      "倒數第一個就是最後一個元素。",
      "最後索引是長度減 1，不是長度本身。",
      "所以合理寫法是 temps[len(temps) - 1]。"
    ]
  }
];

const allPracticeQuestions = [...practiceQuestions, ...extraPracticeQuestions];

const supplementalTopicQuestions = [
  {
    id: "rg-cp-1",
    topicId: "range_loop",
    state: "CHECKPOINT",
    title: "概念檢核",
    prompt: "range(0, 3) 會產生哪些數字？",
    code: "for i in range(0, 3):\n    print(i)",
    options: ["0, 1, 2", "0, 1, 2, 3", "1, 2, 3", "我不知道"],
    answer: "0, 1, 2",
    errorMap: { "0, 1, 2, 3": "range_includes_stop" },
    hints: ["range 的結束值不包含在內。", "從 0 開始，走到 3 前停止。", "所以會印出 0, 1, 2。"]
  },
  {
    id: "rg-vf-1",
    topicId: "range_loop",
    state: "VERIFY",
    title: "驗證理解",
    prompt: "range(2, 6) 的最後一個數字是多少？",
    code: "list(range(2, 6))",
    options: ["5", "6", "2", "我不知道"],
    answer: "5",
    errorMap: { "6": "range_includes_stop" },
    hints: ["結束值 6 不會被包含。", "序列會是 2, 3, 4, 5。", "最後一個數字是 5。"]
  },
  {
    id: "rg-cr-1",
    topicId: "range_loop",
    state: "CORRECTION",
    title: "修正題",
    prompt: "想印出 1 到 5，哪個寫法最合理？",
    code: "# 目標輸出：1, 2, 3, 4, 5",
    options: ["range(1, 5)", "range(1, 6)", "range(0, 5)", "我不知道"],
    answer: "range(1, 6)",
    errorMap: { "range(1, 5)": "range_includes_stop", "range(0, 5)": "range_start_confusion" },
    hints: ["要包含 5，結束值要寫到 6。", "range 的第二個數字是不包含的停止點。", "所以要用 range(1, 6)。"]
  },
  {
    id: "rg-tr-1",
    topicId: "range_loop",
    state: "TRANSFER",
    title: "遷移題",
    prompt: "要產生 3, 4, 5, 6，應該用哪個 range？",
    code: "# 目標序列：3, 4, 5, 6",
    options: ["range(3, 6)", "range(3, 7)", "range(4, 7)", "我不知道"],
    answer: "range(3, 7)",
    errorMap: { "range(3, 6)": "range_includes_stop", "range(4, 7)": "range_start_confusion" },
    hints: ["第一個數字要是 3。", "最後要包含 6，所以停止點要多 1。", "答案是 range(3, 7)。"]
  },
  {
    id: "cd-cp-1",
    topicId: "conditionals",
    state: "CHECKPOINT",
    title: "概念檢核",
    prompt: "x = 8 時，下面程式會印出什麼？",
    code: "x = 8\nif x > 10:\n    print('big')\nelse:\n    print('small')",
    options: ["big", "small", "不會印出任何東西", "我不知道"],
    answer: "small",
    errorMap: { big: "condition_boundary_confusion" },
    hints: ["先判斷 x > 10 是否成立。", "8 > 10 不成立，所以走 else。", "會印出 small。"]
  },
  {
    id: "cd-vf-1",
    topicId: "conditionals",
    state: "VERIFY",
    title: "驗證理解",
    prompt: "score = 80 時，下面程式會印出什麼？",
    code: "score = 80\nif score >= 60:\n    print('pass')\nelse:\n    print('fail')",
    options: ["pass", "fail", "60", "我不知道"],
    answer: "pass",
    errorMap: { fail: "comparison_operator_confusion", "60": "value_output_confusion" },
    hints: ["比較的是 score >= 60。", "80 大於等於 60，條件成立。", "所以會印出 pass。"]
  },
  {
    id: "cd-cr-1",
    topicId: "conditionals",
    state: "CORRECTION",
    title: "修正題",
    prompt: "想讓 60 分也算及格，條件應該怎麼寫？",
    code: "score = 60\nif score > 60:\n    print('pass')",
    options: ["score >= 60", "score > 60", "score < 60", "我不知道"],
    answer: "score >= 60",
    errorMap: { "score > 60": "comparison_operator_confusion", "score < 60": "condition_reversed" },
    hints: ["題目說 60 分也要算。", "只有 > 60 不包含 60。", "要用 >= 60。"]
  },
  {
    id: "cd-tr-1",
    topicId: "conditionals",
    state: "TRANSFER",
    title: "遷移題",
    prompt: "age = 18，若 18 歲以上可報名，條件應該是哪一個？",
    code: "age = 18",
    options: ["age > 18", "age >= 18", "age < 18", "我不知道"],
    answer: "age >= 18",
    errorMap: { "age > 18": "comparison_operator_confusion", "age < 18": "condition_reversed" },
    hints: ["18 歲以上包含 18。", "包含邊界時要用 >=。", "所以條件是 age >= 18。"]
  },
  {
    id: "tc-cp-1",
    topicId: "type_conversion",
    state: "CHECKPOINT",
    title: "概念檢核",
    prompt: "input() 讀進來的 '5' 預設是什麼？",
    code: "n = input('number: ')",
    options: ["整數 5", "字串 '5'", "布林值 True", "我不知道"],
    answer: "字串 '5'",
    errorMap: { "整數 5": "input_is_number" },
    hints: ["input() 回傳文字。", "即使看起來像數字，仍然是字串。", "所以是字串 '5'。"]
  },
  {
    id: "tc-vf-1",
    topicId: "type_conversion",
    state: "VERIFY",
    title: "驗證理解",
    prompt: "要把字串 '12' 轉成整數，應該用哪個？",
    code: "text = '12'",
    options: ["str(text)", "int(text)", "input(text)", "我不知道"],
    answer: "int(text)",
    errorMap: { "str(text)": "conversion_direction_confusion", "input(text)": "input_conversion_confusion" },
    hints: ["目標是變成整數。", "int() 可以把可轉換的字串轉成整數。", "所以用 int(text)。"]
  },
  {
    id: "tc-cr-1",
    topicId: "type_conversion",
    state: "CORRECTION",
    title: "修正題",
    prompt: "下面程式想做數字相加，哪個修改較合理？",
    code: "age = input('age: ')\nprint(age + 1)",
    options: ["print(int(age) + 1)", "print(str(age) + 1)", "print(age + '1')", "我不知道"],
    answer: "print(int(age) + 1)",
    errorMap: { "print(str(age) + 1)": "conversion_direction_confusion", "print(age + '1')": "string_concat_confusion" },
    hints: ["age 目前是字串。", "要做數字加法，先轉成 int。", "所以寫 int(age) + 1。"]
  },
  {
    id: "tc-tr-1",
    topicId: "type_conversion",
    state: "TRANSFER",
    title: "遷移題",
    prompt: "price = '100'，要算打 8 折，哪個寫法合理？",
    code: "price = '100'",
    options: ["int(price) * 0.8", "str(price) * 0.8", "price + 0.8", "我不知道"],
    answer: "int(price) * 0.8",
    errorMap: { "str(price) * 0.8": "conversion_direction_confusion", "price + 0.8": "string_number_operation" },
    hints: ["price 是字串。", "要做乘法計算，先轉成數字。", "所以用 int(price) * 0.8。"]
  }
];

const combinedSupplementalTopicQuestions = [
  ...supplementalTopicQuestions,
  ...diagnosticQuestions.filter((question) => question.state)
];

const questionBankByTopic = {
  list_index: allPracticeQuestions.map((question) => ({ ...question, topicId: "list_index" })),
  range_loop: combinedSupplementalTopicQuestions.filter((question) => question.topicId === "range_loop"),
  conditionals: combinedSupplementalTopicQuestions.filter((question) => question.topicId === "conditionals"),
  type_conversion: combinedSupplementalTopicQuestions.filter((question) => question.topicId === "type_conversion")
};

const conceptRulesByTopic = {
  list_index: [
    { id: "zero_based", label: "索引從 0 開始", patterns: ["索引從 0", "從0", "0 開始", "0開始", "zero"] },
    { id: "len_is_length", label: "len(list) 是長度", patterns: ["len", "長度"] },
    { id: "last_index_len_minus_one", label: "最後索引是 len(list) - 1", patterns: ["len", "- 1", "-1", "減 1", "減一", "最後"] },
    { id: "out_of_range", label: "使用 len(list) 會超出範圍", patterns: ["超出", "範圍", "IndexError", "錯"] }
  ],
  range_loop: [
    { id: "stop_excluded", label: "range 不包含結束值", patterns: ["不包含", "不含", "停止", "結束值", "stop"] },
    { id: "start_included", label: "range 會包含起始值", patterns: ["包含起始", "從", "開始", "start"] },
    { id: "need_stop_plus_one", label: "要包含最後數字需把停止值加 1", patterns: ["加 1", "+1", "多 1", "多一"] }
  ],
  conditionals: [
    { id: "boolean_condition", label: "條件會判斷 True / False", patterns: ["成立", "不成立", "true", "false", "判斷"] },
    { id: "boundary_operator", label: ">= 會包含邊界值", patterns: [">=", "包含", "邊界", "至少", "以上"] },
    { id: "else_path", label: "條件不成立會走 else", patterns: ["else", "否則", "不成立"] }
  ],
  type_conversion: [
    { id: "input_returns_string", label: "input() 回傳字串", patterns: ["input", "字串", "str", "文字"] },
    { id: "convert_before_math", label: "數字運算前要轉型", patterns: ["int", "float", "轉", "數字", "運算"] },
    { id: "string_concat", label: "字串 + 會串接", patterns: ["串接", "相接", "字串相加", "連起來"] }
  ]
};

const repairContentByError = {
  index_start_from_one: {
    title: "第幾個元素不是索引值",
    focus: "你可能把「第一個、第二個」直接當成索引。Python list 的索引從 0 開始。",
    contrast: "numbers = [10, 20, 30] 中，第一個元素 10 的索引是 0，第二個元素 20 的索引才是 1。",
    next: "重做概念檢核題時，先把每個元素上方標出索引 0, 1, 2。"
  },
  len_is_last_index: {
    title: "長度不是最後索引",
    focus: "你可能把 len(list) 當成最後一個合法索引。長度是元素數量，最後索引是長度減 1。",
    contrast: "letters = ['p', 'y', 't'] 的長度是 3，但合法索引只有 0、1、2。",
    next: "遇到最後一個元素時，先寫出 len(list)，再減 1。"
  },
  value_index_confusion: {
    title: "元素值不是索引值",
    focus: "你可能把 list 裡的值拿去當位置編號。for x in numbers 時，x 是元素值，不一定是合法索引。",
    contrast: "numbers = [2, 4, 6] 中，x 會是 2、4、6；但 numbers[4] 和 numbers[6] 都會超出範圍。",
    next: "如果只是要印出每個元素，使用 print(x)，不要再寫 numbers[x]。"
  },
  range_includes_stop: {
    title: "range 不包含結束值",
    focus: "你可能以為 range(start, stop) 會包含 stop。",
    contrast: "range(1, 5) 會產生 1, 2, 3, 4，不包含 5。",
    next: "若要包含最後數字，把停止值多寫 1。"
  },
  range_start_confusion: {
    title: "range 起點需要確認",
    focus: "你可能混淆 range 的起始值，或忘記單參數 range 會從 0 開始。",
    contrast: "range(4) 是 0, 1, 2, 3；range(1, 4) 是 1, 2, 3。",
    next: "先問自己第一個要出現的數字是什麼，再決定 start。"
  },
  comparison_operator_confusion: {
    title: "比較運算子與邊界",
    focus: "你可能沒有分清楚 > 和 >= 的差異。",
    contrast: "score > 60 不包含 60；score >= 60 才包含 60。",
    next: "看到「至少、以上、包含」時，優先檢查是否需要 >=。"
  },
  condition_reversed: {
    title: "條件方向相反",
    focus: "你可能把條件寫成和題目要求相反的方向。",
    contrast: "若題目說 18 歲以上，age < 18 代表的是未滿 18。",
    next: "把條件用一句話唸出來，確認它和題目意思相同。"
  },
  input_is_number: {
    title: "input() 預設是字串",
    focus: "你可能以為 input() 讀到數字時會自動變成 int。",
    contrast: "輸入 5 時，input() 得到的是 '5'，不是整數 5。",
    next: "要做數字運算前，先用 int() 或 float() 轉型。"
  },
  conversion_direction_confusion: {
    title: "型態轉換方向",
    focus: "你可能知道要轉型，但選錯方向。",
    contrast: "要做數字運算用 int(text) 或 float(text)；要顯示文字才用 str(value)。",
    next: "先決定目標是數字運算還是文字顯示，再選轉型函式。"
  },
  string_concat_confusion: {
    title: "字串相加是串接",
    focus: "你可能把字串加法誤認為數字加法。",
    contrast: "'7' + '3' 的結果是 '73'，不是 10。",
    next: "兩邊都先轉成 int，才能得到數字加法。"
  },
  string_number_operation: {
    title: "字串不能直接做數字運算",
    focus: "你可能直接把字串拿去和數字運算。",
    contrast: "'100' + 0.8 不是合理的數字計算。",
    next: "先用 int() 或 float() 轉型，再進行運算。"
  }
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

function saveState() {
  state.profile.lastActiveAt = new Date().toISOString();
  localStorage.setItem(KEYS.profile, JSON.stringify(state.profile));
  localStorage.setItem(KEYS.progress, JSON.stringify(state.progress));
  localStorage.setItem(KEYS.attempts, JSON.stringify(state.attempts));
  localStorage.setItem(KEYS.session, JSON.stringify(state.session));
  localStorage.setItem(KEYS.summaries, JSON.stringify(state.summaries));
}

function resetAllLearningData(options = {}) {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem("pythonTutorState");
  state = createDefaultState();
  saveState();
  diagnosticIndex = 0;
  practiceIndex = 0;
  screen = "home";
  if (!options.silent) render();
}

function init() {
  if (!loadState()) {
    state = createDefaultState();
    saveState();
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
  window.addEventListener("pagehide", saveState);
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

  return [
    {
      title: "localStorage 五個主要 key",
      detail: keysReady ? "profile、progress、attempts、session、summaries 都已建立。" : "尚未建立完整 key，可重新整理或開始一次練習。",
      status: keysReady ? "pass" : "partial"
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
