# Run API with .venv Python (avoids global uvicorn/python on PATH).
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Py = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $Py)) {
    Write-Error "Missing $Py - create venv: py -3.11 -m venv .venv then pip install -r requirements.txt"
}
& $Py -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 @args
