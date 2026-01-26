# VisionAssist - AI-Powered Visual Accessibility

<div align="center">

🔮 **Empowering independence through AI vision technology**

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Google Gemini](https://img.shields.io/badge/Gemini-AI-blue?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

</div>

## 🌟 Overview

**VisionAssist** is an innovative AI-powered accessibility application designed to help visually impaired individuals understand and navigate their environment. Using advanced computer vision powered by Google's Gemini AI, VisionAssist provides real-time scene descriptions, text reading, object identification, and navigation assistance.

## ✨ Features

### 🎯 Core Capabilities

| Mode | Description |
|------|-------------|
| 👁️ **Scene Description** | Get detailed descriptions of your surroundings including objects, people, and spatial layout |
| 📖 **Text Reading** | Extract and read text from documents, signs, labels, and more |
| 📦 **Object Identification** | Identify objects, products, brands, and get usage information |
| 🧭 **Navigation Assistance** | Receive guidance about paths, obstacles, and safe navigation routes |
| 🎨 **Color Detection** | Identify colors in scenes for clothing, food, and other color-dependent tasks |

### ♿ Accessibility Features

- **🔊 Text-to-Speech**: All results are automatically read aloud
- **🎤 Voice Commands**: Control the app hands-free with voice commands
- **⌨️ Keyboard Navigation**: Full keyboard support with shortcuts
- **🌓 High Contrast Mode**: Enhanced visibility for low-vision users
- **📏 Adjustable Text Size**: Customize text size from 14px to 28px
- **🖥️ Screen Reader Compatible**: Proper ARIA labels and semantic HTML

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/visionassist.git
   cd visionassist
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-5` | Switch between analysis modes |
| `Space` | Capture image (when camera is active) |
| `C` | Open camera |
| `S` | Stop speech |
| `R` | Repeat last description |
| `V` | Activate voice command |
| `Esc` | Close camera/settings |

## 🎤 Voice Commands

- **"Scene"** or **"Describe"** - Switch to scene description mode
- **"Read"** or **"Text"** - Switch to text reading mode
- **"Identify"** or **"Object"** - Switch to object identification mode
- **"Navigate"** or **"Path"** - Switch to navigation mode
- **"Color"** - Switch to color detection mode
- **"Capture"** or **"Take photo"** - Capture current camera view
- **"Stop"** or **"Quiet"** - Stop current speech
- **"Repeat"** or **"Again"** - Repeat last description

## 🛠️ Technology Stack

- **Frontend**: Next.js 16.1, React 19, TypeScript
- **Styling**: Tailwind CSS 4.0
- **AI**: Google Gemini 1.5 Flash
- **Icons**: Lucide React
- **APIs**: Web Speech API (TTS & STT), MediaDevices API

## 📁 Project Structure

```
visionassist/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── analyze/
│   │   │       └── route.ts      # Gemini AI integration
│   │   ├── globals.css           # Global styles
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Main page
│   ├── components/
│   │   └── VisionAssist.tsx      # Main application component
│   └── types/
│       └── speech.d.ts           # Speech API types
├── public/                        # Static assets
├── .env.local.example             # Environment template
└── package.json
```

## 🎯 Use Cases

1. **Daily Navigation**: Help users navigate indoor and outdoor environments safely
2. **Reading Mail**: Read letters, bills, and documents
3. **Shopping**: Identify products, read labels, and check prices
4. **Clothing Selection**: Identify colors and patterns for outfit coordination
5. **Cooking**: Read recipes and identify ingredients
6. **Public Spaces**: Navigate airports, malls, and transit stations

## 🔒 Privacy & Security

- **No image storage**: Images are processed in real-time and not stored
- **Local processing**: Voice commands are processed locally when possible
- **Secure API**: All API calls are made server-side
- **No tracking**: No user tracking or analytics

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for more details.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Gemini AI for powering the vision capabilities
- The accessibility community for guidance and feedback
- Open source contributors

---

<div align="center">

**Built with ❤️ for accessibility**

[Report Bug](https://github.com/yourusername/visionassist/issues) · [Request Feature](https://github.com/yourusername/visionassist/issues)

</div>
