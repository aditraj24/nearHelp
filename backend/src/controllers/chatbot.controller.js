import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { askCrisisAssistant } from '../utils/aiService.js';

export const chat = asyncHandler(async (req, res) => {
  const { crisisType, question, conversationHistory } = req.body;

  if (!crisisType || !question) {
    throw new ApiError(400, 'crisisType and question are required');
  }

  const answer = await askCrisisAssistant(crisisType, question, conversationHistory || []);

  res.json(new ApiResponse(200, { answer }, 'AI response generated'));
});
