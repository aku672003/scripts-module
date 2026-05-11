import subprocess
import os
import yaml
import asyncio
from pathlib import Path

async def run_forge_script(file_path):
    # Ensure the dataset path exists for the script
    dataset_path = "dataset"
    if not os.path.exists(dataset_path):
        os.makedirs(dataset_path)
        with open(os.path.join(dataset_path, "classes.txt"), "w") as f:
            f.write("car\ntruck\npedestrian\ntraffic_light\n")

    # The user's script path
    script_path = "backend/scripts/forge_engine.py"
    
    # Run the script and capture output
    process = await asyncio.create_subprocess_exec(
        "python3", script_path, file_path,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    
    stdout, stderr = await process.communicate()
    
    output = stdout.decode()
    error = stderr.decode()
    
    # Parse results from the script's output
    classes = ["unknown"]
    if "--- RESULT_START ---" in output:
        try:
            class_part = output.split("--- RESULT_START ---")[1].split("--- RESULT_END ---")[0]
            classes = [c.strip() for c in class_part.split(",") if c.strip()]
        except:
            pass

    # Load the generated YAML to return its info
    yaml_info = {}
    if os.path.exists("data.yaml"):
        with open("data.yaml", "r") as f:
            yaml_info = yaml.safe_load(f)

    return {
        "logs": output.split("--- RESULT_START ---")[0] + (output.split("--- RESULT_END ---")[1] if "--- RESULT_END ---" in output else ""),
        "error": error,
        "classes": classes,
        "yaml": yaml_info
    }
