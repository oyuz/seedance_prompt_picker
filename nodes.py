class SeedancePromptPickerHelper:
    """Prompt helper with image inputs used by the frontend picker."""

    @classmethod
    def INPUT_TYPES(cls):
        optional = {}
        for index in range(12):
            optional[f"Resources_{index}"] = ("IMAGE",)

        return {
            "required": {
                "prompt": ("STRING", {"multiline": True, "default": ""}),
            },
            "optional": optional,
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("prompt",)
    FUNCTION = "run"
    CATEGORY = "utils/seedance"

    def run(self, prompt, **kwargs):
        return (prompt,)


NODE_CLASS_MAPPINGS = {
    "SeedancePromptPickerHelper": SeedancePromptPickerHelper,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SeedancePromptPickerHelper": "seedance2.0 @ picker helper",
}
