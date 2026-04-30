$files = Get-ChildItem -Recurse -Include *.tsx -Path components,pages -ErrorAction SilentlyContinue

$orphanPatterns = @(
  '\s+dark:bg-gray-\d+\b',
  '\s+dark:bg-slate-\d+\b',
  '\s+dark:bg-zinc-\d+\b',
  '\s+dark:text-gray-\d+\b',
  '\s+dark:text-slate-\d+\b',
  '\s+dark:text-zinc-\d+\b',
  '\s+dark:text-white\b',
  '\s+dark:border-gray-\d+\b',
  '\s+dark:border-slate-\d+\b',
  '\s+dark:hover:bg-gray-\d+\b',
  '\s+dark:hover:bg-slate-\d+\b',
  '\s+dark:hover:text-gray-\d+\b',
  '\s+dark:hover:text-white\b',
  '\s+dark:divide-gray-\d+\b',
  '\s+dark:placeholder-gray-\d+\b',
  '\s+dark:ring-gray-\d+\b'
)

$total = 0
foreach ($f in $files) {
  $orig = [System.IO.File]::ReadAllText($f.FullName)
  $content = $orig
  foreach ($p in $orphanPatterns) { $content = [regex]::Replace($content, $p, '') }
  if ($content -ne $orig) {
    [System.IO.File]::WriteAllText($f.FullName, $content)
    Write-Host "cleaned: $($f.FullName)"
    $total++
  }
}
Write-Host "Files cleaned: $total"
