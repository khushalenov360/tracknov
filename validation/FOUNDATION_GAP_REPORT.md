# FOUNDATION GAP REPORT

### GAP-REASONER-01
**Description**: Harita `ReasoningEngine` lacks `QuestionType.KNOWLEDGE_QUERY` classification to route conversational queries (like "What documents are required for EDA C1?") to the new Knowledge Ontology DB tables.
**Severity**: HIGH
**Impact**: Harita cannot natively answer general knowledge questions dynamically using the new repository without LLM hallucination or falling back to generic chat. The DB exists, but the conversational bridge does not.
**Recommended Fix**: Implement a `KnowledgeOntologyReasoner` tool and add the `KNOWLEDGE_QUERY` intent type to `QuestionClassifier`. Map questions about credits and evidence to standard Supabase lookups.

### GAP-SEED-01
**Description**: Missing `workflow_document_responsibility` records for specific nested evidence sub-types like `WATER_CALCULATION`.
**Severity**: MEDIUM
**Impact**: Queries about who uploads calculations for EDA C1 yield null results because the workflow role wasn't mapped specifically to the `WATER_CALCULATION` evidence ID in the rapid MVP seeding script.
**Recommended Fix**: Expand the initial seeding script to recursively map all calculation variants (Water, Energy, Daylight) to MEP Consultant or Architect as appropriate.

### GAP-SEED-02
**Description**: Missing `knowledge_review_criteria` and `knowledge_submission_criteria` row seeds for EDA C1.
**Severity**: LOW (Pending next phase)
**Impact**: Questions asking "What are the review criteria for EDA C1" return empty sets natively.
**Recommended Fix**: Perform bulk CSV import of IGBC V4 review logic into the established table structures.
