import { app } from "../../scripts/app.js";

const EXTENSION_NAME = "seedance.prompt.thumbnail_picker";
const STATE = {
  picker: null,
  current: null,
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
      width: min(720px, calc(100vw - 48px));
      max-height: min(620px, calc(100vh - 48px));
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
      grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
      gap: 10px;
      padding: 12px;
      max-height: 520px;
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
      gap: 6px;
    }

    .seedance-picker-label {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #cfd5dd;
      font-size: 12px;
    }

    .seedance-picker-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .seedance-picker-action {
      min-height: 28px;
      border: 0;
      border-radius: 6px;
      background: #3b82f6;
      color: white;
      cursor: pointer;
      font-size: 12px;
    }

    .seedance-picker-action.secondary {
      background: #4b5563;
    }

    .seedance-picker-empty {
      padding: 28px;
      color: #cfd5dd;
      font-size: 13px;
      line-height: 1.5;
    }
  `;
  document.head.appendChild(style);
}

function isSeedancePromptNode(node) {
  const name = String(node?.comfyClass || node?.type || node?.title || "");
  return /Seedance.*PE|Seedance2DPE|Seedance.*Prompt|Seedance.*Generate/i.test(name);
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
      sceneToken: `场景${number}`,
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
        sceneToken: `场景${index}`,
        thumb: getNodeThumbnail(node),
      };
    });
}

function collectReferences(peNode) {
  const resourceNode = getResourceNode(peNode);
  const refs = collectFromResourceNode(resourceNode);
  return refs.length ? refs : collectVisibleImageNodes(peNode);
}

function setPromptValue(widget, nextValue) {
  widget.__seedancePickerUpdating = true;
  widget.value = nextValue;

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

function insertToken(widget, token) {
  const value = String(widget.value || "");
  const atIndex = value.lastIndexOf("@");
  const nextValue =
    atIndex >= 0
      ? `${value.slice(0, atIndex)}${token}${value.slice(atIndex + 1)}`
      : `${value}${value && !value.endsWith(" ") ? " " : ""}${token}`;

  setPromptValue(widget, nextValue);
  closePicker();
}

function closePicker() {
  if (STATE.picker) {
    STATE.picker.remove();
    STATE.picker = null;
    STATE.current = null;
  }
}

function showPicker(node, widget) {
  closePicker();
  injectStyles();

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

      const sceneButton = document.createElement("button");
      sceneButton.className = "seedance-picker-action secondary";
      sceneButton.type = "button";
      sceneButton.textContent = ref.sceneToken;
      sceneButton.addEventListener("click", () => insertToken(widget, ref.sceneToken));

      actions.append(imageButton, sceneButton);
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
      window.setTimeout(() => showPicker(node, widget), 0);
    }

    widget.__seedancePromptPickerPreviousValue = String(value || "");

    if (typeof originalCallback === "function") {
      return originalCallback.call(this, value, ...args);
    }
    return undefined;
  };
}

function addPickerButton(node, widget) {
  if (node.__seedancePromptPickerButtonAdded || typeof node.addWidget !== "function") return;
  node.__seedancePromptPickerButtonAdded = true;
  node.addWidget("button", "@ 选择参考图", "open", () => showPicker(node, widget));
}

function setupNode(node) {
  if (!isSeedancePromptNode(node)) return;

  const widget = findPromptWidget(node);
  if (!widget) return;

  enhancePromptWidget(node, widget);
  addPickerButton(node, widget);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePicker();
});

app.registerExtension({
  name: EXTENSION_NAME,
  nodeCreated(node) {
    setupNode(node);
  },
  loadedGraphNode(node) {
    setupNode(node);
  },
});
