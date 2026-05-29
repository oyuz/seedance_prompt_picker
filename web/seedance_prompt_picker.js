import { app } from "../../scripts/app.js";

const EXTENSION_NAME = "seedance.prompt.thumbnail_picker";
const STATE = {
  picker: null,
  current: null,
  textarea: null,
  insertRange: null,
};

function injectStyles() {
  if (document.getElementById("seedance-prompt-picker-style")) return;

  const style = document.createElement("style");
  style.id = "seedance-prompt-picker-style";
  style.textContent = `
    .seedance-picker-backdrop {
      position: fixed;
      inset: 0;
      z-index: 99998;
      background: rgba(0, 0, 0, 0.18);
    }

    .seedance-picker-panel {
      position: fixed;
      z-index: 99999;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(560px, calc(100vw - 48px));
      max-height: min(520px, calc(100vh - 48px));
      overflow: hidden;
      border: 1px solid #3f444b;
      border-radius: 8px;
      background: #1f2228;
      color: #f0f2f5;
      box-shadow: 0 20px 70px rgba(0, 0, 0, 0.55);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .seedance-picker-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-bottom: 1px solid #343941;
      background: #242832;
    }

    .seedance-picker-title {
      font-size: 14px;
      font-weight: 650;
    }

    .seedance-picker-close {
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 6px;
      background: #343a45;
      color: #f0f2f5;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
    }

    .seedance-picker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
      gap: 8px;
      padding: 10px;
      max-height: 430px;
      overflow: auto;
    }

    .seedance-picker-card {
      border: 1px solid #3b414a;
      border-radius: 8px;
      background: #292e37;
      overflow: hidden;
    }

    .seedance-picker-thumb {
      display: block;
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      background: #15171b;
    }

    .seedance-picker-placeholder {
      display: grid;
      place-items: center;
      width: 100%;
      aspect-ratio: 4 / 3;
      background: #15171b;
      color: #9aa3ad;
      font-size: 12px;
    }

    .seedance-picker-meta {
      padding: 8px;
      display: grid;
      gap: 5px;
    }

    .seedance-picker-label {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #cfd5dd;
      font-size: 10px;
    }

    .seedance-picker-actions {
      display: grid;
      gap: 6px;
    }

    .seedance-picker-action {
      min-height: 24px;
      border: 0;
      border-radius: 6px;
      background: #3b82f6;
      color: white;
      cursor: pointer;
      font-size: 11px;
    }

    .seedance-picker-empty {
      padding: 28px;
      color: #cfd5dd;
      font-size: 13px;
      line-height: 1.5;
    }

    .seedance-help-body {
      padding: 14px 16px 16px;
      color: #d8dee8;
      font-size: 13px;
      line-height: 1.65;
    }

    .seedance-help-body code {
      padding: 2px 5px;
      border-radius: 5px;
      background: #111318;
      color: #f3f4f6;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
  `;
  document.head.appendChild(style);
}

function isSeedancePromptNode(node) {
  const name = String(node?.comfyClass || node?.type || node?.title || "");
  return /SeedancePromptPickerHelper|Seedance.*PE|Seedance2DPE|Seedance.*Prompt|Seedance.*Generate/i.test(name);
}

function findPromptWidget(node) {
  const widgets = node?.widgets || [];
  return widgets.find((widget) => {
    const name = String(widget.name || "").toLowerCase();
    return name === "prompt" || name === "text" || name.includes("prompt") || name.includes("提示词");
  });
}

function getGraph() {
  return app?.graph || window?.app?.graph;
}

function getLink(linkId) {
  const graph = getGraph();
  if (!graph || linkId == null) return null;
  return graph.links?.[linkId] || null;
}

function getNodeById(id) {
  const graph = getGraph();
  if (!graph || id == null) return null;
  return graph.getNodeById ? graph.getNodeById(id) : graph._nodes_by_id?.[id];
}

function getWidgetValue(node, names) {
  const widget = node?.widgets?.find((item) => names.includes(String(item.name || "").toLowerCase()));
  return widget?.value;
}

function viewUrlFromImageValue(value) {
  if (!value) return null;

  if (typeof value === "object") {
    const filename = value.filename || value.name;
    if (!filename) return null;
    const type = value.type || "input";
    const subfolder = value.subfolder || "";
    return `/view?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(type)}&subfolder=${encodeURIComponent(subfolder)}`;
  }

  return `/view?filename=${encodeURIComponent(String(value))}&type=input`;
}

function getNodeThumbnail(node) {
  const imgs = node?.imgs || node?.images;
  if (imgs?.length) {
    const image = imgs[node.imageIndex || 0] || imgs[0];
    if (typeof image === "string") return image;
    if (image?.src) return image.src;
    if (image?.currentSrc) return image.currentSrc;
  }

  const value = getWidgetValue(node, ["image", "filename", "file", "path"]);
  return viewUrlFromImageValue(value);
}

function nodeLabel(node) {
  return String(node?.title || node?.comfyClass || node?.type || `Node ${node?.id || ""}`);
}

function getResourceNode(peNode) {
  const resourceInput = peNode?.inputs?.find((input) => /resources?/i.test(String(input.name || "")));
  const link = getLink(resourceInput?.link);
  return getNodeById(link?.origin_id);
}

function collectFromResourceNode(resourceNode) {
  if (!resourceNode?.inputs) return [];

  const inputs = resourceNode.inputs
    .map((input, inputIndex) => ({ input, inputIndex }))
    .filter(({ input }) => /resources?_\d+/i.test(String(input.name || "")) && input.link != null)
    .sort((a, b) => a.inputIndex - b.inputIndex);

  return inputs.map(({ input }, index) => {
    const link = getLink(input.link);
    const upstream = getNodeById(link?.origin_id);
    const number = index + 1;
    return {
      key: `${resourceNode.id}:${input.name}`,
      label: `${input.name} - ${nodeLabel(upstream)}`,
      imageToken: `图片${number}`,
      thumb: getNodeThumbnail(upstream),
    };
  });
}

function collectVisibleImageNodes(peNode) {
  const graph = getGraph();
  const nodes = graph?._nodes || [];
  let index = 0;

  return nodes
    .filter((node) => node !== peNode && getNodeThumbnail(node))
    .map((node) => {
      index += 1;
      return {
        key: `visible:${node.id}`,
        label: nodeLabel(node),
        imageToken: `图片${index}`,
        thumb: getNodeThumbnail(node),
      };
    });
}

function collectReferences(peNode) {
  if (String(peNode?.comfyClass || "") === "SeedancePromptPickerHelper") {
    const ownRefs = collectFromResourceNode(peNode);
    if (ownRefs.length) return ownRefs;
  }

  const resourceNode = getResourceNode(peNode);
  const refs = collectFromResourceNode(resourceNode);
  return refs.length ? refs : collectVisibleImageNodes(peNode);
}

function setPromptValue(widget, nextValue) {
  widget.__seedancePickerUpdating = true;
  widget.value = nextValue;

  if (STATE.textarea && "value" in STATE.textarea) {
    STATE.textarea.value = nextValue;
    STATE.textarea.dispatchEvent(new Event("input", { bubbles: true }));
    STATE.textarea.focus();
  }

  if (widget.inputEl && "value" in widget.inputEl) {
    widget.inputEl.value = nextValue;
    widget.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  }

  if (typeof widget.callback === "function") {
    widget.callback(nextValue);
  }

  widget.__seedancePickerUpdating = false;
  app.graph?.setDirtyCanvas?.(true, true);
}

function isTokenBoundary(char) {
  return !char || /[\s|,，.。;；:：()[\]{}（）<>《》"'“”‘’]/.test(char);
}

function findReferenceRange(value, cursor) {
  if (cursor > 0 && value[cursor - 1] === "@") {
    return {
      start: cursor - 1,
      end: cursor,
      mode: "replace",
    };
  }

  const beforeCursor = value.slice(0, cursor);
  const start = beforeCursor.lastIndexOf("@");
  if (start < 0) return null;

  for (let index = start + 1; index < cursor; index += 1) {
    if (isTokenBoundary(value[index])) return null;
  }

  let end = cursor;
  while (end < value.length && !isTokenBoundary(value[end])) {
    end += 1;
  }

  if (end <= start + 1) return null;

  return {
    start: end,
    end,
    mode: "appendParen",
  };
}

function getFallbackRange(value) {
  const cursor = value.length;
  return {
    start: cursor,
    end: cursor,
    mode: value && !value.endsWith(" ") ? "appendSpaced" : "append",
  };
}

function getInsertText(token, range) {
  if (range?.mode === "appendParen") return `（${token}）`;
  if (range?.mode === "replace") return `（${token}）`;
  if (range?.mode === "appendSpaced") return ` ${token}`;
  return token;
}

function insertToken(widget, token) {
  const value = String(STATE.textarea?.value ?? widget.value ?? "");
  const range = STATE.insertRange || getFallbackRange(value);
  const insertText = getInsertText(token, range);
  const nextValue = `${value.slice(0, range.start)}${insertText}${value.slice(range.end)}`;

  setPromptValue(widget, nextValue);

  if (STATE.textarea) {
    const nextCursor = range.start + insertText.length;
    STATE.textarea.setSelectionRange?.(nextCursor, nextCursor);
  }

  closePicker();
}

function closePicker() {
  if (STATE.picker) {
    STATE.picker.remove();
    STATE.picker = null;
    STATE.current = null;
    STATE.insertRange = null;
  }
}

function showPicker(node, widget, insertRange = null) {
  closePicker();
  injectStyles();
  STATE.insertRange = insertRange;

  const refs = collectReferences(node);
  const backdrop = document.createElement("div");
  backdrop.className = "seedance-picker-backdrop";
  backdrop.addEventListener("click", closePicker);

  const panel = document.createElement("div");
  panel.className = "seedance-picker-panel";
  panel.addEventListener("click", (event) => event.stopPropagation());

  const head = document.createElement("div");
  head.className = "seedance-picker-head";

  const title = document.createElement("div");
  title.className = "seedance-picker-title";
  title.textContent = "选择参考图";

  const close = document.createElement("button");
  close.className = "seedance-picker-close";
  close.type = "button";
  close.textContent = "x";
  close.addEventListener("click", closePicker);

  head.append(title, close);
  panel.appendChild(head);

  if (!refs.length) {
    const empty = document.createElement("div");
    empty.className = "seedance-picker-empty";
    empty.textContent = "没有找到可用图片。请先把图片节点连接到 Seedance2DResource 的 Resources 输入槽。";
    panel.appendChild(empty);
  } else {
    const grid = document.createElement("div");
    grid.className = "seedance-picker-grid";

    for (const ref of refs) {
      const card = document.createElement("div");
      card.className = "seedance-picker-card";

      if (ref.thumb) {
        const img = document.createElement("img");
        img.className = "seedance-picker-thumb";
        img.src = ref.thumb;
        img.loading = "lazy";
        card.appendChild(img);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "seedance-picker-placeholder";
        placeholder.textContent = "No preview";
        card.appendChild(placeholder);
      }

      const meta = document.createElement("div");
      meta.className = "seedance-picker-meta";

      const label = document.createElement("div");
      label.className = "seedance-picker-label";
      label.title = ref.label;
      label.textContent = ref.label;

      const actions = document.createElement("div");
      actions.className = "seedance-picker-actions";

      const imageButton = document.createElement("button");
      imageButton.className = "seedance-picker-action";
      imageButton.type = "button";
      imageButton.textContent = ref.imageToken;
      imageButton.addEventListener("click", () => insertToken(widget, ref.imageToken));

      actions.append(imageButton);
      meta.append(label, actions);
      card.appendChild(meta);
      grid.appendChild(card);
    }

    panel.appendChild(grid);
  }

  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
  STATE.picker = backdrop;
  STATE.current = { node, widget };
}

function showHelpPanel() {
  closePicker();
  injectStyles();

  const backdrop = document.createElement("div");
  backdrop.className = "seedance-picker-backdrop";
  backdrop.addEventListener("click", closePicker);

  const panel = document.createElement("div");
  panel.className = "seedance-picker-panel";
  panel.addEventListener("click", (event) => event.stopPropagation());

  const head = document.createElement("div");
  head.className = "seedance-picker-head";

  const title = document.createElement("div");
  title.className = "seedance-picker-title";
  title.textContent = "Seedance @ Picker 用法";

  const close = document.createElement("button");
  close.className = "seedance-picker-close";
  close.type = "button";
  close.textContent = "x";
  close.addEventListener("click", closePicker);

  const body = document.createElement("div");
  body.className = "seedance-help-body";
  body.innerHTML = [
    "1. 同一批参考图要同时接到原 Seedance 资源节点和本 Helper 的 Resources 输入口。",
    "2. 两边顺序必须一致：Resources_0 对应 <code>图片1</code>，Resources_1 对应 <code>图片2</code>。",
    "3. 在 prompt 需要引用的位置输入 <code>@</code>，选择图片后会插入 <code>（图片1）</code>。",
    "4. 例如写 <code>@角色1@</code> 后选择图片1，会变成 <code>@角色1（图片1）</code>。",
    "5. 本 Helper 只输出 Seedance 能读的 prompt 文本；图片仍由原 Seedance 资源节点提供。",
  ].join("<br>");

  head.append(title, close);
  panel.append(head, body);
  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
  STATE.picker = backdrop;
}

function installHelpIcon(node) {
  if (node.__seedancePromptPickerHelpInstalled) return;
  node.__seedancePromptPickerHelpInstalled = true;

  const previousDrawForeground = node.onDrawForeground;
  node.onDrawForeground = function seedancePromptPickerDrawHelp(ctx, ...args) {
    previousDrawForeground?.call(this, ctx, ...args);

    const x = this.size[0] - 24;
    const y = 18;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#2f80ed";
    ctx.fill();
    ctx.strokeStyle = "#9fc5ff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("i", x, y + 0.5);
    ctx.restore();
  };

  const previousMouseDown = node.onMouseDown;
  node.onMouseDown = function seedancePromptPickerHelpClick(event, localPos, ...args) {
    const x = this.size[0] - 24;
    const y = 18;
    const dx = localPos?.[0] - x;
    const dy = localPos?.[1] - y;
    if (dx * dx + dy * dy <= 12 * 12) {
      showHelpPanel();
      return true;
    }
    return previousMouseDown?.call(this, event, localPos, ...args);
  };
}

function shouldOpenPicker(previousValue, nextValue) {
  if (nextValue === previousValue) return false;
  if (!nextValue.endsWith("@")) return false;
  return nextValue.length >= previousValue.length;
}

function enhancePromptWidget(node, widget) {
  if (!widget || widget.__seedancePromptPickerEnhanced) return;
  widget.__seedancePromptPickerEnhanced = true;
  widget.__seedancePromptPickerPreviousValue = String(widget.value || "");

  const originalCallback = widget.callback;
  widget.callback = function seedancePromptPickerCallback(value, ...args) {
    if (!widget.__seedancePickerUpdating && shouldOpenPicker(widget.__seedancePromptPickerPreviousValue, String(value || ""))) {
      const nextValue = String(value || "");
      window.setTimeout(() => showPicker(node, widget, findReferenceRange(nextValue, nextValue.length) || getFallbackRange(nextValue)), 0);
    }

    widget.__seedancePromptPickerPreviousValue = String(value || "");

    if (typeof originalCallback === "function") {
      return originalCallback.call(this, value, ...args);
    }
    return undefined;
  };
}

function setupNode(node) {
  if (!isSeedancePromptNode(node)) return;

  const widget = findPromptWidget(node);
  if (!widget) return;

  enhancePromptWidget(node, widget);
  installHelpIcon(node);
}

function canvasPointFromElement(element) {
  const canvas = app?.canvas?.canvas;
  if (!canvas || !element) return null;

  const elementRect = element.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const screenX = elementRect.left + elementRect.width / 2 - canvasRect.left;
  const screenY = elementRect.top + elementRect.height / 2 - canvasRect.top;
  const ds = app.canvas.ds;

  return [
    screenX / ds.scale - ds.offset[0],
    screenY / ds.scale - ds.offset[1],
  ];
}

function nodeContainsPoint(node, point) {
  if (!node || !point || !node.pos || !node.size) return false;
  return (
    point[0] >= node.pos[0] &&
    point[0] <= node.pos[0] + node.size[0] &&
    point[1] >= node.pos[1] &&
    point[1] <= node.pos[1] + node.size[1]
  );
}

function findNodeForTextarea(textarea) {
  const graph = getGraph();
  const nodes = graph?._nodes || [];
  const point = canvasPointFromElement(textarea);

  const containing = nodes
    .filter((node) => isSeedancePromptNode(node) && nodeContainsPoint(node, point))
    .sort((a, b) => (b.id || 0) - (a.id || 0));

  if (containing.length) return containing[0];

  return nodes.find((node) => {
    if (!isSeedancePromptNode(node)) return false;
    const widget = findPromptWidget(node);
    return widget && String(widget.value || "") === String(textarea.value || "");
  });
}

function openPickerForTextarea(textarea) {
  const node = findNodeForTextarea(textarea);
  const widget = findPromptWidget(node);
  if (!node || !widget) return;

  STATE.textarea = textarea;
  widget.value = textarea.value;
  const cursor = textarea.selectionStart ?? textarea.value.length;
  showPicker(node, widget, findReferenceRange(textarea.value, cursor) || getFallbackRange(textarea.value));
}

document.addEventListener(
  "focusin",
  (event) => {
    if (event.target instanceof HTMLTextAreaElement) {
      STATE.textarea = event.target;
    }
  },
  true
);

document.addEventListener(
  "input",
  (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) return;
    const cursor = target.selectionStart ?? target.value.length;
    if (target.value[cursor - 1] !== "@") return;

    window.setTimeout(() => openPickerForTextarea(target), 0);
  },
  true
);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePicker();
});

window.setInterval(() => {
  const graph = getGraph();
  for (const node of graph?._nodes || []) {
    setupNode(node);
  }
}, 1500);

app.registerExtension({
  name: EXTENSION_NAME,
  nodeCreated(node) {
    setupNode(node);
  },
  loadedGraphNode(node) {
    setupNode(node);
  },
});
