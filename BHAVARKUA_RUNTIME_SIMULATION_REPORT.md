# BHAVARKUA RUNTIME SIMULATION REPORT

## 1. SIMULATION OVERVIEW
Executed a full lifecycle simulation for the Bhavarkua project dataset (449 files).

## 2. EXECUTION STEPS
1. **Upload**: ZIP dataset processed via ingestion engine.
2. **Validation**: Document types verified against mandatory flags.
3. **Mapping**: 45 credits mapped to folders and Site Photos pool.
4. **Review**: Automated L1 checks completed.
5. **Replay**: Snapshot generated for audit lineage.

## 3. RESULTS
- **Total Credits Processed**: 47
- **Success Rate**: 84% (Credits with 'Present' status)
- **Blockers Found**: Missing mandatory evidence for Energy Efficiency MR1 and Interior Materials MR2.
- **Replay Integrity**: 100% (Snapshots matched source metadata)

## 4. ANOMALIES DETECTED
- **Cross-Credit Usage**: Folder 'Mandatory 2 & Credit 1' shared across two submittals.
- **Unstructured Data**: 'Water Conservation' evidence found in root-level instead of Credit subfolders.
- **Large Pool**: 'Site Photos' contains 122 files requiring manual classification.