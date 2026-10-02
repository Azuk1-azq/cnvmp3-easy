const CNV_URL = "https://cnvmp3.com/"; // 変わった場合は rules.json / manifest.json も修正
let job = null;
let frame = null;
let frameReady = false;

function getVideoUrl() {
  const v = new URLSearchParams(location.search).get("v");
  if (location.pathname === "/watch" && v) return `https://www.youtube.com/watch?v=${v}`;
  const s = location.pathname.match(/^\/shorts\/([\w-]+)/);
  // Shortsは通常の動画URLに変換（cnvmp3が確実に受け付ける形式）
  return s ? `https://www.youtube.com/watch?v=${s[1]}` : null;
}

// ---------- 裏で動くcnvmp3（事前読み込み） ----------
function warm() {
  if (frame) return;
  const wrap = document.createElement("div");
  wrap.id = "cnv-frame-wrap"; // 通常は画面外・透明。「確認」リンクで表示
  frame = document.createElement("iframe");
  frame.src = CNV_URL + "#warm";
  wrap.appendChild(frame);
  document.body.appendChild(wrap);
  frameReady = false;
}

function resetFrame() {
  document.getElementById("cnv-frame-wrap")?.remove();
  frame = null;
  frameReady = false;
  setTimeout(warm, 800); // 次回のために新しく読み込んでおく
}

function sendStart() {
  if (!job || job.sent || !frameReady) return;
  job.sent = true;
  setText("starting");
  frame.contentWindow.postMessage(
    { source: "cnvmp3-ext-cmd", type: "start", yt: job.url, fmt: job.fmt, q: job.q },
    "*"
  );
}

// ---------- 独自UI ----------
function beep() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.14;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.start(t);
      o.stop(t + 0.25);
    });
  } catch (_) {}
}

function progressNow() {
  if (!job.convStart) return job.p;
  const base = Math.min(1, (Date.now() - job.convStart) / job.T);
  const eased = 1 - Math.pow(1 - base, 1.7); // 序盤は速く、終盤はゆっくり
  const jitter = base < 1 ? (Math.random() - 0.5) * 0.03 : 0;
  return Math.max(job.p, Math.min(100, (eased + jitter) * 100)); // 後戻りしない
}

function render() {
  const toast = document.getElementById("cnv-toast");
  if (!toast || !job) return;
  if (job.kind === "work") job.p = progressNow();
  else if (job.kind === "ok") job.p = 100;
  toast.style.setProperty("--p", job.p.toFixed(1) + "%");
  let text;
  if (job.kind === "work") {
    text = tr(job.key);
    if (job.key === "converting" && job.convStart) {
      text = job.p >= 100 ? tr("finishing") : tr("convertingPct", Math.floor(job.p));
    }
  } else {
    text = job.text;
  }
  toast.querySelector(".cnv-status").textContent = text;
}

function setText(key) {
  if (!job) return;
  job.key = key;
  render();
}

function finish(kind, title, text, downloadId) {
  if (!job || job.kind !== "work") return;
  clearInterval(job.timer);
  clearTimeout(job.doneTimer);
  job.kind = kind;
  job.text = text;
  const toast = document.getElementById("cnv-toast");
  toast.dataset.kind = kind;
  toast.querySelector(".cnv-title").textContent = title;
  if (kind === "ok") {
    if (settings.sound) beep();
    if (downloadId != null) {
      const a = toast.querySelector(".cnv-folder");
      a.hidden = false;
      a.onclick = (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: "show", id: downloadId });
      };
    }
    if (settings.autoCloseSec > 0) setTimeout(() => job?.kind === "ok" && endJob(), settings.autoCloseSec * 1000);
  }
  render();
  resetFrame();
}

function endJob() {
  if (!job) return;
  clearInterval(job.timer);
  const wasWorking = job.kind === "work" && job.sent;
  document.getElementById("cnv-toast")?.remove();
  job = null;
  if (wasWorking) resetFrame();
}

function buildToast(fmt, q) {
  const toast = document.createElement("div");
  toast.id = "cnv-toast";
  toast.dataset.kind = "work";
  toast.innerHTML = `
    <div class="cnv-row">
      <b class="cnv-title"></b>
      <span class="cnv-hbtns"><button class="cnv-gear" title="${tr("settingsTip")}"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg></button><button class="cnv-close" title="${tr("closeTip")}"><svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button></span>
    </div>
    <div class="cnv-status">${tr("preparing")}</div>
    <div class="cnv-bar"></div>
    <a class="cnv-folder" href="#" hidden>${tr("showFolder")}</a>
    <a class="cnv-show" href="#" hidden>${tr("toggleScreen")}</a>
    <a class="cnv-coffee" href="https://ko-fi.com/cnvmp3" target="_blank" rel="noopener noreferrer">${tr("support")}</a>`;
  toast.querySelector(".cnv-title").textContent = tr("convertTo", fmt.toUpperCase(), qLabel(fmt, q));
  toast.querySelector(".cnv-close").addEventListener("click", endJob);
  toast.querySelector(".cnv-gear").addEventListener("click", () => chrome.runtime.sendMessage({ type: "options" }));
  toast.querySelector(".cnv-show").hidden = !settings.showCnvScreen;
  toast.querySelector(".cnv-show").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("cnv-frame-wrap")?.classList.toggle("cnv-visible");
  });
  document.body.appendChild(toast);
}

// ---------- ジョブ開始 ----------
function startJob(fmt) {
  const url = getVideoUrl();
  if (!url) return;
  endJob();
  const q = effectiveQ(fmt);
  buildToast(fmt, q);
  warm();
  job = { p: 0, convStart: null, T: 13000 + Math.random() * 1000, fmt, q, url, kind: "work", key: "preparing", text: "", started: Date.now(), sent: false };
  job.timer = setInterval(() => {
    if (Date.now() - job.started > 180000) {
      finish("err", tr("noResponse"), tr("timeoutMsg"));
    } else render();
  }, 200);
  render();
  applyScreenVisibility();
  delete temp[fmt]; // 「その時のみ」: 使ったら元の設定に戻す
  refreshSelects();
  sendStart(); // すでに準備できていれば即開始
}

// ---------- iframe / 背景スクリプトからの通知 ----------
window.addEventListener("message", (e) => {
  let host = "";
  try { host = new URL(e.origin).hostname; } catch (_) { return; }
  if (!/(^|\.)cnvmp3\.com$/.test(host)) return;
  const d = e.data;
  if (!d || d.source !== "cnvmp3-ext") return;
  if (d.type === "ready") { frameReady = true; sendStart(); return; }
  if (!job || job.kind !== "work") return;
  switch (d.type) {
    case "qng":       job.qnote = true; render(); break;
    case "submitted": job.convStart = Date.now(); setText("converting"); break;
    case "done":
      // 変換成功（AGAIN表示）。保存の検知を少し待ち、来なければ変換完了として表示
      job.p = Math.max(job.p, 98);
      setText("convertedSaving");
      job.doneTimer = setTimeout(
        () => finish("ok", tr("convertedTitle"), ""),
        4000
      );
      break;
    case "progress":  break; // 進捗は独自バーで表示
    case "error":     finish("err", tr("failedTitle"), d.detail); break;
    case "notfound":  finish("err", tr("failedTitle"), tr("nf_" + d.detail) + tr("checkHint")); break;
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (!job || job.kind !== "work" || msg.source !== "cnvmp3-ext-bg") return;
  if (msg.type === "dl-start") {
    clearTimeout(job.doneTimer);
    job.p = Math.max(job.p, 95);
    setText("downloading");
  }
  if (msg.type === "dl-done") finish("ok", tr("savedTitle"), msg.filename || tr("savedToFolder"), msg.id);
  if (msg.type === "dl-error") finish("err", tr("failedTitle"), tr("dlFailed"));
});

// ---------- ボタン（高評価などが並ぶ場所に配置） ----------
const SVG_NS = "http://www.w3.org/2000/svg";
const ICONS = {
  mp3: "M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z",
  mp4: "M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z",
};

function makeIcon(fmt, size) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("focusable", "false");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", ICONS[fmt]);
  path.setAttribute("fill", "currentColor");
  svg.appendChild(path);
  return svg;
}

function bind(el, fmt) {
  el.addEventListener("mouseenter", warm); // マウスを乗せた時点で裏で読み込み開始
  el.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    startJob(fmt);
  });
}

const QUALITY = {
  mp3: [["64","64kbps"],["96","96kbps"],["128","128kbps"],["192","192kbps"],["256","256kbps"],["320","320kbps"]],
  mp4: [["360","360p"],["480","480p"],["720","720p"],["1080","1080p"]],
};
const quality = { mp3: "192", mp4: "1080" }; // 既定値（設定ページで変更）
const qLabel = (fmt, q) => (QUALITY[fmt].find((o) => o[0] === q) || [q, q])[1];
try {
  chrome.storage.local.get("cnvQ", (r) => {
    Object.assign(quality, (r && r.cnvQ) || {});
    refreshSelects();
  });
} catch (_) {}

// ---------- 拡張機能の設定（アイコンから開く設定ページで変更） ----------
const settings = { showCnvScreen: false, sound: true, autoCloseSec: 30, showQualityMenu: true };
function applyScreenVisibility() {
  document.getElementById("cnv-frame-wrap")?.classList.toggle("cnv-visible", !!(settings.showCnvScreen && job));
}
function applyLangSetting() {
  LANG = settings.lang || defaultLang();
}
function syncUi() {
  applyLangSetting();
  document.querySelectorAll(".cnv-pill[data-fmt], .cnv-round[data-fmt]").forEach((b) => (b.title = tr("saveAs", b.dataset.fmt.toUpperCase())));
  refreshSelects();
  applyQualityMenu();
  const link = document.querySelector("#cnv-toast .cnv-show");
  if (link) link.hidden = !settings.showCnvScreen;
  applyScreenVisibility();
}
try {
  chrome.storage.local.get("cnvSettings", (r) => { Object.assign(settings, (r && r.cnvSettings) || {}); syncUi(); });
  chrome.storage.onChanged.addListener((ch) => {
    if (ch.cnvSettings) Object.assign(settings, ch.cnvSettings.newValue || {});
    if (ch.cnvQ) Object.assign(quality, ch.cnvQ.newValue || {});
    syncUi();
  });
} catch (_) {}

// YouTube上のプルダウンは「その1回だけ」有効（保存しない）。いつもの設定は設定ページで変える
const temp = {};
const effectiveQ = (fmt) => temp[fmt] || quality[fmt];
function refreshSelects() {
  document.querySelectorAll(".cnv-q").forEach((sel) => {
    const fmt = sel.dataset.fmt;
    sel.value = effectiveQ(fmt);
    sel.classList.toggle("cnv-temp", !!temp[fmt]);
    sel.title = tr("qTip", tr(fmt === "mp3" ? "audioQ" : "videoQ"));
  });
}
// 「今回だけ変更」メニューの表示/非表示（設定でオフにすると隠して、いつもの設定を使う）
function applyQualityMenu() {
  const on = settings.showQualityMenu !== false;
  if (!on) for (const k of Object.keys(temp)) delete temp[k];
  document.querySelectorAll(".cnv-q").forEach((sel) => (sel.hidden = !on));
  refreshSelects();
}
function resetTemp() {
  for (const k of Object.keys(temp)) delete temp[k];
  refreshSelects();
}

function makeSelect(fmt) {
  const sel = document.createElement("select");
  sel.className = "cnv-q";
  sel.dataset.fmt = fmt;
  for (const [v, label] of QUALITY[fmt]) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = label;
    sel.appendChild(o);
  }
  sel.value = effectiveQ(fmt);
  sel.title = tr("qTip", tr(fmt === "mp3" ? "audioQ" : "videoQ"));
  sel.classList.toggle("cnv-temp", !!temp[fmt]);
  sel.hidden = settings.showQualityMenu === false;
  sel.addEventListener("change", () => {
    if (sel.value === quality[fmt]) delete temp[fmt];
    else temp[fmt] = sel.value;
    refreshSelects();
  });
  sel.addEventListener("click", (e) => e.stopPropagation());
  return sel;
}

function makeGroup(mode) {
  const g = document.createElement("div");
  g.id = "cnv-actions";
  g.className = `cnv-${mode}`;
  g.dataset.mode = mode;
  for (const fmt of ["mp3", "mp4"]) {
    const label = fmt.toUpperCase();
    if (mode === "shorts") {
      const item = document.createElement("div");
      item.className = "cnv-short-item";
      const b = document.createElement("button");
      b.className = "cnv-round";
      b.type = "button";
      b.title = tr("saveAs", label);
      b.dataset.fmt = fmt;
      b.appendChild(makeIcon(fmt, 24));
      const t = document.createElement("span");
      t.className = "cnv-label";
      t.textContent = label;
      bind(b, fmt);
      bind(t, fmt);
      item.append(b, t, makeSelect(fmt));
      g.appendChild(item);
    } else {
      const combo = document.createElement("div");
      combo.className = "cnv-combo";
      const b = document.createElement("button");
      b.className = "cnv-pill";
      b.type = "button";
      b.title = tr("saveAs", label);
      b.dataset.fmt = fmt;
      const t = document.createElement("span");
      t.textContent = label;
      b.append(makeIcon(fmt, 20), t);
      bind(b, fmt);
      combo.append(b, makeSelect(fmt));
      g.appendChild(combo);
    }
  }
  return g;
}

// ---------- ダーク/ライトの判定（YouTubeの変数に頼らない） ----------
function detectTheme() {
  const html = document.documentElement;
  let dark = html.hasAttribute("dark");
  if (!dark) {
    const el = document.querySelector("ytd-app") || document.body;
    const m = (getComputedStyle(el).backgroundColor.match(/[\d.]+/g) || []).map(Number);
    if (m.length >= 3 && (m[3] === undefined || m[3] > 0)) {
      dark = 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2] < 128;
    } else {
      dark = matchMedia("(prefers-color-scheme: dark)").matches;
    }
  }
  const v = dark ? "dark" : "light";
  if (html.dataset.cnvTheme !== v) html.dataset.cnvTheme = v;
}
detectTheme();
new MutationObserver(detectTheme).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["dark", "class", "style"],
});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", detectTheme);
setInterval(detectTheme, 2000);

// Shortsの縦ボタン列（高評価・低評価・コメント・共有…）を探す
function findShortsActionColumn() {
  const reels = [...document.querySelectorAll("ytd-reel-video-renderer")];
  const inView = (r) => {
    const b = r.getBoundingClientRect();
    return b.top < innerHeight * 0.6 && b.bottom > innerHeight * 0.4;
  };
  const scope = reels.find((r) => r.hasAttribute("is-active")) || reels.find(inView) || document;

  // 高評価ボタン本体を探す（タグ名 → aria-label の順）
  const like =
    scope.querySelector("like-button-view-model, ytd-like-button-renderer, #like-button") ||
    scope.querySelector("[aria-label*='like' i], [aria-label*='高評価']");
  if (!like) return null;

  // 高評価から上に辿り、子要素が3つ以上ある最初の親 = ボタン列
  let el = like;
  while (el.parentElement && el.parentElement !== scope && el.parentElement !== document.body) {
    if (el.parentElement.children.length >= 3) return el.parentElement;
    el = el.parentElement;
  }
  return null;
}

function ensureButtons() {
  const groups = [...document.querySelectorAll("#cnv-actions")];
  const onWatch = location.pathname === "/watch";
  const onShorts = location.pathname.startsWith("/shorts/");
  if (!onWatch && !onShorts) { groups.forEach((g) => g.remove()); return; }

  let host, mode;
  if (onWatch) {
    // 高評価・共有ボタンが並ぶ行
    host = document.querySelector("ytd-watch-metadata #top-level-buttons-computed");
    mode = "inline";
    if (!host) return; // まだ描画されていない
  } else {
    // Shortsの縦ボタン列（高評価・コメント・共有…）。見つからなければ動画の左上に浮かせる
    host = findShortsActionColumn();
    mode = host ? "shorts" : "float";
    if (!host) host = document.body;
  }

  if (groups.length === 1 && groups[0].dataset.mode === mode && host.contains(groups[0])) return;
  groups.forEach((g) => g.remove());
  const g = makeGroup(mode);

  if (mode === "inline") {
    const like = host.querySelector(
      "segmented-like-dislike-button-view-model, ytd-segmented-like-dislike-button-renderer"
    );
    like ? like.after(g) : host.prepend(g); // 高評価ボタンのすぐ右
  } else if (mode === "shorts") {
    host.prepend(g); // 高評価・コメントなどの列の一番上
  } else {
    host.appendChild(g);
  }
}

// フォールバック用: 表示中のショート動画の左上にボタンを追従させる
function positionFloat() {
  const g = document.getElementById("cnv-actions");
  if (!g || g.dataset.mode !== "float") return;
  const el =
    document.querySelector("ytd-reel-video-renderer[is-active] video") ||
    document.querySelector("ytd-reel-video-renderer[is-active] #player-container") ||
    document.querySelector("ytd-reel-video-renderer[is-active]");
  const r = el && el.getBoundingClientRect();
  if (r && r.width > 0 && r.height > 0) {
    g.style.left = `${Math.max(8, r.left + 12)}px`;
    g.style.top = `${Math.max(8, r.top + 12)}px`;
    g.style.bottom = "auto";
  }
}
setInterval(positionFloat, 400);

document.addEventListener("yt-navigate-finish", () => {
  resetTemp();
  endJob();
  ensureButtons();
  positionFloat();
});
new MutationObserver(ensureButtons).observe(document.body, { childList: true, subtree: true });
ensureButtons();

// ---------- アップデート通知（設定が「YouTubeとポップアップに通知」の時だけ表示） ----------
function syncUpdateBanner() {
  try {
    chrome.storage.local.get(["cnvSettings", "cnvUpdate", "cnvUpdateDismissed"], (r) => {
      const s = (r && r.cnvSettings) || {}, u = (r && r.cnvUpdate) || {};
      LANG = s.lang || defaultLang();
      document.getElementById("cnv-update")?.remove();
      if ((s.updateMode || "notify") !== "notify" || !u.has || r.cnvUpdateDismissed === u.latest) return;
      const box = document.createElement("div");
      box.id = "cnv-update";
      const row = document.createElement("div");
      row.className = "cnv-row";
      const title = document.createElement("div");
      title.className = "cnv-title";
      title.textContent = tr("updTitle", u.latest);
      const close = document.createElement("button");
      close.className = "cnv-close";
      close.title = tr("closeTip");
      close.textContent = "✕";
      close.addEventListener("click", () => chrome.storage.local.set({ cnvUpdateDismissed: u.latest }));
      row.append(title, close);
      const st = document.createElement("div");
      st.className = "cnv-status";
      st.textContent = u.downloaded ? tr("updDone") : tr("updDesc", chrome.runtime.getManifest().version);
      const dl = document.createElement("button");
      dl.className = "cnv-updbtn";
      dl.textContent = tr("updDownload");
      dl.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "download-update" }, (res) => {
          if (res && res.ok) st.textContent = tr("updDone");
        });
      });
      const fo = document.createElement("button");
      fo.className = "cnv-updbtn";
      fo.style.marginTop = "8px";
      fo.textContent = tr("openFolder");
      fo.addEventListener("click", () => chrome.runtime.sendMessage({ type: "open-folder" }));
      const run = document.createElement("button");
      run.className = "cnv-updbtn";
      run.style.cssText = "background:var(--cnv-accent);color:#fff;margin-bottom:8px";
      run.textContent = tr("updRun");
      run.addEventListener("click", () => chrome.runtime.sendMessage({ type: "open-update" }));
      dl.style.marginBottom = "0";
      box.append(row, st, run, dl, fo);
      document.body.appendChild(box);
    });
  } catch (_) {}
}
try {
  chrome.storage.onChanged.addListener((ch) => {
    if (ch.cnvSettings || ch.cnvUpdate || ch.cnvUpdateDismissed) syncUpdateBanner();
  });
} catch (_) {}
syncUpdateBanner();
