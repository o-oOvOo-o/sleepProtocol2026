# Simple flag renaming script
Write-Host "Starting flag renaming..." -ForegroundColor Green

Set-Location "public\images\Countries"

# Flag mappings
$mappings = @{
    "A (17).png" = "AU.png"
    "A (32).png" = "BR.png"
    "A (72).png" = "CA.png"
    "A (35).png" = "CN.png"
    "A (68).png" = "FR.png"
    "A (67).png" = "DE.png"
    "A (40).png" = "IN.png"
    "A (46).png" = "IT.png"
    "A (48).png" = "JP.png"
    "A (71).png" = "MX.png"
    "A (76).png" = "NL.png"
    "A (75).png" = "NO.png"
    "A (74).png" = "RU.png"
    "A (38).png" = "SG.png"
    "A (73).png" = "KR.png"
    "A (69).png" = "ES.png"
    "A (70).png" = "SE.png"
    "A (77).png" = "CH.png"
    "A (66).png" = "UK.png"
    "A (65).png" = "US.png"
}

$success = 0
foreach ($mapping in $mappings.GetEnumerator()) {
    $source = $mapping.Key
    $target = $mapping.Value
    
    if (Test-Path $source) {
        Copy-Item $source $target
        Write-Host "Copied $source to $target" -ForegroundColor Cyan
        $success++
    } else {
        Write-Host "File not found: $source" -ForegroundColor Yellow
    }
}

Write-Host "Completed! $success files renamed." -ForegroundColor Green
