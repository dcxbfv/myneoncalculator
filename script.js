// Development By Ali Asgharian =)
// ساخته شده توسط علی اصغریان =)

"use strict";

// ========================================
// GLASS CALC PRO
// ========================================

// عناصر HTML
const display = document.getElementById("display");
const historyDisplay = document.getElementById("history");
const buttons = document.querySelectorAll(".buttons button");

const historyList = document.getElementById("history-list");
const clearHistoryButton = document.getElementById("clear-history");

const copyResultButton = document.getElementById("copy-result");
const copyStatus = document.getElementById("copy-status");

const soundVolumeSlider = document.getElementById("sound-volume");
const soundValueLabel = document.getElementById("sound-value");
const soundIcon = document.getElementById("sound-icon");

// ========================================
// وضعیت ماشین‌حساب
// ========================================

let currentInput = "0";
let calculationTokens = [];
let shouldResetDisplay = false;
let justCalculated = false;

// ========================================
// تنظیمات صدا
// ========================================

let audioContext = null;
let clickVolume = 55;

try {
  const savedVolume = localStorage.getItem("glassCalcVolume");

  if (savedVolume !== null) {
    const value = Number(savedVolume);

    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      clickVolume = value;
    }
  }
} catch (error) {
  console.warn("بازیابی تنظیم صدا ممکن نشد:", error);
}

// ========================================
// صدای کلیک
// ========================================

function playClickSound() {
  if (clickVolume <= 0) return;

  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    const playTone = () => {
      if (!audioContext || audioContext.state !== "running") return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(700, now);

      gainNode.gain.setValueAtTime(
        0.12 * (clickVolume / 100),
        now
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        now + 0.09
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(now);
      oscillator.stop(now + 0.09);
    };

    if (audioContext.state === "suspended") {
      audioContext.resume().then(playTone).catch((error) => {
        console.warn("فعال‌سازی صدا ممکن نشد:", error);
      });
    } else {
      playTone();
    }
  } catch (error) {
    console.warn("پخش صدای کلیک ممکن نشد:", error);
  }
}

// ========================================
// نمایش اعداد
// ========================================

function formatNumber(value) {
  if (!Number.isFinite(value)) return "خطا";
  if (Object.is(value, -0)) value = 0;

  return String(Number(value.toPrecision(12)));
}

function updateDisplay() {
  display.textContent = currentInput;
  historyDisplay.textContent = calculationTokens.join(" ");
}

function showError(message = "خطا") {
  currentInput = message;
  calculationTokens = [];
  shouldResetDisplay = true;
  justCalculated = false;
  updateDisplay();
}

// ========================================
// تاریخچه
// ========================================

const HISTORY_KEY = "glassCalcHistory";
const MAX_HISTORY_ITEMS = 20;

function getHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (!saved) return [];

    const items = JSON.parse(saved);
    if (!Array.isArray(items)) return [];

    return items.filter((item) => {
      return (
        item &&
        typeof item.expression === "string" &&
        typeof item.result === "string"
      );
    });
  } catch (error) {
    console.warn("خواندن تاریخچه ممکن نشد:", error);
    return [];
  }
}

function saveToHistory(calculation, result) {
  const items = getHistory();

  items.unshift({
    expression: calculation,
    result: String(result),
    time: Date.now()
  });

  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS))
    );
  } catch (error) {
    console.warn("ذخیره تاریخچه ممکن نشد:", error);
  }

  renderHistory();
}


function renderHistory() {
  if (!historyList) return;

  historyList.replaceChildren();

  const items = getHistory();

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = "هنوز محاسبه‌ای ثبت نشده.";
    historyList.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = "history-item";

    // قابل کلیک کردن محاسبه
    wrapper.setAttribute("role", "button");
    wrapper.setAttribute("tabindex", "0");
    wrapper.title = "برای بازگرداندن نتیجه کلیک کن";

    const expressionElement = document.createElement("div");
    expressionElement.className = "history-expression";
    expressionElement.textContent = item.expression;

    const resultElement = document.createElement("div");
    resultElement.className = "history-result";
    resultElement.textContent = item.result;

    wrapper.append(expressionElement, resultElement);

    // برگرداندن نتیجه به ماشین‌حساب
    function restoreCalculation() {
      const result = Number(item.result);

      if (!Number.isFinite(result)) return;

      playClickSound();

      currentInput = formatNumber(result);
      calculationTokens = [];
      shouldResetDisplay = true;
      justCalculated = true;

      updateDisplay();

      // نمایش پیام کوتاه، در صورت وجود عنصر وضعیت کپی
      if (copyStatus) {
        copyStatus.textContent = "نتیجه به ماشین‌حساب برگشت!";

        setTimeout(() => {
          copyStatus.textContent = "";
        }, 1800);
      }
    }

    wrapper.addEventListener("click", restoreCalculation);

    // پشتیبانی از صفحه‌کلید
    wrapper.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        restoreCalculation();
      }
    });

    historyList.appendChild(wrapper);
  });
}


// ========================================
// ورود عدد و اعشار
// ========================================

function inputNumber(number) {
  if (currentInput === "خطا") {
    currentInput = "0";
    calculationTokens = [];
  }

  if (shouldResetDisplay || justCalculated) {
    currentInput = number;
    shouldResetDisplay = false;
    justCalculated = false;
  } else if (currentInput === "0") {
    currentInput = number;
  } else if (currentInput.length < 15) {
    currentInput += number;
  }

  updateDisplay();
}

function inputDecimal() {
  if (currentInput === "خطا") {
    currentInput = "0";
    calculationTokens = [];
  }

  if (shouldResetDisplay || justCalculated) {
    currentInput = "0.";
    shouldResetDisplay = false;
    justCalculated = false;
  } else if (!currentInput.includes(".")) {
    currentInput += ".";
  }

  updateDisplay();
}

// ========================================
// انتخاب عملگر
// ========================================

function chooseOperator(selectedOperator) {
  if (currentInput === "خطا") return;

  const value = Number(currentInput);
  if (!Number.isFinite(value)) return;

  if (justCalculated) {
    calculationTokens = [formatNumber(value)];
    justCalculated = false;
  } else if (!shouldResetDisplay) {
    calculationTokens.push(formatNumber(value));
  } else if (calculationTokens.length === 0) {
    calculationTokens.push(formatNumber(value));
  }

  const operators = ["+", "-", "×", "÷"];
  const last = calculationTokens[calculationTokens.length - 1];

  if (operators.includes(last)) {
    calculationTokens[calculationTokens.length - 1] =
      selectedOperator;
  } else {
    calculationTokens.push(selectedOperator);
  }

  shouldResetDisplay = true;
  updateDisplay();
}

// ========================================
// محاسبه با اولویت ضرب و تقسیم
// ========================================

function performCalculation() {
  if (currentInput === "خطا" || shouldResetDisplay) return;
  if (calculationTokens.length === 0) return;

  const tokens = [
    ...calculationTokens,
    formatNumber(Number(currentInput))
  ];

  if (tokens.length < 3 || tokens.length % 2 === 0) return;

  const numbers = [Number(tokens[0])];
  const operators = [];
  const allowedOperators = ["+", "-", "×", "÷"];

  // مرحله اول: ضرب و تقسیم
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const nextNumber = Number(tokens[i + 1]);

    if (
      !allowedOperators.includes(op) ||
      !Number.isFinite(nextNumber)
    ) {
      showError();
      return;
    }

    if (op === "×" || op === "÷") {
      const index = numbers.length - 1;

      if (op === "÷" && nextNumber === 0) {
        showError();
        return;
      }

      numbers[index] =
        op === "×"
          ? numbers[index] * nextNumber
          : numbers[index] / nextNumber;

      if (!Number.isFinite(numbers[index])) {
        showError();
        return;
      }
    } else {
      operators.push(op);
      numbers.push(nextNumber);
    }
  }

  // مرحله دوم: جمع و تفریق
  let result = numbers[0];

  for (let i = 0; i < operators.length; i++) {
    if (operators[i] === "+") {
      result += numbers[i + 1];
    } else {
      result -= numbers[i + 1];
    }
  }

  if (!Number.isFinite(result)) {
    showError();
    return;
  }

  const calculationText = `${tokens.join(" ")} =`;

  currentInput = formatNumber(result);
  saveToHistory(calculationText, currentInput);

  calculationTokens = [];
  shouldResetDisplay = true;
  justCalculated = true;

  updateDisplay();
}

// ========================================
// درصد، تغییر علامت و حذف
// ========================================

function calculatePercent() {
  if (currentInput === "خطا") return;

  const value = Number(currentInput);
  if (!Number.isFinite(value)) return;

  currentInput = formatNumber(value / 100);
  shouldResetDisplay = false;
  justCalculated = false;

  updateDisplay();
}

function toggleSign() {
  if (currentInput === "خطا" || Number(currentInput) === 0) return;

  currentInput = currentInput.startsWith("-")
    ? currentInput.slice(1)
    : "-" + currentInput;

  updateDisplay();
}

function deleteLastDigit() {
  if (
    currentInput === "خطا" ||
    shouldResetDisplay ||
    justCalculated
  ) {
    currentInput = "0";
    shouldResetDisplay = false;
    justCalculated = false;
  } else {
    currentInput = currentInput.slice(0, -1);

    if (currentInput === "" || currentInput === "-") {
      currentInput = "0";
    }
  }

  updateDisplay();
}

function clearCalculator() {
  currentInput = "0";
  calculationTokens = [];
  shouldResetDisplay = false;
  justCalculated = false;

  updateDisplay();
}

// ========================================
// اتصال دکمه‌های ماشین‌حساب
// ========================================

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    playClickSound();

    if (button.dataset.number !== undefined) {
      inputNumber(button.dataset.number);
      return;
    }

    if (button.dataset.operator !== undefined) {
      chooseOperator(button.dataset.operator);
      return;
    }

    switch (button.dataset.action) {
      case "decimal":
        inputDecimal();
        break;

      case "equals":
        performCalculation();
        break;

      case "clear":
        clearCalculator();
        break;

      case "delete":
        deleteLastDigit();
        break;

      case "percent":
        calculatePercent();
        break;

      case "sign":
        toggleSign();
        break;
    }
  });
});

// ========================================
// پاک کردن تاریخچه
// ========================================

if (clearHistoryButton) {
  clearHistoryButton.addEventListener("click", () => {
    playClickSound();

    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.warn("پاک کردن تاریخچه ممکن نشد:", error);
    }

    renderHistory();
  });
}

// ========================================
// کپی نتیجه
// ========================================

if (copyResultButton) {
  copyResultButton.addEventListener("click", async () => {
    playClickSound();

    if (copyStatus) {
      copyStatus.textContent = "";
    }

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API در دسترس نیست.");
      }

      await navigator.clipboard.writeText(currentInput);

      if (copyStatus) {
        copyStatus.textContent = "نتیجه کپی شد!";
      }
    } catch (error) {
      if (copyStatus) {
        copyStatus.textContent =
          "کپی خودکار نشد؛ نتیجه را دستی کپی کن.";
      }
    }
  });
}

// ========================================
// نوار صدا و آیکون بی‌صدا
// ========================================



 // ========================================
// نوار صدا و آیکون بی‌صدا
// ========================================

let previousVolume = clickVolume > 0 ? clickVolume : 55;

function updateSoundControl() {
  if (soundVolumeSlider) {
    soundVolumeSlider.value = String(clickVolume);
  }

  if (soundValueLabel) {
    soundValueLabel.textContent = `${clickVolume}%`;
  }

  if (soundIcon) {
    const muted = clickVolume === 0;

    soundIcon.textContent = muted ? "🔇" : "🔊";
    soundIcon.setAttribute(
      "aria-label",
      muted ? "وصل کردن صدا" : "قطع صدا"
    );
    soundIcon.title = muted ? "وصل کردن صدا" : "قطع صدا";
  }
}

// ذخیره تنظیمات صدا
function saveSoundSettings() {
  try {
    localStorage.setItem("glassCalcVolume", String(clickVolume));
  } catch (error) {
    console.warn("ذخیره تنظیم صدا ممکن نشد:", error);
  }
}

// کلیک روی آیکون قطع و وصل صدا
if (soundIcon) {
  soundIcon.addEventListener("click", () => {
    if (clickVolume > 0) {
      // صدای آخر را نگه می‌داریم
      previousVolume = clickVolume;
      clickVolume = 0;
    } else {
      // برگرداندن صدای قبلی
      clickVolume = previousVolume > 0 ? previousVolume : 55;
    }

    saveSoundSettings();
    updateSoundControl();
  });
}

// تغییر مقدار نوار صدا
if (soundVolumeSlider) {
  soundVolumeSlider.addEventListener("input", () => {
    const value = Number(soundVolumeSlider.value);

    if (!Number.isFinite(value)) return;

    clickVolume = Math.max(0, Math.min(100, value));

    if (clickVolume > 0) {
      previousVolume = clickVolume;
    }

    saveSoundSettings();
    updateSoundControl();
  });
}

// ========================================
// کنترل با صفحه‌کلید
// ========================================

document.addEventListener("keydown", (event) => {
  if (event.target === soundVolumeSlider) return;

  const key = event.key;

  if (/^[0-9]$/.test(key)) {
    inputNumber(key);
  } else if (key === "." || key === ",") {
    inputDecimal();
  } else if (key === "+") {
    chooseOperator("+");
  } else if (key === "-") {
    chooseOperator("-");
  } else if (key === "*") {
    chooseOperator("×");
  } else if (key === "/") {
    event.preventDefault();
    chooseOperator("÷");
  } else if (key === "Enter" || key === "=") {
    event.preventDefault();
    performCalculation();
  } else if (key === "Backspace") {
    deleteLastDigit();
  } else if (key === "Escape") {
    clearCalculator();
  }
});

// ========================================
// راه‌اندازی اولیه
// ========================================

updateDisplay();
updateSoundControl();
renderHistory();
