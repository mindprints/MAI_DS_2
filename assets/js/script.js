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
document.addEventListener('DOMContentLoaded', () => {
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Configuration
    const config = {
        visibleSlides: 4, // Number of slides to show at once (1 main + 3 underneath)
        rotationInterval: 6000, // Time between rotations in milliseconds
        transitionDuration: 2000 // Transition duration in milliseconds
    };

    // Available images in numbered order (can be easily updated)
    // All filenames use kebab-case ASCII to avoid server compatibility issues
    const imageData = [
        { number: 1, filename: '1-museums-logo.webp', title: 'Museum Logo', description: 'Welcome to MAI Museum' },
        { number: 2, filename: '2-hotorget-exterior.webp', title: 'HÃ¶torget Exterior', description: 'Urban innovation hub' },
        { number: 3, filename: '3-greg-lecturing-in-museum.webp', title: 'AI Lecture', description: 'Expert presentations' },
        { number: 4, filename: '4-max-demonstrate-for-gregor.webp', title: 'Live Demo', description: 'Interactive demonstrations' },
        { number: 5, filename: '5-three-robot-faces.webp', title: 'Robot Gallery', description: 'AI companions' },
        { number: 6, filename: '6-musikafton-hotorget.webp', title: 'Music & AI', description: 'Creative collaboration' },
        { number: 7, filename: '7-platon-robot-2.webp', title: 'Platon Robot', description: 'Advanced robotics' },
        { number: 8, filename: '8-greg-closeup-lecture.webp', title: 'Expert Lecture', description: 'AI insights' },
        { number: 10, filename: '10-tidnings-articel-invigning.webp', title: 'Opening Ceremony', description: 'Grand opening event' },
        { number: 11, filename: '11-random-graphics.webp', title: 'Digital Art', description: 'AI-generated graphics' },
        { number: 12, filename: '12-music-afton-hotorget.webp', title: 'Music Evening', description: 'Cultural performances' },
        { number: 13, filename: '13-storefront-skrapan.webp', title: 'Storefront', description: 'Museum entrance' },
        { number: 14, filename: '14-invigning-skrapan.webp', title: 'Inauguration', description: 'Official opening' },
        { number: 16, filename: '16-public-hotorget.webp', title: 'Public Space', description: 'Community area' },
        { number: 17, filename: '17-hologram-building.webp', title: 'Hologram Display', description: 'Future technology' },
        { number: 18, filename: '18-evenemang-at-narkesgatan.webp', title: 'Street Event', description: 'Public engagement' },
        { number: 19, filename: '19-exterior-skrapan.webp', title: 'Skrapan Exterior', description: 'Iconic building' },
        { number: 20, filename: '20-greg-lecture-narkesg.webp', title: 'Lecture Series', description: 'Educational talks' },
        { number: 21, filename: '21-happybirthday-at-narkesgtan.webp', title: 'Celebration', description: 'Special events' },
        { number: 22, filename: '22-jubelium-pix-patrick.webp', title: 'Jubilee', description: 'Milestone celebration' },
        { number: 23, filename: '23-veiwing-screen-hotorget.webp', title: 'Viewing Screen', description: 'Large displays' },
        { number: 24, filename: '24-jubelium-pix-genom-skarmen-patrick.webp', title: 'Through the Screen', description: 'Digital experiences' },
        { number: 25, filename: '25-interior-skrappan.webp', title: 'Interior Design', description: 'Modern spaces' },
        { number: 26, filename: '26-greg-skollecture-hotorget.webp', title: 'School Lecture', description: 'Educational outreach' },
        { number: 27, filename: '27-mai-interior-nov-15.webp', title: 'MAI Interior', description: 'Museum spaces' },
        { number: 28, filename: '28-survielence-camera.webp', title: 'Surveillance', description: 'Security systems' },
        { number: 29, filename: '29-stockholm-ai-hotorget.webp', title: 'Stockholm AI', description: 'Local innovation' },
        { number: 30, filename: '30-closeup-aws-poster.webp', title: 'AWS Partnership', description: 'Cloud technology' },
        { number: 31, filename: '31-bob-lecture.webp', title: 'Bob\'s Lecture', description: 'Featured speaker' },
        { number: 32, filename: '32-big-screens-at-hotorget.webp', title: 'Big Screens', description: 'Public displays' },
        { number: 33, filename: '33-public-hotorget.webp', title: 'Public Gathering', description: 'Community events' },
        { number: 34, filename: '34-arc-pussle.webp', title: 'Arc Puzzle', description: 'Interactive exhibit' },
        { number: 35, filename: '35-ai-och-music-seminar.webp', title: 'AI Music Seminar', description: 'Creative AI' },
        { number: 37, filename: '37-aws-poster.webp', title: 'AWS Exhibit', description: 'Technology showcase' }
    ];

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
        generateSlides();
        initSlideshow();
    }
});


