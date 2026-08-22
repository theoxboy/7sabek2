import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { messages, systemPrompt } = await request.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "messages parameter must be an array" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.warn("WARN: GEMINI_API_KEY environment variable is not defined.");
    }

    const contents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    const sysInstruction = systemPrompt || 
      "Tu es l'assistant IA de 7sabek | Floussy, l'application bancaire connectée de notifications intelligentes et d'éducation budgétaire. Réponds en français avec enthousiasme, clarté et professionnalisme. Ne donne jamais de conseils d'investissement garantis, sois informatif et vigilant. Propose aux utilisateurs des simulations de dépenses et des conseils pour réduire les frais. Reste digne d'une institution financière de confiance.";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: sysInstruction }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu générer de réponse.";
    return NextResponse.json({ text: reply });
  } catch (error: any) {
    console.error("Gemini API error in /api/chat:", error);
    return NextResponse.json(
      { error: "Erreur lors de la communication avec l'IA.", details: error.message },
      { status: 500 }
    );
  }
}
