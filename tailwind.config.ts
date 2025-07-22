
import type { Config } from "tailwind-css";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "2rem",
        lg: "4rem",
        xl: "5rem",
        "2xl": "6rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      xs: "320px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Yodel Mobile brand colors - Enhanced Palette
        yodel: {
          orange: {
            50: "#FFF7ED",
            100: "#FFEDD5", 
            200: "#FED7AA",
            300: "#FDBA74",
            400: "#FB923C",
            500: "#F97316", // Main brand orange
            600: "#EA580C",
            700: "#C2410C",
            800: "#9A3412",
            900: "#7C2D12",
            DEFAULT: "#F97316",
          },
          blue: {
            50: "#EFF6FF",
            100: "#DBEAFE",
            200: "#BFDBFE", 
            300: "#93C5FD",
            400: "#60A5FA",
            500: "#3B82F6", // Main blue accent
            600: "#2563EB",
            700: "#1D4ED8",
            800: "#1E40AF",
            900: "#1E3A8A",
            DEFAULT: "#3B82F6",
          },
          richBlack: {
            DEFAULT: "#121212",
            light: "#1A1A1A",
            lighter: "#222222",
            dark: "#0A0A0A",
            darker: "#050505",
          },
          success: "#10B981",
          "success-light": "#34D399",
          "success-dark": "#059669",
          warning: "#F59E0B", 
          "warning-light": "#FBBF24",
          "warning-dark": "#D97706",
          error: "#EF4444",
          "error-light": "#F87171",
          "error-dark": "#DC2626",
          info: "#06B6D4",
          "info-light": "#22D3EE",
          "info-dark": "#0891B2",
        },
      },
      spacing: {
        // Touch-friendly sizes
        'touch-sm': '44px',
        'touch-md': '48px', 
        'touch-lg': '56px',
        // Additional responsive spacing
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1", 
            transform: "translateY(0)"
          }
        },
        "fade-out": {
          "0%": {
            opacity: "1",
            transform: "translateY(0)"
          },
          "100%": {
            opacity: "0",
            transform: "translateY(10px)"
          }
        },
        "slide-in-left": {
          "0%": {
            opacity: "0",
            transform: "translateX(-20px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)"
          }
        },
        "slide-in-right": {
          "0%": {
            opacity: "0", 
            transform: "translateX(20px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)"
          }
        },
        "slide-out-left": {
          "0%": {
            opacity: "1",
            transform: "translateX(0)"
          },
          "100%": {
            opacity: "0",
            transform: "translateX(-20px)"
          }
        },
        "slide-out-right": {
          "0%": {
            opacity: "1",
            transform: "translateX(0)"
          },
          "100%": {
            opacity: "0",
            transform: "translateX(20px)"
          }
        },
        "scale-in": {
          "0%": {
            opacity: "0",
            transform: "scale(0.95)"
          },
          "100%": {
            opacity: "1",
            transform: "scale(1)"
          }
        },
        "scale-out": {
          "0%": {
            opacity: "1",
            transform: "scale(1)"
          },
          "100%": {
            opacity: "0",
            transform: "scale(0.95)"
          }
        },
        "pulse-gentle": {
          "0%, 100%": {
            opacity: "1"
          },
          "50%": {
            opacity: "0.8"
          }
        },
        shimmer: {
          "0%": {
            "background-position": "-200% 0"
          },
          "100%": {
            "background-position": "200% 0"
          }
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0)"
          },
          "50%": {
            transform: "translateY(-5px)"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out", 
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-left": "slide-out-left 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "pulse-gentle": "pulse-gentle 3s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
        "float": "float 3s ease-in-out infinite",
        "enter": "fade-in 0.3s ease-out, scale-in 0.2s ease-out",
        "exit": "fade-out 0.3s ease-out, scale-out 0.2s ease-out"
      },
      zIndex: {
        '60': '60',
        '70': '70', 
        '80': '80',
        '90': '90',
        '100': '100',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(249, 115, 22, 0.1)',
        'glow': '0 0 20px rgba(249, 115, 22, 0.15)',
        'glow-lg': '0 0 30px rgba(249, 115, 22, 0.2)',
        'glow-blue-sm': '0 0 10px rgba(59, 130, 246, 0.1)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glow-blue-lg': '0 0 30px rgba(59, 130, 246, 0.2)',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
