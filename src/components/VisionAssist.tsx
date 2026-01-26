"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  Upload,
  Volume2,
  VolumeX,
  Eye,
  BookOpen,
  Package,
  Navigation,
  Palette,
  RefreshCw,
  Sun,
  Moon,
  Mic,
  MicOff,
  ZoomIn,
  ZoomOut,
  Settings,
  X,
  Copy,
  Share2,
  History,
  Zap,
  Play,
  Pause,
  Check,
  Trash2,
} from "lucide-react";

// Constants
const STORAGE_KEY = "visionassist-settings";
const HISTORY_KEY = "visionassist-history";
const MAX_HISTORY_ITEMS = 10;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_SPEECH_LENGTH = 2000; // Chrome has ~15 sec limit

// Types
interface HistoryItem {
  id: string;
  timestamp: number;
  mode: AnalysisMode;
  thumbnail: string;
  description: string;
}

interface UserSettings {
  highContrast: boolean;
  fontSize: number;
  autoSpeak: boolean;
  selectedMode: AnalysisMode;
  soundEnabled: boolean;
  darkMode: boolean;
}

interface DemoScenario {
  id: string;
  name: string;
  mode: AnalysisMode;
  description: string;
  response: string;
}

// Demo scenarios for offline/presentation mode
const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "street",
    name: "Street Scene",
    mode: "scene",
    description: "Urban street with pedestrians",
    response: `**Overview**: You're on a busy urban sidewalk during daytime. The street is well-lit with clear visibility.

**Key Objects**:
- Crosswalk directly ahead (12 o'clock, near)
- Traffic light on the right (3 o'clock, medium distance)
- Parked cars along the left side (9 o'clock)
- Building entrance ahead on the right

**People**: 3-4 pedestrians walking in various directions. One person approaching from 2 o'clock position, about 10 feet away.

**Text**: "WALK" signal is lit on the traffic light. Store sign reads "Coffee Shop" on the right.

**Safety Notes**: The crosswalk appears clear. Watch for a person approaching from your right.

**Atmosphere**: Bright daylight, outdoor urban environment, appears to be mid-afternoon.`,
  },
  {
    id: "document",
    name: "Document",
    mode: "read",
    description: "Text document or menu",
    response: `**Document Type**: Restaurant Menu

**Extracted Text**:

LUNCH SPECIALS
Available 11am - 3pm

1. Grilled Chicken Sandwich - $12.95
   Served with fries and coleslaw

2. Caesar Salad - $9.95
   Romaine lettuce, parmesan, croutons

3. Soup of the Day - $6.95
   Ask your server for today's selection

4. Club Sandwich - $13.95
   Triple-decker with turkey, bacon, lettuce, tomato

BEVERAGES
Coffee - $3.50
Tea - $3.00
Soft Drinks - $2.95

**Important Notes**: Prices include tax. 18% gratuity added for parties of 6 or more.`,
  },
  {
    id: "product",
    name: "Product",
    mode: "identify",
    description: "Consumer product",
    response: `**Primary Object**: Smartphone

**Brand/Model**: This appears to be a modern smartphone, approximately 6.1 inches diagonally.

**Description**:
- Color: Dark gray/black
- Material: Glass front and back with metal frame
- Size: Standard smartphone size, approximately 6 x 3 inches
- Condition: Good condition, screen is intact

**Usage**: This is a mobile communication device used for calls, texts, internet browsing, photography, and running applications.

**Key Features Visible**:
- Large touchscreen display
- Camera array on back (multiple lenses)
- Volume buttons on left side
- Power button on right side`,
  },
  {
    id: "room",
    name: "Room Navigation",
    mode: "navigation",
    description: "Indoor room layout",
    response: `**Path Analysis**: You are in what appears to be a living room. The main path is clear straight ahead (12 o'clock).

**Obstacles**:
- Coffee table at 12 o'clock, about 4 feet ahead (near)
- Sofa on your left (9 o'clock), about 3 feet away
- Floor lamp at 2 o'clock, about 6 feet away

**Landmarks**:
- Large window at 12 o'clock, far wall
- TV mounted on wall at 1 o'clock
- Doorway visible at 3 o'clock, approximately 15 feet away

**Surfaces**: Hardwood flooring, level surface, no steps detected.

**Doors/Exits**: One doorway at 3 o'clock position leading to what appears to be a hallway.

**Immediate Hazards**: Watch for coffee table directly ahead at knee height.

**Direction Guidance**: For the clearest path, move slightly right (toward 1 o'clock) to go around the coffee table, then proceed toward the doorway at 3 o'clock.`,
  },
  {
    id: "clothing",
    name: "Clothing Colors",
    mode: "color",
    description: "Clothing item",
    response: `**Dominant Colors**: Navy blue is the primary color, covering about 80% of the garment.

**Object Colors**:
- Main fabric: Navy blue (deep, dark blue)
- Buttons: Silver/chrome metallic
- Stitching: Matching navy thread
- Interior lining: Light gray

**Color Combinations**: This is a solid navy blue shirt with subtle tonal stitching. The silver buttons provide a nice contrast.

**Practical Info**: This appears to be a navy blue dress shirt. Navy is a versatile, professional color that pairs well with:
- Gray or black pants
- Khaki or tan chinos
- Jeans for a casual look

The color is consistent throughout, no patterns or prints. This would be appropriate for both business casual and formal settings.`,
  },
];

// Utility functions
const generateId = () => Math.random().toString(36).substring(2, 9);

const compressThumbnail = (imageData: string, maxSize: number = 100): string => {
  // Create a canvas to resize the image for thumbnail
  if (typeof window === "undefined") return imageData;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.src = imageData;
  canvas.width = maxSize;
  canvas.height = maxSize;
  ctx?.drawImage(img, 0, 0, maxSize, maxSize);
  return canvas.toDataURL("image/jpeg", 0.5);
};

const splitTextIntoChunks = (text: string, maxLength: number): string[] => {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
};

const triggerHaptic = (pattern: "capture" | "success" | "error") => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const patterns = {
      capture: [100],
      success: [100, 100, 100],
      error: [500],
    };
    navigator.vibrate(patterns[pattern]);
  }
};

type AnalysisMode = "scene" | "read" | "identify" | "navigation" | "color";

interface ModeOption {
  id: AnalysisMode;
  label: string;
  icon: React.ReactNode;
  description: string;
  shortcut: string;
}

const modes: ModeOption[] = [
  {
    id: "scene",
    label: "Scene Description",
    icon: <Eye className="w-5 h-5" />,
    description: "Understand your surroundings",
    shortcut: "1",
  },
  {
    id: "read",
    label: "Read Text",
    icon: <BookOpen className="w-5 h-5" />,
    description: "Read documents, signs, labels",
    shortcut: "2",
  },
  {
    id: "identify",
    label: "Identify Object",
    icon: <Package className="w-5 h-5" />,
    description: "Identify items and products",
    shortcut: "3",
  },
  {
    id: "navigation",
    label: "Navigation Help",
    icon: <Navigation className="w-5 h-5" />,
    description: "Find paths and avoid obstacles",
    shortcut: "4",
  },
  {
    id: "color",
    label: "Color Detection",
    icon: <Palette className="w-5 h-5" />,
    description: "Identify colors in the scene",
    shortcut: "5",
  },
];

export default function VisionAssist() {
  // Core state
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>("scene");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("environment");

  // New feature state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [showDemoMode, setShowDemoMode] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const continuousIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechChunksRef = useRef<string[]>([]);
  const currentChunkIndexRef = useRef<number>(0);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check feature support
    setSpeechSupported("speechSynthesis" in window);
    setVoiceSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Pre-load voices for Chrome (loads asynchronously)
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }

    // Load saved settings
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const settings: UserSettings = JSON.parse(savedSettings);
        setHighContrast(settings.highContrast ?? false);
        setFontSize(settings.fontSize ?? 18);
        setAutoSpeak(settings.autoSpeak ?? true);
        setSelectedMode(settings.selectedMode ?? "scene");
        setSoundEnabled(settings.soundEnabled ?? true);
        // Use saved preference, default to dark mode
        setDarkMode(settings.darkMode ?? true);
      }
      // No saved settings - default to dark mode (already set in initial state)

      // Load history
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }

      // Check for first visit
      const hasVisited = localStorage.getItem("visionassist-visited");
      if (!hasVisited) {
        setShowOnboarding(true);
        localStorage.setItem("visionassist-visited", "true");
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    }

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window === "undefined") return;

    const settings: UserSettings = {
      highContrast,
      fontSize,
      autoSpeak,
      selectedMode,
      soundEnabled,
      darkMode,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  }, [highContrast, fontSize, autoSpeak, selectedMode, soundEnabled, darkMode]);

  // Save history to localStorage when it changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Error saving history:", e);
    }
  }, [history]);

  // Initialize speech recognition with error handling
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check for iOS Safari which has limited speech recognition support
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    const SpeechRecognitionAPI = window.webkitSpeechRecognition || (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition;

    if (SpeechRecognitionAPI) {
      try {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "en-US";
        // Increase max alternatives for better accuracy on mobile
        recognitionRef.current.maxAlternatives = 3;

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const command = event.results[0][0].transcript.toLowerCase();
          handleVoiceCommand(command);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          setIsListening(false);
          let errorMessage = "Voice command error. Please try again.";

          switch (event.error) {
            case "not-allowed":
            case "service-not-allowed":
              errorMessage = isIOS
                ? "Microphone access not available. On iOS, voice commands require Chrome browser."
                : "Microphone permission denied. Please enable microphone access in your browser settings.";
              break;
            case "no-speech":
              errorMessage = "No speech detected. Tap mic and speak your command.";
              break;
            case "audio-capture":
              errorMessage = "No microphone found. Please check your device settings.";
              break;
            case "network":
              errorMessage = "Network required for voice recognition. Please check your connection.";
              break;
            case "aborted":
              // User cancelled, no need to show error
              return;
          }

          setError(errorMessage);
          speak(errorMessage);
        };
      } catch {
        setVoiceSupported(false);
      }
    } else {
      setVoiceSupported(false);
    }

    // iOS Safari doesn't support speech recognition well
    if (isIOS && isSafari) {
      setVoiceSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort errors
        }
      }
    };
  }, []);

  const handleVoiceCommand = (command: string) => {
    // Mode commands
    if (command.includes("scene") || command.includes("describe")) {
      setSelectedMode("scene");
      speak("Scene description mode activated");
    } else if (command.includes("read") || command.includes("text")) {
      setSelectedMode("read");
      speak("Read text mode activated");
    } else if (command.includes("identify") || command.includes("object") || command.includes("what is")) {
      setSelectedMode("identify");
      speak("Identify object mode activated");
    } else if (command.includes("navigate") || command.includes("navigation") || command.includes("path")) {
      setSelectedMode("navigation");
      speak("Navigation mode activated");
    } else if (command.includes("color") || command.includes("colour")) {
      setSelectedMode("color");
      speak("Color detection mode activated");
    }
    // Action commands
    else if (command.includes("capture") || command.includes("take") || command.includes("photo")) {
      captureImage();
    } else if (command.includes("stop") || command.includes("quiet")) {
      stopSpeaking();
    } else if (command.includes("repeat") || command.includes("again")) {
      if (description) speak(description);
    }
    // New commands
    else if (command.includes("history") || command.includes("previous")) {
      if (history.length > 0) {
        setShowHistory(true);
        speak(`You have ${history.length} items in history`);
      } else {
        speak("No history yet. Capture an image first.");
      }
    } else if (command.includes("last result") || command.includes("last analysis")) {
      if (history.length > 0) {
        speak(history[0].description);
      } else {
        speak("No previous results available.");
      }
    } else if (command.includes("continuous on") || command.includes("auto capture")) {
      if (cameraActive) {
        setContinuousMode(true);
        speak("Continuous mode enabled. I will analyze every 5 seconds.");
      } else {
        speak("Please open the camera first to use continuous mode.");
      }
    } else if (command.includes("continuous off") || command.includes("stop continuous")) {
      setContinuousMode(false);
      speak("Continuous mode disabled.");
    } else if (command.includes("help")) {
      speak("Available commands: capture, read, scene, navigate, identify, color, history, repeat, stop, continuous on, continuous off");
    } else {
      // Unrecognized command feedback
      speak("Command not recognized. Say help for available commands.");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "1":
          setSelectedMode("scene");
          speak("Scene mode");
          break;
        case "2":
          setSelectedMode("read");
          speak("Read mode");
          break;
        case "3":
          setSelectedMode("identify");
          speak("Identify mode");
          break;
        case "4":
          setSelectedMode("navigation");
          speak("Navigation mode");
          break;
        case "5":
          setSelectedMode("color");
          speak("Color mode");
          break;
        case " ":
          e.preventDefault();
          if (cameraActive) captureImage();
          break;
        case "c":
          if (!cameraActive) startCamera();
          break;
        case "s":
          stopSpeaking();
          break;
        case "r":
          if (description) speak(description);
          break;
        case "v":
          toggleVoiceCommand();
          break;
        case "h":
          e.preventDefault();
          setShowHistory(!showHistory);
          break;
        case "q":
          e.preventDefault();
          setShowQuickActions(!showQuickActions);
          break;
        case "escape":
          setShowSettings(false);
          setShowHistory(false);
          setShowQuickActions(false);
          setShowOnboarding(false);
          if (cameraActive) stopCamera();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cameraActive, description, showHistory, showQuickActions]);

  const startCamera = async () => {
    try {
      setError(null);
      setVideoDimensions(null);

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const errorMsg = "Camera not supported in this browser. Please use Chrome, Firefox, or Safari.";
        setError(errorMsg);
        speak(errorMsg);
        return;
      }

      // Check for camera permission first
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (permissionStatus.state === 'denied') {
          const errorMsg = "Camera permission was denied. Please enable camera access in your browser settings and reload the page.";
          setError(errorMsg);
          speak(errorMsg);
          return;
        }
      } catch {
        // permissions API not supported, continue with getUserMedia
      }

      // Mobile-optimized camera constraints
      const constraints: MediaStreamConstraints = {
        video: isMobile
          ? {
              facingMode: cameraFacing,
              // Let mobile devices choose optimal resolution
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            }
          : {
              facingMode: cameraFacing,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        // Wait for video metadata to get actual dimensions
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            setVideoDimensions({
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
            });
          }
        };

        setCameraActive(true);
        triggerHaptic("capture");
        speak(isMobile ? "Camera ready. Tap capture button." : "Camera activated. Press space to capture.");
      }
    } catch (err: unknown) {
      let errorMsg = "Unable to access camera.";

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = isMobile
            ? "Camera permission denied. Please allow camera access in your browser settings."
            : "Camera permission denied. Please click the camera icon in your browser's address bar to allow access, then try again.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = "No camera found. Please connect a camera and try again.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMsg = "Camera is in use by another application. Please close other apps using the camera and try again.";
        } else if (err.name === 'OverconstrainedError') {
          // Try again with basic constraints for older devices
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacing } });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              streamRef.current = stream;
              videoRef.current.onloadedmetadata = () => {
                if (videoRef.current) {
                  setVideoDimensions({
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight,
                  });
                }
              };
              setCameraActive(true);
              triggerHaptic("capture");
              speak("Camera activated.");
              return;
            }
          } catch {
            errorMsg = "Camera constraints not supported. Please try a different camera.";
          }
        } else if (err.name === 'SecurityError') {
          errorMsg = "Camera access requires a secure connection (HTTPS). Please use HTTPS or localhost.";
        } else {
          errorMsg = `Camera error: ${err.message}`;
        }
      }

      setError(errorMsg);
      speak(errorMsg);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setVideoDimensions(null);
  };

  const switchCamera = async () => {
    const newFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(newFacing);
    if (cameraActive) {
      stopCamera();
      // Increased delay for reliable camera switching on various devices
      setTimeout(() => startCamera(), 300);
    }
  };

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageData);
        analyzeImage(imageData);
        speak("Image captured. Analyzing...");
      }
    }
  }, [selectedMode]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const errorMsg = `Image is too large. Please use an image under ${MAX_FILE_SIZE_MB}MB.`;
      setError(errorMsg);
      speak(errorMsg);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      const errorMsg = "Please select an image file (JPEG, PNG, etc.)";
      setError(errorMsg);
      speak(errorMsg);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    speak("Checking image...");

    // Validate dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxDimension = 4096;
      if (img.width > maxDimension || img.height > maxDimension) {
        const errorMsg = "Image dimensions too large. Please use an image smaller than 4096x4096 pixels.";
        setError(errorMsg);
        speak(errorMsg);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Read file after validation passes
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setCapturedImage(imageData);
        analyzeImage(imageData);
        speak("Image uploaded. Analyzing...");
        triggerHaptic("capture");
      };
      reader.onerror = () => {
        const errorMsg = "Failed to read image file. Please try a different file.";
        setError(errorMsg);
        speak(errorMsg);
      };
      reader.readAsDataURL(file);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const errorMsg = "Unable to load image. Please try a different file.";
      setError(errorMsg);
      speak(errorMsg);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    img.src = objectUrl;
  };

  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true);
    setError(null);
    setDescription("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, mode: selectedMode }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        speak("Error: " + data.error);
        triggerHaptic("error");
      } else {
        setDescription(data.description);
        triggerHaptic("success");

        // Add to history
        const historyItem: HistoryItem = {
          id: generateId(),
          timestamp: Date.now(),
          mode: selectedMode,
          thumbnail: compressThumbnail(imageData),
          description: data.description,
        };

        setHistory((prev) => {
          const newHistory = [historyItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
          return newHistory;
        });

        if (autoSpeak) {
          speak(data.description);
        }
      }
    } catch (err) {
      const errorMsg = "Connection failed. Please check your internet and try again.";
      setError(errorMsg);
      speak(errorMsg);
      triggerHaptic("error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Continuous mode effect
  useEffect(() => {
    if (continuousMode && cameraActive && !capturedImage) {
      continuousIntervalRef.current = setInterval(() => {
        if (!isAnalyzing) {
          captureImage();
        }
      }, 5000);

      return () => {
        if (continuousIntervalRef.current) {
          clearInterval(continuousIntervalRef.current);
        }
      };
    } else {
      if (continuousIntervalRef.current) {
        clearInterval(continuousIntervalRef.current);
        continuousIntervalRef.current = null;
      }
    }
  }, [continuousMode, cameraActive, capturedImage, isAnalyzing]);

  const speak = useCallback((text: string) => {
    if (!speechSupported || !("speechSynthesis" in window)) {
      console.warn("Speech synthesis not supported");
      return;
    }

    // Strip markdown formatting for cleaner speech
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold**
      .replace(/\*([^*]+)\*/g, '$1')       // *italic*
      .replace(/__([^_]+)__/g, '$1')       // __bold__
      .replace(/_([^_]+)_/g, '$1')         // _italic_
      .replace(/#{1,6}\s*/g, '')           // # headings
      .replace(/`([^`]+)`/g, '$1')         // `code`
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [links](url)
      .replace(/^\s*[-*+]\s+/gm, '')       // bullet points
      .replace(/^\s*\d+\.\s+/gm, '')       // numbered lists
      .replace(/\n{3,}/g, '\n\n')          // excessive newlines
      .trim();

    const synth = window.speechSynthesis;

    // Cancel any current speech first
    synth.cancel();
    speechChunksRef.current = [];
    currentChunkIndexRef.current = 0;
    setIsSpeaking(false);

    // Helper function to actually speak
    const doSpeak = () => {
      // Split long text into chunks for reliability (Chrome has issues with long text)
      const chunks = splitTextIntoChunks(cleanText, MAX_SPEECH_LENGTH);
      speechChunksRef.current = chunks;
      currentChunkIndexRef.current = 0;

      const speakChunk = (index: number) => {
        if (index >= chunks.length) {
          setIsSpeaking(false);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Get voices and set a voice
        const voices = synth.getVoices();
        if (voices.length > 0) {
          // Prefer Google US English or any English voice
          const preferredVoice = voices.find(v => v.name.includes('Google US English'))
            || voices.find(v => v.lang === 'en-US')
            || voices.find(v => v.lang.startsWith('en'))
            || voices[0];
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          currentChunkIndexRef.current++;
          if (currentChunkIndexRef.current < chunks.length) {
            // Small delay between chunks for Chrome
            setTimeout(() => speakChunk(currentChunkIndexRef.current), 50);
          } else {
            setIsSpeaking(false);
          }
        };

        utterance.onerror = (event) => {
          setIsSpeaking(false);

          // Don't show error for expected interruptions
          const ignoredErrors = ["canceled", "interrupted", "not-allowed"];
          if (!ignoredErrors.includes(event.error)) {
            console.error("Speech synthesis error:", event.error);
            setError("Unable to speak. Displaying text instead.");
          }
        };

        speechSynthRef.current = utterance;

        // Chrome fix: make sure synth is not paused
        if (synth.paused) {
          synth.resume();
        }

        // Speak the utterance
        synth.speak(utterance);
      };

      speakChunk(0);
    };

    // Chrome requires voices to be loaded - they load asynchronously
    const voices = synth.getVoices();
    if (voices.length > 0) {
      // Voices already loaded, speak after a brief delay
      setTimeout(doSpeak, 100);
    } else {
      // Wait for voices to load
      const voicesLoaded = () => {
        synth.onvoiceschanged = null;
        setTimeout(doSpeak, 100);
      };
      synth.onvoiceschanged = voicesLoaded;

      // Fallback timeout in case onvoiceschanged doesn't fire
      setTimeout(() => {
        if (!speechSynthRef.current) {
          synth.onvoiceschanged = null;
          doSpeak();
        }
      }, 500);
    }
  }, [speechSupported]);

  const stopSpeaking = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      speechChunksRef.current = [];
      currentChunkIndexRef.current = 0;
      setIsSpeaking(false);
    }
  }, []);

  const toggleVoiceCommand = async () => {
    if (isListening) {
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore abort errors
      }
      setIsListening(false);
      return;
    }

    if (!recognitionRef.current) {
      const errorMsg = isMobile
        ? "Voice commands not available on this device. Try using Chrome browser."
        : "Voice commands not supported in this browser.";
      setError(errorMsg);
      speak(errorMsg);
      return;
    }

    // Request microphone permission explicitly on mobile
    if (isMobile && navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        const errorMsg = "Please allow microphone access to use voice commands.";
        setError(errorMsg);
        speak(errorMsg);
        return;
      }
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      triggerHaptic("capture");
      // Shorter message for mobile
      speak(isMobile ? "Listening" : "Listening for command");
    } catch (err) {
      setIsListening(false);
      if (err instanceof Error && err.message.includes("already started")) {
        // Already listening, ignore
        return;
      }
      const errorMsg = "Unable to start voice recognition. Please try again.";
      setError(errorMsg);
      speak(errorMsg);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setDescription("");
    setError(null);
    stopSpeaking();
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    if (!description) return;

    try {
      await navigator.clipboard.writeText(description);
      setCopied(true);
      speak("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy. Please try selecting the text manually.");
      speak("Failed to copy");
    }
  };

  // Share functionality
  const shareResults = async () => {
    if (!description) return;

    const shareData = {
      title: "VisionAssist Analysis",
      text: `[${modes.find((m) => m.id === selectedMode)?.label}]\n\n${description}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        speak("Shared successfully");
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== "AbortError") {
          copyToClipboard(); // Fallback to copy
        }
      }
    } else {
      // Fallback to copy
      copyToClipboard();
    }
  };

  // Delete history item
  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    speak("Removed from history");
  };

  // Clear all history
  const clearHistory = () => {
    setHistory([]);
    speak("History cleared");
    setShowHistory(false);
  };

  // Load history item
  const loadHistoryItem = (item: HistoryItem) => {
    setCapturedImage(item.thumbnail);
    setDescription(item.description);
    setSelectedMode(item.mode);
    setShowHistory(false);
    speak("Loaded from history");
  };

  // Quick action handlers
  const quickScan = () => {
    setSelectedMode("scene");
    setShowQuickActions(false);
    if (cameraActive) {
      captureImage();
    } else {
      startCamera();
      speak("Opening camera for quick scan");
    }
  };

  const quickRead = () => {
    setSelectedMode("read");
    setShowQuickActions(false);
    if (cameraActive) {
      captureImage();
    } else {
      startCamera();
      speak("Opening camera to read text");
    }
  };

  const quickNavigate = () => {
    setSelectedMode("navigation");
    setShowQuickActions(false);
    if (cameraActive) {
      captureImage();
    } else {
      startCamera();
      speak("Opening camera for navigation help");
    }
  };

  // Demo mode handler
  const runDemo = (scenario: DemoScenario) => {
    setShowDemoMode(false);
    setSelectedMode(scenario.mode);
    setDescription(scenario.response);
    triggerHaptic("success");

    // Add to history
    const historyItem: HistoryItem = {
      id: generateId(),
      timestamp: Date.now(),
      mode: scenario.mode,
      thumbnail: "", // Demo items don't have thumbnails
      description: scenario.response,
    };
    setHistory((prev) => [historyItem, ...prev].slice(0, MAX_HISTORY_ITEMS));

    if (autoSpeak) {
      speak(scenario.response);
    }
  };

  const currentMode = modes.find((m) => m.id === selectedMode)!;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        highContrast
          ? "bg-black text-yellow-300"
          : darkMode
          ? "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white"
          : "bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 text-slate-900"
      }`}
      style={{ fontSize: `${fontSize}px` }}
    >
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-lg border-b ${
        highContrast
          ? "bg-black/90 border-yellow-300/30"
          : darkMode
          ? "bg-black/30 border-white/10"
          : "bg-white/70 border-slate-200"
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${highContrast ? "bg-yellow-300 text-black" : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"}`}>
                <Eye className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">VisionAssist</h1>
                <p className={`text-sm hidden sm:block ${highContrast ? "text-yellow-200" : darkMode ? "text-cyan-200" : "text-cyan-600"}`}>
                  AI-Powered Visual Assistance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Theme Toggle Button */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 sm:p-3 rounded-xl transition-all ${
                  highContrast
                    ? "bg-yellow-300 text-black"
                    : darkMode
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                }`}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* Quick Actions Button */}
              <button
                onClick={() => setShowQuickActions(true)}
                className={`p-2 sm:p-3 rounded-xl transition-all ${
                  highContrast
                    ? "bg-yellow-300 text-black"
                    : darkMode
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                }`}
                aria-label="Quick actions"
              >
                <Zap className="w-5 h-5" />
              </button>

              {/* History Button */}
              <button
                onClick={() => setShowHistory(true)}
                className={`p-2 sm:p-3 rounded-xl transition-all relative ${
                  highContrast
                    ? "bg-yellow-300 text-black"
                    : darkMode
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                }`}
                aria-label="View history"
              >
                <History className="w-5 h-5" />
                {history.length > 0 && (
                  <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center text-white ${
                    highContrast ? "bg-black text-yellow-300" : "bg-cyan-500"
                  }`}>
                    {history.length}
                  </span>
                )}
              </button>

              {/* Voice Command Button */}
              <button
                onClick={toggleVoiceCommand}
                disabled={!voiceSupported}
                className={`p-2 sm:p-3 rounded-xl transition-all ${
                  !voiceSupported
                    ? "opacity-50 cursor-not-allowed bg-white/5"
                    : isListening
                    ? "bg-red-500 animate-pulse text-white"
                    : highContrast
                    ? "bg-yellow-300 text-black"
                    : darkMode
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                }`}
                aria-label={isListening ? "Stop listening" : "Start voice command"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 sm:p-3 rounded-xl transition-all ${
                  highContrast
                    ? "bg-yellow-300 text-black"
                    : darkMode
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                }`}
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${darkMode ? "bg-black/80" : "bg-black/50"}`}>
          <div
            className={`w-full max-w-md rounded-2xl p-6 ${
              highContrast
                ? "bg-black border-2 border-yellow-300"
                : darkMode
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-900 shadow-xl"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Accessibility Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className={`p-2 rounded-lg ${
                  highContrast
                    ? "bg-yellow-300 text-black"
                    : darkMode
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-slate-100 hover:bg-slate-200"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* High Contrast */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {highContrast ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>High Contrast Mode</span>
                </div>
                <button
                  onClick={() => setHighContrast(!highContrast)}
                  className={`w-14 h-8 rounded-full transition-all ${
                    highContrast ? "bg-yellow-300" : "bg-white/20"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white shadow-lg transform transition-transform ${
                      highContrast ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Font Size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span>Text Size</span>
                  <span className="text-sm opacity-70">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                    className={`p-2 rounded-lg ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <input
                    type="range"
                    min="14"
                    max="28"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="flex-1 accent-cyan-500"
                  />
                  <button
                    onClick={() => setFontSize(Math.min(28, fontSize + 2))}
                    className={`p-2 rounded-lg ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Auto Speak */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5" />
                  <span>Auto-read Results</span>
                </div>
                <button
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className={`w-14 h-8 rounded-full transition-all ${
                    autoSpeak ? (highContrast ? "bg-yellow-300" : "bg-cyan-500") : "bg-white/20"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white shadow-lg transform transition-transform ${
                      autoSpeak ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <h3 className="font-semibold mb-4">Keyboard Shortcuts</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Capture</span>
                  <kbd className={`px-2 py-1 rounded ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}>Space</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Camera</span>
                  <kbd className={`px-2 py-1 rounded ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}>C</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Stop Speech</span>
                  <kbd className={`px-2 py-1 rounded ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}>S</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Repeat</span>
                  <kbd className={`px-2 py-1 rounded ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}>R</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Voice</span>
                  <kbd className={`px-2 py-1 rounded ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}>V</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Modes</span>
                  <kbd className={`px-2 py-1 rounded ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}>1-5</kbd>
                </div>
                <div className="flex justify-between">
                  <span>History</span>
                  <kbd className={`px-2 py-1 rounded ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}>H</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Quick Actions</span>
                  <kbd className={`px-2 py-1 rounded ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}>Q</kbd>
                </div>
              </div>
            </div>

            {/* Sound Toggle */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5" />
                  <span>Sound Effects</span>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-14 h-8 rounded-full transition-all ${
                    soundEnabled ? (highContrast ? "bg-yellow-300" : "bg-cyan-500") : "bg-white/20"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white shadow-lg transform transition-transform ${
                      soundEnabled ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden ${
              highContrast ? "bg-black border-2 border-yellow-300" : "bg-slate-800"
            }`}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="w-5 h-5" />
                Analysis History
              </h2>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      highContrast ? "bg-red-900 text-red-300" : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className={`p-2 rounded-lg ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {history.length === 0 ? (
                <div className="text-center py-12 opacity-70">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No history yet</p>
                  <p className="text-sm mt-2">Capture an image to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl flex gap-4 ${
                        highContrast ? "bg-yellow-300/10 border border-yellow-300/30" : "bg-white/5"
                      }`}
                    >
                      {item.thumbnail && (
                        <img
                          src={item.thumbnail}
                          alt="Analysis thumbnail"
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            highContrast ? "bg-yellow-300 text-black" : "bg-cyan-500/30"
                          }`}>
                            {modes.find((m) => m.id === item.mode)?.label}
                          </span>
                          <span className="text-xs opacity-50">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2 opacity-80">{item.description}</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => loadHistoryItem(item)}
                            className={`text-xs px-3 py-1 rounded ${
                              highContrast ? "bg-yellow-300 text-black" : "bg-white/10"
                            }`}
                          >
                            Load
                          </button>
                          <button
                            onClick={() => speak(item.description)}
                            className={`text-xs px-3 py-1 rounded ${
                              highContrast ? "bg-yellow-300 text-black" : "bg-white/10"
                            }`}
                          >
                            Read
                          </button>
                          <button
                            onClick={() => deleteHistoryItem(item.id)}
                            className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Panel */}
      {showQuickActions && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl ${
              highContrast ? "bg-black border-2 border-yellow-300" : "bg-slate-800"
            }`}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Actions
              </h2>
              <button
                onClick={() => setShowQuickActions(false)}
                className={`p-2 rounded-lg ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <button
                onClick={quickScan}
                className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                  highContrast
                    ? "bg-yellow-300/10 border border-yellow-300 hover:bg-yellow-300/20"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className={`p-3 rounded-full ${highContrast ? "bg-yellow-300 text-black" : "bg-cyan-500"}`}>
                  <Eye className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">What&apos;s Around Me?</div>
                  <div className="text-sm opacity-70">Quick scene description</div>
                </div>
              </button>

              <button
                onClick={quickRead}
                className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                  highContrast
                    ? "bg-yellow-300/10 border border-yellow-300 hover:bg-yellow-300/20"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className={`p-3 rounded-full ${highContrast ? "bg-yellow-300 text-black" : "bg-blue-500"}`}>
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Read This Now</div>
                  <div className="text-sm opacity-70">Extract and read text</div>
                </div>
              </button>

              <button
                onClick={quickNavigate}
                className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                  highContrast
                    ? "bg-yellow-300/10 border border-yellow-300 hover:bg-yellow-300/20"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className={`p-3 rounded-full ${highContrast ? "bg-yellow-300 text-black" : "bg-green-500"}`}>
                  <Navigation className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-semibold">Help Me Navigate</div>
                  <div className="text-sm opacity-70">Find paths and obstacles</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Tutorial */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-2xl overflow-hidden ${
              highContrast ? "bg-black border-2 border-yellow-300" : "bg-slate-800"
            }`}
          >
            {onboardingStep === 0 && (
              <div className="p-8 text-center">
                <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
                  highContrast ? "bg-yellow-300 text-black" : "bg-gradient-to-r from-cyan-500 to-blue-600"
                }`}>
                  <Eye className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Welcome to VisionAssist</h2>
                <p className="opacity-80 mb-8">
                  AI-powered visual assistance to help you understand your surroundings, read text, identify objects, and navigate safely.
                </p>
                <button
                  onClick={() => setOnboardingStep(1)}
                  className={`w-full py-4 rounded-xl font-semibold ${
                    highContrast ? "bg-yellow-300 text-black" : "bg-gradient-to-r from-cyan-500 to-blue-600"
                  }`}
                >
                  Get Started
                </button>
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="w-full py-3 mt-3 opacity-70 hover:opacity-100"
                >
                  Skip Tutorial
                </button>
              </div>
            )}

            {onboardingStep === 1 && (
              <div className="p-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Camera className="w-6 h-6" />
                  Capture Images
                </h3>
                <p className="opacity-80 mb-6">
                  Use your camera or upload an image. Press <kbd className="px-2 py-1 rounded bg-white/10">Space</kbd> to capture when camera is open.
                </p>
                <div className="flex justify-between">
                  <button onClick={() => setOnboardingStep(0)} className="px-4 py-2 opacity-70">
                    Back
                  </button>
                  <button
                    onClick={() => setOnboardingStep(2)}
                    className={`px-6 py-2 rounded-xl ${
                      highContrast ? "bg-yellow-300 text-black" : "bg-cyan-500"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="p-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Mic className="w-6 h-6" />
                  Voice Commands
                </h3>
                <p className="opacity-80 mb-4">
                  Control the app hands-free with voice commands:
                </p>
                <ul className="space-y-2 mb-6 text-sm opacity-80">
                  <li>&quot;Capture&quot; - Take a photo</li>
                  <li>&quot;Scene / Read / Navigate / Identify / Color&quot; - Change mode</li>
                  <li>&quot;Repeat&quot; - Hear the result again</li>
                  <li>&quot;History&quot; - Access previous results</li>
                </ul>
                <div className="flex justify-between">
                  <button onClick={() => setOnboardingStep(1)} className="px-4 py-2 opacity-70">
                    Back
                  </button>
                  <button
                    onClick={() => setOnboardingStep(3)}
                    className={`px-6 py-2 rounded-xl ${
                      highContrast ? "bg-yellow-300 text-black" : "bg-cyan-500"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="p-8 text-center">
                <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
                  highContrast ? "bg-yellow-300 text-black" : "bg-green-500"
                }`}>
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-4">You&apos;re All Set!</h3>
                <p className="opacity-80 mb-8">
                  Press <kbd className="px-2 py-1 rounded bg-white/10">V</kbd> for voice commands, <kbd className="px-2 py-1 rounded bg-white/10">H</kbd> for history, or <kbd className="px-2 py-1 rounded bg-white/10">Q</kbd> for quick actions.
                </p>
                <button
                  onClick={() => setShowOnboarding(false)}
                  className={`w-full py-4 rounded-xl font-semibold ${
                    highContrast ? "bg-yellow-300 text-black" : "bg-gradient-to-r from-cyan-500 to-blue-600"
                  }`}
                >
                  Start Using VisionAssist
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Demo Mode Panel */}
      {showDemoMode && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-2xl overflow-hidden ${
              highContrast ? "bg-black border-2 border-yellow-300" : "bg-slate-800"
            }`}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Play className="w-5 h-5" />
                Demo Mode
              </h2>
              <button
                onClick={() => setShowDemoMode(false)}
                className={`p-2 rounded-lg ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm opacity-70 mb-4">
                Try VisionAssist without a camera. Select a scenario to see how the app analyzes different situations.
              </p>

              <div className="space-y-3">
                {DEMO_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => runDemo(scenario)}
                    className={`w-full p-4 rounded-xl flex items-center gap-4 text-left transition-all ${
                      highContrast
                        ? "bg-yellow-300/10 border border-yellow-300 hover:bg-yellow-300/20"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      highContrast ? "bg-yellow-300 text-black" : "bg-cyan-500/30"
                    }`}>
                      {modes.find((m) => m.id === scenario.mode)?.icon}
                    </div>
                    <div>
                      <div className="font-medium">{scenario.name}</div>
                      <div className="text-sm opacity-70">{scenario.description}</div>
                      <div className={`text-xs mt-1 ${
                        highContrast ? "text-yellow-300" : "text-cyan-400"
                      }`}>
                        {modes.find((m) => m.id === scenario.mode)?.label}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Mode Selection */}
        <div className="mb-6">
          <h2 className="sr-only">Select Analysis Mode</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  setSelectedMode(mode.id);
                  speak(`${mode.label} mode selected`);
                }}
                className={`p-4 rounded-xl transition-all transform hover:scale-105 ${
                  selectedMode === mode.id
                    ? highContrast
                      ? "bg-yellow-300 text-black ring-4 ring-yellow-500"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/30 text-white"
                    : highContrast
                    ? "bg-black border-2 border-yellow-300"
                    : darkMode
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-white hover:bg-slate-100 shadow-md border border-slate-200"
                }`}
                aria-pressed={selectedMode === mode.id}
                aria-label={`${mode.label}: ${mode.description}. Press ${mode.shortcut}`}
              >
                <div className="flex flex-col items-center gap-2">
                  {mode.icon}
                  <span className="font-medium text-sm">{mode.label}</span>
                  <span className="text-xs opacity-70 hidden sm:block">{mode.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Camera/Image Section */}
          <div
            className={`rounded-2xl overflow-hidden ${
              highContrast
                ? "bg-black border-2 border-yellow-300"
                : darkMode
                ? "bg-white/5 backdrop-blur-lg"
                : "bg-white shadow-lg border border-slate-200"
            }`}
          >
            <div className={`p-4 border-b ${darkMode ? "border-white/10" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  {cameraActive ? "Live Camera" : "Capture Image"}
                </h2>
                {cameraActive && (
                  <div className="flex items-center gap-2">
                    {/* Continuous Mode Toggle */}
                    <button
                      onClick={() => {
                        setContinuousMode(!continuousMode);
                        speak(continuousMode ? "Continuous mode off" : "Continuous mode on. Analyzing every 5 seconds.");
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        continuousMode
                          ? "bg-green-500 animate-pulse"
                          : highContrast
                          ? "bg-yellow-300 text-black"
                          : "bg-white/10"
                      }`}
                      aria-label={continuousMode ? "Stop continuous mode" : "Start continuous mode"}
                    >
                      {continuousMode ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    {/* Switch Camera */}
                    <button
                      onClick={switchCamera}
                      className={`p-2 rounded-lg ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}
                      aria-label="Switch camera"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div
              className="relative bg-black overflow-hidden"
              style={{
                // Dynamic aspect ratio: use video dimensions if available, otherwise default to 4:3 on mobile, 16:9 on desktop
                aspectRatio: videoDimensions
                  ? `${videoDimensions.width} / ${videoDimensions.height}`
                  : isMobile
                  ? "3 / 4"
                  : "16 / 9",
                maxHeight: isMobile ? "60vh" : "70vh",
              }}
            >
              {/* Always render video element so ref is available for camera */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: cameraActive && !capturedImage ? "block" : "none" }}
              />
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-contain"
                />
              ) : error && error.includes("permission") ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                  <div className={`p-4 rounded-full mb-4 ${highContrast ? "bg-yellow-300/20" : "bg-red-500/20"}`}>
                    <Camera className="w-12 h-12 text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Camera Permission Required</h3>
                  <p className="text-center text-white/70 mb-4 max-w-md">
                    To use VisionAssist, please allow camera access in your browser.
                  </p>
                  <div className={`p-4 rounded-xl text-sm ${highContrast ? "bg-yellow-300/10" : "bg-white/10"}`}>
                    <p className="font-medium mb-2">How to enable:</p>
                    <ol className="list-decimal list-inside space-y-1 text-white/70">
                      <li>Click the camera/lock icon in your browser&apos;s address bar</li>
                      <li>Find &quot;Camera&quot; and select &quot;Allow&quot;</li>
                      <li>Refresh this page and try again</li>
                    </ol>
                  </div>
                  <button
                    onClick={startCamera}
                    className={`mt-4 px-6 py-3 rounded-xl font-medium ${
                      highContrast ? "bg-yellow-300 text-black" : "bg-cyan-500 hover:bg-cyan-600"
                    }`}
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
                  <Camera className="w-16 h-16 mb-4" />
                  <p>No image captured</p>
                </div>
              )}

              {/* Capture/Analyze overlay */}
              {cameraActive && !capturedImage && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                  <button
                    onClick={() => {
                      captureImage();
                      triggerHaptic("capture");
                    }}
                    className={`rounded-full flex items-center justify-center transition-all transform active:scale-95 hover:scale-105 ${
                      isMobile ? "w-24 h-24" : "w-20 h-20"
                    } ${
                      highContrast
                        ? "bg-yellow-300 text-black shadow-lg shadow-yellow-300/50"
                        : "bg-white shadow-xl"
                    }`}
                    aria-label="Capture image"
                  >
                    <div className={`rounded-full ${isMobile ? "w-20 h-20" : "w-16 h-16"} ${highContrast ? "bg-black" : "bg-cyan-500"}`} />
                  </button>
                </div>
              )}

              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      <div className={`absolute inset-0 rounded-full border-4 border-t-transparent animate-spin ${
                        highContrast ? "border-yellow-300" : "border-cyan-500"
                      }`} />
                      <div className={`absolute inset-2 rounded-full border-4 border-b-transparent animate-spin ${
                        highContrast ? "border-yellow-300/50" : "border-teal-500"
                      }`} style={{ animationDirection: "reverse", animationDuration: "0.75s" }} />
                      <Eye className={`absolute inset-0 m-auto w-8 h-8 ${
                        highContrast ? "text-yellow-300" : "text-white"
                      }`} />
                    </div>
                    <p className="text-lg font-medium">Analyzing with AI...</p>
                    <p className="text-sm opacity-70 mt-1">
                      {selectedMode === "scene" && "Understanding your surroundings"}
                      {selectedMode === "read" && "Extracting text"}
                      {selectedMode === "identify" && "Identifying object"}
                      {selectedMode === "navigation" && "Finding safe paths"}
                      {selectedMode === "color" && "Detecting colors"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Action Buttons */}
            <div className="p-4 flex flex-wrap gap-3">
              {!cameraActive ? (
                <>
                  <button
                    onClick={startCamera}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-medium transition-all active:scale-95 ${
                      isMobile ? "py-4 px-4 text-lg" : "py-3 px-4"
                    } ${
                      highContrast
                        ? "bg-yellow-300 text-black"
                        : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white"
                    }`}
                  >
                    <Camera className={isMobile ? "w-6 h-6" : "w-5 h-5"} />
                    {isMobile ? "Camera" : "Open Camera"}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl font-medium transition-all active:scale-95 ${
                      isMobile ? "py-4 px-4 text-lg" : "py-3 px-4"
                    } ${
                      highContrast
                        ? "bg-black border-2 border-yellow-300"
                        : darkMode
                        ? "bg-white/10 hover:bg-white/20"
                        : "bg-slate-200 hover:bg-slate-300"
                    }`}
                  >
                    <Upload className={isMobile ? "w-6 h-6" : "w-5 h-5"} />
                    Upload
                  </button>
                  <button
                    onClick={() => setShowDemoMode(true)}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm transition-all active:scale-95 ${
                      highContrast
                        ? "bg-black border border-yellow-300/50 text-yellow-300"
                        : darkMode
                        ? "bg-white/5 hover:bg-white/10 text-white/70"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    Try Demo (No Camera Needed)
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture={isMobile ? "environment" : undefined}
                    onChange={handleFileUpload}
                    className="hidden"
                    aria-label="Upload image file"
                  />
                </>
              ) : (
                <>
                  <button
                    onClick={stopCamera}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                      highContrast
                        ? "bg-black border-2 border-yellow-300"
                        : darkMode
                        ? "bg-white/10 hover:bg-white/20"
                        : "bg-slate-200 hover:bg-slate-300"
                    }`}
                  >
                    <X className="w-5 h-5" />
                    Close Camera
                  </button>
                  {capturedImage && (
                    <button
                      onClick={resetCapture}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                        highContrast
                          ? "bg-yellow-300 text-black"
                          : "bg-gradient-to-r from-cyan-500 to-blue-600"
                      }`}
                    >
                      <RefreshCw className="w-5 h-5" />
                      Retake
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div
            className={`rounded-2xl ${
              highContrast
                ? "bg-black border-2 border-yellow-300"
                : darkMode
                ? "bg-white/5 backdrop-blur-lg"
                : "bg-white shadow-lg border border-slate-200"
            }`}
          >
            <div className={`p-4 border-b ${darkMode ? "border-white/10" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  {currentMode.icon}
                  {currentMode.label} Results
                </h2>
                <div className="flex items-center gap-2">
                  {description && (
                    <>
                      {/* Copy Button */}
                      <button
                        onClick={copyToClipboard}
                        className={`p-2 rounded-lg transition-all ${
                          copied
                            ? "bg-green-500 text-white"
                            : highContrast
                            ? "bg-yellow-300 text-black"
                            : darkMode
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-slate-100 hover:bg-slate-200"
                        }`}
                        aria-label={copied ? "Copied!" : "Copy to clipboard"}
                      >
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>

                      {/* Share Button */}
                      <button
                        onClick={shareResults}
                        className={`p-2 rounded-lg transition-all ${
                          highContrast
                            ? "bg-yellow-300 text-black"
                            : darkMode
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-slate-100 hover:bg-slate-200"
                        }`}
                        aria-label="Share results"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>

                      {/* Speak Button */}
                      <button
                        onClick={() => (isSpeaking ? stopSpeaking() : speak(description))}
                        className={`p-2 rounded-lg transition-all ${
                          isSpeaking
                            ? "bg-green-500 animate-pulse text-white"
                            : highContrast
                            ? "bg-yellow-300 text-black"
                            : darkMode
                            ? "bg-white/10 hover:bg-white/20"
                            : "bg-slate-100 hover:bg-slate-200"
                        }`}
                        aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
                      >
                        {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 min-h-[300px] max-h-[500px] overflow-y-auto">
              {error ? (
                <div className={`p-4 rounded-xl ${highContrast ? "bg-red-900 border border-red-500" : "bg-red-500/20 border border-red-500/50"}`}>
                  <p className="text-red-300">{error}</p>
                </div>
              ) : description ? (
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed">{description}</div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-white/50">
                  <div className={`p-6 rounded-full mb-4 ${highContrast ? "bg-yellow-300/10" : "bg-white/5"}`}>
                    {currentMode.icon}
                  </div>
                  <p className="text-center">
                    {cameraActive
                      ? "Press the capture button or spacebar to analyze"
                      : "Open the camera or upload an image to get started"}
                  </p>
                </div>
              )}
            </div>

            {/* Speaking indicator */}
            {isSpeaking && (
              <div className={`p-4 border-t border-white/10 ${highContrast ? "bg-yellow-300/10" : "bg-cyan-500/20"}`}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full ${highContrast ? "bg-yellow-300" : "bg-cyan-400"}`}
                        style={{
                          height: "20px",
                          animation: `pulse 0.5s ease-in-out ${i * 0.1}s infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm">Speaking...</span>
                  <button
                    onClick={stopSpeaking}
                    className={`ml-auto px-3 py-1 rounded-lg text-sm ${
                      highContrast ? "bg-yellow-300 text-black" : "bg-white/10"
                    }`}
                  >
                    Stop
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips */}
        <div className={`mt-8 p-6 rounded-2xl ${highContrast ? "bg-black border-2 border-yellow-300" : "bg-white/5"}`}>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Quick Tips
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className={`p-4 rounded-xl ${highContrast ? "bg-yellow-300/10" : "bg-white/5"}`}>
              <div className="font-medium mb-1">🎤 Voice Commands</div>
              <p className="opacity-70">Say &quot;capture&quot;, &quot;read&quot;, &quot;navigate&quot;, or &quot;identify&quot; to control the app</p>
            </div>
            <div className={`p-4 rounded-xl ${highContrast ? "bg-yellow-300/10" : "bg-white/5"}`}>
              <div className="font-medium mb-1">⌨️ Keyboard Friendly</div>
              <p className="opacity-70">Press 1-5 to switch modes, Space to capture, V for voice</p>
            </div>
            <div className={`p-4 rounded-xl ${highContrast ? "bg-yellow-300/10" : "bg-white/5"}`}>
              <div className="font-medium mb-1">🔊 Audio Feedback</div>
              <p className="opacity-70">All results are automatically read aloud for easy access</p>
            </div>
            <div className={`p-4 rounded-xl ${highContrast ? "bg-yellow-300/10" : "bg-white/5"}`}>
              <div className="font-medium mb-1">♿ Accessible Design</div>
              <p className="opacity-70">High contrast mode and adjustable text size available</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`mt-12 py-6 border-t ${highContrast ? "border-yellow-300" : "border-white/10"}`}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="opacity-70">
            VisionAssist — Empowering independence through AI vision technology
          </p>
          <p className="text-sm opacity-50 mt-2">
            Built with ❤️ for accessibility • Powered by Google Gemini AI
          </p>
        </div>
      </footer>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes pulse {
          from {
            transform: scaleY(0.5);
          }
          to {
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
