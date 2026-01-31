interface ProcessingDashboardProps {
  stats?: any;
  [key: string]: any;
}

export function ProcessingDashboard({ stats }: ProcessingDashboardProps) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Processing Dashboard</h2>
      <p>Dashboard content coming soon...</p>
    </div>
  );
}
