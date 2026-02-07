export default async function handler(req, res) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=" +
      process.env.GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: req.body.text }] }]
      })
    }
  );

  const data = await response.json();
  res.status(200).json({
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || "No response"
  });
}

