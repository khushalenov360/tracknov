# HARITA AUTOMATED green BUILDING COMPLIANCE INFRASTRUCTURE SPECIFICATION
==============================================================================
PROJECT REFERENCE: TRACKNOV AUDIT RUNTIME ENGINE
TARGET WORKSPACE LOCATION: C:\Users\91922\Documents\Codex\tracknov\
STATUS: COMPLETE UNIFIED ARCHITECTURE PRODUCTION HANDOFF
COMPILATION CONDITION: FULL RECONSTRUCTION STREAM (ZERO CODE ON SCREEN)

This single-file specification merges the entire multi-format file parsing 
pipeline with the high-frequency database subsystem. It provides full, 
non-truncated instructions to configure all 9 Technical Tools and 9 Core 
Consulting Skills into a unified application lifecycle.

------------------------------------------------------------------------------
PART 1: COMPREHENSIVE BACKEND ENGINEERING TOOLS DEFINITIONS (9 TOOLS TOTAL)
------------------------------------------------------------------------------

### CORE MODULE A: MULTI-FORMAT SUBMITTAL INGESTION LAYER (TOOLS 1 - 3)

#### TOOL I: SPATIAL COORDINATE & GRID-MAPPING PDF PARSER
- **Target Location:** tracknov-server/src/services/parsers/PdfGridParser.ts
- **Instructions:** Configure a layout-preserving document text read layout. It must analyze the bounding coordinates of text grids within the uploaded 'IGBC Green Interiors Reference Guide 2021' and vendor submittals. It must map data row-by-row and column-by-column, preventing text from being flattened or headers from separating from their numeric metrics.

#### TOOL II: MULTI-FORMAT FILE INGESTION DISPATCH ROUTER
- **Target Location:** tracknov-server/src/services/IngestionDispatcher.ts
- **Instructions:** Establish a central file gateway dispatcher. It must intercept every incoming contractor document attachment, inspect its absolute MIME type string and file header extensions, and dynamically route the file stream to its format-specific sub-processing engine.

#### TOOL III: MULTI-TAB TABULAR DATA SCHEMA BINDER
- **Target Location:** tracknov-server/src/services/parsers/ExcelDataBinder.ts
- **Instructions:** Set up an absolute sheet row cell parsing connector. It must interface directly with Microsoft Excel, CSV, and tabular data spreadsheets, extracting data tables (like material sheets and engineering schedules) without flat-text regex processing, preserving the programmatic integrity of the rows.

### CORE MODULE B: VECTOR BLUEPRINT & VISUAL HANDLING KERNEL (TOOLS 4 - 6)

#### TOOL IV: SPATIAL COMPUTER VISION VECTOR PARSER
- **Target Location:** tracknov-server/src/services/parsers/CadVectorParser.ts
- **Instructions:** Build a geometric blueprint tracking engine. It must read high-resolution structural line layers from CAD plans (.dwg / .dxf) and vector engineering PDFs, extracting room perimeters, wall footprints, and layout dimensions directly into spatial object maps.

#### TOOL V: HIGH-FIDELITY DOCUMENT OCR & VISION TRANSFORMER
- **Target Location:** tracknov-server/src/services/parsers/VisualOcrTransformer.ts
- **Instructions:** Map a specialized visual text-extraction parser using the Gemini Vision API framework. It must process scanned low-quality papers, site setup pictures, stamps, and signatures, converting messy or warped text rows into clear text parameters.

#### TOOL VI: STRICT JSON SCHEMA VALIDATION ENGINE (ZOD FIREWALL)
- **Target Location:** tracknov-server/src/services/middleware/SchemaValidator.ts
- **Instructions:** Install a runtime types and schema block directly behind the file parsers. It must immediately capture extracted parameters from any source file format and force them into strict schemas. It must reject the processing thread instantly if a string slips into a dedicated mathematical number or float slot.

### CORE MODULE C: HIGH-FREQUENCY DATABASE RUNTIME ENGINES (TOOLS 7 - 9)

#### TOOL VII: SEMANTIC QUERY CACHE LAYER (REDIS SYSTEM BUFFER)
- **Target Location:** tracknov-server/src/cache/SemanticQueryCache.ts
- **Instructions:** Configure an in-memory data buffer layer using an active Redis system cluster connection. It must evaluate incoming natural language status queries, matching duplicate intents semantically. If project criteria fields haven't changed, it must serve the data directly from the cache buffer to prevent live table read bottlenecks.

#### TOOL VIII: PARAMETERIZED PARAMETER TOKENIZER (SECURE PIPELINE)
- **Target Location:** tracknov-server/src/database/QueryTokenizer.ts
- **Instructions:** Put a strict parameterized security wrapper over the database extraction loop. It must explicitly block the LLM model from formulating raw SQL query text against your tables, converting user data intent into a locked object of system filters.

#### TOOL IX: REAL-TIME CDC (CHANGE DATA CAPTURE) STREAM LISTENER
- **Target Location:** tracknov-server/src/services/SupabaseStreamListener.ts
- **Instructions:** Build a permanent, active websocket subscription channel connecting directly to your active Supabase database tables. It must monitor row updates inside tables (`projects`, `project_credits`, and `project_documents`), refreshing Harita's immediate context window automatically without a webpage reload.

------------------------------------------------------------------------------
PART 2: CORE CONSULTING & REASONING SKILLS DEFINITIONS (9 SKILLS TOTAL)
------------------------------------------------------------------------------

### CORE MODULE D: ENGINEERING MODULES & COMPLIANCE CLASSIFICATION (SKILLS 1 - 3)

#### SKILL I: PREREQUISITE GATEKEEPER & HIERARCHY TRACKER
- **System Location Prompt Matrix:** tracknov-server/src/agents/prompts/regulatoryGovernor.ts
- **Mandate:** Direct the agent to read and map mandatory compliance terms across all modules. Harita must systematically halt the calculation of any optional credits within a category if a project fails a mandatory requirement block.

#### SKILL II: REGULATORY & COMPLIANCE STRATEGIC CLASSIFIER
- **System Location Prompt Matrix:** tracknov-server/src/agents/prompts/plannerPersona.ts
- **Mandate:** Instruct the agent to classify incoming natural language queries into their exact IGBC categories (Eco-Design, Water Conservation, Energy Efficiency, Materials, IEQ, or Innovation in Design) before initiating database searches.

#### SKILL III: FORENSIC MATERIAL VERIFICATION AUDITOR
- **System Location Prompt Matrix:** tracknov-server/src/agents/prompts/reviewerPersona.ts
- **Mandate:** Train the agent to review contractor submittals with strict skepticism. It must inspect Material Safety Data Sheets (MSDS), manufacturer confirmation letters, valid GreenPro registration codes, and invoice dates, rather than blindly trusting loose text declarations.

### CORE MODULE E: BUDGETARY AND SPATIAL GEOMETRY INSPECTIONS (SKILLS 4 - 6)

#### SKILL IV: FINANCIAL COST-WEIGHTED QUANTITY EVALUATOR
- **System Location Prompt Matrix:** tracknov-server/src/agents/prompts/reviewerPersona.ts
- **Mandate:** Provide the agent with the skills to audit financial tables and itemized costs. It must calculate absolute cost splits across entire Bill of Quantities (BOQs) to determine the true weighted proportion of local sourcing, recycled content, or rapidly renewable choices.

#### SKILL V: MEP PERFORMANCE GRID EVALUATOR
- **System Location Prompt Matrix:** tracknov-server/src/agents/prompts/executorPersona.ts
- **Mandate:** Program the agent with mechanical, electrical, and plumbing engineering parameters. It must read design values—such as Coefficient of Performance (COP), Lighting Power Density (LPD), and Cubic Feet per Minute (CFM) ventilation rates—benchmarking them accurately against standard baselines.

#### SKILL VI: SPATIAL GEOMETRY COMPLIANCE INSPECTOR
- **System Location Prompt Matrix:** tracknov-server/src/agents/prompts/executorPersona.ts
- **Mandate:** Instruct the agent to run spatial math rules on extracted CAD coordinates. It must calculate the proportion of regularly occupied carpet layout areas against window vectors to evaluate daylight factor compliance.

### CORE MODULE F: DATABASE AUDITING & RELATION MATCHING LOOPS (SKILLS 7 - 9)

#### SKILL VII: RELATIONAL GRAPH JOINER & MULTI-TABLE LINKER
- **System Location Prompt Matrix:** tracknov-server/src/agents/prompts/executorPersona.ts
- **Mandate:** Command the agent to map multi-table lookup tracks. It must link active tables by joining keys from `projects.id` to `project_credits.project_id`, down to individual file statuses, locating exactly which upload action triggered a point drop.

#### SKILL VIII: DELTA INVERSION AUDITOR (HISTORICAL CHANGE ANALYZER)
- **System Location Prompt Matrix:** tracknov-server/src/agents/prompts/plannerPersona.ts
- **Mandate:** Train the agent to analyze data state changes over time. It must compare yesterday's database records with live incoming fields, issuing clear warnings if a contractor adjustment violates an IGBC threshold.

#### SKILL IX: DYNAMIC DATABASE SCHEMA INSPECTOR
- **System Location Prompt Matrix:** tracknov-server/src/agents/prompts/regulatoryGovernor.ts
- **Mandate:** Instruct the agent to evaluate the database schema automatically. If custom evaluation data columns (like Carbon Footprint metrics) are added, it must update its variable extraction logic to map records into those slots without breaking the application engine.

------------------------------------------------------------------------------
PART 3: PURE CODE COMPLIANCE ASSERTION MATRICES STRATEGY
------------------------------------------------------------------------------
- **Target File Location:** tracknov-server/src/services/ComplianceAssertionEngine.ts
- **Instructions:** Build hardcoded, purely mathematical TypeScript verification formulas inside this file. The open prompt window must be completely restricted from calculating point percentages. The system code must compare the data variables extracted by the LLM against the reference tables, execute the reduction formulas, and flag hard errors if point thresholds aren't met.

------------------------------------------------------------------------------
PART 4: SYSTEM DEPLOYMENT RUNNER ORDER
------------------------------------------------------------------------------
1. Create directories: `mkdir -p src/services/parsers src/services/handlers src/cache src/database src/agents/prompts` within your server root directory.
2. Ensure that your master workspace dependencies contain `xlsx`, `zod`, and the standard database connector models.
3. Configure your server environment configuration flags to include proper connection routes for your production database, Redis host, and your active `GEMINI_API_KEY`.
4. Instruct **antigravity** to execute a full compilation sweep over this master file block using the execution prompt: `npm run dev`.
==============================================================================