import { useState, useEffect } from 'react';
import { HardDrive, Upload, Check, X, AlertTriangle, Download } from 'lucide-react';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';

interface WipeJob {
  id: string;
  asset_id: string;
  provider: string;
  status: string;
  wiped_at: string | null;
  certificate_url: string | null;
  exception_reason: string | null;
  notes: string | null;
  assets?: {
    serial_number: string;
    brand: string;
    model: string;
  };
}

export function WipingQueue() {
  const { selectedCompany } = useCompany();
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<WipeJob[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<WipeJob | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (selectedCompany) {
      loadJobs();
    }
  }, [selectedCompany, filter]);

  const loadJobs = async () => {
    if (!selectedCompany) return;

    try {
      let query = supabase
        .from('wipe_jobs')
        .select(`
          *,
          assets (serial_number, brand, model)
        `)
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      console.error('Failed to load wipe jobs:', error);
      addToast('Failed to load wipe jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (jobId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'success') {
        updates.wiped_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('wipe_jobs')
        .update(updates)
        .eq('id', jobId);

      if (error) throw error;
      addToast('Status updated successfully', 'success');
      loadJobs();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      addToast('Failed to update status', 'error');
    }
  };

  const handleUploadCertificate = async (jobId: string) => {
    const url = prompt('Enter certificate URL:');
    if (!url) return;

    try {
      const { error } = await supabase
        .from('wipe_jobs')
        .update({
          certificate_url: url,
          certificate_uploaded_at: new Date().toISOString(),
          status: 'success',
          wiped_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (error) throw error;
      addToast('Certificate uploaded successfully', 'success');
      loadJobs();
    } catch (error: any) {
      console.error('Failed to upload certificate:', error);
      addToast('Failed to upload certificate', 'error');
    }
  };

  const handleApproveException = async (jobId: string) => {
    const reason = prompt('Enter exception reason:');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('wipe_jobs')
        .update({
          status: 'exception_approved',
          exception_reason: reason,
        })
        .eq('id', jobId);

      if (error) throw error;
      addToast('Exception approved successfully', 'success');
      loadJobs();
    } catch (error: any) {
      console.error('Failed to approve exception:', error);
      addToast('Failed to approve exception', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      exception_approved: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'success') return <Check className="w-4 h-4" />;
    if (status === 'failed') return <X className="w-4 h-4" />;
    if (status === 'exception_approved') return <AlertTriangle className="w-4 h-4" />;
    return <HardDrive className="w-4 h-4" />;
  };

  const statuses = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
    { value: 'exception_approved', label: 'Exceptions' },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Data Wiping Queue</h2>
          <p className="text-sm text-gray-600 mt-1">
            Track data sanitization for ITAD compliance
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {statuses.map(s => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === s.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <HardDrive className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No wipe jobs found</h3>
          <p className="text-gray-600">Wipe jobs will appear here as assets arrive</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Wiped At</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Certificate</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map(job => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">
                        {job.assets?.serial_number || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {job.assets?.brand} {job.assets?.model}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900 capitalize">
                      {job.provider.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {getStatusIcon(job.status)}
                      {job.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {job.wiped_at ? new Date(job.wiped_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {job.certificate_url ? (
                      <a
                        href={job.certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {job.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(job.id, 'in_progress')}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                          >
                            Start
                          </button>
                          <button
                            onClick={() => handleApproveException(job.id)}
                            className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                          >
                            Exception
                          </button>
                        </>
                      )}
                      {job.status === 'in_progress' && (
                        <>
                          <button
                            onClick={() => handleUploadCertificate(job.id)}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                          >
                            Upload Cert
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(job.id, 'failed')}
                            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                          >
                            Failed
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {jobs.some(j => j.status === 'failed') && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>Failed Wipes Detected:</strong> Assets with failed wipes require attention.
              Contact compliance team or approve exception if wiping not applicable.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
