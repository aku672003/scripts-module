from __future__ import annotations

import ast
import json
import logging
import re
from collections import Counter

import ollama

from backend.core.constants import DEFAULT_OLLAMA_MODEL
from backend.models.schemas import AnalysisResponse, DependencyDetail

logger = logging.getLogger(__name__)


def get_available_models() -> list[dict]:
    try:
        res = ollama.list()
        return res.get("models", []) if isinstance(res, dict) else [m.model_dump() if hasattr(m, 'model_dump') else m for m in res.models]
    except Exception as exc:
        logger.warning("Could not fetch ollama models: %s", exc)
        return []


def _chat_with_model(messages: list[dict[str, str]]) -> str:
    response = ollama.chat(model=DEFAULT_OLLAMA_MODEL, messages=messages)
    return response["message"]["content"].strip()


def infer_dependency_details(code: str, language: str) -> list[DependencyDetail]:
    dependencies: list[DependencyDetail] = []
    seen: set[str] = set()

    def add(name: str, purpose: str) -> None:
        key = name.lower()
        if key not in seen:
            seen.add(key)
            dependencies.append(DependencyDetail(name=name, purpose=purpose))

    if language == "python":
        # Handle 'import x', 'import x as y', 'from x import y', 'from x import y as z'
        for match in re.findall(r"^\s*import\s+([a-zA-Z0-9_\.]+)(?:\s+as\s+[a-zA-Z0-9_]+)?", code, flags=re.MULTILINE):
            for part in match.split(','):
                add(part.strip().split(".")[0], "Imported Python module.")
        for match in re.findall(r"^\s*from\s+([a-zA-Z0-9_\.]+)\s+import", code, flags=re.MULTILINE):
            add(match.split(".")[0], "Imported Python module.")
    elif language in {"javascript", "typescript"}:
        # Handle 'import ... from "x"', 'require("x")', 'import("x")'
        for match in re.findall(r"from\s+['\"]([^'\"]+)['\"]", code):
            add(match, "Imported package or module.")
        for match in re.findall(r"(?:require|import)\(['\"]([^'\"]+)['\"]\)", code):
            add(match, "Module dependency.")
    elif language == "bash":
        for tool in ("curl", "jq", "awk", "sed", "grep", "tar", "find", "ssh", "rsync"):
            if re.search(rf"\b{tool}\b", code):
                add(tool, "Command-line tool invoked by the script.")
    elif language == "go":
        for match in re.findall(r"^\s*\"([^\"]+)\"", code, flags=re.MULTILINE):
            add(match, "Imported Go package.")
    elif language == "rust":
        for match in re.findall(r"use\s+([a-zA-Z0-9_:]+)", code):
            add(match.split("::")[0], "Imported Rust crate or module.")
    elif language == "php":
        for match in re.findall(r"use\s+([a-zA-Z0-9_\\]+)", code):
            add(match.split("\\")[0], "Imported PHP namespace.")
    elif language == "ruby":
        for match in re.findall(r"require\s+['\"]([^'\"]+)['\"]", code):
            add(match, "Ruby dependency loaded at runtime.")
    elif language == "java":
        for match in re.findall(r"import\s+([a-zA-Z0-9_\.]+);", code):
            add(match.split(".")[0], "Imported Java package.")

    return dependencies[:10]


def infer_key_features(code: str, language: str) -> list[str]:
    features: list[str] = []

    def add(item: str) -> None:
        if item not in features:
            features.append(item)

    if re.search(r"\b(requests|get|post|fetch|axios|http|https)\b", code, flags=re.IGNORECASE):
        add("Performs network or API communication.")
    if re.search(r"\b(open|read|write|json|csv|pathlib|os\.path|fs\.)\b", code):
        add("Reads from or writes to files.")
    if re.search(r"\b(for|while|map|filter|reduce|forEach)\b", code):
        add("Processes data through iterative control flow.")
    if re.search(r"\b(try|except|catch|finally)\b", code):
        add("Includes explicit error handling paths.")
    if re.search(r"\b(thread|async|await|Promise|subprocess|multiprocessing)\b", code):
        add("Coordinates asynchronous or concurrent work.")
    if re.search(r"\b(class|def |function |fn |public static void main)\b", code):
        add("Defines reusable program structure.")
    if language == "bash":
        add("Designed for command-line automation.")
    if not features:
        add("Implements focused task-specific logic.")

    return features[:8]


def _infer_name(code: str, language: str) -> str:
    candidates = []
    if language == "python":
        candidates.extend(re.findall(r"^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)", code, flags=re.MULTILINE))
    elif language in {"javascript", "typescript"}:
        candidates.extend(re.findall(r"function\s+([a-zA-Z_][a-zA-Z0-9_]*)", code))
    elif language == "java":
        candidates.extend(re.findall(r"class\s+([A-Z][a-zA-Z0-9_]*)", code))

    if candidates:
        base = candidates[0].replace("_", " ").strip()
        return base[:120]

    dominant = Counter(re.findall(r"[a-zA-Z]{4,}", code.lower())).most_common(1)
    if dominant:
        return f"{dominant[0][0].title()} Protocol"[:120]
    return f"{language.title()} Protocol"


def _fallback_analysis(code: str, language: str | None = None, error: Exception | None = None) -> AnalysisResponse:
    detected_lang = language or _infer_language_from_prompt(code)
    line_count = len([line for line in code.splitlines() if line.strip()])
    dependencies = infer_dependency_details(code, detected_lang)
    features = infer_key_features(code, detected_lang)
    description = f"{detected_lang.title()} script with {line_count} non-empty lines."
    overview = (
        f"This {detected_lang} artifact contains {line_count} non-empty lines. "
        f"It appears to focus on {features[0].lower()}"
    )
    if error:
        overview += f" The local model path was unavailable, so this analysis used static inspection ({error})."
    return AnalysisResponse(
        name=_infer_name(code, detected_lang),
        description=description,
        technical_overview=overview,
        key_features=features,
        version="1.0.0",
        dependency_details=dependencies,
        quality_score="B",
        language=detected_lang,
    )
def analyze_model_file(filename: str) -> dict:
    prompt = f"""
Analyze the following AI model filename: {filename}
Generate a premium deployment protocol (Python) for this model.
The model is likely a YOLO (.pt) file or a similar weights file.
Extract the intended purpose, possible classes (e.g. if 'ppe' in name, suggest hard-hat, vest), and key features.
Return only valid JSON with keys:
name, description, technical_overview, key_features, version, dependency_details, quality_score, language, code, classes

Rules:
- name: A professional name for the protocol (e.g. "NEURAL VISION SYSTEM")
- code: A full, production-ready Python script using 'ultralytics' (for .pt) to load the model and run inference on a sample. Use generic placeholder paths.
- classes: array of strings representing detected object categories
- key_features: array of strings
- dependency_details: array of {{name, purpose}}
- quality_score: one of A+, A, A-, B+, B, B-, C+, C, C-, D, F
- do not wrap the JSON in markdown
""".strip()

    try:
        content = _chat_with_model(
            [
                {
                    "role": "system",
                    "content": "You are a Neural Architect. Produce strict JSON only.",
                },
                {"role": "user", "content": prompt},
            ]
        )
        return _extract_json_object(content)
    except Exception as exc:
        logger.error("Model forge analysis failed: %s", exc)
        return {
            "name": f"NEURAL_NODE_{filename.upper()}",
            "description": "Auto-generated neural protocol for weights file.",
            "technical_overview": "Basic inference pipeline generated via fallback logic.",
            "key_features": ["Automated Deployment", "Inference Pipeline"],
            "version": "1.0.0",
            "dependency_details": [{"name": "ultralytics", "purpose": "Model Core"}],
            "quality_score": "B",
            "language": "python",
            "code": f"# Neural Forge Fallback\nimport torch\n# Load {filename}...",
            "classes": ["Object_0", "Object_1"],
        }


def _extract_json_object(text: str) -> dict:
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        raise ValueError("Model response did not contain a JSON object.")
    return json.loads(match.group(0))


def analyze_code(code: str, language: str) -> AnalysisResponse:
    prompt = f"""
Analyze the following codebase fragment.
Return only valid JSON with keys:
name, description, author, technical_overview, key_features, version, dependency_details, quality_score, language

Rules:
- language: Detect the programming language (e.g., python, bash, javascript, typescript, go, rust, sql, php, java)
- key_features must be an array of short strings
- dependency_details must be an array of objects with name and purpose
- quality_score must be one of A+, A, A-, B+, B, B-, C+, C, C-, D, F
- do not wrap the JSON in markdown

CODE:
{code}
""".strip()

    try:
        content = _chat_with_model(
            [
                {
                    "role": "system",
                    "content": "You are a backend code auditor. Produce strict JSON only.",
                },
                {"role": "user", "content": prompt},
            ]
        )
        payload = _extract_json_object(content)
        fallback = _fallback_analysis(code, language)
        merged = {
            **fallback.model_dump(mode="json"),
            **payload,
        }
        return AnalysisResponse.model_validate(merged)
    except Exception as exc:
        logger.warning("analysis fallback engaged: %s", exc)
        return _fallback_analysis(code, language, exc)


def _infer_language_from_prompt(prompt: str, language: str | None = None) -> str:
    if language:
        return language

    prompt_lower = prompt.lower()
    aliases = {
        "bash": ("bash", "shell", "linux", "terminal", "script"),
        "python": ("python", "pandas", "fastapi", "flask"),
        "javascript": ("javascript", "node", "react", "js"),
        "sql": ("sql", "query", "database"),
    }
    for candidate, keywords in aliases.items():
        if any(keyword in prompt_lower for keyword in keywords):
            return candidate
    return "python"


def _starter_script(language: str) -> str:
    if language == "bash":
        return """#!/usr/bin/env bash
set -euo pipefail

main() {
  echo "Implement your automation here"
}

main "$@"
"""
    if language in {"javascript", "typescript"}:
        return """async function main() {
  console.log("Implement your automation here");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
"""
    if language == "sql":
        return """-- Implement your query here
SELECT 1 AS status;
"""
    return """def main() -> None:
    print("Implement your automation here")


if __name__ == "__main__":
    main()
"""


def generate_chat_response(prompt: str, history: list[Any] | None = None) -> str:
    messages = [
        {
            "role": "system",
            "content": "You are a helpful and expert AI assistant. Provide clear, accurate, and professional responses in markdown format."
        }
    ]
    
    if history:
        for msg in history:
            # Handle both dict and object with .role/.text
            role_val = msg.get("role") if isinstance(msg, dict) else getattr(msg, "role", "bot")
            text_val = msg.get("text") if isinstance(msg, dict) else getattr(msg, "text", "")
            
            # Map 'bot' role to 'assistant' for LLM compatibility
            role = "assistant" if role_val == "bot" else "user"
            messages.append({"role": role, "content": text_val})
    
    messages.append({"role": "user", "content": prompt})

    try:
        return _chat_with_model(messages)
    except Exception as exc:
        logger.warning("chat fallback engaged: %s", exc)
        return f"I am currently having trouble connecting to my neural core. Error: {str(exc)}"


def sandbox_simulation(code: str) -> str:
    analysis = _fallback_analysis(code, "python" if "def " in code else "bash")
    try:
        content = _chat_with_model(
            [
                {
                    "role": "system",
                    "content": (
                        "You simulate code behavior without execution. "
                        "Return a concise analysis followed by likely stdout or side effects."
                    ),
                },
                {"role": "user", "content": code},
            ]
        )
        return content
    except Exception as exc:
        logger.warning("sandbox fallback engaged: %s", exc)
        feature_lines = "\n".join(f"- {item}" for item in analysis.key_features)
        return (
            "Static simulation only.\n"
            f"Likely purpose: {analysis.description}\n"
            f"Observed traits:\n{feature_lines}\n"
            "Predicted stdout: depends on the runtime inputs and environment."
        )

