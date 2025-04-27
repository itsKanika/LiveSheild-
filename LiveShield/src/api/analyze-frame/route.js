async function handler({ image }) {
  if (!image) {
    return {
      error: "No image provided",
      detected: false,
    };
  }

  try {
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this image for signs of physical violence, assault, or threatening behavior. If you detect any concerning activity, describe what you see in detail. Focus specifically on: physical confrontations, aggressive gestures, weapons, signs of distress, or any threatening situations. Provide a clear yes/no if violence is detected.",
          },
          {
            type: "image_url",
            image_url: {
              url: image,
            },
          },
        ],
      },
    ];

    const response = await fetch("/integrations/gpt-vision/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    const result = await response.json();
    const analysis = result.choices[0].message.content.toLowerCase();

    // Simplified but effective detection logic
    let confidence = 0;
    const violenceIndicators = [
      "violence",
      "assault",
      "attack",
      "fight",
      "weapon",
      "threatening",
      "aggressive",
      "danger",
      "distress",
    ];

    // Check for violence indicators
    if (violenceIndicators.some((indicator) => analysis.includes(indicator))) {
      confidence = 0.8; // High confidence for any violence indicator
    }

    // Increase confidence for clear violence mentions
    if (
      analysis.includes("violence") ||
      analysis.includes("assault") ||
      analysis.includes("weapon")
    ) {
      confidence = 0.9;
    }

    return {
      detected: confidence > 0,
      confidence,
      description: result.choices[0].message.content,
    };
  } catch (error) {
    console.error("Analysis error:", error);
    return {
      error: "Failed to analyze image",
      detected: false,
    };
  }
}
export async function POST(request) {
  return handler(await request.json());
}