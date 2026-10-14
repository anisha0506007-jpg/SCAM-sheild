const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const STORE = {
  history: "scamshield-history",
  theme: "scamshield-theme",
  size: "scamshield-font-size"
};

const el = {
  scanForm: $("#scanForm"),
  message: $("#messageInput"),
  char: $("#charCount"),
  formError: $("#formError"),

  scannerForm: $("#scannerForm"),
  scannerMessage: $("#scannerMessage"),
  scannerChar: $("#scannerCharCount"),
  scannerError: $("#scannerError"),

  results: $("#results"),
  riskPill: $("#riskPill"),
  riskScore: $("#riskScore"),
  riskTitle: $("#riskTitle"),
  riskSummary: $("#riskSummary"),
  resultStatus: $("#resultStatus"),
  scoreRing: $("#scoreRing"),
  meter: $("#meterFill"),
  findingCount: $("#findingCount"),
  findings: $("#findingsList"),
  breakdown: $("#riskBreakdown"),
  recommendation: $("#recommendationText"),

  total: $("#totalScans"),
  high: $("#highRiskCount"),
  low: $("#lowRiskCount"),
  history: $("#historyList"),
  fullHistory: $("#fullHistoryList"),
  historySearch: $("#historySearch"),
  historyFilter: $("#historyFilter"),
  historyCount: $("#historyCount"),

  themeToggle: $("#themeToggle"),
  themeIcon: $("#themeIcon"),
  themeLabel: $("#themeLabel"),
  themeSelect: $("#themeSelect"),
  size: $("#fontSizeSelect"),
  reset: $("#resetSettings"),
  settingsStatus: $("#settingsStatus"),

  urlForm: $("#urlForm"),
  urlInput: $("#urlInput"),
  urlError: $("#urlError"),
  urlResults: $("#urlResults"),
  urlRiskPill: $("#urlRiskPill"),
  urlScore: $("#urlScore"),
  urlTitle: $("#urlTitle"),
  urlSummary: $("#urlSummary"),
  urlFindings: $("#urlFindings"),
  urlRecommendation: $("#urlRecommendation"),

  toast: $("#toast"),
  menu: $("#menuButton"),
  sidebar: $("#sidebar"),
  overlay: $("#mobileOverlay"),
  breadcrumb: $("#breadcrumbTitle"),
  year: $("#year")
};

let currentResult = null;
let currentUrlReport = null;
let toastTimer;
let shortcutTimer;
let shortcutPrefix = false;

const pageTitles = {
  dashboard: "Dashboard",
  scanner: "Message scanner",
  urlscanner: "URL scanner",
  history: "Scan history",
  safety: "Safety guide",
  settings: "Settings"
};

const samples = {
  phishing:
    "URGENT! Your bank account will be blocked today. Verify your account immediately and share your OTP. Click http://example-suspicious-link.test/verify to avoid suspension. Act now!",

  safe:
    "Hi! Our team meeting is scheduled for tomorrow at 10 AM in the conference room. Please review the agenda before joining. Thank you!",

  job:
    "Congratulations! You are selected for a work-from-home job earning ₹8,000 per day. No interview required. Pay a refundable registration fee today to confirm your position.",

  payment:
    "Your parcel is on hold. Pay a small delivery fee immediately using this link to release your package. Failure to pay today will cancel delivery."
};


function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn("Storage unavailable.", error);
  }
}

function read(key, fallback = "") {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function getHistory() {
  try {
    const items = JSON.parse(read(STORE.history, "[]"));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  store(STORE.history, JSON.stringify(items.slice(0, 150)));
}

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    el.toast.classList.remove("show");
  }, 2800);
}

function downloadBlob(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      toast("Copied to clipboard.");
      return;
    }

    throw new Error("Clipboard API unavailable");
  } catch {
    const area = document.createElement("textarea");

    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";

    document.body.append(area);
    area.select();

    let copied = false;

    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }

    area.remove();

    toast(
      copied
        ? "Copied to clipboard."
        : "Copy failed. Please copy the report manually."
    );
  }
}

function applySize(size, save = true) {
  const allowedSizes = ["14px", "16px", "18px", "20px"];
  const chosen = allowedSizes.includes(size) ? size : "16px";

  document.documentElement.style.setProperty(
    "--base-font-size",
    chosen
  );

  el.size.value = chosen;

  if (save) {
    store(STORE.size, chosen);
  }
}

function applyTheme(theme, save = true) {
  const dark = theme === "dark";

  document.body.classList.toggle("dark-mode", dark);

  el.themeIcon.textContent = dark ? "☀" : "☾";
  el.themeLabel.textContent = dark ? "Light mode" : "Dark mode";
  el.themeSelect.value = dark ? "dark" : "light";

  if (save) {
    store(STORE.theme, dark ? "dark" : "light");
  }
}

el.themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark-mode")
    ? "light"
    : "dark";

  applyTheme(nextTheme);
});

el.themeSelect.addEventListener("change", (event) => {
  applyTheme(event.target.value);
  el.settingsStatus.textContent = "Theme saved on this device.";
});

el.size.addEventListener("change", (event) => {
  applySize(event.target.value);
  el.settingsStatus.textContent = "Text size saved on this device.";
  toast("Text size updated.");
});

el.reset.addEventListener("click", () => {
  applyTheme("light");
  applySize("16px");

  el.settingsStatus.textContent = "Default preferences restored.";
  toast("Settings reset.");
});


function closeSidebar() {
  el.sidebar.classList.remove("open");
  el.overlay.classList.remove("show");
}

function navigate(page) {
  if (!pageTitles[page]) return;

  $$(".page-section").forEach((section) => {
    section.classList.toggle("active", section.id === page);
  });

  $$(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === page);
  });

  el.breadcrumb.textContent = pageTitles[page];

  history.replaceState(null, "", `#${page}`);

  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".nav-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    navigate(link.dataset.page);
  });
});

$$("[data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    navigate(button.dataset.go);
  });
});

el.menu.addEventListener("click", () => {
  const isOpen = el.sidebar.classList.contains("open");

  if (isOpen) {
    closeSidebar();
  } else {
    el.sidebar.classList.add("open");
    el.overlay.classList.add("show");
  }
});

el.overlay.addEventListener("click", closeSidebar);


function updateCounter(input, output) {
  output.textContent = `${input.value.length} / ${input.maxLength}`;
}

el.message.addEventListener("input", () => {
  updateCounter(el.message, el.char);
  el.formError.textContent = "";
});

el.scannerMessage.addEventListener("input", () => {
  updateCounter(el.scannerMessage, el.scannerChar);
  el.scannerError.textContent = "";
});


function analyzeMessage(message) {
  const text = message.toLowerCase();
  const findings = [];
  let score = 0;

  function add(condition, points, title, description) {
    if (condition) {
      score += points;
      findings.push({ title, description, points });
    }
  }

  add(
    /\b(urgent|immediately|act now|limited time|within \d+ hours?|last warning|final notice|right now|today only|don't delay)\b/i.test(text),
    17,
    "Urgent or pressuring language",
    "The message pressures you to act quickly instead of giving you time to verify the claim."
  );

  add(
    /\b(otp|one.time password|verification code|pin number|security code|password)\b/i.test(text) &&
    /\b(share|send|tell|provide|enter|reply|confirm|give me|verify)\b/i.test(text),
    28,
    "Possible request for sensitive credentials",
    "Never share an OTP, PIN, or password with someone who contacts you unexpectedly."
  );

  add(
    /\b(bank account|account suspended|account blocked|kyc|debit card|credit card|upi|bank details)\b/i.test(text) &&
    /\b(update|verify|suspend|block|expire|confirm|click|reactivate|unlock)\b/i.test(text),
    20,
    "Financial account pressure",
    "Verify financial-account messages using your bank's official app or independently found contact details."
  );

  add(
    /\b(winner|won a prize|lottery|jackpot|claim your reward|lucky draw|free gift|cash prize)\b/i.test(text),
    18,
    "Unexpected prize or reward",
    "Unexpected prizes can be used to collect personal information or demand fees."
  );

  add(
    /\b(registration fee|processing fee|pay .* fee|advance payment|refundable fee|security deposit|pay to get a job|joining fee|delivery fee)\b/i.test(text),
    24,
    "Upfront payment request",
    "Verify the organization and the reason for payment before transferring money."
  );

  add(
    /\b(guaranteed profit|double your money|risk.free investment|100% return|easy money|earn ₹?\s*\d+.*day|earn \$?\s*\d+.*day)\b/i.test(text),
    20,
    "Unrealistic financial promise",
    "Guaranteed or unusually high earnings are a warning sign. Research the offer before investing."
  );

  add(
    /\b(remote job|work from home|hiring immediately|no interview|selected for the job|job offer|earn per day|salary per day)\b/i.test(text) &&
    /\b(fee|pay|deposit|registration|guaranteed|no interview|immediately)\b/i.test(text),
    17,
    "Job offer needs verification",
    "Verify the employer, job description, and payment requirements through official channels."
  );

  add(
    /\b(click here|click the link|open this link|verify your account|login here|confirm your account|tap here)\b/i.test(text),
    12,
    "Encourages link interaction",
    "Avoid unexpected links. Visit the official website by typing its address yourself."
  );

  const urls = text.match(/\b(?:https?:\/\/|www\.)[^\s<>"']+/gi) || [];

  add(
    urls.length > 0,
    10,
    "Contains a web link",
    "A link is not proof of fraud, but unexpected links should be checked carefully."
  );

  add(
    /\b(send money|transfer money|payment required|pay immediately|wallet address|gift card|crypto investment)\b/i.test(text),
    20,
    "Money transfer or payment language",
    "Independently confirm the recipient and purpose before making a payment."
  );

  add(
    /\b(share your aadhaar|send your pan|identity proof|personal details|bank details|card number)\b/i.test(text),
    18,
    "Request for personal information",
    "Confirm why sensitive information is needed and who is requesting it."
  );

  add(
    /\b(police case|arrest warrant|legal action|account will be blocked|sim will be blocked|electricity disconnected)\b/i.test(text),
    18,
    "Threat of penalties or disconnection",
    "Threatening language may be used to create panic. Contact the relevant organization independently."
  );

  add(
    /!{3,}/.test(message),
    4,
    "Excessive exclamation marks",
    "This is only a weak signal; punctuation alone does not establish fraud."
  );

  score = Math.min(100, score);

  const level = score >= 60 ? "high" : score >= 30 ? "medium" : "low";

  const descriptions = {
    high: {
      title: "High-risk warning signs",
      summary:
        "Several common warning signs were found. Do not click links, share sensitive information, or send money before verifying the message.",
      recommendation:
        "Pause. Do not reply or use links in the message. Contact the claimed organization through its official app, website, or a trusted phone number. If you already paid or shared financial information, contact your bank promptly.",
      status: "Extra caution is strongly recommended."
    },

    medium: {
      title: "Suspicious patterns detected",
      summary:
        "Some warning signs were found. Verify the message independently before acting on it.",
      recommendation:
        "Check the sender and verify the claim using an official source. Never share OTPs, passwords, PINs, or payment details. Be cautious with links.",
      status: "Verify before taking action."
    },

    low: {
      title: "Fewer warning signs detected",
      summary:
        "This message contains fewer of the patterns checked. That does not prove it is genuine.",
      recommendation:
        "Verify requests for money or personal information independently. Check the sender and website address before responding or opening links.",
      status: "Stay cautious even when the score is low."
    }
  };

  if (!findings.length) {
    findings.push({
      title: "No common warning patterns matched",
      description:
        "This checker did not find the patterns it looks for. New or convincing scams may not trigger these checks.",
      points: 0
    });
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "message",
    message,
    score,
    level,
    ...descriptions[level],
    findings,
    timestamp: new Date().toISOString()
  };
}


function addFindingList(target, findings) {
  target.replaceChildren();

  findings.forEach((finding) => {
    const item = document.createElement("li");
    const icon = document.createElement("span");
    const content = document.createElement("div");
    const title = document.createElement("strong");
    const description = document.createElement("p");

    icon.className = "finding-check";
    icon.textContent = finding.points === 0 ? "✓" : "⚠";

    title.textContent = finding.title;
    description.textContent = finding.description;
    description.style.cssText =
      "margin:5px 0 0;color:var(--muted);font-size:.82rem";

    content.append(title, description);
    item.append(icon, content);

    if (finding.points === 0) {
      item.classList.add("no-findings");
    }

    target.append(item);
  });
}

function renderBreakdown(findings) {
  el.breakdown.replaceChildren();

  const contributing = findings.filter((finding) => finding.points > 0);

  if (!contributing.length) {
    const message = document.createElement("p");
    message.className = "muted";
    message.textContent =
      "No scored warning signs were detected by the current rules.";

    el.breakdown.append(message);
    return;
  }

  contributing.forEach((finding) => {
    const row = document.createElement("div");
    const label = document.createElement("span");
    const track = document.createElement("div");
    const fill = document.createElement("div");
    const points = document.createElement("strong");

    row.className = "breakdown-row";
    track.className = "breakdown-track";
    fill.className = "breakdown-fill";

    label.textContent = finding.title;
    fill.style.width = `${Math.min(100, finding.points / 28 * 100)}%`;
    points.textContent = `+${finding.points}`;

    track.append(fill);
    row.append(label, track, points);
    el.breakdown.append(row);
  });
}

function renderResults(result) {
  currentResult = result;
  el.results.hidden = false;

  el.riskScore.textContent = result.score;
  el.riskTitle.textContent = result.title;
  el.riskSummary.textContent = result.summary;
  el.resultStatus.textContent = result.status;
  el.recommendation.textContent = result.recommendation;

  el.riskPill.className = `risk-pill ${result.level}`;

  el.riskPill.textContent = {
    high: "High risk",
    medium: "Medium risk",
    low: "Lower risk"
  }[result.level];

  const color = {
    high: "danger",
    medium: "warning",
    low: "success"
  }[result.level];

  el.scoreRing.style.background =
    `conic-gradient(var(--${color}) ${result.score}%, var(--border) ${result.score}%)`;

  el.meter.style.width = `${result.score}%`;
  el.meter.className = `meter-fill ${result.level}`;

  el.findingCount.textContent =
    `${result.findings.length} ${result.findings.length === 1 ? "finding" : "findings"}`;

  addFindingList(el.findings, result.findings);
  renderBreakdown(result.findings);
}

function submitMessage(message, errorElement) {
  const clean = message.trim();

  if (!clean) {
    errorElement.textContent = "Please enter a message before scanning.";
    return false;
  }

  if (clean.length < 5) {
    errorElement.textContent = "Please enter a little more text to analyze.";
    return false;
  }

  errorElement.textContent = "";

  const result = analyzeMessage(clean);
  const items = getHistory();

  items.unshift(result);
  saveHistory(items);

  renderResults(result);
  renderHistory();
  updateStats();
  navigate("dashboard");

  setTimeout(() => {
    el.results.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);

  toast("Message analysis completed.");
  return true;
}

el.scanForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitMessage(el.message.value, el.formError);
});

el.scannerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const success = submitMessage(
    el.scannerMessage.value,
    el.scannerError
  );

  if (success) {
    el.message.value = el.scannerMessage.value;
    updateCounter(el.message, el.char);
  }
});

$$("[data-sample]").forEach((button) => {
  button.addEventListener("click", () => {
    el.message.value = samples[button.dataset.sample] || "";

    updateCounter(el.message, el.char);
    el.formError.textContent = "";

    navigate("dashboard");
    el.message.focus();
    el.message.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function preview(value, length = 85) {
  const text = (value || "").replace(/\s+/g, " ").trim();

  return text.length > length
    ? `${text.slice(0, length)}…`
    : text;
}

function emptyState(iconText, titleText, descriptionText) {
  const box = document.createElement("div");
  const icon = document.createElement("span");
  const title = document.createElement("h3");
  const description = document.createElement("p");

  box.className = "empty-state";
  icon.className = "empty-icon";

  icon.textContent = iconText;
  title.textContent = titleText;
  description.textContent = descriptionText;

  box.append(icon, title, description);

  return box;
}

function historyItem(result, showDelete = false) {
  const article = document.createElement("article");
  const badge = document.createElement("div");
  const info = document.createElement("div");
  const title = document.createElement("h3");
  const previewText = document.createElement("p");
  const meta = document.createElement("div");
  const date = document.createElement("span");
  const risk = document.createElement("span");
  const score = document.createElement("strong");

  article.className = "history-item";
  badge.className = `history-indicator ${result.level}`;
  info.className = "history-info";
  meta.className = "history-meta";
  score.className = "history-score";

  badge.textContent = {
    high: "⚠",
    medium: "!",
    low: "✓"
  }[result.level];

  title.textContent = result.type === "url"
    ? `URL scan: ${result.title}`
    : result.title;

  previewText.textContent = preview(
    result.message || result.url || "No preview"
  );

  date.textContent = formatDate(result.timestamp);

  risk.textContent = {
    high: "High risk",
    medium: "Medium risk",
    low: "Lower risk"
  }[result.level];

  score.textContent = `${result.score}/100`;

  meta.append(date, risk);
  info.append(title, previewText, meta);
  article.append(badge, info, score);

  if (showDelete) {
    const removeButton = document.createElement("button");

    removeButton.className = "delete-scan";
    removeButton.type = "button";
    removeButton.textContent = "Remove";

    removeButton.addEventListener("click", () => {
      const remaining = getHistory().filter(
        (item) => item.id !== result.id
      );

      saveHistory(remaining);
      renderHistory();
      updateStats();

      toast("Scan removed.");
    });

    article.append(removeButton);
  }

  return article;
}

function renderHistory() {
  const all = getHistory();

  el.history.replaceChildren();
  el.fullHistory.replaceChildren();

  const query = (el.historySearch.value || "").trim().toLowerCase();
  const filter = el.historyFilter.value;

  const filtered = all.filter((item) => {
    const matchesRisk = filter === "all" || item.level === filter;

    const searchableText = [
      item.message || "",
      item.url || "",
      item.title || ""
    ].join(" ").toLowerCase();

    return matchesRisk && searchableText.includes(query);
  });

  el.historyCount.textContent = `${filtered.length} of ${all.length} scans`;

  if (!all.length) {
    el.history.append(
      emptyState("⌕", "No scans yet", "Your recent results will appear here.")
    );

    el.fullHistory.append(
      emptyState(
        "◷",
        "No scan history",
        "Messages and URLs you analyze will appear here."
      )
    );

    return;
  }

  all.slice(0, 5).forEach((item) => {
    el.history.append(historyItem(item));
  });

  if (!filtered.length) {
    el.fullHistory.append(
      emptyState(
        "⌕",
        "No matching scans",
        "Try a different search or filter."
      )
    );

    return;
  }

  filtered.forEach((item) => {
    el.fullHistory.append(historyItem(item, true));
  });
}

function updateStats() {
  const items = getHistory();

  el.total.textContent = items.length;
  el.high.textContent = items.filter((item) => item.level === "high").length;
  el.low.textContent = items.filter((item) => item.level === "low").length;
}

el.historySearch.addEventListener("input", renderHistory);
el.historyFilter.addEventListener("change", renderHistory);

$("#clearHistoryButton").addEventListener("click", () => {
  if (!getHistory().length) {
    toast("History is already empty.");
    return;
  }

  if (!confirm("Delete all scan history saved on this device?")) {
    return;
  }

  saveHistory([]);
  renderHistory();
  updateStats();

  toast("Scan history cleared.");
});


function reportText(result) {
  return [
    `ScamShield ${result.type === "url" ? "URL" : "Message"} Scan Report`,
    `Date: ${formatDate(result.timestamp)}`,
    `Risk score: ${result.score}/100`,
    `Risk level: ${result.level}`,
    `Result: ${result.title}`,
    `${result.type === "url" ? "URL" : "Message"}: ${result.url || result.message}`,
    `Summary: ${result.summary}`,
    "Warning signs:",
    ...result.findings.map(
      (finding) =>
        `- ${finding.title} (+${finding.points}): ${finding.description}`
    ),
    `Recommendation: ${result.recommendation}`,
    "",
    "Note: This is a rule-based heuristic, not a verified probability or a guarantee of safety."
  ].join("\n");
}

$("#copyReportButton").addEventListener("click", () => {
  if (currentResult) {
    copyText(reportText(currentResult));
  }
});

$("#downloadReportButton").addEventListener("click", () => {
  if (currentResult) {
    downloadBlob("scamshield-report.txt", reportText(currentResult));
    toast("Report downloaded.");
  }
});

$("#speakButton").addEventListener("click", () => {
  if (!currentResult) {
    toast("Scan a message first.");
    return;
  }

  if (!("speechSynthesis" in window)) {
    toast("Speech is not supported in this browser.");
    return;
  }

  speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(
    `${currentResult.title}. Risk score ${currentResult.score} out of 100. ${currentResult.summary} ${currentResult.recommendation}`
  );

  speech.lang = "en-IN";
  speech.rate = 0.92;

  speechSynthesis.speak(speech);
});

$("#clearButton").addEventListener("click", () => {
  el.results.hidden = true;
  currentResult = null;
  toast("Results cleared.");
});

function analyzeUrl(raw) {
  let normalized = raw.trim();

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  let parsed;

  try {
    parsed = new URL(normalized);
  } catch {
    return {
      error: "Enter a valid web address, such as example.com or https://example.com."
    };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return {
      error: "Only HTTP and HTTPS web addresses can be checked."
    };
  }

  const host = parsed.hostname.toLowerCase();

  if (!host || !host.includes(".")) {
    return {
      error: "Enter a complete website address, including a domain extension."
    };
  }

  const findings = [];
  let score = 0;

  function add(condition, points, title, description) {
    if (condition) {
      score += points;
      findings.push({ title, points, description });
    }
  }

  add(
    parsed.protocol !== "https:",
    18,
    "No HTTPS encryption",
    "The address uses HTTP. Avoid entering private information on sites without HTTPS. HTTPS alone does not prove a site is trustworthy."
  );

  add(
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host),
    25,
    "Uses an IP address as the host",
    "An unexpected login or payment page hosted at an IP address deserves extra scrutiny."
  );

  add(
    host.split(".").length >= 5,
    12,
    "Unusually long subdomain chain",
    "Nested subdomains can make a destination harder to read. Check the registered domain carefully."
  );

  add(
    /xn--/i.test(host),
    18,
    "Internationalized domain encoding detected",
    "Some lookalike domains use encoded characters. Inspect the domain carefully."
  );

  add(
    /\b(login|verify|account|secure|update|wallet|banking|password|gift|claim|prize|payment)\b/i.test(host),
    10,
    "Sensitive or promotional wording in the domain",
    "These words are sometimes used in deceptive domains. Their presence alone does not prove fraud."
  );

  const shorteners = [
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "is.gd",
    "cutt.ly",
    "rb.gy"
  ];

  add(
    shorteners.includes(host),
    15,
    "URL shortener detected",
    "Short links hide the final destination. Confirm the destination with the sender before opening it."
  );

  add(
    host.length > 45,
    8,
    "Long hostname",
    "A long hostname may be harder to inspect. Check which domain you are actually visiting."
  );

  add(
    parsed.username !== "" || parsed.password !== "",
    25,
    "Credentials embedded in URL",
    "The URL contains user information before the host. Do not open it unless you understand why it is structured this way."
  );

  add(
    /[^\x00-\x7F]/.test(host),
    12,
    "Non-ASCII characters in hostname",
    "Characters from different writing systems can sometimes resemble Latin letters. Check the exact domain carefully."
  );

  add(
    /\.(zip|mov)$/i.test(host),
    5,
    "Domain uses a less familiar extension",
    "An unfamiliar extension is not proof of fraud. Verify the domain and context before proceeding."
  );

  score = Math.min(100, score);

  const level = score >= 50 ? "high" : score >= 25 ? "medium" : "low";

  if (!findings.length) {
    findings.push({
      title: "No common URL warning patterns matched",
      points: 0,
      description:
        "This basic check found no listed warning signs. It does not verify the site's reputation or safety."
    });
  }

  const titles = {
    high: "High-risk URL signals",
    medium: "URL needs careful review",
    low: "Fewer URL warning signs"
  };

  const summaries = {
    high:
      "Several patterns commonly associated with deceptive links were found. Do not open the link or enter information unless you independently verify it.",
    medium:
      "Some URL patterns deserve a closer look. Confirm the exact domain and why the link was sent to you.",
    low:
      "Few listed warning patterns were found. This is not a security verdict; malicious websites can use ordinary-looking URLs."
  };

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "url",
    url: raw,
    score,
    level,
    title: titles[level],
    summary: summaries[level],
    recommendation:
      "Do not enter passwords, OTPs, or payment details from an unexpected link. Navigate to the official website yourself and use a reputable security service if you need a live reputation check.",
    findings,
    timestamp: new Date().toISOString()
  };
}

el.urlForm.addEventListener("submit", (event) => {
  event.preventDefault();
  el.urlError.textContent = "";

  const result = analyzeUrl(el.urlInput.value);

  if (result.error) {
    el.urlError.textContent = result.error;
    return;
  }

  currentUrlReport = result;

  el.urlResults.hidden = false;
  el.urlRiskPill.className = `risk-pill ${result.level}`;

  el.urlRiskPill.textContent = {
    high: "High risk signals",
    medium: "Review carefully",
    low: "Fewer signals"
  }[result.level];

  el.urlScore.textContent = `${result.score}/100`;
  el.urlTitle.textContent = result.title;
  el.urlSummary.textContent = result.summary;
  el.urlRecommendation.textContent = result.recommendation;

  addFindingList(el.urlFindings, result.findings);

  const items = getHistory();
  items.unshift(result);

  saveHistory(items);
  renderHistory();
  updateStats();

  el.urlResults.scrollIntoView({ behavior: "smooth", block: "start" });

  toast("URL analysis completed.");
});

$("#copyUrlReport").addEventListener("click", () => {
  if (currentUrlReport) {
    copyText(reportText(currentUrlReport));
  }
});


$("#exportHistoryButton").addEventListener("click", () => {
  const items = getHistory();

  if (!items.length) {
    toast("There is no history to export.");
    return;
  }

  const quote = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const rows = [
    ["Date", "Type", "Risk level", "Score", "Result", "Scanned content", "Summary"],
    ...items.map((item) => [
      formatDate(item.timestamp),
      item.type || "message",
      item.level,
      item.score,
      item.title,
      item.message || item.url,
      item.summary
    ])
  ];

  const csv = rows
    .map((row) => row.map(quote).join(","))
    .join("\r\n");

  downloadBlob("scamshield-history.csv", csv, "text/csv;charset=utf-8");
  toast("History export prepared.");
});

document.addEventListener("keydown", (event) => {
  const typing = event.target.matches(
    "input, textarea, select, [contenteditable='true']"
  );

  if (typing || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  if (event.key === "/") {
    event.preventDefault();
    navigate("scanner");
    el.scannerMessage.focus();
    return;
  }

  if (event.key.toLowerCase() === "g") {
    shortcutPrefix = true;

    clearTimeout(shortcutTimer);

    shortcutTimer = setTimeout(() => {
      shortcutPrefix = false;
    }, 1000);

    return;
  }

  if (shortcutPrefix) {
    shortcutPrefix = false;

    if (event.key.toLowerCase() === "d") {
      navigate("dashboard");
    }

    if (event.key.toLowerCase() === "h") {
      navigate("history");
    }
  }
});
function init() {
  el.year.textContent = new Date().getFullYear();

  applyTheme(read(STORE.theme, "light"), false);
  applySize(read(STORE.size, "16px"), false);

  renderHistory();
  updateStats();

  updateCounter(el.message, el.char);
  updateCounter(el.scannerMessage, el.scannerChar);

  const requestedPage = location.hash.slice(1);

  navigate(
    pageTitles[requestedPage]
      ? requestedPage
      : "dashboard"
  );
}

init();