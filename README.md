# Seedance @ Prompt Picker

This is a small ComfyUI custom node package that adds a browser-side prompt helper for Seedance-style workflows.

It does not change the Seedance generation code. It only enhances the prompt widget in nodes such as `Seedance2DPE`.

## What it does

- Adds an `@ 选择参考图` button to the Seedance prompt node when detected.
- When the prompt value ends with `@`, opens a thumbnail picker.
- Reads images connected to `Seedance2DResource` through `Resources_0`, `Resources_1`, etc.
- Clicking a thumbnail inserts a token such as `图片1`, `图片2`, `场景1`, or `场景2` into the prompt.

The `@` is only a trigger. The inserted text is the plain token that the existing Seedance node already understands.

## Install

Copy this folder into ComfyUI:

```text
ComfyUI/custom_nodes/seedance_prompt_picker
```

Then restart ComfyUI and refresh the browser page.

## Use

1. Open your existing Seedance2.0 workflow.
2. Connect images into `Seedance2DResource`.
3. Find the `Seedance2DPE` prompt box.
4. Type `@` at the end of the prompt, or click `@ 选择参考图`.
5. Choose a thumbnail.
6. The helper inserts `图片1` / `场景1` style text into the prompt.

## Notes

This is a best-effort frontend helper. Company-hosted ComfyUI builds may customize frontend internals, so the first version may need small adjustments if:

- The Seedance prompt node has a different class name.
- The resources input is not named `resources`.
- The image resource slots are not named `Resources_0`, `Resources_1`, etc.
- The image preview is stored somewhere other than `node.imgs` or the `image` widget.

If the picker opens but thumbnails are missing, the token insertion can still work.
