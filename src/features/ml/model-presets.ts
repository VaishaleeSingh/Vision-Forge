export type MlModelPresetId =
  | 'customer-churn'
  | 'co-emission-risk'
  | 'loan-default-risk'
  | 'fraud-detection'
  | 'qa-defect-severity'
  | 'phishing-email'

export type MlModelPresetIcon =
  | 'users'
  | 'factory'
  | 'banknote'
  | 'shield'
  | 'clipboard'
  | 'mail'

export type MlModelPreset = {
  id: MlModelPresetId
  title: string
  subtitle: string
  domain: string
  trainingKind: 'tabular' | 'text_classifier'
  targetColumn: string
  textColumn?: string
  sampleFile: string
  defaultGoal: string
  expectedColumns: string[]
  icon: MlModelPresetIcon
  algorithm: string
  demoPitch: string
}

export const ML_MODEL_PRESETS: MlModelPreset[] = [
  {
    id: 'customer-churn',
    title: 'Customer Churn Predictor',
    subtitle: 'Who is likely to cancel their subscription?',
    domain: 'SaaS / Telecom',
    trainingKind: 'tabular',
    targetColumn: 'churned',
    sampleFile: 'customer_churn_predictor.csv',
    defaultGoal:
      'Predict customer churn from subscription and usage signals. Target column: churned (Yes/No).',
    expectedColumns: [
      'customer_id',
      'tenure_months',
      'monthly_charges',
      'total_charges',
      'contract_type',
      'payment_method',
      'support_tickets_last_6mo',
      'avg_login_days_per_month',
      'feature_adoption_score',
      'churned',
    ],
    icon: 'users',
    algorithm: 'Random Forest (scikit-learn)',
    demoPitch:
      'Uses billing, contract, and engagement features to flag at-risk customers before they leave.',
  },
  {
    id: 'co-emission-risk',
    title: 'Industrial CO Emission Risk',
    subtitle: 'Classify CO risk from facility inspection reports',
    domain: 'Environmental compliance',
    trainingKind: 'text_classifier',
    targetColumn: 'co_risk_level',
    textColumn: 'inspection_report',
    sampleFile: 'industrial_co_emission_risk.csv',
    defaultGoal:
      'Classify carbon monoxide emission risk from facility inspection reports. Target: co_risk_level. Text column: inspection_report.',
    expectedColumns: [
      'report_id',
      'facility_type',
      'region',
      'inspection_report',
      'co_risk_level',
    ],
    icon: 'factory',
    algorithm: 'TF-IDF + Logistic Regression',
    demoPitch:
      'Reads regulator-style inspection narratives and classifies CO exposure risk for industrial plants.',
  },
  {
    id: 'loan-default-risk',
    title: 'Loan Default Risk',
    subtitle: 'Will the borrower miss payments?',
    domain: 'FinTech / Banking',
    trainingKind: 'tabular',
    targetColumn: 'loan_default',
    sampleFile: 'loan_default_risk_predictor.csv',
    defaultGoal:
      'Predict loan default from applicant financial profile. Target column: loan_default (Yes/No).',
    expectedColumns: [
      'loan_id',
      'applicant_age',
      'annual_income',
      'credit_score',
      'loan_amount',
      'loan_term_months',
      'employment_years',
      'debt_to_income_ratio',
      'loan_default',
    ],
    icon: 'banknote',
    algorithm: 'Random Forest (scikit-learn)',
    demoPitch:
      'Scores creditworthiness using income, credit score, DTI, and loan terms — standard retail lending ML.',
  },
  {
    id: 'fraud-detection',
    title: 'Transaction Fraud Detector',
    subtitle: 'Flag suspicious card transactions in real time',
    domain: 'Payments / Security',
    trainingKind: 'tabular',
    targetColumn: 'is_fraud',
    sampleFile: 'transaction_fraud_detector.csv',
    defaultGoal:
      'Detect fraudulent transactions from amount, merchant, location, and behavior signals. Target: is_fraud (Yes/No).',
    expectedColumns: [
      'transaction_id',
      'amount',
      'merchant_category',
      'distance_from_home_km',
      'hour_of_day',
      'card_present',
      'prev_fraud_alerts_90d',
      'is_fraud',
    ],
    icon: 'shield',
    algorithm: 'Random Forest (scikit-learn)',
    demoPitch:
      'Identifies anomalous spend patterns — high amounts, odd hours, card-not-present, and prior alerts.',
  },
  {
    id: 'qa-defect-severity',
    title: 'Manufacturing QA Defect Severity',
    subtitle: 'Classify defect level from QA inspection notes',
    domain: 'Manufacturing / Quality',
    trainingKind: 'text_classifier',
    targetColumn: 'defect_severity',
    textColumn: 'qa_report',
    sampleFile: 'manufacturing_qa_defect_severity.csv',
    defaultGoal:
      'Classify manufacturing defect severity from QA inspection reports. Target: defect_severity. Text column: qa_report.',
    expectedColumns: [
      'inspection_id',
      'product_line',
      'shift',
      'qa_report',
      'defect_severity',
    ],
    icon: 'clipboard',
    algorithm: 'TF-IDF + Logistic Regression',
    demoPitch:
      'Parses quality-assurance narratives to triage Minor vs Major vs Critical defects on the production line.',
  },
  {
    id: 'phishing-email',
    title: 'Phishing Email Classifier',
    subtitle: 'Legitimate vs phishing from email body text',
    domain: 'Cybersecurity',
    trainingKind: 'text_classifier',
    targetColumn: 'phishing_label',
    textColumn: 'email_body',
    sampleFile: 'phishing_email_classifier.csv',
    defaultGoal:
      'Detect phishing emails from message content. Target: phishing_label (Legitimate/Phishing). Text column: email_body.',
    expectedColumns: [
      'email_id',
      'sender_domain',
      'email_body',
      'phishing_label',
    ],
    icon: 'mail',
    algorithm: 'TF-IDF + Logistic Regression',
    demoPitch:
      'NLP security model that spots urgency scams, credential-harvest links, and spoofed sender patterns.',
  },
]

export function getMlModelPreset(id: MlModelPresetId | string | null | undefined): MlModelPreset | null {
  return ML_MODEL_PRESETS.find((p) => p.id === id) ?? null
}

export function validateCsvForPreset(
  headers: string[],
  preset: MlModelPreset,
): { ok: true } | { ok: false; message: string } {
  const normalized = headers.map((h) => h.trim().toLowerCase())
  const missing = preset.expectedColumns.filter(
    (col) => !normalized.includes(col.toLowerCase()),
  )
  if (missing.length > 0) {
    return {
      ok: false,
      message: `This model expects columns: ${preset.expectedColumns.join(', ')}. Missing: ${missing.join(', ')}.`,
    }
  }
  return { ok: true }
}
