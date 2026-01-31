import { useState, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ImportJob {
  id: string;
  job_type: string;
  file_name: string;
  status: string;
  progress: number;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  errors?: Array<{ row: number; message: string }>;
  created_at: string;
  completed_at?: string;
}

interface ImportJobMonitorProps {
  jobId: string;
  onComplete?: () => void;
}

export function ImportJobMonitor({ jobId, onComplete }: ImportJobMonitorProps) {
  const [job, setJob] = useState<ImportJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJob();
    const subscription = subscribeToJobUpdates();

    return () => {
      subscription.unsubscribe();
    };
  }, [jobId]);

  const loadJob = async () => {
    try {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);

      if (data.status === 'completed' || data.status === 'completed_with_errors' || data.status === 'failed') {
        onComplete?.();
      }
    } catch (error) {
      console.error('Failed to load job:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToJobUpdates = () => {
    return supabase
      .channel(`import_job:${jobId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'import_jobs',
        filter: `id=eq.${jobId}`
      }, (payload) => {
        setJob(payload.new as ImportJob);

        if (['completed', 'completed_with_errors', 'failed'].includes(payload.new.status)) {
          onComplete?.();
        }
      })
      .subscribe();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-24 bg-gray-200 rounded mb-4"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Job not found</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'completed_with_errors':
        return <AlertCircle className="w-8 h-8 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-8 h-8 text-red-600" />;
      case 'processing':
        return <Clock className="w-8 h-8 text-blue-600 animate-spin" />;
      default:
        return <Upload className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'pending':
        return 'Waiting to start...';
      case 'processing':
        return 'Processing import...';
      case 'completed':
        return 'Import completed successfully!';
      case 'completed_with_errors':
        return 'Import completed with some errors';
      case 'failed':
        return 'Import failed';
      default:
        return job.status;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'completed':
        return 'text-green-600';
      case 'completed_with_errors':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      case 'processing':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-4 mb-6">
          {getStatusIcon()}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Import Progress</h2>
            <p className="text-gray-600">{job.file_name}</p>
          </div>
        </div>

        <div className={`text-lg font-semibold mb-4 ${getStatusColor()}`}>
          {getStatusText()}
        </div>

        {job.status === 'processing' && (
          <div className="mb-6">
            <div className="flex justify-between mb-2 text-sm text-gray-600">
              <span>Progress</span>
              <span>{job.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{job.total_rows}</div>
            <div className="text-sm text-gray-600">Total Rows</div>
          </div>

          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{job.processed_rows || 0}</div>
            <div className="text-sm text-gray-600">Processed</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{job.success_count || 0}</div>
            <div className="text-sm text-gray-600">Successful</div>
          </div>

          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{job.error_count || 0}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
        </div>

        {job.errors && job.errors.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Errors</h3>
            <div className="max-h-64 overflow-y-auto bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="space-y-2 text-sm">
                {job.errors.slice(0, 20).map((error, index) => (
                  <li key={index} className="text-red-800">
                    <span className="font-medium">Row {error.row}:</span> {error.message}
                  </li>
                ))}
                {job.errors.length > 20 && (
                  <li className="text-red-600 font-medium">
                    ... and {job.errors.length - 20} more errors
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Job Type:</span>
              <span className="ml-2 font-medium text-gray-900 capitalize">
                {job.job_type.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Created:</span>
              <span className="ml-2 font-medium text-gray-900">
                {new Date(job.created_at).toLocaleString()}
              </span>
            </div>
            {job.completed_at && (
              <>
                <div>
                  <span className="text-gray-600">Completed:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {new Date(job.completed_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {Math.round(
                      (new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000
                    )}s
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
