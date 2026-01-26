import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { image, mode } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Remove data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    };

    let prompt = "";

    switch (mode) {
      case "scene":
        prompt = `You are an AI assistant helping a visually impaired person understand their surroundings. Analyze this image and provide:

1. **Overview**: A brief, clear description of the scene (1-2 sentences)
2. **Key Objects**: List the main objects visible with their approximate positions (left, right, center, near, far)
3. **People**: If there are people, describe their general appearance, activities, and positions
4. **Text**: Any visible text or signs
5. **Safety Notes**: Any potential hazards or important navigation information
6. **Atmosphere**: Lighting conditions, indoor/outdoor, time of day if apparent

Keep the language simple, direct, and helpful for navigation. Prioritize information that helps with spatial awareness and safety.`;
        break;

      case "read":
        prompt = `You are an AI assistant helping a visually impaired person read text. Analyze this image and:

1. **Extract all visible text** - Read every piece of text you can see, in order from top to bottom, left to right
2. **Context**: Describe what type of document/sign/label this appears to be
3. **Important highlights**: Point out any emphasized text, headings, or crucial information
4. **Formatting notes**: Mention if there are lists, tables, or special formatting that affects meaning

If the text is partially obscured or unclear, indicate that. Read numbers, dates, and special characters carefully.`;
        break;

      case "identify":
        prompt = `You are an AI assistant helping a visually impaired person identify objects. Analyze this image and:

1. **Primary Object**: What is the main object in focus? Provide a detailed identification
2. **Brand/Model**: If visible, identify any brand names, logos, or model information
3. **Description**: Color, size (estimated), shape, material if apparent
4. **Usage**: Brief explanation of what this object is used for
5. **Similar items**: If relevant, mention what this might be confused with

Be specific and practical in your identification.`;
        break;

      case "navigation":
        prompt = `You are an AI assistant helping a visually impaired person navigate. Analyze this image for navigation assistance:

1. **Path Analysis**: Describe the walkable path or route visible
2. **Obstacles**: List any obstacles, their positions, and distances (near/medium/far)
3. **Landmarks**: Identify any landmarks that could help with orientation
4. **Surfaces**: Describe floor/ground conditions (stairs, ramps, uneven surfaces, wet areas)
5. **Doors/Exits**: Location of any doors, exits, or openings
6. **Immediate Hazards**: Any immediate safety concerns (steps, curbs, obstacles at head height)
7. **Direction Guidance**: Suggest the safest path forward

Use clock positions (12 o'clock = straight ahead) and distance estimates when possible.`;
        break;

      case "color":
        prompt = `You are an AI assistant helping a visually impaired person identify colors. Analyze this image and:

1. **Dominant Colors**: List the main colors visible, from most to least prominent
2. **Object Colors**: For each visible object, describe its color(s) specifically
3. **Color Combinations**: Note any patterns, gradients, or color combinations
4. **Practical Info**: If this appears to be clothing, food, or other items where color matters, provide practical context (e.g., "This appears to be a ripe banana - yellow with small brown spots")

Use specific color names when possible (navy blue vs. just blue, forest green vs. just green).`;
        break;

      default:
        prompt = `Describe this image in detail for a visually impaired person. Include information about objects, people, text, colors, and spatial layout. Be helpful and practical.`;
    }

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ description: text });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
