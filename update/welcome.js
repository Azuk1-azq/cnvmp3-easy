const QUALITY = {
  mp3: [["64","64kbps"],["96","96kbps"],["128","128kbps"],["192","192kbps"],["256","256kbps"],["320","320kbps"]],
  mp4: [["360","360p"],["480","480p"],["720","720p"],["1080","1080p"]],
};
const RECOMMENDED = { mp3: "192", mp4: "1080" };
const settings = { showCnvScreen: false, sound: true, autoCloseSec: 30, showQualityMenu: true, firstRunDone: false };
const quality = { ...RECOMMENDED };
const $ = (id) => document.getElementById(id);

// 音質・画質をチップで選ぶ（おすすめを最初から選択）
for (const fmt of ["mp3", "mp4"]) {
  const box = $("chips-" + fmt);
  for (const [v, label] of QUALITY[fmt]) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "qchip";
    b.dataset.v = v;
    b.append(label);
    if (v === RECOMMENDED[fmt]) {
      const s = document.createElement("small");
      s.dataset.i18n = "recommended";
      b.append(s);
    }
    b.addEventListener("click", () => {
      quality[fmt] = v;
      box.querySelectorAll(".qchip").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    });
    b.setAttribute("aria-pressed", String(v === quality[fmt]));
    box.appendChild(b);
  }
}
function applyI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = tr(el.dataset.i18n)));
}
function show(n) {
  document.querySelectorAll("section").forEach((el) => (el.hidden = el.dataset.step !== String(n)));
  document.querySelectorAll("#stepper li").forEach((li, i) => {
    li.dataset.state = i + 1 < n ? "done" : i + 1 === n ? "active" : "todo";
  });
}
$("back").onclick = () => show(1);
function pick(l) {
  LANG = settings.lang = l;
  applyI18n();
  chrome.storage.local.set({ cnvSettings: settings }); // 途中で閉じても言語は保存
  show(2);
}
$("pick-ja").onclick = () => pick("ja");
$("pick-en").onclick = () => pick("en");
$("go").onclick = () => {
  settings.sound = $("sound").checked;
  settings.showQualityMenu = $("tempMenu").checked;
  settings.firstRunDone = true;
  chrome.storage.local.set({ cnvSettings: settings, cnvQ: quality }, () => show(3));
};
applyI18n();
