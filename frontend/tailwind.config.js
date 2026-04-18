/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                fontFamily: {
                        'heading': ['Rajdhani', 'sans-serif'],
                        'body': ['Manrope', 'sans-serif'],
                        'mono': ['JetBrains Mono', 'monospace'],
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: '2px'
                },
                colors: {
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        },
                        // Premium Trading Terminal Colors
                        bullish: '#00FF9D',
                        bearish: '#FF1E56',
                        whale: '#8b5cf6',
                        cyber: '#00F0FF',
                        'crypto-bg': '#06080A',
                        'crypto-card': '#0C1015',
                        'crypto-border': '#1C232D',
                        'crypto-surface': '#11161D',
                },
                boxShadow: {
                        'neon-bullish': '0 0 30px rgba(0, 255, 157, 0.2)',
                        'neon-bearish': '0 0 30px rgba(255, 30, 86, 0.2)',
                        'neon-cyber': '0 0 30px rgba(0, 240, 255, 0.2)',
                        'neon-whale': '0 0 30px rgba(139, 92, 246, 0.2)',
                },
                dropShadow: {
                        'glow-bullish': '0 0 15px rgba(0, 255, 157, 0.5)',
                        'glow-bearish': '0 0 15px rgba(255, 30, 86, 0.5)',
                        'glow-cyber': '0 0 15px rgba(0, 240, 255, 0.5)',
                },
                keyframes: {
                        'accordion-down': {
                                from: { height: '0' },
                                to: { height: 'var(--radix-accordion-content-height)' }
                        },
                        'accordion-up': {
                                from: { height: 'var(--radix-accordion-content-height)' },
                                to: { height: '0' }
                        },
                        'pulse-glow': {
                                '0%, 100%': { opacity: '1' },
                                '50%': { opacity: '0.5' }
                        },
                        'slide-in': {
                                from: { transform: 'translateX(-100%)' },
                                to: { transform: 'translateX(0)' }
                        },
                        'shimmer': {
                                '0%': { backgroundPosition: '-200% 0' },
                                '100%': { backgroundPosition: '200% 0' }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                        'slide-in': 'slide-in 0.3s ease-out',
                        'shimmer': 'shimmer 2s linear infinite'
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};
