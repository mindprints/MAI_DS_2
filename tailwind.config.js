module.exports = {
  content: [
    './src/site/**/*.html',
    './src/content/**/*.html',
    './src/templates/**/*.html',
    './src/site/assets/js/**/*.js',
    './src/site/journal.js',
    // Daily home-page cards are injected into public/ after the CSS build,
    // so their utility classes must be scanned here to survive purging.
    './tools/inject-daily.js'
  ],
  safelist: [
    // Classes used at runtime in JS or conditionally
    'transition',
    'transition-all',
    'duration-1000',
    'ease-in-out',
    'z-0',
    'opacity-0',
    'absolute',
    'hidden'
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1rem',
        md: '2rem',
        lg: '2rem',
        xl: '2rem',
      },
    },
    extend: {},
  },
  plugins: [],
}
