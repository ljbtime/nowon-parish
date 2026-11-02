param([string]$msg = "")
# 저장 + 배포: main 에 푸시하면 사이트(hosting)는 GitHub Actions 가 자동 배포하고,
# 보안 규칙·색인(firestore)은 여기서 직접 배포한다.
# 중간에 실패하면 멈춘다(커밋 실패·충돌 상태로 배포되는 것을 막음).
# Storage 는 아직 켜져 있지 않아 storage.rules 는 배포하지 않는다.
if (-not $msg) { $msg = "update: " + (Get-Date -Format "yyyy-MM-dd HH:mm") }
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "main") { Write-Host "지금 브랜치는 '$branch' 입니다. main 에서만 실행하세요." -ForegroundColor Red; exit 1 }
git pull
if ($LASTEXITCODE -ne 0) { Write-Host "git pull 실패 - 충돌을 먼저 해결하세요." -ForegroundColor Red; exit 1 }
git add .
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m $msg
  if ($LASTEXITCODE -ne 0) { Write-Host "커밋 실패" -ForegroundColor Red; exit 1 }
}
firebase deploy --only firestore --project nowon-catholic
if ($LASTEXITCODE -ne 0) { Write-Host "규칙 배포 실패 - 푸시(사이트 배포)를 중단합니다." -ForegroundColor Red; exit 1 }
git push
if ($LASTEXITCODE -ne 0) { Write-Host "git push 실패" -ForegroundColor Red; exit 1 }
Write-Host "완료: 규칙 배포됨, 사이트는 1~2분 뒤 GitHub Actions 로 반영됩니다." -ForegroundColor Green
