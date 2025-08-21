# PowerShell script to rename remaining image files to kebab-case ASCII

Write-Host "Starting file renaming..." -ForegroundColor Yellow

# Change to the images directory
Set-Location "images\WEBP_images"

# Define the mapping for remaining files that need renaming
$mapping = @{
    "2_hötorget exterior.webp" = "2-hotorget-exterior.webp"
    "6_musikafton hötorget.webp" = "6-musikafton-hotorget.webp"
    "10_tidnings articel invigning.webp" = "10-tidnings-articel-invigning.webp"
    "11_random graphics.webp" = "11-random-graphics.webp"
    "12_music afton hötorget.webp" = "12-music-afton-hotorget.webp"
    "13_storefront skrapan.webp" = "13-storefront-skrapan.webp"
    "14_invigning skrapan.webp" = "14-invigning-skrapan.webp"
    "16_Public högtorget.webp" = "16-public-hotorget.webp"
    "17_hologram building.webp" = "17-hologram-building.webp"
    "18_evenemäng at närkesgatan.webp" = "18-evenemang-at-narkesgatan.webp"
    "19_exterior skrapan.webp" = "19-exterior-skrapan.webp"
    "20_greg lecture närkesg.webp" = "20-greg-lecture-narkesg.webp"
    "21_happybirthday at närkesgtan.webp" = "21-happybirthday-at-narkesgtan.webp"
    "22_Jubelium pix-Patrick.webp" = "22-jubelium-pix-patrick.webp"
    "23_veiwing screen hötorget.webp" = "23-veiwing-screen-hotorget.webp"
    "24_jubelium pix genom skärmen - Patrick.webp" = "24-jubelium-pix-genom-skarmen-patrick.webp"
    "25_interior skrappan.webp" = "25-interior-skrappan.webp"
    "26_greg skollecture hötorget.webp" = "26-greg-skollecture-hotorget.webp"
    "27_Mai interior nov 15.webp" = "27-mai-interior-nov-15.webp"
    "28_survielence camera.webp" = "28-survielence-camera.webp"
    "29_stockholm AI högtorget.webp" = "29-stockholm-ai-hotorget.webp"
    "30_closeup aws poster.webp" = "30-closeup-aws-poster.webp"
    "31_Bob lecture.webp" = "31-bob-lecture.webp"
    "32_big screens at hötorget.webp" = "32-big-screens-at-hotorget.webp"
    "33_public hötorget.webp" = "33-public-hotorget.webp"
    "34_arc pussle.webp" = "34-arc-pussle.webp"
    "35_AI och music seminar.webp" = "35-ai-och-music-seminar.webp"
    "37_aws poster.webp" = "37-aws-poster.webp"
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
Write-Host "Renaming complete!" -ForegroundColor Green
