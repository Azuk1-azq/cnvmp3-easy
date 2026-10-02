const QUALITY = {
  mp3: [["64","64kbps"],["96","96kbps"],["128","128kbps"],["192","192kbps"],["256","256kbps"],["320","320kbps"]],
  mp4: [["360","360p"],["480","480p"],["720","720p"],["1080","1080p"]],
};
const settings = { showCnvScreen: false, sound: true, autoCloseSec: 30, showQualityMenu: true, updateMode: "notify" };
const quality = { mp3: "192", mp4: "1080" };
let upd = null, updError = "", updBusy = false;
const $ = (id) => document.getElementById(id);

for (const fmt of ["mp3", "mp4"]) {
  for (const [v, l] of QUALITY[fmt]) $("q-" + fmt).add(new Option(l, v));
}
function applyI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = tr(el.dataset.i18n)));
  $("v").textContent = tr("version", chrome.runtime.getManifest().version);
  if (typeof renderUpdate === "function") renderUpdate();
}
let timer;
function flash() {
  $("saved").textContent = tr("saved");
  clearTimeout(timer);
  timer = setTimeout(() => ($("saved").textContent = ""), 1200);
}
function save() {
  chrome.storage.local.set({ cnvSettings: settings, cnvQ: quality }, flash);
}
chrome.storage.local.get(["cnvSettings", "cnvQ", "cnvUpdate"], (r) => {
  Object.assign(settings, r.cnvSettings || {});
  upd = r.cnvUpdate || null;
  Object.assign(quality, r.cnvQ || {});
  LANG = settings.lang || defaultLang();
  $("lang").value = LANG;
  $("showCnvScreen").checked = !!settings.showCnvScreen;
  $("sound").checked = !!settings.sound;
  $("tempMenu").checked = settings.showQualityMenu !== false;
  $("autoCloseSec").value = String(settings.autoCloseSec);
  $("updateMode").value = settings.updateMode;
  $("q-mp3").value = quality.mp3;
  $("q-mp4").value = quality.mp4;
  applyI18n();
});
$("lang").onchange = (e) => { settings.lang = LANG = e.target.value; applyI18n(); save(); };
$("showCnvScreen").onchange = (e) => { settings.showCnvScreen = e.target.checked; save(); };
$("tempMenu").onchange = (e) => { settings.showQualityMenu = e.target.checked; save(); };
$("sound").onchange = (e) => { settings.sound = e.target.checked; save(); };
$("autoCloseSec").onchange = (e) => { settings.autoCloseSec = Number(e.target.value); save(); };
$("updateMode").onchange = (e) => { settings.updateMode = e.target.value; renderUpdate(); save(); };
$("q-mp3").onchange = (e) => { quality.mp3 = e.target.value; save(); };
$("q-mp4").onchange = (e) => { quality.mp4 = e.target.value; save(); };
$("openSettings").onclick = () => {
  // 設定ページを新しいタブで開く
  chrome.runtime.openOptionsPage(() => window.close());
};
const openFolder = () => chrome.runtime.sendMessage({ type: "open-folder" });
$("openFolder").onclick = openFolder;
$("updFolder").onclick = openFolder;
$("updRun").onclick = () => chrome.runtime.sendMessage({ type: "open-update" });
let resetArmed = false, resetTimer;
function disarmReset() {
  resetArmed = false;
  clearTimeout(resetTimer);
  $("resetAll").textContent = tr("resetAll");
}
$("resetAll").onclick = () => {
  if (!resetArmed) {
    // 誤操作防止：1回目は確認表示、4秒以内にもう一度押すと実行
    resetArmed = true;
    $("resetAll").textContent = tr("resetConfirm");
    resetTimer = setTimeout(disarmReset, 4000);
    return;
  }
  disarmReset();
  chrome.storage.local.remove(["cnvSettings", "cnvQ", "cnvUpdateDismissed"], () => {
    // 初期設定（ウェルカムページ）をもう一度開く
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") }, () => window.close());
  });
};
// ---------- アップデート ----------
function renderUpdate() {
  const cur = chrome.runtime.getManifest().version;
  $("updModeNote").textContent = tr({ notify: "updNoteNotify", popup: "updNotePopup", auto: "updNoteAuto" }[settings.updateMode] || "updNoteNotify");
  $("updCheck").textContent = tr(updBusy ? "updChecking" : "updCheck");
  $("updCheck").disabled = updBusy;
  const has = !!(upd && upd.has);
  $("updBox").hidden = !has;
  if (has) {
    $("updMsg").textContent = tr("updTitle", upd.latest);
    $("updSub").textContent = upd.downloaded ? tr("updDone") : tr("updDesc", cur);
  }
  $("updStatus").textContent = updBusy ? "" : updError ? tr("updFailed") + " (" + updError + ")" : has ? tr("updFound", upd.latest) : upd ? tr("updLatest", cur) : "";
}
function runCheck() {
  updBusy = true; updError = ""; renderUpdate();
  chrome.runtime.sendMessage({ type: "check-update" }, (u) => {
    updBusy = false;
    if (chrome.runtime.lastError || !u || u.error) updError = (u && u.detail) || "error";
    else upd = u;
    renderUpdate();
  });
}
$("updCheck").onclick = runCheck;
$("updDl").onclick = () => {
  chrome.runtime.sendMessage({ type: "download-update" }, (r) => {
    if (r && r.ok) { upd.downloaded = upd.latest; renderUpdate(); }
  });
};
chrome.storage.onChanged.addListener((ch) => {
  if (ch.cnvUpdate) { upd = ch.cnvUpdate.newValue || null; renderUpdate(); }
});
// 開いた時、前回の確認から1時間以上たっていたら自動で確認
chrome.storage.local.get("cnvUpdate", (r) => {
  if (!r.cnvUpdate || Date.now() - (r.cnvUpdate.checkedAt || 0) > 3600e3) runCheck();
});
applyI18n();
