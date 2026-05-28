class SeedancePromptPickerHelper:
    """A tiny pass-through node so the extension is visible in ComfyUI."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "prompt": ("STRING", {"multiline": True, "default": ""}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt",)
    FUNCTION = "run"
    CATEGORY = "utils/seedance"

    def run(self, prompt):
        return (prompt,)


NODE_CLASS_MAPPINGS = {
    "SeedancePromptPickerHelper": SeedancePromptPickerHelper,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SeedancePromptPickerHelper": "Seedance @ Picker Helper",
}
