(function initNotesPalette(global) {
  const root = global || window;
  root.ProCalModules = root.ProCalModules || {};

  function setColor(value, options) {
    const opts = options || {};
    const normalizeHexColor = opts.normalizeHexColor;
    const input = opts.input;
    const palette = opts.palette;
    if (typeof normalizeHexColor !== "function") return;
    const color = normalizeHexColor(value, "#fde68a");
    if (input) input.value = color;
    if (!palette) return;
    palette.querySelectorAll(".sticky-note-color-chip").forEach((btn) => {
      const btnColor = normalizeHexColor(btn.getAttribute("data-color"), "");
      btn.classList.toggle("active", btnColor === color);
    });
  }

  function renderPalette(options) {
    const opts = options || {};
    const palette = opts.palette;
    const colors = Array.isArray(opts.colors) ? opts.colors : [];
    const onPick = opts.onPick;
    if (!palette) return;
    palette.innerHTML = "";
    colors.forEach((color) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sticky-note-color-chip";
      btn.setAttribute("data-color", color);
      btn.style.background = color;
      btn.setAttribute("aria-label", `Select color ${color}`);
      btn.addEventListener("click", () => {
        if (typeof onPick === "function") onPick(color);
      });
      palette.appendChild(btn);
    });
  }

  root.ProCalModules.notesPalette = {
    setColor,
    renderPalette
  };
})(window);
