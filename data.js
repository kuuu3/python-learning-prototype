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


