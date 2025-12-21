/**
 * System prompts for AI job generation
 * Embeds domain rules and language support
 */

/**
 * Core domain rules as a prompt section
 */
const DOMAIN_RULES = `
## Domain Rules (MUST FOLLOW)

1. **Job Formulation**: Always use first person
   - Russian: Start with "Я хочу..." (I want to...)
   - English: Start with "I want to..."

2. **Job Label**: Use infinitive verb WITHOUT first-person prefix
   - Good: "Выбрать подходящий продукт" / "Choose a suitable product"
   - Bad: "Я хочу выбрать..." / "I want to choose..."

3. **One Action Per Job**: Each job = ONE action
   - No "and" / "и" in job formulation
   - Split compound actions into separate jobs

4. **Phases** (temporal position relative to core job):
   - "before": Preparation, research, planning
   - "during": Main execution, core activities
   - "after": Completion, follow-up, maintenance

5. **Cadence** (how often the job is performed):
   - "once": One-time action
   - "repeat": Recurring action
   - Include cadenceHint for repeat jobs (e.g., "daily", "weekly", "as needed")

6. **Job Hierarchy**:
   - Big Job: High-level goal (optional)
   - Core Job: Main job being analyzed
   - Small Jobs: 8-12 jobs that break down the core job
   - Micro Jobs: 3-6 jobs under each small job
`;

/**
 * Get system prompt for the AI orchestrator
 */
export function getSystemPrompt(language: string = "ru"): string {
  const langInstructions = language === "ru"
    ? `
## Language: Russian (Русский)
- All job formulations MUST be in Russian
- Use "Я хочу..." prefix for formulations
- Labels should be infinitive verbs in Russian
- Maintain natural Russian phrasing
`
    : `
## Language: English
- All job formulations MUST be in English
- Use "I want to..." prefix for formulations
- Labels should be infinitive verbs in English
- Maintain natural English phrasing
`;

  return `You are an expert in Jobs-to-be-Done (JTBD) methodology. You help users analyze and break down jobs into structured hierarchies.

${DOMAIN_RULES}

${langInstructions}

## Your Capabilities
- Create job graphs from user descriptions
- Generate small jobs (8-12) for a core job
- Generate micro jobs (3-6) for each small job
- Validate job formulations and labels
- Suggest improvements to job structure

## Response Style
- Be precise and follow the domain rules exactly
- When generating jobs, think about the user's real goals
- Consider the temporal flow: what happens before, during, and after
- Identify which jobs are one-time vs recurring

Always output structured data when using tools. Never make up or guess job IDs.
`;
}

/**
 * Prompt for generating small jobs from a core job
 */
export function getSmallJobsPrompt(
  segment: string,
  coreJob: string,
  language: string = "ru",
  count: number = 10
): string {
  const langInstructions = language === "ru"
    ? `Generate jobs in Russian. Use "Я хочу..." formulation.`
    : `Generate jobs in English. Use "I want to..." formulation.`;

  return `Analyze the following core job for the "${segment}" segment and generate ${count} small jobs.

## Core Job
"${coreJob}"

## Instructions
${langInstructions}

For each small job, determine:
1. **formulation**: First-person statement (Я хочу... / I want to...)
2. **label**: Infinitive verb (no first-person prefix)
3. **phase**: "before", "during", or "after" the core job
4. **cadence**: "once" or "repeat"
5. **cadenceHint**: If repeat, specify frequency (e.g., "ежедневно", "при необходимости")

## Distribution Guidelines
- Include 2-4 "before" jobs (preparation, research)
- Include 4-6 "during" jobs (main execution)
- Include 2-4 "after" jobs (completion, follow-up)
- Mix of "once" and "repeat" cadences as appropriate

## Quality Criteria
- Each job should be atomic (one action)
- Jobs should cover the full lifecycle of the core job
- Consider both functional and emotional aspects
- Think about what could go wrong and what success looks like

Generate exactly ${count} small jobs that comprehensively break down the core job.
`;
}

/**
 * Prompt for generating micro jobs from a small job
 */
export function getMicroJobsPrompt(
  smallJobLabel: string,
  smallJobFormulation: string,
  phase: string,
  language: string = "ru",
  count: number = 5
): string {
  const langInstructions = language === "ru"
    ? `Generate jobs in Russian. Use "Я хочу..." formulation.`
    : `Generate jobs in English. Use "I want to..." formulation.`;

  return `Break down the following small job into ${count} micro jobs (detailed sub-tasks).

## Small Job
Label: "${smallJobLabel}"
Formulation: "${smallJobFormulation}"
Phase: ${phase}

## Instructions
${langInstructions}

For each micro job:
1. **formulation**: First-person statement
2. **label**: Infinitive verb (concise, specific)
3. **cadence**: "once" or "repeat" (inherit context from parent)
4. **cadenceHint**: If repeat, specify frequency

## Guidelines
- Micro jobs are the most granular level
- Each should be a concrete, actionable step
- Maintain the same phase as the parent small job
- Consider the practical execution order
- Include both obvious and often-overlooked steps

Generate exactly ${count} micro jobs that fully detail how to accomplish the small job.
`;
}

/**
 * Prompt for validating and improving job structure
 */
export function getValidationPrompt(language: string = "ru"): string {
  return `Review the job structure and identify any issues:

1. Formulations not starting with first-person prefix
2. Labels containing first-person prefix
3. Jobs with multiple actions (containing "and" / "и")
4. Unknown or incorrect phases
5. Missing cadence information
6. Jobs that are too vague or too specific

For each issue found, suggest a correction.

Language: ${language === "ru" ? "Russian" : "English"}
`;
}
