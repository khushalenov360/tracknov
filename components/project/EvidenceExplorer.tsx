"use client";

import React, { useState, useMemo } from "react";
import { 
  Folder, 
  File, 
  Search, 
  Filter, 
  MoreVertical, 
  ChevronRight, 
  ChevronDown,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Camera,
  AlertCircle,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  ExternalLink,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui-lib/ui/badge";
import { Button } from "@/components/ui-lib/ui/button";

import { formatDistanceToNow } from "date-fns";

interface EvidenceExplorerProps {
  documents: any[];
  categories: string[];
  onSelect: (doc: any) => void;
  selectedId?: string;
  duplicateReports?: any[];
}

export function EvidenceExplorer({ documents, categories, onSelect, selectedId, duplicateReports }: EvidenceExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(categories));
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFolder = (category: string) => {
    const next = new Set(expandedFolders);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    setExpandedFolders(next);
  };

  const filteredDocs = useMemo(() => {
    if (!searchQuery) return documents;
    return documents.filter(doc => 
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.doc_category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  const docsByCategory = useMemo(() => {
    const map: Record<string, any[]> = {};
    categories.forEach(cat => map[cat] = []);
    filteredDocs.forEach(doc => {
      if (!map[doc.doc_category]) map[doc.doc_category] = [];
      map[doc.doc_category].push(doc);
    });
    return map;
  }, [filteredDocs, categories]);

  const getFileIcon = (type: string) => {
    const ext = type.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return <ImageIcon className="w-4 h-4 text-pink-400" />;
    if (['pdf'].includes(ext)) return <FileText className="w-4 h-4 text-red-400" />;
    if (['xlsx', 'xls', 'csv'].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const getStatusIcon = (state: string) => {
    const s = state.toUpperCase();
    if (s === 'APPROVED' || s === 'VERIFIED') return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
    if (s === 'CLARIFICATION' || s === 'REJECTED') return <AlertCircle className="w-3 h-3 text-amber-500" />;
    if (s === 'UNDER_REVIEW') return <Clock className="w-3 h-3 text-blue-500 animate-pulse" />;
    return <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
      {/* Search & Filter Header */}
      <div className="p-4 bg-white/5 border-b border-white/5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search evidence..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Button variant="secondary" className="bg-white/5 border-white/10 text-xs font-black uppercase h-7 px-3">
            <Filter className="w-3 h-3 mr-1" />
            Types
          </Button>
          <Button variant="secondary" className="bg-white/5 border-white/10 text-xs font-black uppercase h-7 px-3 text-emerald-400">
            Verified
          </Button>
          <Button variant="secondary" className="bg-white/5 border-white/10 text-xs font-black uppercase h-7 px-3 text-amber-400">
            Issues
          </Button>
        </div>
      </div>

      {/* Folder Graph Navigation */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
        {categories.map(category => {
          const categoryDocs = docsByCategory[category] || [];
          if (categoryDocs.length === 0 && searchQuery) return null;
          
          const isExpanded = expandedFolders.has(category);

          return (
            <div key={category} className="space-y-0.5">
              <button 
                onClick={() => toggleFolder(category)}
                className="w-full flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="text-slate-500 group-hover:text-blue-400 transition-colors">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <Folder className={`w-4 h-4 ${isExpanded ? 'text-blue-400 fill-blue-400/10' : 'text-slate-500'}`} />
                  <span className={`text-xs font-bold ${isExpanded ? 'text-white' : 'text-slate-400'}`}>{category}</span>
                </div>
                <span className="text-xs font-black text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">
                  {categoryDocs.length}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-4 pl-4 border-l border-white/5 space-y-0.5 mt-0.5 mb-2">
                  {categoryDocs.map(doc => {
                    const isSelected = selectedId === doc.id;
                    const isDuplicate = duplicateReports?.some(r => r.document_a_id === doc.id || r.document_b_id === doc.id);

                    return (
                      <div 
                        key={doc.id}
                        onClick={() => onSelect(doc)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all group ${
                          isSelected ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0">{getFileIcon(doc.file_type)}</div>
                          <div className="min-w-0">
                            <p className={`text-xs font-medium truncate ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                              {doc.file_name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {getStatusIcon(doc.state)}
                              <span className="text-[9px] text-slate-600 font-mono">v{doc.version}</span>
                              {isDuplicate && (
                                <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] h-3 px-1">DUPLICATE</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" className="w-6 h-6 rounded-lg text-slate-500 hover:text-white p-0">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" className="w-6 h-6 rounded-lg text-slate-500 hover:text-white p-0">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {categoryDocs.length === 0 && (
                    <p className="text-xs text-slate-600 italic py-2 pl-2">No documents in this category.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Recommendation Footer */}
      <div className="p-4 bg-indigo-600/5 border-t border-indigo-500/10">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-3 h-3 text-indigo-400" />
          <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">AI Insights</span>
        </div>
        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <p className="text-xs text-indigo-200 leading-relaxed">
            AI detected 3 reuse opportunities from similar projects. Review the "Cross-Credit" tab.
          </p>
        </div>
      </div>
    </div>
  );
}
