// cnvmp3側（YouTube内の非表示iframeのみで動作）。親からの指示を受けて操作し、状況を通知する
(function () {
  if (window.parent === window) return; // 通常のcnvmp3タブでは何もしない

  const post = (type, detail = "") =>
    window.parent.postMessage({ source: "cnvmp3-ext", type, detail }, "*");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ★サイトの構造が変わった場合はここを調整
  const findInput = () =>
    document.querySelector('input[type="url"], input[type="text"], input:not([type])');

  function fill(input, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function selectFormat(fmt) {
    const exact = new RegExp(`^\\s*${fmt}\\s*$`, "i");
    const loose = new RegExp(fmt, "i");
    for (const sel of document.querySelectorAll("select")) {
      const opt = [...sel.options].find((o) => loose.test(o.textContent) || loose.test(o.value));
      if (opt) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }
    const radio = [...document.querySelectorAll('input[type="radio"]')].find((r) =>
      loose.test(r.value || "")
    );
    if (radio) { radio.click(); return true; }
    const el = [...document.querySelectorAll("label, button, [role=tab], [role=radio], a, span, div")]
      .filter((e) => e.children.length <= 1 && exact.test((e.textContent || "").trim()))[0];
    if (el) { el.click(); return true; }
    return false;
  }

  function findConvertButton() {
    const els = [...document.querySelectorAll("button, input[type=submit], a")];
    const text = (e) => e.textContent || e.value || "";
    return (
      els.find((e) => /convert|変換/i.test(text(e))) ||
      els.find((e) => /download|ダウンロード/i.test(text(e)))
    );
  }

  // 音質(kbps)/画質(p)を選ぶ。見つからなければfalse
  async function selectQuality(fmt, q) {
    const num = String(q).replace(/\D/g, "");
    const exact = fmt === "mp3"
      ? new RegExp(`^\\s*${num}\\s*(kbps|k)?\\s*$`, "i")
      : new RegExp(`^\\s*${num}\\s*p?\\s*$`, "i");
    const loose = new RegExp(`(^|\\D)${num}(\\D|$)`);
    const trySelect = () => {
      for (const sel of document.querySelectorAll("select")) {
        const opt = [...sel.options].find((o) => loose.test(o.textContent) || loose.test(o.value));
        if (opt) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
      }
      return false;
    };
    const tryClick = () => {
      const el = [...document.querySelectorAll("li, option, button, label, [role=option], [role=radio], a, span, div")]
        .filter((e) => e.children.length <= 1 && exact.test((e.textContent || "").trim()))[0];
      if (el) { el.click(); return true; }
      return false;
    };
    if (trySelect() || tryClick()) return true;
    // ドロップダウンを開いてから探す
    const opener = [...document.querySelectorAll("button, [role=combobox], [role=button], div")].find((e) => {
      const t = (e.textContent || "").trim();
      return e.children.length <= 3 && t.length < 30 && /kbps|quality|音質|画質|\d{3,4}\s*p\b/i.test(t);
    });
    if (opener) {
      opener.click();
      await sleep(200);
      if (trySelect() || tryClick()) return true;
    }
    return false;
  }

  async function run(ytUrl, fmt, q) {
    const input = findInput();
    if (!input) return post("notfound", "noinput");
    fill(input, ytUrl);
    await sleep(80);
    selectFormat(fmt);
    await sleep(150);
    if (q && !(await selectQuality(fmt, q))) post("qng");
    await sleep(100);

    const before = new Set(document.body.innerText.split("\n"));
    const btn = findConvertButton();
    if (!btn) return post("notfound", "nobutton");
    btn.click();
    post("submitted");

    const errRe = /error|failed|invalid|not found|too long|longer than|unavailable|エラー|失敗|無効/i;
    let last = "";
    for (let i = 0; i < 600; i++) {
      await sleep(400);
      const lines = document.body.innerText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !before.has(l));
      // 変換が終わると「AGAIN」ボタンが現れる = 成功
      if (lines.some((l) => /^(convert\s+)?again$/i.test(l))) return post("done");
      const err = lines.find((l) => errRe.test(l));
      if (err) return post("error", err.slice(0, 120));
      const latest = lines[lines.length - 1];
      if (latest && latest !== last) {
        last = latest;
        post("progress", latest.slice(0, 80));
      }
    }
  }

  let running = false;
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent) return;
    const d = e.data;
    if (!d || d.source !== "cnvmp3-ext-cmd" || d.type !== "start" || running) return;
    running = true;
    run(d.yt, String(d.fmt || "mp3").toLowerCase(), d.q);
  });

  // 入力欄が現れたら「準備完了」を通知（事前読み込み用）
  (async () => {
    for (let i = 0; i < 300; i++) {
      if (findInput()) return post("ready");
      await sleep(100);
    }
    post("notfound", "loadfail");
  })();
})();
