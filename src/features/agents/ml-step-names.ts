/** Client-safe ML pipeline step names (keep in sync with server/workflows.ts) */
export const ML_TRAINING_STEP_NAMES = [
  'ML Orchestrator Agent',
  'Data Preprocessing Agent',
  'Model Selection Agent',
  'Model Training Agent',
  'Model Evaluation Agent',
  'Hyperparameter Optimization Agent',
  'NLP Fine-tuning Agent',
  'Computer Vision Training Agent',
  'Final ML Report Agent',
] as const
