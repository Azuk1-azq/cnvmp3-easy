chrome.storage.local.get("cnvSettings", (r) => {
  LANG = ((r && r.cnvSettings) || {}).lang || defaultLang();
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = tr(el.dataset.i18n)));
  document.getElementById("shot").alt = tr("guideAlt");
});
document.getElementById("openExt").onclick = () => chrome.runtime.sendMessage({ type: "open-ext-page" });
