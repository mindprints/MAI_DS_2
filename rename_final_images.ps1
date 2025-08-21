# Final PowerShell script to rename remaining image files to kebab-case ASCII

Write-Host "Starting final file renaming..." -ForegroundColor Yellow

# Change to the images directory
Set-Location "images\WEBP_images"

# Define the mapping for files that actually exist with old names
$mapping = @{
    "2_hötorget exterior.webp" = "2-hotorget-exterior.webp"
    "6_musikafton hötorget.webp" = "6-musikafton-hotorget.webp"
    "10_tidnings articel invigning.webp" = "10-tidnings-articel-invigning.webp"
    "12_music afton hötorget.webp" = "12-music-afton-hotorget.webp"
    "16_Public högtorget.webp" = "16-public-hotorget.webp"
    "18_evenemäng at närkesgatan.webp" = "18-evenemang-at-narkesgatan.webp"
    "20_greg lecture närkesg.webp" = "20-greg-lecture-narkesg.webp"
    "21_happybirthday at närkesgtan.webp" = "21-happybirthday-at-narkesgtan.webp"
    "23_veiwing screen hötorget.webp" = "23-veiwing-screen-hotorget.webp"
    "24_jubelium pix genom skärmen - Patrick.webp" = "24-jubelium-pix-genom-skarmen-patrick.webp"
    "26_greg skollecture hötorget.webp" = "26-greg-skollecture-hotorget.webp"
    "29_stockholm AI högtorget.webp" = "29-stockholm-ai-hotorget.webp"
    "32_big screens at hötorget.webp" = "32-big-screens-at-hotorget.webp"
    "33_public hötorget.webp" = "33-public-hotorget.webp"
}

$renamedCount = 0
$notFoundCount = 0

foreach ($old in $mapping.Keys) {
    if (Test-Path $old) {
        try {
            Rename-Item $old $mapping[$old]
            Write-Host "Renamed: $old → $($mapping[$old])" -ForegroundColor Green
            $renamedCount++
        }
        catch {
            Write-Host "Error renaming $old : $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "File not found: $old" -ForegroundColor Yellow
        $notFoundCount++
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "Files renamed: $renamedCount" -ForegroundColor Green
Write-Host "Files not found: $notFoundCount" -ForegroundColor Yellow
Write-Host "Final renaming complete!" -ForegroundColor Green
