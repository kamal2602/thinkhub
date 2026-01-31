import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, CheckCircle, Package, Search, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Certificate {
  id: string;
  certificate_number: string;
  certificate_type: string;
  title: string;
  description: string;
  total_assets: number;
  total_weight_kg: number;
  co2_saved_kg: number;
  data_destruction_method: string;
  issued_at: string;
  status: string;
  itad_project: {
    project_number: string;
    project_name: string;
  };
}

interface CertificateDownloadsProps {
  customerId: string;
}

export function CertificateDownloads({ customerId }: CertificateDownloadsProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchCertificates();
  }, [customerId]);

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('itad_certificates')
        .select(`
          *,
          itad_project:itad_projects (
            project_number,
            project_name
          )
        `)
        .eq('itad_customer_id', customerId)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCertificateTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'data_destruction': 'Data Destruction',
      'recycling': 'Recycling',
      'environmental_impact': 'Environmental Impact',
      'comprehensive': 'Comprehensive',
      'chain_of_custody': 'Chain of Custody'
    };
    return labels[type] || type;
  };

  const getCertificateTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'data_destruction': 'bg-red-100 text-red-700',
      'recycling': 'bg-green-100 text-green-700',
      'environmental_impact': 'bg-blue-100 text-blue-700',
      'comprehensive': 'bg-indigo-100 text-indigo-700',
      'chain_of_custody': 'bg-gray-100 text-gray-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const handleDownload = async (certificate: Certificate) => {
    window.print();
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cert.itad_project as any)?.project_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || cert.certificate_type === filterType;

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading certificates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Compliance Certificates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Download your ITAD compliance certificates
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle className="w-5 h-5 text-green-600" />
            {certificates.length} certificates available
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by certificate number or project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="data_destruction">Data Destruction</option>
            <option value="recycling">Recycling</option>
            <option value="environmental_impact">Environmental Impact</option>
            <option value="comprehensive">Comprehensive</option>
            <option value="chain_of_custody">Chain of Custody</option>
          </select>
        </div>

        {filteredCertificates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">
              {certificates.length === 0
                ? 'No certificates available yet'
                : 'No certificates match your search'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCertificates.map(cert => (
              <div
                key={cert.id}
                className="flex items-center justify-between p-6 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">{cert.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getCertificateTypeColor(cert.certificate_type)}`}>
                      {getCertificateTypeLabel(cert.certificate_type)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Certificate Number: <span className="font-medium">{cert.certificate_number}</span></p>
                    <p>Project: {(cert.itad_project as any)?.project_number} - {(cert.itad_project as any)?.project_name}</p>
                    {cert.description && <p>{cert.description}</p>}
                  </div>

                  <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
                    {cert.total_assets > 0 && (
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {cert.total_assets} assets
                      </div>
                    )}
                    {cert.total_weight_kg > 0 && (
                      <div>
                        {cert.total_weight_kg.toFixed(2)} kg processed
                      </div>
                    )}
                    {cert.co2_saved_kg > 0 && (
                      <div className="text-green-600">
                        {cert.co2_saved_kg.toFixed(0)} kg CO2 saved
                      </div>
                    )}
                    {cert.issued_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(cert.issued_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(cert)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Need a Custom Certificate?</h3>
        <p className="text-sm text-blue-800 mb-4">
          If you need a certificate with specific information or for audit purposes, please contact us.
        </p>
        <a
          href="mailto:support@example.com"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          <Mail className="w-4 h-4" />
          Request Custom Certificate
        </a>
      </div>
    </div>
  );
}
