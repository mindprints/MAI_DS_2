# Filename Mapping: Old to New Kebab-Case ASCII

This file maps the old filenames (with spaces, special characters, and non-ASCII) to new kebab-case ASCII filenames for better server compatibility.

## Why This Change?

- **Server Compatibility**: Avoids issues with different operating systems and web servers
- **URL Encoding**: Eliminates need for URL encoding in different environments
- **Consistency**: Standardizes naming convention across the project
- **Maintenance**: Makes the codebase easier to maintain and deploy

## Complete Filename Mapping

| Number | Old Filename | New Filename | Description |
|--------|--------------|--------------|-------------|
| 1 | `1_Museums logo.webp` | `1-museums-logo.webp` | Museum Logo |
| 2 | `2_h+Âtorget exterior.webp` | `2-hotorget-exterior.webp` | H+Âtorget Exterior |
| 3 | `3_Greg lecturing in museum.webp` | `3-greg-lecturing-in-museum.webp` | AI Lecture |
| 4 | `4_max demonstrate for gregor.webp` | `4-max-demonstrate-for-gregor.webp` | Live Demo |
| 5 | `5_three robot faces.webp` | `5-three-robot-faces.webp` | Robot Gallery |
| 6 | `6_musikafton h+Âtorget.webp` | `6-musikafton-hotorget.webp` | Music & AI |
| 7 | `7_platon robot 2.webp` | `7-platon-robot-2.webp` | Platon Robot |
| 8 | `8_greg closeup lecture.webp` | `8-greg-closeup-lecture.webp` | Expert Lecture |
| 10 | `10_tidnings articel invigning.webp` | `10-tidnings-articel-invigning.webp` | Opening Ceremony |
| 11 | `11_random graphics.webp` | `11-random-graphics.webp` | Digital Art |
| 12 | `12_music afton h+Âtorget.webp` | `12-music-afton-hotorget.webp` | Music Evening |
| 13 | `13_storefront skrapan.webp` | `13-storefront-skrapan.webp` | Storefront |
| 14 | `14_invigning skrapan.webp` | `14-invigning-skrapan.webp` | Inauguration |
| 16 | `16_Public h+Âgtorget.webp` | `16-public-hotorget.webp` | Public Space |
| 17 | `17_hologram building.webp` | `17-hologram-building.webp` | Hologram Display |
| 18 | `18_evenem+ñng at n+ñrkesgatan.webp` | `18-evenemang-at-narkesgatan.webp` | Street Event |
| 19 | `19_exterior skrapan.webp` | `19-exterior-skrapan.webp` | Skrapan Exterior |
| 20 | `20_greg lecture n+ñrkesg.webp` | `20-greg-lecture-narkesg.webp` | Lecture Series |
| 21 | `21_happybirthday at n+ñrkesgtan.webp` | `21-happybirthday-at-narkesgtan.webp` | Celebration |
| 22 | `22_Jubelium pix-Patrick.webp` | `22-jubelium-pix-patrick.webp` | Jubilee |
| 23 | `23_veiwing screen h+Âtorget.webp` | `23-veiwing-screen-hotorget.webp` | Viewing Screen |
| 24 | `24_jubelium pix genom sk+ñrmen - Patrick.webp` | `24-jubelium-pix-genom-skarmen-patrick.webp` | Through the Screen |
| 25 | `25_interior skrappan.webp` | `25-interior-skrappan.webp` | Interior Design |
| 26 | `26_greg skollecture h+Âtorget.webp` | `26-greg-skollecture-hotorget.webp` | School Lecture |
| 27 | `27_Mai interior nov 15.webp` | `27-mai-interior-nov-15.webp` | MAI Interior |
| 28 | `28_survielence camera.webp` | `28-survielence-camera.webp` | Surveillance |
| 29 | `29_stockholm AI h+Âgtorget.webp` | `29-stockholm-ai-hotorget.webp` | Stockholm AI |
| 30 | `30_closeup aws poster.webp` | `30-closeup-aws-poster.webp` | AWS Partnership |
| 31 | `31_Bob lecture.webp` | `31-bob-lecture.webp` | Bob's Lecture |
| 32 | `32_big screens at h+Âtorget.webp` | `32-big-screens-at-hotorget.webp` | Big Screens |
| 33 | `33_public h+Âtorget.webp` | `33-public-hotorget.webp` | Public Gathering |
| 34 | `34_arc pussle.webp` | `34-arc-pussle.webp` | Arc Puzzle |
| 35 | `35_AI och music seminar.webp` | `35-ai-och-music-seminar.webp` | AI Music Seminar |
| 37 | `37_aws poster.webp` | `37-aws-poster.webp` | AWS Exhibit |

## Character Replacements Made

- **Spaces** ÔåÆ **Hyphens** (` ` ÔåÆ `-`)
- **Underscores** ÔåÆ **Hyphens** (`_` ÔåÆ `-`)
- **Special Characters** ÔåÆ **ASCII equivalents**:
  - `+Â` ÔåÆ `o` (h+Âtorget ÔåÆ hotorget)
  - `+ñ` ÔåÆ `a` (n+ñrkesgatan ÔåÆ narkesgatan)
  - `+Ñ` ÔåÆ `a` (n+ñrkesg ÔåÆ narkesg)
  - `+ñ` ÔåÆ `a` (n+ñrkesgtan ÔåÆ narkesgtan)
  - `+ñ` ÔåÆ `a` (sk+ñrmen ÔåÆ skarmen)
- **Capitalization** ÔåÆ **Lowercase** (except for proper nouns in titles)

## How to Rename Files

### Option 1: Manual Renaming (Recommended for small numbers)
1. Navigate to `images/WEBP_images/`
2. Rename each file according to the mapping above
3. Ensure the JavaScript code has been updated (already done)

### Option 2: Batch Script (Windows)
```batch
@echo off
cd images\WEBP_images
ren "1_Museums logo.webp" "1-museums-logo.webp"
ren "2_h+Âtorget exterior.webp" "2-hotorget-exterior.webp"
ren "3_Greg lecturing in museum.webp" "3-greg-lecturing-in-museum.webp"
ren "4_max demonstrate for gregor.webp" "4-max-demonstrate-for-gregor.webp"
ren "5_three robot faces.webp" "5-three-robot-faces.webp"
ren "6_musikafton h+Âtorget.webp" "6-musikafton-hotorget.webp"
ren "7_platon robot 2.webp" "7-platon-robot-2.webp"
ren "8_greg closeup lecture.webp" "8-greg-closeup-lecture.webp"
ren "10_tidnings articel invigning.webp" "10-tidnings-articel-invigning.webp"
ren "11_random graphics.webp" "11-random-graphics.webp"
ren "12_music afton h+Âtorget.webp" "12-music-afton-hotorget.webp"
ren "13_storefront skrapan.webp" "13-storefront-skrapan.webp"
ren "14_invigning skrapan.webp" "14-invigning-skrapan.webp"
ren "16_Public h+Âgtorget.webp" "16-public-hotorget.webp"
ren "17_hologram building.webp" "17-hologram-building.webp"
ren "18_evenem+ñng at n+ñrkesgatan.webp" "18-evenemang-at-narkesgatan.webp"
ren "19_exterior skrapan.webp" "19-exterior-skrapan.webp"
ren "20_greg lecture n+ñrkesg.webp" "20-greg-lecture-narkesg.webp"
ren "21_happybirthday at n+ñrkesgtan.webp" "21-happybirthday-at-narkesgtan.webp"
ren "22_Jubelium pix-Patrick.webp" "22-jubelium-pix-patrick.webp"
ren "23_veiwing screen h+Âtorget.webp" "23-veiwing-screen-hotorget.webp"
ren "24_jubelium pix genom sk+ñrmen - Patrick.webp" "24-jubelium-pix-genom-skarmen-patrick.webp"
ren "25_interior skrappan.webp" "25-interior-skrappan.webp"
ren "26_greg skollecture h+Âtorget.webp" "26-greg-skollecture-hotorget.webp"
ren "27_Mai interior nov 15.webp" "27-mai-interior-nov-15.webp"
ren "28_survielence camera.webp" "28-survielence-camera.webp"
ren "29_stockholm AI h+Âgtorget.webp" "29-stockholm-ai-hotorget.webp"
ren "30_closeup aws poster.webp" "30-closeup-aws-poster.webp"
ren "31_Bob lecture.webp" "31-bob-lecture.webp"
ren "32_big screens at h+Âtorget.webp" "32-big-screens-at-hotorget.webp"
ren "33_public h+Âtorget.webp" "33-public-hotorget.webp"
ren "34_arc pussle.webp" "34-arc-pussle.webp"
ren "35_AI och music seminar.webp" "35-ai-och-music-seminar.webp"
ren "37_aws poster.webp" "37-aws-poster.webp"
echo Renaming complete!
pause
```

### Option 3: PowerShell Script
```powershell
$mapping = @{
    "1_Museums logo.webp" = "1-museums-logo.webp"
    "2_h+Âtorget exterior.webp" = "2-hotorget-exterior.webp"
    "3_Greg lecturing in museum.webp" = "3-greg-lecturing-in-museum.webp"
    "4_max demonstrate for gregor.webp" = "4-max-demonstrate-for-gregor.webp"
    "5_three robot faces.webp" = "5-three-robot-faces.webp"
    "6_musikafton h+Âtorget.webp" = "6-musikafton-hotorget.webp"
    "7_platon robot 2.webp" = "7-platon-robot-2.webp"
    "8_greg closeup lecture.webp" = "8-greg-closeup-lecture.webp"
    "10_tidnings articel invigning.webp" = "10-tidnings-articel-invigning.webp"
    "11_random graphics.webp" = "11-random-graphics.webp"
    "12_music afton h+Âtorget.webp" = "12-music-afton-hotorget.webp"
    "13_storefront skrapan.webp" = "13-storefront-skrapan.webp"
    "14_invigning skrapan.webp" = "14-invigning-skrapan.webp"
    "16_Public h+Âgtorget.webp" = "16-public-hotorget.webp"
    "17_hologram building.webp" = "17-hologram-building.webp"
    "18_evenem+ñng at n+ñrkesgatan.webp" = "18-evenemang-at-narkesgatan.webp"
    "19_exterior skrapan.webp" = "19-exterior-skrapan.webp"
    "20_greg lecture n+ñrkesg.webp" = "20-greg-lecture-narkesg.webp"
    "21_happybirthday at n+ñrkesgtan.webp" = "21-happybirthday-at-narkesgtan.webp"
    "22_Jubelium pix-Patrick.webp" = "22-jubelium-pix-patrick.webp"
    "23_veiwing screen h+Âtorget.webp" = "23-veiwing-screen-hotorget.webp"
    "24_jubelium pix genom sk+ñrmen - Patrick.webp" = "24-jubelium-pix-genom-skarmen-patrick.webp"
    "25_interior skrappan.webp" = "25-interior-skrappan.webp"
    "26_greg skollecture h+Âtorget.webp" = "26-greg-skollecture-hotorget.webp"
    "27_Mai interior nov 15.webp" = "27-mai-interior-nov-15.webp"
    "28_survielence camera.webp" = "28-survielence-camera.webp"
    "29_stockholm AI h+Âgtorget.webp" = "29-stockholm-ai-hotorget.webp"
    "30_closeup aws poster.webp" = "30-closeup-aws-poster.webp"
    "31_Bob lecture.webp" = "31-bob-lecture.webp"
    "32_big screens at h+Âtorget.webp" = "32-big-screens-at-hotorget.webp"
    "33_public h+Âtorget.webp" = "33-public-hotorget.webp"
    "34_arc pussle.webp" = "34-arc-pussle.webp"
    "35_AI och music seminar.webp" = "35-ai-och-music-seminar.webp"
    "37_aws poster.webp" = "37-aws-poster.webp"
}

Set-Location "images\WEBP_images"
foreach ($old in $mapping.Keys) {
    if (Test-Path $old) {
        Rename-Item $old $mapping[$old]
        Write-Host "Renamed: $old ÔåÆ $($mapping[$old])"
    } else {
        Write-Host "File not found: $old"
    }
}
Write-Host "Renaming complete!"
```

## Verification

After renaming:
1. **Check JavaScript**: Ensure `script.js` uses the new filenames (already updated)
2. **Test Website**: Verify all images load correctly
3. **Check Console**: No 404 errors for image requests
4. **Cross-Platform**: Test on different operating systems if possible

## Benefits of This Change

- Ô£à **Universal Compatibility**: Works on all servers and operating systems
- Ô£à **No URL Encoding**: Clean, readable URLs
- Ô£à **Easier Maintenance**: Consistent naming convention
- Ô£à **Better SEO**: Search engines prefer clean URLs
- Ô£à **Reduced Errors**: Eliminates special character encoding issues
