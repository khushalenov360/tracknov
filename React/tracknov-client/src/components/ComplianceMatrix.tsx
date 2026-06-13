import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Clock, ArrowRight } from 'lucide-react';

interface CreditStatus {
  id: string;
  code: string;
  title: string;
  status: 'Verified' | 'Fails Baseline' | 'Awaiting Data';
  points: number | '-';
  maxPoints: number;
}

const mockCredits: CreditStatus[] = [
  {
    id: 'chiller-01',
    code: 'EE_Credit1',
    title: 'Energy Efficiency: Chiller Plant',
    status: 'Awaiting Data',
    points: '-',
    maxPoints: 5,
  },
  {
    id: 'rainwater-01',
    code: 'MR_Credit1',
    title: 'Sustainable Water: Rainwater Harvesting',
    status: 'Verified',
    points: 3,
    maxPoints: 3,
  },
  {
    id: 'materials-01',
    code: 'MR_Credit3',
    title: 'Materials: Recycled Content Optimization',
    status: 'Fails Baseline',
    points: 0,
    maxPoints: 2,
  }
];

export function ComplianceMatrix() {
  const { projectId } = useParams<{ projectId: string }>();
  const [credits] = useState<CreditStatus[]>(mockCredits);

  const getStatusBadge = (status: CreditStatus['status']) => {
    switch (status) {
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified
          </span>
        );
      case 'Fails Baseline':
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            Fails Baseline
          </span>
        );
      case 'Awaiting Data':
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            Awaiting Data
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Compliance Tracking Matrix</h2>
        <p className="text-gray-600">Overview of all mandatory baselines and targeted IGBC credits for project workspace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {credits.map((credit) => (
          <div key={credit.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">{credit.code}</span>
              {getStatusBadge(credit.status)}
            </div>
            
            <h3 className="font-bold text-gray-900 text-lg mb-2 leading-tight flex-1">{credit.title}</h3>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase font-semibold">Points</span>
                <span className="font-mono font-bold text-slate-700">{credit.points} / {credit.maxPoints}</span>
              </div>
              
              <Link 
                to={`/project/${projectId}/credit/${credit.id}`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Audit <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
