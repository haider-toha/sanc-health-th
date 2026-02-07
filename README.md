# Medical Chatbot - Take Home Task

A production-ready medical information retrieval system that combines vector search, PubMed API integration, and LLM-powered response generation to answer medical questions with cited, peer-reviewed sources.

## Overview

This system processes medical questions through a multi-stage pipeline:

1. Classifies queries to ensure they are medical in nature
2. Optimizes user queries for semantic search
3. Retrieves relevant medical literature from Pinecone vector database
4. Enriches results with PubMed metadata and citation counts
5. Generates natural language responses with inline citations

## Architecture

The project follows clean architecture principles with clear separation of concerns:

```
src/
├── clients/              # External API clients
│   ├── openai.ts        # OpenAI GPT-4o and GPT-4o-mini client
│   └── pubmed.ts        # PubMed E-utilities API client
│
├── config/              # Configuration
│   └── scopeKeywords.ts # Medical/non-medical keyword lists
│
├── nodes/               # LangGraph orchestration nodes
│   ├── scopeClassifier.ts      # Filters non-medical queries
│   ├── queryParser.ts          # Optimizes queries for search
│   ├── vectorSearch.ts         # Retrieves from Pinecone
│   ├── pubmedEnricher.ts       # Enriches with PubMed data
│   ├── respond.ts              # Generates LLM response
│   ├── outOfScopeResponse.ts  # Handles non-medical queries
│   └── noResultsResponse.ts   # Handles empty search results
│
├── services/            # Business logic layer
│   ├── pubmedEnrichment.ts    # PubMed enrichment orchestration
│   └── responseGeneration.ts  # LLM response generation
│
├── types/               # TypeScript type definitions
│   ├── pubmed.ts       # PubMed API types
│   └── response.ts     # Response generation types
│
├── utils/               # Pure utility functions
│   ├── formatters.ts          # Citation and response formatting
│   ├── getMessageText.ts      # Message extraction utilities
│   ├── llmClassifier.ts       # LLM-based classification
│   ├── queryOptimizer.ts      # Query optimization via LLM
│   └── ranking.ts             # Citation-based re-ranking
│
└── retrieval_graph/     # LangGraph state machine
    ├── graph.ts        # Main graph definition
    └── state.ts        # State schema
```

## Data Flow

The system processes queries through the following pipeline:

```
User Query
    ↓
┌─────────────────────┐
│ Scope Classifier    │  Hybrid: Keywords (fast) + LLM (accurate)
└─────────────────────┘
    ↓ (if medical)
┌─────────────────────┐
│ Query Parser        │  Optimizes query for vector search
└─────────────────────┘
    ↓
┌─────────────────────┐
│ Vector Search       │  Retrieves top papers from Pinecone
└─────────────────────┘
    ↓ (if results found)
┌─────────────────────┐
│ PubMed Enricher     │  Adds metadata, abstracts, citations
└─────────────────────┘
    ↓
┌─────────────────────┐
│ Response Generator  │  LLM synthesizes answer with citations
└─────────────────────┘
    ↓
Natural Language Response
```

## Key Components

### 1. Scope Classifier (`src/nodes/scopeClassifier.ts`)

Filters non-medical queries using a hybrid approach:

- **Keyword matching** (~80% of queries, <1ms): Fast path for obvious cases
- **LLM classification** (~20% of queries, ~300ms): Handles ambiguous queries with GPT-4o-mini

**Example:**
- "What are diabetes symptoms?" → Medical (keyword match)
- "How do I bake a cake?" → Non-medical (keyword match)
- "What is T2D?" → Medical (LLM resolves ambiguity)

### 2. Query Parser (`src/nodes/queryParser.ts`)

Optimizes user queries for vector search using GPT-4o-mini:

- Removes conversational noise ("I want to know...", "My mom has...")
- Expands colloquial terms ("sugar problems" → "diabetes hyperglycemia")
- Adds medical synonyms ("tired" → "tired fatigue asthenia")
- Expands abbreviations ("T2D" → "type 2 diabetes T2D")

**Example transformation:**
```
Input:  "My mom has been feeling dizzy and tired lately"
Output: "dizzy tired dizziness fatigue vertigo symptoms causes"
```

### 3. Vector Search (`src/nodes/vectorSearch.ts`)

Retrieves relevant medical literature from Pinecone:

- Uses Google Vertex AI embeddings (768 dimensions)
- Searches against 2,063,475 indexed PubMed articles
- Returns top 5 most semantically similar papers

### 4. PubMed Enricher (`src/nodes/pubmedEnricher.ts`)

Enriches search results with PubMed metadata:

- **Fetches:** Abstracts, citation counts, journal info, article types
- **Re-ranks:** Combines vector similarity (70%) + citation count (30%)
- **APIs used:** ESummary, EFetch, ELink
- **Fallback:** Gracefully handles missing PMIDs, abstracts, or API failures

**Re-ranking formula:**
```
qualityScore = (vectorSimilarity × 0.7) + (normalizedCitations × 0.3)
```

### 5. Response Generator (`src/nodes/respond.ts`)

Generates natural language responses using GPT-4o:

- Synthesizes information from enriched papers
- Includes numbered inline citations [1], [2], [3]
- Provides sources section with citation counts
- Adds medical disclaimer
- Professional yet accessible tone

**Example response:**
```
Type 2 diabetes is characterized by insulin resistance and relative 
insulin deficiency [1]. Common symptoms include increased thirst, 
frequent urination, and unexplained weight loss [1][2]. Other symptoms 
may include fatigue, blurred vision, and slow-healing sores [2].

SOURCES:
[1] Understanding Type 2 Diabetes - JAMA (2023) | Cited by: 145 articles
[2] Clinical Management of T2DM - Diabetes Care (2024) | Cited by: 89 articles

MEDICAL DISCLAIMER:
This information is for educational purposes only...
```

## Setup

### Prerequisites

- Node.js 18+ and yarn
- Google Cloud account with Vertex AI enabled
- Pinecone API access (credentials provided)
- OpenAI API key

### Installation

1. Install dependencies:
```bash
yarn install
```

2. Create `.env` file with required credentials:
```env
# Pinecone (provided)
PINECONE_API_KEY="pcsk_..."
PINECONE_INDEX_NAME="pubmed-articles"

# OpenAI
OPENAI_API_KEY="sk-..."

# Google Vertex AI
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
GOOGLE_VERTEX_AI_PROJECT="your-project-id"
GOOGLE_VERTEX_AI_LOCATION="us-central1"
```

3. Build the project:
```bash
yarn build
```

### Running the System

**LangGraph Studio (Interactive UI):**
```bash
yarn dev
```
Access at: http://localhost:2024

**Command Line Testing:**
```bash
# Run all tests
npm run test:all

# Run individual test suites
npm run test:validate    # Integration validation
npm run test:scope       # Scope classifier
npm run test:parser      # Query parser
npm run test:pubmed      # PubMed enricher
npm run test:response    # Response generation
```

## Testing

Comprehensive test coverage across all components:

```bash
npm run test:all
```

**Test Coverage:**
- Integration validation: 4/4 tests
- Scope classifier: 9/9 tests
- Query parser: 11/11 tests
- PubMed enricher: 7/7 tests
- Response generation: 7/7 tests
- **Total: 38/38 tests passing**

## Performance

**End-to-End Latency:** 5-8 seconds per query
- Scope classification: ~300ms
- Query optimization: ~500ms
- Vector search: ~1s
- PubMed enrichment: ~2-3s
- Response generation: ~1-2s

**Cost per Query:** ~$0.005 (£0.004)
- Scope classifier (GPT-4o-mini): $0.000015
- Query optimizer (GPT-4o-mini): $0.000015
- Response generation (GPT-4o): ~$0.005
- PubMed API: Free

## Code Quality

### Linting and Formatting

```bash
yarn lint          # Check for linting errors
yarn lint:fix      # Auto-fix linting errors
yarn format        # Format with Prettier
yarn format:check  # Check formatting
yarn fix           # Fix all linting and formatting
yarn check         # Run all checks + build
```

### Design Principles

- **Clean Architecture:** Clear separation of clients, services, nodes, and utilities
- **Type Safety:** Comprehensive TypeScript types throughout
- **Error Handling:** Graceful fallbacks at every layer
- **Testability:** Pure functions and dependency injection
- **Maintainability:** Single responsibility principle

## Task Implementation Summary

All five tasks completed successfully:

1. **Validate Integrations** - Verified Pinecone and Google Vertex AI connectivity
2. **Scope Classifier** - Hybrid keyword + LLM classification system
3. **Query Parser** - LLM-based query optimization for vector search
4. **PubMed Integration** - Metadata enrichment and citation-based re-ranking
5. **LLM Response Generation** - Natural language responses with citations

## Development Log

For detailed development decisions, challenges, and implementation notes, see `DEV_LOG.md`.

## Technology Stack

- **LangGraph:** State machine orchestration
- **LangChain:** LLM framework and integrations
- **Google Vertex AI:** Text embeddings (768 dimensions)
- **Pinecone:** Vector database (2M+ medical articles)
- **PubMed E-utilities:** Medical literature metadata
- **OpenAI:** GPT-4o (responses) and GPT-4o-mini (classification/optimization)
- **TypeScript:** Type-safe implementation

## License

MIT
