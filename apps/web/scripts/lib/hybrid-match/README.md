# Hybrid Match Pipeline Modules

`/scripts/run-hybrid-match.mjs` is the orchestration entrypoint only.

Core modules:
- `common.mjs`: numeric/tag utilities and shared primitives
- `self-development.mjs`: self-development extraction/merge and exploration need
- `evidence.mjs`: evidence allowlist + value/evidence validation
- `scoring.mjs`: deterministic scoring, blending, calibration, pair queue/cap selection
- `llm.mjs`: Gemini prediction wrapper with retry/fallback

Unit tests target these modules directly under `tests/unit`.
