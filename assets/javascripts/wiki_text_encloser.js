(() => {
  if (typeof jsToolBar === "undefined") return;

  const initialized = new WeakSet();
  const startSymbols = Array.from(WikiTextEncloser.settings.targetStartSymbols);
  const endSymbols = Array.from(WikiTextEncloser.settings.targetEndSymbols);

  function replaceSelection(textarea, replacement, start, end,
                            selectionStart = start, selectionEnd = start + replacement.length) {
    const previousValue = textarea.value;
    let inputEmitted = false;
    const onInput = () => {
      inputEmitted = true;
      textarea.setSelectionRange(selectionStart, selectionEnd);
    };
    // Set the final selection before existing bubbling input listeners run.
    textarea.addEventListener("input", onInput, true);
    try {
      // Native insertion preserves undo/redo history; setRangeText does not.
      textarea.ownerDocument.execCommand("insertText", false, replacement);
    } catch (error) {
      // Keep enclosure working in browsers without native insertion support.
    } finally {
      textarea.removeEventListener("input", onInput, true);
    }
    if (!inputEmitted && textarea.value === previousValue) {
      textarea.setRangeText(replacement, start, end, "select");
    }
    textarea.setSelectionRange(selectionStart, selectionEnd);
    if (!inputEmitted) {
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  jsToolBar.prototype.elements.wiki_text_encloser = {
    type: "init_wiki_text_encloser",
  };

  jsToolBar.prototype.init_wiki_text_encloser = function () {
    const textarea = this.textarea;
    if (initialized.has(textarea)) return;
    initialized.add(textarea);

    textarea.addEventListener("keydown", (event) => {
      if (event.defaultPrevented || event.isComposing || textarea.readOnly || textarea.disabled) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start === end) return;

      if (WikiTextEncloser.settings.markdownLinksEnabled &&
          (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey &&
          event.key.toLowerCase() === "k") {
        event.preventDefault();
        const label = textarea.value.slice(start, end);
        const urlStart = start + label.length + 3;
        replaceSelection(textarea, "[" + label + "](url)", start, end, urlStart, urlStart + 3);
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const index = startSymbols.indexOf(event.key);
      if (index === -1 || !endSymbols[index]) return;

      event.preventDefault();
      const opening = startSymbols[index];
      const closing = endSymbols[index];
      replaceSelection(textarea, opening + textarea.value.slice(start, end) + closing, start, end);
    });
  };
})();
