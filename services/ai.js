const Groq = require("groq-sdk");

function stripHtmlTags(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateBlogSummary(blogTitle, blogBody) {
  try {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_key") {
      return "AI summaries are not configured yet. Please add your Groq API key and try again.";
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    const plainText = stripHtmlTags(blogBody);
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates concise, engaging summaries of blog posts. Return ONLY the summary text, nothing else. Keep it to 2-3 sentences maximum.",
        },
        {
          role: "user",
          content: `Summarize the following blog post: Title: ${blogTitle} Content: ${plainText}`,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      max_tokens: 150,
    });

    return (
      completion.choices?.[0]?.message?.content?.trim() ||
      "Unable to generate a summary right now. Please try again later."
    );
  } catch (error) {
    console.error("Groq summary generation failed:", error);
    return "Unable to generate a summary right now. Please try again later.";
  }
}

module.exports = {
  generateBlogSummary,
};