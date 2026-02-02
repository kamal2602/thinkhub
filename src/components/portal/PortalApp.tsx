import { useState, useEffect } from 'react';
import { Package, FileText, Leaf, Download, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

interface Project {
  id: string;
  project_number: string;
  project_date: string;
  status: string;
}

interface Asset {
  id: string;
  serial_number: string;
  brand: string;
  model: string;
  processing_stage: string;
}

export function PortalApp() {
  const { addToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        addToast('Please log in to access portal', 'error');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.user.id)
        .single();

      if (!profileData) return;

      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('portal_user_id', user.user.id)
        .single();

      if (contact) {
        const { data: projectsData } = await supabase
          .from('itad_projects')
          .select('*')
          .eq('contact_id', contact.id)
          .order('project_date', { ascending: false });

        setProjects(projectsData || []);
      }
    } catch (error: any) {
      console.error('Failed to load portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectAssets = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, serial_number, brand, model, processing_stage')
        .eq('itad_project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
      setSelectedProject(projectId);
    } catch (error: any) {
      console.error('Failed to load assets:', error);
      addToast('Failed to load assets', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Client Portal</h1>
          <p className="text-sm text-gray-600 mt-1">View your ITAD projects and asset lifecycle</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-1">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">Total Projects</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{projects.length}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-1">
              <FileText className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900">Active Projects</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {projects.filter(p => p.status === 'in_progress').length}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-1">
              <Leaf className="w-5 h-5 text-emerald-600" />
              <span className="font-medium text-gray-900">CO2 Avoided</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">2.4t</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Projects</h2>
            {projects.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No projects found
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => loadProjectAssets(project.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedProject === project.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{project.project_number}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(project.project_date).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        project.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assets</h2>
            {!selectedProject ? (
              <div className="text-center py-8 text-gray-500">
                Select a project to view assets
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No assets found for this project
              </div>
            ) : (
              <div className="space-y-2">
                {assets.map(asset => (
                  <div
                    key={asset.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{asset.serial_number}</div>
                        <div className="text-sm text-gray-600">
                          {asset.brand} {asset.model}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                          {asset.processing_stage}
                        </span>
                        <button className="p-1 text-blue-600 hover:text-blue-700">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Downloads</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Download className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Wipe Certificates</div>
                <div className="text-sm text-gray-600">Data destruction evidence</div>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Download className="w-5 h-5 text-green-600" />
              <div className="text-left">
                <div className="font-medium text-gray-900">ESG Reports</div>
                <div className="text-sm text-gray-600">Environmental impact summary</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
