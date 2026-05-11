import os
import sys
import time

# Attempt to import torch for real inspection
try:
    import torch
except ImportError:
    torch = None

def extract_classes(model_path):
    print(f"🔍 Loading model: {model_path}")
    time.sleep(0.5)

    # ---------------------------
    # Try Ultralytics YOLO
    # ---------------------------
    try:
        from ultralytics import YOLO
        model = YOLO(model_path)
        if hasattr(model, "names"):
            print("\n✅ Detected: Ultralytics YOLO")
            return model.names
    except Exception:
        pass

    # ---------------------------
    # Try PyTorch (.pt/.pth)
    # ---------------------------
    try:
        if torch is None:
            raise ImportError("torch not installed")
            
        model = torch.load(model_path, map_location="cpu")

        # Case 1: model object
        if hasattr(model, "names"):
            print("\n✅ Found names in model.names")
            return model.names

        if hasattr(model, "classes"):
            print("\n✅ Found names in model.classes")
            return model.classes

        # Case 2: checkpoint dict
        if isinstance(model, dict):
            if "names" in model:
                print("\n✅ Found names in checkpoint['names']")
                return model["names"]

            if "model" in model and hasattr(model["model"], "names"):
                print("\n✅ Found names in checkpoint['model'].names")
                return model["model"].names

    except Exception as e:
        print(f"⚠️ PyTorch load failed: {str(e)}")

    # ---------------------------
    # Try ONNX metadata
    # ---------------------------
    try:
        import onnx

        model = onnx.load(model_path)
        metadata = {p.key: p.value for p in model.metadata_props}

        if "names" in metadata:
            print("\n✅ Found names in ONNX metadata")
            return eval(metadata["names"])

    except Exception:
        pass

    # ---------------------------
    # Fallback
    # ---------------------------
    print("\n❌ Could not extract class names.")
    print("👉 Model likely does not store labels.")
    return None

if __name__ == "__main__":
    MODEL_PATH = sys.argv[1] if len(sys.argv) > 1 else "best.pt"

    classes = extract_classes(MODEL_PATH)

    if classes:
        print("\n📊 Classes Found:")
        # Format for frontend parsing
        class_list = []
        if isinstance(classes, dict):
            for k, v in classes.items():
                print(f"{k}: {v}")
                class_list.append(str(v))
        else:
            for i, name in enumerate(classes):
                print(f"{i}: {name}")
                class_list.append(str(name))
        
        # Secret marker for the backend service to grab the final list easily
        print("--- RESULT_START ---")
        print(",".join(class_list))
        print("--- RESULT_END ---")
