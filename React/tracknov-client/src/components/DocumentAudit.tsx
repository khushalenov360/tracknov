import { useState } from 'react';
import { Play, CheckCircle, XCircle, FileJson } from 'lucide-react';
import { evaluateCreditMetrics } from '../services/api';

const MOCK_CHILLER_PAYLOAD = JSON.stringify({
  equipment_tag: "CH-01",
  cooling_medium: "Water-Cooled",
  nominal_tr_capacity: 120,
  full_load_cop: 5.95,
  refrigerant_ashrae_id: "R-134a"
}, null, 2);

export function DocumentAudit() {
  const [jsonInput, setJsonInput] = useState(MOCK_CHILLER_PAYLOAD);
  const [isVerifying, setIsVerifying] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    setAuditResult(null);

    try {
      const payload = JSON.parse(jsonInput);
      // Hardcoded to EE_Credit1 for demonstration purposes based on the mock payload
      const result = await evaluateCreditMetrics('EE_Credit1', payload);
      setAuditResult(result);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Ensure valid JSON payload.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Document Audit Copilot</h2>
          <p className="text-gray-600">Extract submittal payloads and run deterministic mathematical verification.</p>
        </div>
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          <Play className="w-4 h-4" />
          {isVerifying ? 'Running Core...' : 'Run Harita Verification Core'}
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Left Pane: JSON Editor */}
        <div className="bg-slate-950 rounded-xl shadow-sm border border-slate-800 flex flex-col overflow-hidden">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
            <FileJson className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-300 font-mono">Parsed Payload Injection (JSON)</span>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="flex-1 w-full bg-slate-950 text-green-400 p-4 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-slate-700"
            spellCheck={false}
          />
        </div>

        {/* Right Pane: Audit Report Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-700">Live Verification Report</span>
          </div>
          
          <div className="flex-1 p-6 overflow-auto">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
                <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">{error}</div>
              </div>
            )}

            {!error && !auditResult && !isVerifying && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p>Inject JSON and run verification to view results.</p>
              </div>
            )}

            {isVerifying && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
                <p>Evaluating mathematical strict baselines...</p>
              </div>
            )}

            {auditResult && !isVerifying && (
              <div className="space-y-6">
                <div className={`p-4 rounded-lg border flex items-center gap-4 ${auditResult.evaluationResult.compliant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  {auditResult.evaluationResult.compliant ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-600" />
                  )}
                  <div>
                    <h3 className={`font-bold text-lg ${auditResult.evaluationResult.compliant ? 'text-green-900' : 'text-red-900'}`}>
                      {auditResult.evaluationResult.compliant ? 'Verified Compliant' : 'Baseline Failure'}
                    </h3>
                    <p className={`text-sm ${auditResult.evaluationResult.compliant ? 'text-green-700' : 'text-red-700'}`}>
                      Credit Points Awarded: <strong>{auditResult.evaluationResult.pointsAwarded}</strong>
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">Mathematical Justification</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded border border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Mandatory ECBC Baseline</span>
                      <span className="font-mono text-lg text-slate-800 font-bold">{auditResult.evaluationResult.mandatoryBaseline}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded border border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Extracted Payload Value</span>
                      <span className={`font-mono text-lg font-bold ${auditResult.evaluationResult.compliant ? 'text-green-600' : 'text-red-600'}`}>
                        {auditResult.evaluationResult.extracted_cop}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">Raw API Dump</h4>
                  <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-xs overflow-auto">
                    {JSON.stringify(auditResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
