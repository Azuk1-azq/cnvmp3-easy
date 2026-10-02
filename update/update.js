// GitHubの update/ フォルダにあるファイルで、選んだ拡張機能フォルダを直接入れ替える
const UPDATE_BASE = "https://raw.githubusercontent.com/Azuk1-azq/cnvmp3-easy/main/update/";
const LIST_URL = "https://api.github.com/repos/Azuk1-azq/cnvmp3-easy/contents/update?ref=main";
const $ = (id) => document.getElementById(id);
const cur = chrome.runtime.getManifest();
class UErr extends Error {}

// ---- 選んだフォルダの記憶（IndexedDB） ----
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("cnvmp3", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("h");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet(k) {
  try {
    const db = await idb();
    return await new Promise((res, rej) => { const q = db.transaction("h").objectStore("h").get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); });
  } catch (_) { return null; }
}
async function idbSet(k, v) {
  try {
    const db = await idb();
    await new Promise((res, rej) => { const t = db.transaction("h", "readwrite"); t.objectStore("h").put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); });
  } catch (_) {}
}

// ---- 表示 ----
function setStatus(key, ...args) {
  $("status").className = "";
  $("status").textContent = key ? tr(key, ...args) : "";
}
function setError(msg) {
  $("status").className = "err";
  $("status").textContent = msg;
}

// ---- 更新の本体 ----
async function fetchFiles() {
  const lr = await fetch(LIST_URL, { cache: "no-store" });
  if (!lr.ok) throw new UErr(tr("upErrNet", "list " + lr.status));
  const list = (await lr.json()).filter((f) => f.type === "file" && /^[^\/\\]+$/.test(f.name) && !f.name.startsWith("."));
  if (!list.some((f) => f.name === "manifest.json")) throw new UErr(tr("upErrNet", "manifest.json"));
  const out = [];
  for (let i = 0; i < list.length; i++) {
    setStatus("upDownloading", i + 1, list.length);
    const r = await fetch(UPDATE_BASE + encodeURIComponent(list[i].name) + "?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new UErr(tr("upErrNet", list[i].name + " " + r.status));
    out.push({ name: list[i].name, data: await r.arrayBuffer() });
  }
  return out; // 全部そろってから書き込む（途中失敗で中途半端にならないように）
}
async function verifyFolder(dir) {
  try {
    const fh = await dir.getFileHandle("manifest.json");
    const m = JSON.parse(await (await fh.getFile()).text());
    if (m.name !== cur.name) throw new Error("name");
  } catch (_) { throw new UErr(tr("upErrFolder")); }
}
async function writeAll(dir, files) {
  // manifest.json は最後に書く
  files.sort((a, b) => (a.name === "manifest.json") - (b.name === "manifest.json"));
  for (const f of files) {
    const fh = await dir.getFileHandle(f.name, { create: true });
    const w = await fh.createWritable();
    await w.write(f.data);
    await w.close();
  }
}

let stored = null, busy = false;
function renderButtons() {
  $("go").textContent = tr(stored ? "upRun" : "upPick");
  $("repick").hidden = !stored;
  $("folder").textContent = stored ? tr("upFolderName", stored.name) : "";
}
async function go(forcePick) {
  if (busy) return;
  busy = true; $("go").disabled = true; $("repick").disabled = true;
  try {
    let dir = forcePick ? null : stored;
    if (dir) {
      // 保存済みフォルダ：書き込み許可を確認（クリック直後に行う）
      const o = { mode: "readwrite" };
      if ((await dir.queryPermission(o)) !== "granted" && (await dir.requestPermission(o)) !== "granted") throw new UErr(tr("upErrDenied"));
    } else {
      dir = await showDirectoryPicker({ id: "cnvmp3-ext", mode: "readwrite" });
    }
    await verifyFolder(dir);
    stored = dir; await idbSet("dir", dir); renderButtons();
    const files = await fetchFiles();
    setStatus("upWriting");
    await writeAll(dir, files);
    setStatus("upDone");
    setTimeout(() => chrome.runtime.reload(), 1500);
    return;
  } catch (e) {
    if (e && e.name === "AbortError") setStatus("");
    else if (e instanceof UErr) setError(e.message);
    else if (e && (e.name === "NotAllowedError" || e.name === "SecurityError")) setError(tr("upErrDenied"));
    else setError(tr("upErrOther", (e && e.message) || e));
  }
  busy = false; $("go").disabled = false; $("repick").disabled = false;
}

// ---- 起動 ----
chrome.storage.local.get(["cnvSettings", "cnvUpdate"], async (r) => {
  LANG = ((r && r.cnvSettings) || {}).lang || defaultLang();
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = tr(el.dataset.i18n)));
  $("shot").alt = tr("guideAlt");
  const u = (r && r.cnvUpdate) || {};
  $("ver").textContent = u.has ? tr("upVer", cur.version, u.latest) : tr("upVerCur", cur.version);
  stored = await idbGet("dir");
  renderButtons();
});
$("go").onclick = () => go(false);
$("repick").onclick = () => go(true);
$("openExt").onclick = () => chrome.runtime.sendMessage({ type: "open-ext-page" });
