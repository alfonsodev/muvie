# Services

Backend services and data pipelines for the Muvi platform.

Each service lives in its own subdirectory with its own dependencies and configuration.

## Structure

| Directory    | Description                                      |
|-------------|--------------------------------------------------|
| `pipeline/` | Dagster data pipeline — movie data and processing |

## Adding a service

Create a subdirectory here with its own `README.md` and tooling config (e.g. `pyproject.toml` for Python services).
