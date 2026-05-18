"use client";

import React, { useState } from "react";
import { UploadRecoveryStatus } from "@/components/uploads/UploadRecoveryStatus";
import { 
  Building2, 
  Settings2, 
  Users2, 
  PlusCircle, 
  Sparkles, 
  Check, 
  ArrowRight, 
  FileText, 
  CheckSquare, 
  AlertCircle,
  HelpCircle,
  AlertTriangle
} from "lucide-react";

export default function CustomerZeroActivation() {
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1: Org Setup States
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [certType, setCertType] = useState("LEED");
  const [expectedProjects, setExpectedProjects] = useState("1-5");
  const [teamSize, setTeamSize] = useState("5-10");

  // Step 2: Framework Init States
  const [selectedFramework, setSelectedFramework] = useState("IGBC GI V1");
  const [isInitializing, setIsInitializing] = useState(false);
  const [initLogs, setInitLogs] = useState<string[]>([]);
  const [initDone, setInitDone] = useState(false);

  // Step 3: Team Provisioning
  const [bulkInviteText, setBulkInviteText] = useState("");
  const [roleTemplate, setRoleTemplate] = useState("CONTRIBUTOR");
  const [specialization, setSpecialization] = useState("Energy & Carbon");

  // Step 4: Guided Project
  const [projectName, setProjectName] = useState("");
  const [checklistCompleted, setChecklistCompleted] = useState<string[]>(["milestones"]);

  // Step 5: Guided Ingestion & Upload
  const [showDemoUpload, setShowDemoUpload] = useState(false);
  const [demoUploadFile, setDemoUploadFile] = useState<any>({
    name: "lighting_specs_scan_2026.pdf",
    size: 4892110,
    retryStatus: "success",
    ocrStatus: "warning",
    quarantineState: "clean",
    ocrScore: 0.78,
    recoveryAttempts: 1,
    suggestions: [
      "File successfully ingested. Text extraction score matches minimum targets.",
      "Identified scan. Suggest uploading clean digital source specifications to maximize compliance quality."
    ]
  });

  const nextStep = () => {
    setCompletedSteps((prev) => [...prev, step]);
    setStep((prev) => Math.min(5, prev + 1));
  };

  const prevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleFrameworkInit = () => {
    setIsInitializing(true);
    setInitLogs([]);
    const logs = [
      "Accessing Framework Knowledge Core...",
      "Generating dynamic operational workflows for IGBC certification standard...",
      "Configuring auditor specialty assignments for Water Stewardship & Energy...",
      "Setting up review checklists & folder taxonomy in document center...",
      "Finalizing smart template presets for clarification messages...",
      "System integration successful! Your workspace is ready."
    ];

    logs.forEach((logText, idx) => {
      setTimeout(() => {
        setInitLogs((prev) => [...prev, logText]);
        if (idx === logs.length - 1) {
          setIsInitializing(false);
          setInitDone(true);
        }
      }, (idx + 1) * 800);
    });
  };

  const toggleChecklist = (item: string) => {
    setChecklistCompleted((prev) => 
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const getStepClass = (stepIndex: number) => {
    if (step === stepIndex) return "border-indigo-500 text-indigo-400 bg-indigo-950/20";
    if (completedSteps.includes(stepIndex)) return "border-emerald-500 text-emerald-400 bg-emerald-950/20";
    return "border-slate-800 text-slate-500 bg-slate-900/10";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Premium Onboarding Header */}
      <header className="border-b border-slate-900 bg-slate-900/60 backdrop-blur-md px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            T
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
              Tracknov Active Onboarding Wizard
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
              Guided System Setup for Enterprise Green Certification Teams
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/40 border border-indigo-900/50 text-indigo-400 text-[10px] font-bold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          PILOT SYSTEM: LIVE ACTIVATION MODE
        </div>
      </header>

      {/* Main setup wizard body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-8 flex flex-col gap-8">
        
        {/* Step Indicator */}
        <div className="grid grid-cols-5 gap-3 border-b border-slate-900 pb-6">
          {[
            { label: "Organization", icon: <Building2 className="w-4 h-4" /> },
            { label: "Framework", icon: <Settings2 className="w-4 h-4" /> },
            { label: "Team Space", icon: <Users2 className="w-4 h-4" /> },
            { label: "First Project", icon: <PlusCircle className="w-4 h-4" /> },
            { label: "Guided Upload", icon: <FileText className="w-4 h-4" /> },
          ].map((item, idx) => {
            const stepNum = idx + 1;
            return (
              <div 
                key={idx}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-300 ${getStepClass(stepNum)}`}
              >
                <span className="text-xs shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-current font-bold">
                  {completedSteps.includes(stepNum) ? <Check className="w-3.5 h-3.5" /> : stepNum}
                </span>
                <div className="hidden md:block">
                  <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Step {stepNum}</p>
                  <p className="text-xs font-bold text-slate-300">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step Content panels */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl min-h-[400px] flex flex-col justify-between">
          
          {/* STEP 1: ORGANIZATION SETUP */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-100">Set Up Your Sustainability Organization</h2>
                <p className="text-xs text-slate-400">Please provide key details to customize your system taxonomy and reporting tools.</p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Organization / Corporate Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Harita Tech Park Developers"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Industry Classification</label>
                  <select 
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select industry...</option>
                    <option value="Real Estate">Real Estate Developers & Contractors</option>
                    <option value="Manufacturing">Heavy Manufacturing & Plants</option>
                    <option value="Infrastructure">Government & Infrastructure Projects</option>
                    <option value="Consulting">Sustainability / Consulting Agency</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Preferred System Target Standard</label>
                  <select 
                    value={certType}
                    onChange={(e) => setCertType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="IGBC">IGBC Green Cities / Buildings</option>
                    <option value="LEED">LEED Green Building Rating</option>
                    <option value="GRIHA">GRIHA National Rating System</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Expected Annual Projects</label>
                  <select 
                    value={expectedProjects}
                    onChange={(e) => setExpectedProjects(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="1-5">1 - 5 active properties</option>
                    <option value="6-20">6 - 20 properties</option>
                    <option value="20+">More than 20 properties</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: FRAMEWORK INITIALIZATION */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-100">Select & Deploy Compliance Framework</h2>
                <p className="text-xs text-slate-400">This automatically creates your certification knowledge taxonomy, default workflows, and folder hierarchy.</p>
              </div>

              <div className="grid grid-cols-4 gap-4 pt-2">
                {["IGBC GI V1", "IGBC GI V2", "LEED", "GRIHA"].map((fw) => (
                  <div
                    key={fw}
                    onClick={() => {
                      if (!isInitializing) setSelectedFramework(fw);
                    }}
                    className={`p-4 rounded-xl border text-center cursor-pointer transition-all duration-200 ${
                      selectedFramework === fw 
                        ? "bg-indigo-600/10 border-indigo-500 shadow-md"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <FileText className={`w-6 h-6 mx-auto mb-2 ${selectedFramework === fw ? "text-indigo-400" : "text-slate-500"}`} />
                    <span className="text-xs font-bold block">{fw} Standard</span>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Initialize Selected Ruleset Engine</h4>
                    <p className="text-[10px] text-slate-500">Auto-inject compliance rules, folder categories, and reviewer specialties.</p>
                  </div>
                  <button
                    onClick={handleFrameworkInit}
                    disabled={isInitializing || initDone}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      initDone 
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                        : isInitializing
                        ? "bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10"
                    }`}
                  >
                    {initDone ? "Configured & Active" : isInitializing ? "Setting Up..." : "Build Workspace Structure"}
                  </button>
                </div>

                {initLogs.length > 0 && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 max-h-[120px] overflow-y-auto scrollbar-thin">
                    {initLogs.map((log, idx) => (
                      <p key={idx} className="text-[10px] font-mono text-indigo-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        {log}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: TEAM PROVISIONING */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-100">Invite Your Certification & Auditor Teams</h2>
                <p className="text-xs text-slate-400">Allow bulk provisioning of project contributors and define specialization scopes.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-slate-400">Bulk Invite Members (Add CSV or Emails)</label>
                    <span className="text-[10px] text-slate-500">Format: email, first_name, role</span>
                  </div>
                  <textarea
                    placeholder="sara.smith@harita.com, Sara, CONTRIBUTOR&#10;john.doe@audits.com, John, AUDITOR"
                    value={bulkInviteText}
                    onChange={(e) => setBulkInviteText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 h-28 resize-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">Assign General Role Template</label>
                    <select
                      value={roleTemplate}
                      onChange={(e) => setRoleTemplate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="CONTRIBUTOR">Project Document Contributor</option>
                      <option value="AUDITOR">Authorized Framework Reviewer</option>
                      <option value="MANAGER">Sustainability Admin</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">Auditor Specialty Specialization</label>
                    <select
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Energy & Carbon">Energy Efficiency & Carbon Offset</option>
                      <option value="Water Stewardship">Water Ingestion & Sewage Stewardship</option>
                      <option value="Site Planning">Sustainable Site Planning & Ecology</option>
                      <option value="Materials">Low-Carbon Material Sourcing</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: GUIDED PROJECT CREATION */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-100">Create Your First Live Certification Property</h2>
                <p className="text-xs text-slate-400">Deploy your baseline property workflow, milestones, and export checklists.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Property / Project Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Harita Tech Park - Phase A"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-400">Deployment Baseline Checklist</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "milestones", label: "Auto-generate baseline milestones based on framework target" },
                      { id: "clarifications", label: "Create responsive clarification templates for missing documents" },
                      { id: "checklists", label: "Assemble definitive audit export readiness checklists" },
                      { id: "folders", label: "Establish secure segregated file storage directories" }
                    ].map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleChecklist(item.id)}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all duration-200 ${
                          checklistCompleted.includes(item.id)
                            ? "bg-slate-900 border-indigo-500/50 text-slate-100"
                            : "bg-slate-950 border-slate-900 text-slate-500"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 ${
                          checklistCompleted.includes(item.id) ? "bg-indigo-600 border-indigo-500" : "border-slate-800"
                        }`}>
                          {checklistCompleted.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-xs leading-relaxed">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: GUIDED EVIDENCE UPLOAD */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-100">Review & Test Upload Health Checks</h2>
                <p className="text-xs text-slate-400">See how our system translates complicated document quality scans and safety rules into friendly action points.</p>
              </div>

              {!showDemoUpload ? (
                <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-3xl space-y-4">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-300">Resilient Document Ingestion Walkthrough</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                      We'll simulate uploading a typical physical scan. You'll see how our network recovery system automatically heals disconnects, rates extraction accuracy, and outlines warnings in friendly plain English.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDemoUpload(true)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-indigo-600/10"
                  >
                    Simulate Sample Upload
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-6 pt-2">
                  <div className="col-span-2 space-y-4">
                    <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-200">Ingestion Guidelines & Accepted Formats</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        We natively accept digital PDFs, JPG, PNG, and standard Word files. Files can be up to 10MB each. Every document is securely parsed inside isolated project boundaries to guarantee maximum privacy.
                      </p>
                    </div>

                    <div className="p-5 bg-indigo-950/20 border border-indigo-900/40 rounded-2xl flex gap-3">
                      <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-200">How to handle upload issues?</p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          If your Wi-Fi drops out, the system will hold the session and automatically resume uploading the missing chunks the moment you are back online. Never worry about losing progress on massive portfolios.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <UploadRecoveryStatus
                      fileName={demoUploadFile.name}
                      fileSize={demoUploadFile.size}
                      retryStatus={demoUploadFile.retryStatus}
                      ocrStatus={demoUploadFile.ocrStatus}
                      quarantineState={demoUploadFile.quarantineState}
                      ocrScore={demoUploadFile.ocrScore}
                      recoveryAttempts={demoUploadFile.recoveryAttempts}
                      suggestions={demoUploadFile.suggestions}
                      partialRecoveryPercentage={90}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons footer */}
          <div className="flex justify-between border-t border-slate-800/80 pt-6 mt-8">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
                step === 1 
                  ? "border-slate-900 text-slate-700 cursor-not-allowed" 
                  : "border-slate-800 hover:border-slate-700 text-slate-300"
              }`}
            >
              Previous Step
            </button>

            {step < 5 ? (
              <button
                onClick={nextStep}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5"
              >
                Continue Setup
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <a
                href="/reviewer-focus-mode"
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
              >
                Go to Reviewer Focus Console
                <Check className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
