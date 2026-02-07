/**
 * Keyword lists for scope classification
 *
 * These lists are used for fast classification of obviously medical or non-medical queries.
 * Ambiguous queries fall through to LLM classification.
 */

export const MEDICAL_KEYWORDS = [
    // Common conditions
    "diabetes",
    "cancer",
    "covid",
    "coronavirus",
    "flu",
    "asthma",
    "hypertension",
    "arthritis",
    "depression",
    "anxiety",

    // Symptoms
    "pain",
    "fever",
    "bleeding",
    "nausea",
    "cough",
    "headache",
    "fatigue",
    "dizzy",
    "vomiting",

    // Medical terms
    "medication",
    "medicine",
    "treatment",
    "prescription",
    "diagnosis",
    "symptom",
    "disease",
    "infection",
    "therapy",
    "surgery",

    // Body parts
    "heart",
    "lung",
    "kidney",
    "liver",
    "stomach",
    "brain",
    "blood",

    // Healthcare
    "doctor",
    "hospital",
    "clinic",
    "patient"
] as const

export const NON_MEDICAL_KEYWORDS = [
    // Weather
    "weather",
    "temperature",
    "forecast",
    "rain",
    "snow",

    // Food/Cooking
    "recipe",
    "restaurant",
    "pizza",
    "burger",
    "cooking",

    // Entertainment
    "movie",
    "music",
    "song",
    "game",
    "sport",
    "football",
    "basketball",

    // Technology
    "computer",
    "phone",
    "app",
    "software",

    // Travel
    "hotel",
    "flight",
    "travel",
    "vacation",

    // General
    "news",
    "stock",
    "price",
    "joke"
] as const

export type MedicalKeyword = (typeof MEDICAL_KEYWORDS)[number]
export type NonMedicalKeyword = (typeof NON_MEDICAL_KEYWORDS)[number]
