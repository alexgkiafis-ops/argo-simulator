<# Exports the pitch deck as images for the slides on the site (docs/05, decision 36): one PNG per slide, 1920 px
   wide, into design/draft-v2/slides/ (slide-01.png, slide-02.png ...), plus slides/deck.js, the list the page reads
   (slides.js). PowerPoint draws them, so they look exactly as in PowerPoint; the deck's fonts (Inter, Space Grotesk,
   JetBrains Mono) must be installed, as they are on Alex's laptop. Hidden slides are left out.

   Usage, from argo-plan (default deck: new_local_slides.pptx in Downloads):
     powershell -ExecutionPolicy Bypass -File tools/slides/export-slides.ps1 [path\to\deck.pptx]
   then rebuild and publish the site (the commands are in tools/site/make-site.js). #>
param([string]$Deck = (Join-Path $env:USERPROFILE 'Downloads\new_local_slides.pptx'), [int]$Width = 1920)
$ErrorActionPreference = 'Stop'
$Deck = (Resolve-Path -LiteralPath $Deck).Path
$out = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'design\draft-v2\slides'
New-Item -ItemType Directory -Force $out | Out-Null

# PowerPoint opens an unblocked copy in a folder of its own (a downloaded deck would otherwise open in Protected View)
$tmp = Join-Path ([IO.Path]::GetTempPath()) ('argo-slides-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory $tmp | Out-Null
$copy = Join-Path $tmp 'deck.pptx'
Copy-Item -LiteralPath $Deck $copy
Unblock-File $copy

$wasRunning = [bool](Get-Process POWERPNT -ErrorAction SilentlyContinue)   # never close a PowerPoint Alex has open
$ppt = New-Object -ComObject PowerPoint.Application
$files = @()
try {
  $pres = $ppt.Presentations.Open($copy, -1, 0, 0)   # read-only, no window
  try {
    $h = [int][Math]::Round($Width * $pres.PageSetup.SlideHeight / $pres.PageSetup.SlideWidth)
    Get-ChildItem $out -Filter 'slide-*.png' | Remove-Item
    foreach ($s in $pres.Slides) {
      if ($s.SlideShowTransition.Hidden -eq -1) { continue }
      $name = 'slide-{0:D2}.png' -f ($files.Count + 1)
      $s.Export((Join-Path $out $name), 'PNG', $Width, $h)
      $files += $name
    }
  } finally { $pres.Close() }
} finally {
  if (-not $wasRunning -and $ppt.Presentations.Count -eq 0) { $ppt.Quit() }
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($ppt)
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

$list = ($files | ForEach-Object { "'$_'" }) -join ', '
$js = "/* Made by tools/slides/export-slides.ps1 from $(Split-Path -Leaf $Deck) on $(Get-Date -Format 'yyyy-MM-dd HH:mm'): the slides in order (slides.js) */`nwindow.ARGO_SLIDES = [$list];`n"
[IO.File]::WriteAllText((Join-Path $out 'deck.js'), $js)   # UTF-8, no BOM
"$($files.Count) slides, $Width x $h px, in $out"
