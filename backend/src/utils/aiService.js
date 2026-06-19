import { GoogleGenAI } from "@google/genai";

let ai = null;
function getAI() {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

async function callGemini(prompt) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not set – returning fallback AI response');
    return null;
  }

  try {
    const response = await getAI().models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 1024
      }
    });
    return response.text || null;
  } catch (err) {
    console.error('Gemini call failed:', err.message);
    return null;
  }
}

// ---------- Crisis Guidance ----------

const FALLBACK_GUIDANCE = {
  medical: {
    steps: [
      'Ensure the scene is safe before approaching the victim.',
      'Call emergency services (102 for Ambulance, 112 for All-in-One) immediately.',
      'Check for responsiveness — tap shoulders and shout.',
      'If unresponsive and not breathing, begin CPR: 30 chest compressions then 2 rescue breaths.',
      'Use an AED if available. Continue CPR until help arrives.'
    ],
    emergencyScript:
      'I have a medical emergency. A person is unresponsive at my location. I need an ambulance immediately. My location is...'
  },
  fire: {
    steps: [
      'Evacuate everyone from the building immediately.',
      'Call the fire department (101) right away.',
      'Do NOT use elevators — use stairs only.',
      'If trapped, seal door gaps with wet cloth and signal from a window.',
      'Use a fire extinguisher only on small, contained fires if safe to do so.'
    ],
    emergencyScript:
      'I am reporting a fire at my location. People may be inside. Please send the fire department immediately.'
  },
  crime: {
    steps: [
      'Move to a safe location if possible — do not confront the suspect.',
      'Call police immediately and describe the situation.',
      'Note the suspect\'s appearance, direction of travel, and any vehicle.',
      'Preserve any evidence and avoid touching objects at the scene.',
      'Stay on the line with the dispatcher until help arrives.'
    ],
    emergencyScript:
      'I am reporting a crime in progress at my location. Please send police immediately. I am in a safe position.'
  },
  natural_disaster: {
    steps: [
      'Move to higher ground or a structurally safe location immediately.',
      'Call NDRF helpline (011-24363260) or emergency services (112).',
      'Stay away from damaged buildings, downed power lines, and flood waters.',
      'Keep an emergency kit with water, first-aid, flashlight and important documents.',
      'Follow official evacuation orders and do not return until authorities declare it safe.'
    ],
    emergencyScript:
      'I am reporting a natural disaster emergency at my location. Immediate rescue/evacuation assistance is needed. Please send help.'
  },
  other: {
    steps: [
      'Assess the situation and ensure your immediate safety first.',
      'Call emergency services (112) and clearly describe the emergency.',
      'Move to a safe distance and warn others nearby.',
      'Do not attempt to handle hazardous situations alone.',
      'Stay on the line with the dispatcher until professional help arrives.'
    ],
    emergencyScript:
      'I am reporting an emergency at my location. I need immediate assistance. Please send help.'
  }
};

export async function generateCrisisGuidance(crisisType, address) {
  const prompt = `You are an emergency first-response AI for India. A user has triggered a ${crisisType} SOS alert${address ? ` near "${address}"` : ''}.

Return a JSON object with exactly this shape (no markdown, no code fences):
{
  "steps": ["step 1", "step 2", "step 3", "step 4", "step 5"],
  "emergencyScript": "A single paragraph the user can read aloud to 112 / emergency services."
}

The steps should be concise, actionable first-response instructions specific to a ${crisisType} emergency in India. 
The emergencyScript should be ready to read verbatim to a dispatcher (mention location if available).
Mention specific Indian emergency numbers in steps if relevant (100, 101, 102, 108).`;

  const raw = await callGemini(prompt);
  if (!raw) return FALLBACK_GUIDANCE[crisisType] || FALLBACK_GUIDANCE.medical;

  try {
    const cleaned = raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.steps) && typeof parsed.emergencyScript === 'string') {
      return parsed;
    }
  } catch {
    // parse failed — fall through
  }
  return FALLBACK_GUIDANCE[crisisType] || FALLBACK_GUIDANCE.medical;
}

// ---------- Emergency Summary ----------

export async function generateEmergencySummary(crisisType, address, radiusMeters) {
  const prompt = `Write a concise 2-sentence emergency summary for a dispatcher in India. Crisis type: ${crisisType}. Location: ${address || 'coordinates shared'}. Broadcast radius: ${radiusMeters} meters. Return only the summary text, no quotes or labels.`;

  const raw = await callGemini(prompt);
  if (raw) return raw.trim();
  return `${crisisType.toUpperCase()} emergency at ${address || 'shared location'}. Nearby community responders requested within ${radiusMeters} meters.`;
}

// ---------- Post-Resolution Debrief ----------

export async function generateDebriefPrompt(crisisType, durationSeconds, responderCount) {
  const minutes = Math.round((durationSeconds || 0) / 60);
  const prompt = `A ${crisisType} emergency has just been resolved. It lasted approximately ${minutes} minutes and ${responderCount || 0} community responders participated.

Write a short debrief message (3-4 sentences) that:
1. Acknowledges the resolution
2. Reminds the user to follow up with professional services if needed
3. Encourages them to rate the responders
4. Thanks them for using the platform

Return only the debrief text.`;

  const raw = await callGemini(prompt);
  if (raw) return raw.trim();
  return `Your ${crisisType} emergency has been resolved after ${minutes} minutes with ${responderCount || 0} responders. Please follow up with professional services if needed. Don't forget to rate your responders to help the community. Thank you for using NearHelp.`;
}

// ---------- Chat-based AI assistant ----------

export async function askCrisisAssistant(crisisType, question, conversationHistory = []) {
  const historyText = conversationHistory
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `You are NearHelp AI, an emergency crisis assistant for India. The user is currently in a ${crisisType} emergency situation.

Previous conversation:
${historyText || '(none)'}

User's question: ${question}

Provide a concise, actionable answer. Focus on safety. If the situation is life-threatening, always remind them to call emergency services (112). 
Mention relevant Indian emergency numbers if needed (100 Police, 101 Fire, 102 Ambulance, 108 Emergency, 1091 Women Helpline).
Keep your response under 150 words.`;

  const raw = await callGemini(prompt);
  if (raw) return raw.trim();
  return `For ${crisisType} emergencies, please call your local emergency number (112 or 108) immediately. Stay calm, ensure your safety first, and follow the guidance steps provided.`;
}
