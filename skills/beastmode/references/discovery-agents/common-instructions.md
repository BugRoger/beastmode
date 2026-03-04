# Common Agent Instructions

Include this section at the end of every agent prompt.

## Output Format

Return the complete updated markdown file for the prime document.

Do NOT return JSON. Do NOT wrap in code blocks. Just return the markdown content directly.

## Merge Rules

- **Preserve** sections that have real content (not placeholders)
- **Fill** sections that have placeholder patterns: `[e.g., ...]`, `[command]`, `[what it's used for]`, `<!-- Fill in ... -->`
- **Update** sections with stale or incomplete information
- **Keep** the original document structure and headings

## Safety Rules

- NEVER read: `.env`, `*.pem`, `credentials*`, `secrets*`, `*.key`
- Include source file paths in your analysis comments if helpful
- If uncertain about a finding, note it with `[inferred]` or `[uncertain]`
