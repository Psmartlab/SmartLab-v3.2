/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [

    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "smartlab-bg": "var(--smartlab-bg)",
        "smartlab-surface": "var(--smartlab-surface)",
        "smartlab-surface-low": "var(--smartlab-surface-low)",
        "smartlab-on-surface": "var(--smartlab-on-surface)",
        "smartlab-on-surface-variant": "var(--smartlab-on-surface-variant)",
        "smartlab-primary": "var(--smartlab-primary)",
        "smartlab-border": "var(--smartlab-border)",
        background: "var(--smartlab-bg)",
        surface: "var(--smartlab-surface)",
        "surface-low": "var(--smartlab-surface-low)",
        "on-surface": "var(--smartlab-on-surface)",
        "on-surface-variant": "var(--smartlab-on-surface-variant)",
        primary: "var(--smartlab-primary)",
        accent: "hsl(var(--smartlab-accent-h), var(--smartlab-accent-s), var(--smartlab-accent-l))",
        border: "var(--smartlab-border)",
        error: "var(--danger)",
        success: "var(--success)",
        warning: "var(--warning)",
        "inverse-surface": "#2f3131",
        "inverse-on-surface": "#f0f1f1",
      },

      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },

      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
      },
    },
  },
  plugins: [],
}
