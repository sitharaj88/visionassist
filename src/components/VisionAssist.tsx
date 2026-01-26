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
  Loader2,
  RefreshCw,
  Sun,
  Moon,
  Mic,
  MicOff,
  ZoomIn,
  ZoomOut,
  Settings,
  X,
  ChevronDown,
} from "lucide-react";

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const command = event.results[0][0].transcript.toLowerCase();
        handleVoiceCommand(command);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleVoiceCommand = (command: string) => {
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
    } else if (command.includes("capture") || command.includes("take") || command.includes("photo")) {
      captureImage();
    } else if (command.includes("stop") || command.includes("quiet")) {
      stopSpeaking();
    } else if (command.includes("repeat") || command.includes("again")) {
      if (description) speak(description);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "1":
          setSelectedMode("scene");
          break;
        case "2":
          setSelectedMode("read");
          break;
        case "3":
          setSelectedMode("identify");
          break;
        case "4":
          setSelectedMode("navigation");
          break;
        case "5":
          setSelectedMode("color");
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
        case "Escape":
          setShowSettings(false);
          if (cameraActive) stopCamera();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cameraActive, description]);

  const startCamera = async () => {
    try {
      setError(null);
      
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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        speak("Camera activated. Press space to capture.");
      }
    } catch (err: unknown) {
      let errorMsg = "Unable to access camera.";
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg = "Camera permission denied. Please click the camera icon in your browser's address bar to allow access, then try again.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMsg = "No camera found. Please connect a camera and try again.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMsg = "Camera is in use by another application. Please close other apps using the camera and try again.";
        } else if (err.name === 'OverconstrainedError') {
          // Try again with basic constraints
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              streamRef.current = stream;
              setCameraActive(true);
              speak("Camera activated. Press space to capture.");
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
  };

  const switchCamera = async () => {
    const newFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(newFacing);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setCapturedImage(imageData);
        analyzeImage(imageData);
        speak("Image uploaded. Analyzing...");
      };
      reader.readAsDataURL(file);
    }
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
      } else {
        setDescription(data.description);
        if (autoSpeak) {
          speak(data.description);
        }
      }
    } catch (err) {
      setError("Failed to analyze image. Please try again.");
      speak("Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const speak = (text: string) => {
    if ("speechSynthesis" in window) {
      stopSpeaking();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      speechSynthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleVoiceCommand = () => {
    if (isListening) {
      recognitionRef.current?.abort();
      setIsListening(false);
    } else if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
      speak("Listening for command");
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setDescription("");
    setError(null);
    stopSpeaking();
  };

  const currentMode = modes.find((m) => m.id === selectedMode)!;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        highContrast
          ? "bg-black text-yellow-300"
          : "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white"
      }`}
      style={{ fontSize: `${fontSize}px` }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-black/30 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${highContrast ? "bg-yellow-300 text-black" : "bg-gradient-to-r from-purple-500 to-pink-500"}`}>
                <Eye className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">VisionAssist</h1>
                <p className={`text-sm ${highContrast ? "text-yellow-200" : "text-purple-200"}`}>
                  AI-Powered Visual Assistance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Voice Command Button */}
              <button
                onClick={toggleVoiceCommand}
                className={`p-3 rounded-xl transition-all ${
                  isListening
                    ? "bg-red-500 animate-pulse"
                    : highContrast
                    ? "bg-yellow-300 text-black"
                    : "bg-white/10 hover:bg-white/20"
                }`}
                aria-label={isListening ? "Stop listening" : "Start voice command"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-3 rounded-xl transition-all ${
                  highContrast ? "bg-yellow-300 text-black" : "bg-white/10 hover:bg-white/20"
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
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-2xl p-6 ${
              highContrast ? "bg-black border-2 border-yellow-300" : "bg-slate-800"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Accessibility Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className={`p-2 rounded-lg ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}
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
                    className="flex-1 accent-purple-500"
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
                    autoSpeak ? (highContrast ? "bg-yellow-300" : "bg-purple-500") : "bg-white/20"
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
                      : "bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30"
                    : highContrast
                    ? "bg-black border-2 border-yellow-300"
                    : "bg-white/10 hover:bg-white/20"
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
              highContrast ? "bg-black border-2 border-yellow-300" : "bg-white/5 backdrop-blur-lg"
            }`}
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  {cameraActive ? "Live Camera" : "Capture Image"}
                </h2>
                {cameraActive && (
                  <button
                    onClick={switchCamera}
                    className={`p-2 rounded-lg ${highContrast ? "bg-yellow-300 text-black" : "bg-white/10"}`}
                    aria-label="Switch camera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative aspect-video bg-black">
              {cameraActive && !capturedImage ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : capturedImage ? (
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
                      highContrast ? "bg-yellow-300 text-black" : "bg-purple-500 hover:bg-purple-600"
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
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <button
                    onClick={captureImage}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-110 ${
                      highContrast
                        ? "bg-yellow-300 text-black"
                        : "bg-white shadow-xl"
                    }`}
                    aria-label="Capture image"
                  >
                    <div className={`w-16 h-16 rounded-full ${highContrast ? "bg-black" : "bg-purple-500"}`} />
                  </button>
                </div>
              )}

              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                    <p className="text-lg">Analyzing with AI...</p>
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
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                      highContrast
                        ? "bg-yellow-300 text-black"
                        : "bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                    Open Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                      highContrast
                        ? "bg-black border-2 border-yellow-300"
                        : "bg-white/10 hover:bg-white/20"
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    Upload Image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
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
                        : "bg-white/10 hover:bg-white/20"
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
                          : "bg-gradient-to-r from-purple-500 to-pink-500"
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
              highContrast ? "bg-black border-2 border-yellow-300" : "bg-white/5 backdrop-blur-lg"
            }`}
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  {currentMode.icon}
                  {currentMode.label} Results
                </h2>
                <div className="flex items-center gap-2">
                  {description && (
                    <>
                      <button
                        onClick={() => (isSpeaking ? stopSpeaking() : speak(description))}
                        className={`p-2 rounded-lg transition-all ${
                          isSpeaking
                            ? "bg-green-500 animate-pulse"
                            : highContrast
                            ? "bg-yellow-300 text-black"
                            : "bg-white/10 hover:bg-white/20"
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
              <div className={`p-4 border-t border-white/10 ${highContrast ? "bg-yellow-300/10" : "bg-purple-500/20"}`}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full ${highContrast ? "bg-yellow-300" : "bg-purple-400"}`}
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
              <p className="opacity-70">Say "capture", "read", "navigate", or "identify" to control the app</p>
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
