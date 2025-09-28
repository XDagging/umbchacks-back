import "dotenv/config";
import { GoogleGenAI } from "@google/genai";


const ai = new GoogleGenAI({});

export async function gemini(content: string) {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: content
    });
  
    let text = response.text;
    if (!text) {
      throw new Error("Gemini returned no text");
    }   

    text = text.replace("```json", "").replace("```", "").trim();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Gemini did not return valid JSON:", text);
      throw e;
    }
}

