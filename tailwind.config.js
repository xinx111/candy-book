/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF0F0',
        caramel: '#8B5E3C',
        strawberry: '#E8716D',
        matcha: '#7DA87B',
        butter: '#FADADD',
        'text-primary': '#3C2415',
        'text-secondary': '#A0806E',
        'text-muted': '#C4B0A0',
        border: '#F0D0D0',
        'card-bg': '#FFF5F5',
      },
      fontFamily: {
        sans: ['-apple-system', '"PingFang SC"', '"Microsoft YaHei"', '"SF Pro"', 'sans-serif'],
      },
      borderRadius: {
        sm: '12px',
        DEFAULT: '16px',
        lg: '20px',
        pill: '24px',
      },
      boxShadow: {
        card: '0 2px 12px rgba(232, 113, 109, 0.08)',
        'card-hover': '0 4px 20px rgba(232, 113, 109, 0.14)',
      },
      spacing: {
        4.5: '1.125rem',
      },
    },
  },
  plugins: [],
}
