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

// Simple toggle for mobile menu (if added)
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    menu.classList.toggle('hidden');
}

// Dynamic image slideshow system
document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const config = {
        visibleSlides: 4, // Number of slides to show at once (1 main + 3 underneath)
        rotationInterval: 4000, // Time between rotations in milliseconds
        transitionDuration: 1000 // Transition duration in milliseconds
    };

    // Available images in numbered order (can be easily updated)
    const imageData = [
        { number: 1, filename: '1_Museums logo.webp', title: 'Museum Logo', description: 'Welcome to MAI Museum' },
        { number: 2, filename: '2_hötorget exterior.webp', title: 'Hötorget Exterior', description: 'Urban innovation hub' },
        { number: 3, filename: '3_Greg lecturing in museum.webp', title: 'AI Lecture', description: 'Expert presentations' },
        { number: 4, filename: '4_max demonstrate for gregor.webp', title: 'Live Demo', description: 'Interactive demonstrations' },
        { number: 5, filename: '5_three robot faces.webp', title: 'Robot Gallery', description: 'AI companions' },
        { number: 6, filename: '6_musikafton hötorget.webp', title: 'Music & AI', description: 'Creative collaboration' },
        { number: 7, filename: '7_platon robot 2.webp', title: 'Platon Robot', description: 'Advanced robotics' },
        { number: 8, filename: '8_greg closeup lecture.webp', title: 'Expert Lecture', description: 'AI insights' },
        { number: 10, filename: '10_tidnings articel invigning.webp', title: 'Opening Ceremony', description: 'Grand opening event' },
        { number: 11, filename: '11_random graphics.webp', title: 'Digital Art', description: 'AI-generated graphics' },
        { number: 12, filename: '12_music afton hötorget.webp', title: 'Music Evening', description: 'Cultural performances' },
        { number: 13, filename: '13_storefront skrapan.webp', title: 'Storefront', description: 'Museum entrance' },
        { number: 14, filename: '14_invigning skrapan.webp', title: 'Inauguration', description: 'Official opening' },
        { number: 16, filename: '16_Public högtorget.webp', title: 'Public Space', description: 'Community area' },
        { number: 17, filename: '17_hologram building.webp', title: 'Hologram Display', description: 'Future technology' },
        { number: 18, filename: '18_evenemäng at närkesgatan.webp', title: 'Street Event', description: 'Public engagement' },
        { number: 19, filename: '19_exterior skrapan.webp', title: 'Skrapan Exterior', description: 'Iconic building' },
        { number: 20, filename: '20_greg lecture närkesg.webp', title: 'Lecture Series', description: 'Educational talks' },
        { number: 21, filename: '21_happybirthday at närkesgtan.webp', title: 'Celebration', description: 'Special events' },
        { number: 22, filename: '22_Jubelium pix-Patrick.webp', title: 'Jubilee', description: 'Milestone celebration' },
        { number: 23, filename: '23_veiwing screen hötorget.webp', title: 'Viewing Screen', description: 'Large displays' },
        { number: 24, filename: '24_jubelium pix genom skärmen - Patrick.webp', title: 'Through the Screen', description: 'Digital experiences' },
        { number: 25, filename: '25_interior skrappan.webp', title: 'Interior Design', description: 'Modern spaces' },
        { number: 26, filename: '26_greg skollecture hötorget.webp', title: 'School Lecture', description: 'Educational outreach' },
        { number: 27, filename: '27_Mai interior nov 15.webp', title: 'MAI Interior', description: 'Museum spaces' },
        { number: 28, filename: '28_survielence camera.webp', title: 'Surveillance', description: 'Security systems' },
        { number: 29, filename: '29_stockholm AI högtorget.webp', title: 'Stockholm AI', description: 'Local innovation' },
        { number: 30, filename: '30_closeup aws poster.webp', title: 'AWS Partnership', description: 'Cloud technology' },
        { number: 31, filename: '31_Bob lecture.webp', title: 'Bob\'s Lecture', description: 'Featured speaker' },
        { number: 32, filename: '32_big screens at hötorget.webp', title: 'Big Screens', description: 'Public displays' },
        { number: 33, filename: '33_public hötorget.webp', title: 'Public Gathering', description: 'Community events' },
        { number: 34, filename: '34_arc pussle.webp', title: 'Arc Puzzle', description: 'Interactive exhibit' },
        { number: 35, filename: '35_AI och music seminar.webp', title: 'AI Music Seminar', description: 'Creative AI' },
        { number: 37, filename: '37_aws poster.webp', title: 'AWS Exhibit', description: 'Technology showcase' }
    ];

    // Get slideshow container
    const container = document.getElementById('slideshow-container');

    // Create slide elements dynamically
    function createSlide(imageInfo, index) {
        const slide = document.createElement('div');
        slide.className = 'glass-card rounded-xl overflow-hidden w-full h-full absolute transition-all duration-1000 ease-in-out z-0 opacity-0';
        slide.style.transform = 'rotate(-6deg)';
        slide.dataset.slideIndex = index;

        slide.innerHTML = `
            <div class="bg-gray-800 w-full h-full">
                <div class="h-full w-full overflow-hidden">
                    <img src="images/WEBP_images/${imageInfo.filename}"
                         alt="${imageInfo.title}"
                         class="w-full h-full object-cover object-left hover:scale-105 transition-transform duration-500 cursor-move"
                         onerror="console.log('Failed to load image:', this.src)">
                </div>
                <div class="p-6">
                    <h3 class="text-xl font-bold">${imageInfo.title}</h3>
                    <p class="text-slate-400 mt-2">${imageInfo.description}</p>
                </div>
            </div>
        `;

        return slide;
    }

    // Generate all slides
    function generateSlides() {
        imageData.forEach((imageInfo, index) => {
            const slide = createSlide(imageInfo, index);
            container.appendChild(slide);
        });
    }

    // Improved slideshow logic
    function initSlideshow() {
        // Wait a bit to ensure all slides are properly added to DOM
        setTimeout(() => {
            const slides = container.querySelectorAll('[data-slide-index]');
            console.log('Initializing slideshow, found', slides.length, 'slides');
            let currentIndex = 0;

            function updateSlides() {
                slides.forEach((slide, index) => {
                    const diff = (index - currentIndex + imageData.length) % imageData.length;
                    const img = slide.querySelector('img');

                    if (diff === 0) {
                        // Main focused slide
                        slide.style.opacity = '1';
                        slide.style.zIndex = '30';
                        slide.style.transform = 'rotate(6deg) translate(20px, 20px) scale(1.05)';
                        // Add panning animation only to the main slide
                        img.style.animation = 'panImage 8s ease-in-out infinite alternate';
                    } else if (diff === 1) {
                        // First underneath slide
                        slide.style.opacity = '0.8';
                        slide.style.zIndex = '20';
                        slide.style.transform = 'rotate(-3deg) translate(-10px, 10px) scale(0.95)';
                        // Remove animation
                        img.style.animation = 'none';
                    } else if (diff === 2) {
                        // Second underneath slide
                        slide.style.opacity = '0.6';
                        slide.style.zIndex = '15';
                        slide.style.transform = 'rotate(-6deg) translate(-20px, 5px) scale(0.9)';
                        // Remove animation
                        img.style.animation = 'none';
                    } else if (diff === 3) {
                        // Third underneath slide
                        slide.style.opacity = '0.4';
                        slide.style.zIndex = '10';
                        slide.style.transform = 'rotate(-9deg) translate(-30px, 0px) scale(0.85)';
                        // Remove animation
                        img.style.animation = 'none';
                    } else {
                        // Hidden slides
                        slide.style.opacity = '0';
                        slide.style.zIndex = '0';
                        slide.style.transform = 'rotate(-12deg) translate(-40px, -5px) scale(0.8)';
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
            setInterval(nextSlide, config.rotationInterval);
        }, 100); // Small delay to ensure DOM is ready
    }

    // Start the slideshow
    generateSlides();
    initSlideshow();
});
