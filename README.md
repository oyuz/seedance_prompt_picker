# Seedance @ Prompt Picker

This is a small ComfyUI custom node package that adds a browser-side prompt helper for Seedance-style workflows.

It does not change the Seedance generation code. It only enhances the prompt widget in nodes such as `Seedance2DPE`.

## What it does

- When the prompt value ends with `@`, opens a thumbnail picker.
- Reads images connected to `Seedance2DResource` through `Resources_0`, `Resources_1`, etc.
- The included `Seedance @ Picker Helper` node also has `Resources_0` to `Resources_11` image inputs, so you can use it as a standalone prompt helper.
- Clicking a thumbnail inserts a wrapped token such as `（图片1）`, `（图片2）`, etc. into the prompt.
- Draws a small `i` help button on the helper node.

The `@` is only a trigger. The inserted text is the plain token that the existing Seedance node already understands.

## Install

Copy this folder into ComfyUI:

```text
ComfyUI/custom_nodes/seedance_prompt_picker
```

Then restart ComfyUI and refresh the browser page.

## Use

Recommended standalone helper flow:

1. Open your existing Seedance2.0 workflow.
2. Add `Seedance @ Picker Helper`.
3. Connect the same reference images into both places:
   - Your original `Seedance2DResource` node, so Seedance receives the images.
   - `Seedance @ Picker Helper` `Resources_0`, `Resources_1`, etc., so the picker can show thumbnails.
4. Connect `Seedance @ Picker Helper` `prompt` output to the `Seedance2DPE` prompt input.
5. Type your prompt in `Seedance @ Picker Helper`.
6. Type `@` where you need the reference image.
7. Choose a thumbnail.
8. The helper inserts wrapped image reference text. For example, `@角色1@` becomes `@角色1（图片1）`.

Keep the image order the same between `Seedance2DResource` and `Seedance @ Picker Helper`. For example, if the first image connected to `Seedance2DResource` is the character image, connect that same image to `Seedance @ Picker Helper` `Resources_0`.

Important: this helper does not send images to Seedance by itself. It only writes the prompt text that your original Seedance nodes already understand. The real image resources must still be connected to your original Seedance resource node.

The helper cannot create Seedance's native rich image chips unless the original Seedance node exposes that private editor API. It deliberately writes normal prompt text so the existing Seedance2.0 node can still read it.

Click the small `i` icon on the helper node to see these notes inside ComfyUI.

## Notes

This is a best-effort frontend helper. Company-hosted ComfyUI builds may customize frontend internals, so the first version may need small adjustments if:

- The Seedance prompt node has a different class name.
- The resources input is not named `resources`.
- The image resource slots are not named `Resources_0`, `Resources_1`, etc.
- The image preview is stored somewhere other than `node.imgs` or the `image` widget.

If the picker opens but thumbnails are missing, the token insertion can still work.
