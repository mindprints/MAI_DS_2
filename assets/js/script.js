// Copied from root script.js
// Add slide-in animations when elements come into view
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('slide-in');
        }
    });
}, { threshold: 0.2 });

document.querySelectorAll('.feature-card').forEach(card => {
    observer.observe(card);
});



// Dynamic image slideshow system
document.addEventListener('DOMContentLoaded', async () => {
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Configuration
    const config = {
        visibleSlides: 4, // Number of slides to show at once (1 main + 3 underneath)
        rotationInterval: 6000, // Time between rotations in milliseconds
        transitionDuration: 2000, // Transition duration in milliseconds
        shuffleSlides: true // Randomize order of slides on each load
    };

    // Slides data loaded from manifest
    let imageData = [];
    

    // Get slideshow container
    const container = document.getElementById('slideshow-container');

    // Determine correct base path for images depending on current page location
    const imageBasePath = (() => {
        const p = (window.location && window.location.pathname) ? window.location.pathname : '';
        if (p.includes('/sv/pages/')) {
            // From /sv/pages/* â†’ up two levels
            return '../../images/slide/';
        }
        if (p.includes('/sv/')) {
            // From /sv/* â†’ up one level
            return '../images/slide/';
        }
        if (p.includes('/pages/')) {
            // From /pages/* â†’ up one level
            return '../images/slide/';
        }
        // From root
        return 'images/slide/';
    })();

    // Shuffle helper (returns a new array)
    function shuffleArray(array) {
        const arr = array.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // Try to load slides manifest from images/slide/slides.json
    async function tryLoadSlidesManifest() {
        const url = imageBasePath + 'slides.json';
        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) return false;
            const data = await res.json();
            if (!Array.isArray(data)) return false;
            // Basic normalization: ensure objects have filename
            let normalized = data
                .filter(item => item && typeof item.filename === 'string')
                .map((item, idx) => ({
                    number: typeof item.number === 'number' ? item.number : (idx + 1),
                    filename: item.filename,
                    title: typeof item.title === 'string' && item.title.trim() ? item.title : item.filename,
                    description: typeof item.description === 'string' ? item.description : ''
                }));
            if (normalized.length > 0) {
                if (config.shuffleSlides) {
                    normalized = shuffleArray(normalized);
                }
                imageData = normalized;
                return true;
            }
            return false;
        } catch (e) {
            // Likely running without a server or manifest missing; fall back silently
            return false;
        }
    }

    // Create slide elements dynamically
    function createSlide(imageInfo, index, loadImmediately = false) {
        const slide = document.createElement('div');
        slide.className = 'glass-card rounded-xl overflow-hidden w-full h-full absolute transition-all duration-1000 ease-in-out z-0 opacity-0 slide-hidden';
        slide.dataset.slideIndex = index;

        // When loadImmediately is false, render a placeholder with a spinner and
        // store the image path in data-src for later loading.
        slide.innerHTML = `
            <div class="bg-gray-800 w-full h-full">
                <div class="h-full w-full overflow-hidden relative">
                    ${loadImmediately ? `
                        <img src="${imageBasePath}${imageInfo.filename}"
                             alt="${imageInfo.title}"
                             loading="lazy"
                             class="w-full h-full object-cover object-left hover:scale-105 transition-transform duration-500 cursor-move"
                             onerror="console.log('Failed to load image:', this.src)">
                    ` : `
                        <div class="spinner absolute inset-0 flex items-center justify-center">
                            <div class="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <img data-src="${imageBasePath}${imageInfo.filename}"
                             alt="${imageInfo.title}"
                             loading="lazy"
                             class="hidden w-full h-full object-cover object-left hover:scale-105 transition-transform duration-500 cursor-move"
                             onerror="console.log('Failed to load image:', this.dataset.src)">
                    `}
                </div>
                <div class="p-6">
                    <h3 class="text-xl font-bold">${imageInfo.title}</h3>
                    <p class="text-slate-400 mt-2">${imageInfo.description}</p>
                </div>
            </div>
        `;

        return slide;
    }

    // Ensure a slide's image is loaded, swapping out the spinner when done
    function ensureImageLoaded(slide) {
        const img = slide.querySelector('img[data-src]');
        if (img) {
            const spinner = slide.querySelector('.spinner');
            img.src = img.dataset.src;
            img.classList.remove('hidden');
            img.addEventListener('load', () => spinner && spinner.remove(), { once: true });
            img.removeAttribute('data-src');
        }
    }

    // Generate all slides
    function generateSlides() {
        imageData.forEach((imageInfo, index) => {
            const loadNow = index < config.visibleSlides;
            const slide = createSlide(imageInfo, index, loadNow);
            container.appendChild(slide);
        });
    }

    // Improved slideshow logic
    function initSlideshow() {
        // Wait a bit to ensure all slides are properly added to DOM
        setTimeout(() => {
            const slides = container.querySelectorAll('[data-slide-index]');
            let currentIndex = 0;

            function updateSlides() {
                slides.forEach((slide, index) => {
                    const diff = (index - currentIndex + imageData.length) % imageData.length;
                    const img = slide.querySelector('img');

                    // Remove all slide state classes first
                    slide.classList.remove('slide-main', 'slide-under-1', 'slide-under-2', 'slide-under-3', 'slide-hidden');

                    // Cancel any JS-driven zoom from a previous role and reset transforms
                    if (img._zoomAnimation) {
                        try { img._zoomAnimation.cancel(); } catch (e) {}
                        img._zoomAnimation = null;
                    }
                    img.style.transformOrigin = 'center center';
                    img.style.transform = '';

                    if (diff === 0) {
                        ensureImageLoaded(slide);
                        // Main focused slide (pan + smooth zoom)
                        slide.classList.add('slide-main');
                        if (!prefersReducedMotion) {
                            // Keep panning
                            img.style.animation = 'panImage 8s ease-in-out infinite alternate';
                            // Add zoom from 1 -> 1.2 over the full rotation interval
                            img._zoomAnimation = img.animate(
                                [
                                    { transform: 'scale(1)' },
                                    { transform: 'scale(1.2)' }
                                ],
                                {
                                    duration: config.rotationInterval,
                                    easing: 'ease-in-out',
                                    fill: 'forwards'
                                }
                            );
                        } else {
                            img.style.animation = 'none';
                        }
                    } else if (diff === 1) {
                        ensureImageLoaded(slide);
                        // First underneath slide
                        slide.classList.add('slide-under-1');
                        // Remove animation
                        img.style.animation = 'none';
                    } else if (diff === 2) {
                        ensureImageLoaded(slide);
                        // Second underneath slide
                        slide.classList.add('slide-under-2');
                        // Remove animation
                        img.style.animation = 'none';
                    } else if (diff === 3) {
                        ensureImageLoaded(slide);
                        // Third underneath slide
                        slide.classList.add('slide-under-3');
                        // Remove animation
                        img.style.animation = 'none';
                    } else {
                        // Hidden slides
                        slide.classList.add('slide-hidden');
                        // Remove animation
                        img.style.animation = 'none';
                    }
                });
            }

            function nextSlide() {
                currentIndex = (currentIndex + 1) % imageData.length;
                updateSlides();
            }

            // Initialize
            updateSlides();

            // Auto-rotate
            if (!prefersReducedMotion) {
                setInterval(nextSlide, config.rotationInterval);
            }
        }, 100); // Small delay to ensure DOM is ready
    }

    // Start the slideshow only if container exists on this page
    if (container) {
        const ok = await tryLoadSlidesManifest();
        if (!ok || imageData.length === 0) {
            try { container.style.display = 'none'; } catch (e) {}
            return;
        }
        generateSlides();
        initSlideshow();
    }
});
