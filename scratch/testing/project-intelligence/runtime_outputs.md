# Runtime Outputs for Project Intelligence Queries

## Query: "What should we do next?"

### 1. Pipeline Trace
```
[QuestionClassifier] - EXECUTIVE_PRIORITY
[KnowledgeGraphRefresh] - nodes=14
edges=12
[ExecutivePrioritizationEngine] - Reasoning complete
[SelfReview] - PASS
confidence=0.95
[ConsultantResponsePlannerV2] - 
[ENOV-AIT CONSULTANT: EXECUTIVE PRIORITY]
The user asked about executive priorities: "What should we do next?".
Consultant Guidance:
Answer: Based on current project conditions, here are the highest priority actions.
Top Actions: [{"id":"action-c1-rejected","title":"Resubmit rejected documents for EDA C1","impactScore":82,"readinessGain":80,"certificationImpact":70,"riskReduction":90,"urgency":100,"rationale":"Rejected evidence strictly prevents submission until deficiencies are corrected."},{"id":"action-c1-progress","title":"Accelerate evidence gathering for EDA C1","impactScore":53,"readinessGain":60,"certificationImpact":50,"riskReduction":40,"urgency":60,"rationale":"Credit is significantly behind schedule and needs immediate focus to prevent delays."},{"id":"action-c3-progress","title":"Accelerate evidence gathering for WE C1","impactScore":53,"readinessGain":60,"certificationImpact":50,"riskReduction":40,"urgency":60,"rationale":"Credit is significantly behind schedule and needs immediate focus to prevent delays."}]
Expected Impact: Executive prioritization drives the most efficient path to certification.
Risks: Rejected evidence strictly prevents submission until deficiencies are corrected.; Credit is significantly behind schedule and needs immediate focus to prevent delays.; Credit is significantly behind schedule and needs immediate focus to prevent delays.
Recommendation: Resubmit rejected documents for EDA C1
Deliver a highly prescriptive, executive-level summary of the top actions and their impact.
```

### 2. Reasoning Output
```json
{
  "directAnswer": "Based on current project conditions, here are the highest priority actions.",
  "evidence": "[{\"id\":\"action-c1-rejected\",\"title\":\"Resubmit rejected documents for EDA C1\",\"impactScore\":82,\"readinessGain\":80,\"certificationImpact\":70,\"riskReduction\":90,\"urgency\":100,\"rationale\":\"Rejected evidence strictly prevents submission until deficiencies are corrected.\"},{\"id\":\"action-c1-progress\",\"title\":\"Accelerate evidence gathering for EDA C1\",\"impactScore\":53,\"readinessGain\":60,\"certificationImpact\":50,\"riskReduction\":40,\"urgency\":60,\"rationale\":\"Credit is significantly behind schedule and needs immediate focus to prevent delays.\"},{\"id\":\"action-c3-progress\",\"title\":\"Accelerate evidence gathering for WE C1\",\"impactScore\":53,\"readinessGain\":60,\"certificationImpact\":50,\"riskReduction\":40,\"urgency\":60,\"rationale\":\"Credit is significantly behind schedule and needs immediate focus to prevent delays.\"}]",
  "igbcInterpretation": "Executive prioritization drives the most efficient path to certification.",
  "risks": "Rejected evidence strictly prevents submission until deficiencies are corrected.; Credit is significantly behind schedule and needs immediate focus to prevent delays.; Credit is significantly behind schedule and needs immediate focus to prevent delays.",
  "recommendations": "Resubmit rejected documents for EDA C1"
}
```

### 3. Final Consultant Response (Prompt to LLM)
```

[ENOV-AIT CONSULTANT: EXECUTIVE PRIORITY]
The user asked about executive priorities: "What should we do next?".
Consultant Guidance:
Answer: Based on current project conditions, here are the highest priority actions.
Top Actions: [{"id":"action-c1-rejected","title":"Resubmit rejected documents for EDA C1","impactScore":82,"readinessGain":80,"certificationImpact":70,"riskReduction":90,"urgency":100,"rationale":"Rejected evidence strictly prevents submission until deficiencies are corrected."},{"id":"action-c1-progress","title":"Accelerate evidence gathering for EDA C1","impactScore":53,"readinessGain":60,"certificationImpact":50,"riskReduction":40,"urgency":60,"rationale":"Credit is significantly behind schedule and needs immediate focus to prevent delays."},{"id":"action-c3-progress","title":"Accelerate evidence gathering for WE C1","impactScore":53,"readinessGain":60,"certificationImpact":50,"riskReduction":40,"urgency":60,"rationale":"Credit is significantly behind schedule and needs immediate focus to prevent delays."}]
Expected Impact: Executive prioritization drives the most efficient path to certification.
Risks: Rejected evidence strictly prevents submission until deficiencies are corrected.; Credit is significantly behind schedule and needs immediate focus to prevent delays.; Credit is significantly behind schedule and needs immediate focus to prevent delays.
Recommendation: Resubmit rejected documents for EDA C1
Deliver a highly prescriptive, executive-level summary of the top actions and their impact.
```

---

## Query: "Who is overloaded?"

### 1. Pipeline Trace
```
[QuestionClassifier] - WORKLOAD
[KnowledgeGraphRefresh] - nodes=14
edges=12
[WorkloadIntelligenceEngine] - Reasoning complete
[SelfReview] - PASS
confidence=0.95
[ConsultantResponsePlannerV2] - 
[ENOV-AIT CONSULTANT: WORKLOAD INTELLIGENCE]
The user asked about contributor workload: "Who is overloaded?".
Consultant Guidance:
Answer: Here is the current contributor workload distribution.
Contributor Workload: [{"contributorId":"user1","contributorName":"Architect","activeAssignments":2,"overdueAssignments":0,"blockedAssignments":2,"workloadScore":6},{"contributorId":"user2","contributorName":"Contractor","activeAssignments":1,"overdueAssignments":0,"blockedAssignments":0,"workloadScore":1},{"contributorId":"user3","contributorName":"Sustainability Consultant","activeAssignments":0,"overdueAssignments":0,"blockedAssignments":0,"workloadScore":0}]
Reason: Balanced workloads prevent bottlenecks in evidence gathering.
Risks: Workloads are balanced.
Recommendation: Reassign blocked or overdue items from highly loaded contributors.
Provide a clear analysis of who is overloaded and why.
```

### 2. Reasoning Output
```json
{
  "directAnswer": "Here is the current contributor workload distribution.",
  "evidence": "[{\"contributorId\":\"user1\",\"contributorName\":\"Architect\",\"activeAssignments\":2,\"overdueAssignments\":0,\"blockedAssignments\":2,\"workloadScore\":6},{\"contributorId\":\"user2\",\"contributorName\":\"Contractor\",\"activeAssignments\":1,\"overdueAssignments\":0,\"blockedAssignments\":0,\"workloadScore\":1},{\"contributorId\":\"user3\",\"contributorName\":\"Sustainability Consultant\",\"activeAssignments\":0,\"overdueAssignments\":0,\"blockedAssignments\":0,\"workloadScore\":0}]",
  "igbcInterpretation": "Balanced workloads prevent bottlenecks in evidence gathering.",
  "risks": "Workloads are balanced.",
  "recommendations": "Reassign blocked or overdue items from highly loaded contributors."
}
```

### 3. Final Consultant Response (Prompt to LLM)
```

[ENOV-AIT CONSULTANT: WORKLOAD INTELLIGENCE]
The user asked about contributor workload: "Who is overloaded?".
Consultant Guidance:
Answer: Here is the current contributor workload distribution.
Contributor Workload: [{"contributorId":"user1","contributorName":"Architect","activeAssignments":2,"overdueAssignments":0,"blockedAssignments":2,"workloadScore":6},{"contributorId":"user2","contributorName":"Contractor","activeAssignments":1,"overdueAssignments":0,"blockedAssignments":0,"workloadScore":1},{"contributorId":"user3","contributorName":"Sustainability Consultant","activeAssignments":0,"overdueAssignments":0,"blockedAssignments":0,"workloadScore":0}]
Reason: Balanced workloads prevent bottlenecks in evidence gathering.
Risks: Workloads are balanced.
Recommendation: Reassign blocked or overdue items from highly loaded contributors.
Provide a clear analysis of who is overloaded and why.
```

---

## Query: "What is preventing Gold certification?"

### 1. Pipeline Trace
```
[QuestionClassifier] - CERTIFICATION_GAP
[KnowledgeGraphRefresh] - nodes=14
edges=12
[CertificationGapEngine] - Reasoning complete
[SelfReview] - PASS
confidence=0.95
[ConsultantResponsePlannerV2] - 
[ENOV-AIT CONSULTANT: CERTIFICATION GAP]
The user asked about certification progress: "What is preventing Gold certification?".
Consultant Guidance:
Answer: The project is currently targeting Platinum.
Gap Analysis (Secured/Risk/Missing): {"currentPoints":5,"securedPoints":5,"riskPoints":6,"projectedPoints":-3,"targetCertification":"Platinum","missingPoints":0}
Current Position: Certification gap analysis defines the shortest path to target compliance.
Risks: There are 6 points at risk that threaten the certification level.
Recommended Credits: Focus on securing the 0 missing points for Platinum.
Explain the shortest path to the target certification clearly.
```

### 2. Reasoning Output
```json
{
  "directAnswer": "The project is currently targeting Platinum.",
  "evidence": "{\"currentPoints\":5,\"securedPoints\":5,\"riskPoints\":6,\"projectedPoints\":-3,\"targetCertification\":\"Platinum\",\"missingPoints\":0}",
  "igbcInterpretation": "Certification gap analysis defines the shortest path to target compliance.",
  "risks": "There are 6 points at risk that threaten the certification level.",
  "recommendations": "Focus on securing the 0 missing points for Platinum."
}
```

### 3. Final Consultant Response (Prompt to LLM)
```

[ENOV-AIT CONSULTANT: CERTIFICATION GAP]
The user asked about certification progress: "What is preventing Gold certification?".
Consultant Guidance:
Answer: The project is currently targeting Platinum.
Gap Analysis (Secured/Risk/Missing): {"currentPoints":5,"securedPoints":5,"riskPoints":6,"projectedPoints":-3,"targetCertification":"Platinum","missingPoints":0}
Current Position: Certification gap analysis defines the shortest path to target compliance.
Risks: There are 6 points at risk that threaten the certification level.
Recommended Credits: Focus on securing the 0 missing points for Platinum.
Explain the shortest path to the target certification clearly.
```

---

## Query: "Which task has highest impact?"

### 1. Pipeline Trace
```
[QuestionClassifier] - EXECUTIVE_PRIORITY
[KnowledgeGraphRefresh] - nodes=14
edges=12
[ExecutivePrioritizationEngine] - Reasoning complete
[SelfReview] - PASS
confidence=0.95
[ConsultantResponsePlannerV2] - 
[ENOV-AIT CONSULTANT: EXECUTIVE PRIORITY]
The user asked about executive priorities: "Which task has highest impact?".
Consultant Guidance:
Answer: Based on current project conditions, here are the highest priority actions.
Top Actions: [{"id":"action-c1-rejected","title":"Resubmit rejected documents for EDA C1","impactScore":82,"readinessGain":80,"certificationImpact":70,"riskReduction":90,"urgency":100,"rationale":"Rejected evidence strictly prevents submission until deficiencies are corrected."},{"id":"action-c1-progress","title":"Accelerate evidence gathering for EDA C1","impactScore":53,"readinessGain":60,"certificationImpact":50,"riskReduction":40,"urgency":60,"rationale":"Credit is significantly behind schedule and needs immediate focus to prevent delays."},{"id":"action-c3-progress","title":"Accelerate evidence gathering for WE C1","impactScore":53,"readinessGain":60,"certificationImpact":50,"riskReduction":40,"urgency":60,"rationale":"Credit is significantly behind schedule and needs immediate focus to prevent delays."}]
Expected Impact: Executive prioritization drives the most efficient path to certification.
Risks: Rejected evidence strictly prevents submission until deficiencies are corrected.; Credit is significantly behind schedule and needs immediate focus to prevent delays.; Credit is significantly behind schedule and needs immediate focus to prevent delays.
Recommendation: Resubmit rejected documents for EDA C1
Deliver a highly prescriptive, executive-level summary of the top actions and their impact.
```

### 2. Reasoning Output
```json
{
  "directAnswer": "Based on current project conditions, here are the highest priority actions.",
  "evidence": "[{\"id\":\"action-c1-rejected\",\"title\":\"Resubmit rejected documents for EDA C1\",\"impactScore\":82,\"readinessGain\":80,\"certificationImpact\":70,\"riskReduction\":90,\"urgency\":100,\"rationale\":\"Rejected evidence strictly prevents submission until deficiencies are corrected.\"},{\"id\":\"action-c1-progress\",\"title\":\"Accelerate evidence gathering for EDA C1\",\"impactScore\":53,\"readinessGain\":60,\"certificationImpact\":50,\"riskReduction\":40,\"urgency\":60,\"rationale\":\"Credit is significantly behind schedule and needs immediate focus to prevent delays.\"},{\"id\":\"action-c3-progress\",\"title\":\"Accelerate evidence gathering for WE C1\",\"impactScore\":53,\"readinessGain\":60,\"certificationImpact\":50,\"riskReduction\":40,\"urgency\":60,\"rationale\":\"Credit is significantly behind schedule and needs immediate focus to prevent delays.\"}]",
  "igbcInterpretation": "Executive prioritization drives the most efficient path to certification.",
  "risks": "Rejected evidence strictly prevents submission until deficiencies are corrected.; Credit is significantly behind schedule and needs immediate focus to prevent delays.; Credit is significantly behind schedule and needs immediate focus to prevent delays.",
  "recommendations": "Resubmit rejected documents for EDA C1"
}
```

### 3. Final Consultant Response (Prompt to LLM)
```

[ENOV-AIT CONSULTANT: EXECUTIVE PRIORITY]
The user asked about executive priorities: "Which task has highest impact?".
Consultant Guidance:
Answer: Based on current project conditions, here are the highest priority actions.
Top Actions: [{"id":"action-c1-rejected","title":"Resubmit rejected documents for EDA C1","impactScore":82,"readinessGain":80,"certificationImpact":70,"riskReduction":90,"urgency":100,"rationale":"Rejected evidence strictly prevents submission until deficiencies are corrected."},{"id":"action-c1-progress","title":"Accelerate evidence gathering for EDA C1","impactScore":53,"readinessGain":60,"certificationImpact":50,"riskReduction":40,"urgency":60,"rationale":"Credit is significantly behind schedule and needs immediate focus to prevent delays."},{"id":"action-c3-progress","title":"Accelerate evidence gathering for WE C1","impactScore":53,"readinessGain":60,"certificationImpact":50,"riskReduction":40,"urgency":60,"rationale":"Credit is significantly behind schedule and needs immediate focus to prevent delays."}]
Expected Impact: Executive prioritization drives the most efficient path to certification.
Risks: Rejected evidence strictly prevents submission until deficiencies are corrected.; Credit is significantly behind schedule and needs immediate focus to prevent delays.; Credit is significantly behind schedule and needs immediate focus to prevent delays.
Recommendation: Resubmit rejected documents for EDA C1
Deliver a highly prescriptive, executive-level summary of the top actions and their impact.
```

---

