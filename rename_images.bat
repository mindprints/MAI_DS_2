@echo off
echo ========================================
echo   Museum AI Image Renaming Script
echo ========================================
echo.
echo This script will rename all image files to use
echo kebab-case ASCII filenames for better compatibility.
echo.
echo Current directory: %CD%
echo.
pause

cd images\WEBP_images

echo.
echo Starting file renaming...
echo.

ren "1_Museums logo.webp" "1-museums-logo.webp"
ren "2_hötorget exterior.webp" "2-hotorget-exterior.webp"
ren "3_Greg lecturing in museum.webp" "3-greg-lecturing-in-museum.webp"
ren "4_max demonstrate for gregor.webp" "4-max-demonstrate-for-gregor.webp"
ren "5_three robot faces.webp" "5-three-robot-faces.webp"
ren "6_musikafton hötorget.webp" "6-musikafton-hotorget.webp"
ren "7_platon robot 2.webp" "7-platon-robot-2.webp"
ren "8_greg closeup lecture.webp" "8-greg-closeup-lecture.webp"
ren "10_tidnings articel invigning.webp" "10-tidnings-articel-invigning.webp"
ren "11_random graphics.webp" "11-random-graphics.webp"
ren "12_music afton hötorget.webp" "12-music-afton-hotorget.webp"
ren "13_storefront skrapan.webp" "13-storefront-skrapan.webp"
ren "14_invigning skrapan.webp" "14-invigning-skrapan.webp"
ren "16_Public högtorget.webp" "16-public-hotorget.webp"
ren "17_hologram building.webp" "17-hologram-building.webp"
ren "18_evenemäng at närkesgatan.webp" "18-evenemang-at-narkesgatan.webp"
ren "19_exterior skrapan.webp" "19-exterior-skrapan.webp"
ren "20_greg lecture närkesg.webp" "20-greg-lecture-narkesg.webp"
ren "21_happybirthday at närkesgtan.webp" "21-happybirthday-at-narkesgtan.webp"
ren "22_Jubelium pix-Patrick.webp" "22-jubelium-pix-patrick.webp"
ren "23_veiwing screen hötorget.webp" "23-veiwing-screen-hotorget.webp"
ren "24_jubelium pix genom skärmen - Patrick.webp" "24-jubelium-pix-genom-skarmen-patrick.webp"
ren "25_interior skrappan.webp" "25-interior-skrappan.webp"
ren "26_greg skollecture hötorget.webp" "26-greg-skollecture-hotorget.webp"
ren "27_Mai interior nov 15.webp" "27-mai-interior-nov-15.webp"
ren "28_survielence camera.webp" "28-survielence-camera.webp"
ren "29_stockholm AI högtorget.webp" "29-stockholm-ai-hotorget.webp"
ren "30_closeup aws poster.webp" "30-closeup-aws-poster.webp"
ren "31_Bob lecture.webp" "31-bob-lecture.webp"
ren "32_big screens at hötorget.webp" "32-big-screens-at-hotorget.webp"
ren "33_public hötorget.webp" "33-public-hotorget.webp"
ren "34_arc pussle.webp" "34-arc-pussle.webp"
ren "35_AI och music seminar.webp" "35-ai-och-music-seminar.webp"
ren "37_aws poster.webp" "37-aws-poster.webp"

echo.
echo ========================================
echo   Renaming Complete!
echo ========================================
echo.
echo All image files have been renamed to use
echo kebab-case ASCII filenames.
echo.
echo The JavaScript code has already been updated
echo to use these new filenames.
echo.
echo Next steps:
echo 1. Test the website to ensure images load
echo 2. Check browser console for any 404 errors
echo 3. Verify slideshow functionality
echo.
pause
