$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$taskPython = Join-Path $taskRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) {
    throw '먼저 README의 Python 설치 단계를 실행해 주세요.'
}
& $taskPython -X utf8 (Join-Path $PSScriptRoot 'bridge.py')
