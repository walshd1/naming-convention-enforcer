const core = require('@actions/core');
const fs = require('fs');
const PROMPT = `You are the Naming Convention Enforcer. Your task is to review code snippets and determine if the naming conventions are followed. You will be provided with the code snippet, the expected naming convention, and the programming language. Your output should be a concise assessment of whether the code adheres to the naming convention, and if not, a clear explanation of the violation and a suggestion for a corrected name.

**Input:**

*   **Programming Language:** {programming_language}
*   **Code Snippet:** {code_snippet}
*   **Naming Convention:** {naming_convention}
*   **Element Type:** {element_type} (e.g., variable, function, class)

**Output:**

Adherence: {adherence_status} (e.g., Compliant, Non-Compliant)

Reason: {reason_for_adherence_status} (Explain why the code is compliant or non-compliant. Be specific about the violation if any.)

Suggestion: {suggested_correction} (If non-compliant, provide a corrected name adhering to the specified naming convention. Leave blank if compliant.)`;
async function run() {
  try {
    const key = core.getInput('gemini_api_key');
    const token = core.getInput('service_token');
    const ctx = { repoName: process.env.GITHUB_REPOSITORY || '', event: process.env.GITHUB_EVENT_NAME || '' };
    try { Object.assign(ctx, JSON.parse(fs.readFileSync('package.json', 'utf8'))); } catch {}
    let prompt = PROMPT;
    for (const [k, v] of Object.entries(ctx)) prompt = prompt.replace(new RegExp('{' + k + '}', 'g'), String(v || ''));
    let result;
    if (key) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } })
      });
      result = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (token) {
      const r = await fetch('https://action-factory.walshd1.workers.dev/generate/naming-convention-enforcer', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx)
      });
      result = (await r.json()).content || '';
    } else throw new Error('Need gemini_api_key or service_token');
    console.log(result);
    core.setOutput('result', result);
  } catch (e) { core.setFailed(e.message); }
}
run();
