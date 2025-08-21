# Museum of Artificial Intelligence Website

A modern, responsive website for the Museum of Artificial Intelligence featuring interactive slideshows, smooth animations, and a professional design.

## Features

- **Interactive Image Slideshow**: 34+ images with smooth transitions and panning animations
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Smooth Animations**: CSS-based animations with Intersection Observer for performance
- **Modern UI**: Glass morphism effects and gradient backgrounds

## File Structure

```
MAI_DS_2/
├── index.html          # Main HTML structure
├── styles.css          # All CSS styles and animations
├── script.js           # JavaScript functionality
├── images/
│   └── WEBP_images/   # 34+ museum images
└── README.md           # This file
```

## Background Images

The website uses CSS gradients as primary backgrounds with optional local image fallbacks:

### Hero Section (`.hero-bg`)
- **Primary**: Blue gradient overlay
- **Optional**: Add `images/hero-bg.jpg` for enhanced visual appeal
- **Fallback**: Pure gradient if no image is available

### Model Section (`.model-bg`)
- **Primary**: Dark gradient overlay  
- **Optional**: Add `images/model-bg.jpg` for enhanced visual appeal
- **Fallback**: Pure gradient if no image is available

### Adding Local Background Images

1. **Place images** in the `images/` directory:
   - `hero-bg.jpg` - Hero section background (recommended: 1920x1080+)
   - `model-bg.jpg` - Model section background (recommended: 1920x1080+)

2. **Images will automatically be used** if they exist
3. **Gradients remain as fallbacks** if images are missing or fail to load

## Performance Optimizations

- **CSS-based transitions** instead of JavaScript inline styles
- **Intersection Observer** for scroll-based animations
- **Optimized image panning** (only active slide animates)
- **Separate CSS/JS files** for better caching

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- Graceful degradation for older browsers
- Mobile-responsive design

## Development

To run locally:
```bash
python -m http.server 3000
# or
npx serve .
```

Then visit `http://localhost:3000`

## Customization

- **Colors**: Modify CSS custom properties in `styles.css`
- **Images**: Add/remove images from `images/WEBP_images/`
- **Animations**: Adjust timing in CSS animations and JavaScript intervals
- **Content**: Update text and images in `index.html`
