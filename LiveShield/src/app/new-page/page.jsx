"use client";
import React from "react";

function MainComponent() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const alarmRef = useRef(null);
  const alarmTimeoutRef = useRef(null);

  const addToActivityLog = useCallback((event) => {
    setActivityLog((prev) => [
      {
        type: event.type,
        message: event.message,
        timestamp: new Date().toLocaleTimeString(),
        confidence: event.confidence,
      },
      ...prev.slice(0, 9),
    ]);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsRecording(true);
      addToActivityLog({
        type: "system",
        message: "Monitoring started",
        confidence: 1,
      });
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "Could not access camera. Please ensure you have granted permission."
      );
    }
  }, [addToActivityLog]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsRecording(false);
      addToActivityLog({
        type: "system",
        message: "Monitoring stopped",
        confidence: 1,
      });
    }
  }, [stream, addToActivityLog]);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg");
  }, []);

  const playAlarm = useCallback(() => {
    if (alarmRef.current) {
      alarmRef.current.play();
      if (alarmTimeoutRef.current) {
        clearTimeout(alarmTimeoutRef.current);
      }
      alarmTimeoutRef.current = setTimeout(() => {
        alarmRef.current.pause();
        alarmRef.current.currentTime = 0;
      }, 5000);
    }
  }, []);

  const analyzeFrame = useCallback(async () => {
    if (!isRecording) return;

    const frame = captureFrame();
    if (!frame) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch("/api/analyze-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frame }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const result = await response.json();

      if (result.detected) {
        addToActivityLog({
          type: "video",
          message: result.description,
          confidence: result.confidence,
        });
        playAlarm();
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.error("Analysis timeout - skipping frame");
      } else {
        console.error("Error analyzing frame:", err);
      }
    }
  }, [isRecording, captureFrame, addToActivityLog, playAlarm]);

  const clearActivityLog = useCallback(() => {
    setActivityLog([]);
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording) {
      analyzeFrame(); // Immediate first analysis
      interval = setInterval(analyzeFrame, 5000); // Then every 5 seconds
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, analyzeFrame]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    return () => {
      if (alarmTimeoutRef.current) {
        clearTimeout(alarmTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-100">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">SafeHer</h1>
          <p className="text-lg mb-6">
            SafeHer is a real-time women safety web app that uses ScreenPipe to
            detect violent actions through live webcam streams. It instantly
            triggers alerts to help prevent harassment or assault in public
            spaces.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <span className="mr-2">📹</span> Live Monitor
              </h2>
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-6">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <p className="text-white text-xl">Camera Stopped</p>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={isRecording ? stopCamera : startCamera}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  {isRecording ? "Stop Monitoring" : "Start Monitoring"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold flex items-center">
                  <span className="mr-2">📝</span> Activity Log
                </h2>
                <button
                  onClick={clearActivityLog}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
                >
                  Clear Log
                </button>
              </div>
              <div className="space-y-3">
                {activityLog.map((activity, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      activity.type === "system"
                        ? "bg-gray-100"
                        : activity.type === "video"
                        ? "bg-red-100"
                        : "bg-yellow-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {activity.type === "system"
                          ? "🔧"
                          : activity.type === "video"
                          ? "🎥"
                          : "🎤"}{" "}
                        {activity.type.charAt(0).toUpperCase() +
                          activity.type.slice(1)}{" "}
                        Alert
                      </span>
                      <span className="text-xs text-gray-500">
                        {activity.timestamp}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{activity.message}</p>
                    {activity.type !== "system" && (
                      <p className="text-xs text-gray-500 mt-1">
                        Confidence: {Math.round(activity.confidence * 100)}%
                      </p>
                    )}
                  </div>
                ))}
                {activityLog.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    No activity recorded yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            SafeHer Applications
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="font-semibold mb-2">Public Spaces</h3>
              <p className="text-gray-600">
                Integrate with existing CCTV systems to monitor and prevent
                violence in malls, stations, and public areas
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl mb-4">🏫</div>
              <h3 className="font-semibold mb-2">Educational Institutions</h3>
              <p className="text-gray-600">
                Create safer learning environments by detecting and preventing
                bullying and violence in schools
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-4xl mb-4">🏠</div>
              <h3 className="font-semibold mb-2">Personal Security</h3>
              <p className="text-gray-600">
                Enhance home security systems with AI-powered violence detection
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4 text-center">
            About SafeHer
          </h2>
          <p className="text-gray-600 text-center mb-4">
            SafeHer was created with a vision to leverage technology for
            creating safer spaces for everyone. Using advanced AI and machine
            learning, our system can detect potential threats through visual
            cues, providing real-time alerts to prevent incidents before they
            escalate.
          </p>
          <p className="text-gray-600 text-center">
            Our technology integrates seamlessly with existing surveillance
            systems, making it an ideal solution for both public and private
            spaces. Whether it's monitoring public areas, educational
            institutions, or personal spaces, SafeHer works tirelessly to ensure
            safety and peace of mind.
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <audio
        ref={alarmRef}
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
        preload="auto"
      />

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 text-red-700 p-4 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}

export default MainComponent;