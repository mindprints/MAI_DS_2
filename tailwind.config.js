module.exports = {
  content: [
    './src/site/**/*.html',
    './src/templates/**/*.html',
    './src/site/assets/js/**/*.js',
    './src/site/journal.js'
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
