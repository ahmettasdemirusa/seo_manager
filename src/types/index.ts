export interface Site {
  id: string;
  domain: string;
  url: string;
  status: 'Healthy' | 'Optimization Needed' | 'Critical Errors';
  score: number;
  lastScan: string;
  issues?: number;
  aiAnalysis?: any;
  screenshot?: string;
  history?: { date: string; score: number }[]; // History Data
}
