const Anthropic = require('@anthropic-ai/sdk');

async function processEdit(allContentSnippets, emailBody) {
  // TODO: This is not scalable. Sending all content to the AI is expensive and slow.
  // A better approach would be to:
  // 1. Use a vector database (like Pinecone or pgvector) to find the most relevant content chunk.
  // 2. Send only that chunk to the AI for analysis.
  // This would significantly reduce costs and improve performance.

    const API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!API_KEY) {
        throw new Error("ANTHROPIC_API_KEY environment variable not set.");
    }

    const anthropic = new Anthropic({ apiKey: API_KEY });

    const prompt = `
You are an intelligent assistant for a website content management system that works via a simulated email. Your task is to analyze a single block of text from a user, identify the edits they've made, match those edits to the correct content snippets from a database, and generate the updated content.

Here is the current website content, structured as a JSON array of objects with unique "key" identifiers and HTML "body" content:
${JSON.stringify(allContentSnippets, null, 2)}

A user has submitted an edit request. They copied content from the website, pasted it into an email, and made their changes directly within that text. The user's entire submission is in the single block of text below. It may contain one or more edits.

---
USER'S EDITED TEXT:
${emailBody}
---

YOUR TASK:
1.  **Analyze and Diff:** Carefully read the "USER'S EDITED TEXT". For each logical change, you must infer what the original text was by comparing it to the website content database.
2.  **Match:** For each inferred change, identify which single content snippet from the database (by its "key") the original text was from. Use fuzzy matching; the user might have only copied a portion of the text, not the full HTML.
3.  **Generate New Content:** Once a confident match is found, create the new, full HTML content for that snippet by incorporating the user's edit. It is crucial to preserve the original HTML structure (e.g., tags, classes). For example, if they edit text inside a \`<p class="text-base">\` tag, the new text must also be inside that same tag structure.
4.  **Handle Multiple Edits:** The user's text might contain several independent edits that correspond to different keys. You must identify and process all of them.
5.  **Compile JSON Response:** Aggregate all your findings into a single JSON object. This object must contain an array of "changes", with one object for each distinct edit you processed.
6.  **Summarize:** Provide a high-level summary of the entire operation in the "summaryReasoning" field.

The final JSON response must be a valid JSON object. Do not add any extra text, comments, or markdown formatting like \`\`\`json around the JSON object.
`;

    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 4096,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const jsonText = message.content[0].text;
        const parsedResponse = JSON.parse(jsonText);

        if (!Array.isArray(parsedResponse.changes) || typeof parsedResponse.summaryReasoning !== 'string') {
            throw new Error("AI response is missing required fields or has incorrect types.");
        }

        return parsedResponse;

    } catch (error) {
        console.error("Anthropic API call failed:", error);
        throw new Error("The AI model failed to generate a valid response. Please check the console for details.");
    }
}

module.exports = { processEdit };
