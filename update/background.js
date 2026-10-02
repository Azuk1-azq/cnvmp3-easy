// ダウンロードの開始・完了を検知して、YouTubeタブの独自UIに通知する
const ids = new Set();

function broadcast(msg) {
  chrome.tabs.query({ url: "https://www.youtube.com/*" }, (tabs) => {
    tabs.forEach((t) =>
      chrome.tabs.sendMessage(t.id, { source: "cnvmp3-ext-bg", ...msg }).catch(() => {})
    );
  });
}

chrome.downloads.onCreated.addListener((item) => {
  if ((item.url || "").includes("/cnvmp3-easy/")) return; // 更新ZIPのダウンロードはYouTubeの表示対象外
  ids.add(item.id);
  broadcast({ type: "dl-start", id: item.id });
});

chrome.downloads.onChanged.addListener((delta) => {
  if (!ids.has(delta.id) || !delta.state) return;
  const state = delta.state.current;
  if (state === "complete") {
    chrome.downloads.search({ id: delta.id }, ([item]) => {
      broadcast({
        type: "dl-done",
        id: delta.id,
        filename: item?.filename?.split(/[\\/]/).pop() || "",
      });
    });
    ids.delete(delta.id);
  } else if (state === "interrupted") {
    broadcast({ type: "dl-error", id: delta.id });
    ids.delete(delta.id);
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "show") chrome.downloads.show(msg.id);
  if (msg.type === "options") chrome.runtime.openOptionsPage();
});

// インストール直後に、最初の設定ページ（言語選択など）を開く
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
});

// ---------- アップデート確認 ----------
// GitHubの update/manifest.json のバージョンと、いまのバージョンを比べる
const UPDATE_URL = "https://raw.githubusercontent.com/Azuk1-azq/cnvmp3-easy/main/update/manifest.json";
const ZIP_URL = "https://github.com/Azuk1-azq/cnvmp3-easy/raw/refs/heads/main/CNVMP3BUTTON.zip";

function vcmp(a, b) {
  const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

async function downloadZip(u) {
  await chrome.downloads.download({ url: u.zip, filename: `CNVMP3BUTTON-${u.latest}.zip`, conflictAction: "uniquify" });
}

async function checkUpdate() {
  const cur = chrome.runtime.getManifest().version;
  let info;
  try {
    const res = await fetch(UPDATE_URL + "?t=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error("http " + res.status);
    info = await res.json();
  } catch (e) {
    return { error: true, detail: String((e && e.message) || e) };
  }
  const latest = String(info.version || "");
  if (!/^\d+(\.\d+)*$/.test(latest)) return { error: true, detail: "manifest.json" };
  const store = await chrome.storage.local.get(["cnvUpdate", "cnvSettings"]);
  const prev = store.cnvUpdate || {};
  const zip = ZIP_URL;
  const u = { checkedAt: Date.now(), latest, zip, has: vcmp(latest, cur) > 0, downloaded: prev.downloaded === latest ? latest : "" };
  chrome.action.setBadgeText({ text: u.has ? "!" : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#d93025" });
  if (u.has && (store.cnvSettings || {}).updateMode === "auto" && !u.downloaded) {
    try { await downloadZip(u); u.downloaded = latest; } catch (_) {}
  }
  await chrome.storage.local.set({ cnvUpdate: u });
  return u;
}

chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  if (msg.type === "open-folder") {
    // 手順の案内ページを開く
    chrome.tabs.create({ url: chrome.runtime.getURL("guide.html") });
    return;
  }
  if (msg.type === "open-update") {
    chrome.tabs.create({ url: chrome.runtime.getURL("update.html") });
    return;
  }
  if (msg.type === "open-ext-page") {
    // 拡張機能の詳細ページ（「ソース」のパスをクリックするとフォルダが開く）
    chrome.tabs.create({ url: "chrome://extensions/?id=" + chrome.runtime.id });
    return;
  }
  if (msg.type === "check-update") {
    checkUpdate().then(send);
    return true;
  }
  if (msg.type === "download-update") {
    chrome.storage.local.get("cnvUpdate").then(async ({ cnvUpdate: u }) => {
      if (!u || !u.has) return send({ ok: false });
      try {
        await downloadZip(u);
        u.downloaded = u.latest;
        await chrome.storage.local.set({ cnvUpdate: u });
        send({ ok: true });
      } catch (_) { send({ ok: false }); }
    });
    return true;
  }
});

// 6時間ごと・ブラウザ起動時・インストール/更新直後に確認
chrome.alarms.get("cnvUpdate", (a) => {
  if (!a) chrome.alarms.create("cnvUpdate", { delayInMinutes: 1, periodInMinutes: 360 });
});
chrome.alarms.onAlarm.addListener((a) => { if (a.name === "cnvUpdate") checkUpdate(); });
chrome.runtime.onStartup.addListener(checkUpdate);
chrome.runtime.onInstalled.addListener(checkUpdate);

// 設定を「自動でダウンロード」に変えた時は、すぐに確認して必要ならダウンロード
chrome.storage.onChanged.addListener((ch) => {
  if (!ch.cnvSettings) return;
  const o = (ch.cnvSettings.oldValue || {}).updateMode, n = (ch.cnvSettings.newValue || {}).updateMode;
  if (n === "auto" && o !== "auto") checkUpdate();
});
