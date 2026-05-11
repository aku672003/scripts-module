import os
import yaml
import time
import sys

# =========================
# ⚙️ CONFIG
# =========================
DATASET_PATH = "dataset"
OUTPUT_FILE = "data.yaml"

def load_classes(dataset_path):
    class_file = os.path.join(dataset_path, "classes.txt")
    if not os.path.exists(class_file):
        # For simulation/demo purposes, we'll look in the root if not in /dataset
        class_file = "classes.txt" if os.path.exists("classes.txt") else class_file
        if not os.path.exists(class_file):
            raise FileNotFoundError("classes.txt not found")

    with open(class_file, "r") as f:
        classes = [line.strip() for line in f.readlines() if line.strip()]
    return classes

def generate_yaml(dataset_path):
    print(f"📂 [INFO] Scanning dataset path: {dataset_path}")
    time.sleep(0.5)
    classes = load_classes(dataset_path)
    print(f"🧠 [INFO] Classes identified: {', '.join(classes)}")
    
    data = {
        "path": os.path.abspath(dataset_path),
        "train": "images/train",
        "val": "images/val",
        "names": classes,
        "nc": len(classes)
    }
    return data

def save_yaml(data, output_file):
    with open(output_file, "w") as f:
        yaml.dump(data, f, sort_keys=False)

if __name__ == "__main__":
    try:
        # If a file is passed as argument, we treat its directory as the dataset path
        target_path = sys.argv[1] if len(sys.argv) > 1 else DATASET_PATH
        
        print(f"🚀 [SYSTEM] Initializing Dataset Forge Engine...")
        time.sleep(0.6)
        
        yaml_data = generate_yaml(target_path)
        save_yaml(yaml_data, OUTPUT_FILE)
        
        print("--- RESULT_START ---")
        print(",".join(yaml_data["names"]))
        print("--- RESULT_END ---")
        
        time.sleep(0.4)
        print("✅ data.yaml generated successfully!")
    except Exception as e:
        print(f"❌ [ERROR] {str(e)}")
