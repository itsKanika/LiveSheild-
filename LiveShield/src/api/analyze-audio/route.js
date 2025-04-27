async function handler({ text }) {
  if (!text) {
    return {
      error: "No text provided",
      detected: false,
    };
  }

  try {
    const messages = [
      {
        role: "system",
        content:
          "You are a safety analysis system. Analyze the provided text for signs of verbal threats, distress, or concerning language that could indicate danger. Focus on identifying aggressive threats, calls for help, signs of distress, or dangerous situations.",
      },
      {
        role: "user",
        content: text,
      },
    ];

    const response = await fetch("/integrations/google-gemini-1-5/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        json_schema: {
          name: "threat_analysis",
          schema: {
            type: "object",
            properties: {
              detected: { type: "boolean" },
              confidence: { type: "number" },
              description: { type: "string" },
            },
            required: ["detected", "confidence", "description"],
            additionalProperties: false,
          },
        },
      }),
    });

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);

    return analysis;
  } catch (error) {
    return {
      error: "Failed to analyze audio text",
      detected: false,
    };
  }
}
export async function POST(request) {
  return handler(await request.json());
}