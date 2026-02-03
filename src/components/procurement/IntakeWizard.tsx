import React, { useState, useEffect } from 'react';
import { ShoppingCart, Shield, Recycle, X, ArrowLeft } from 'lucide-react';
import { procurementService, IntakeType, CommercialModel, ProcessingIntent } from '../../services/procurementService';
import { useCompany } from '../../contexts/CompanyContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';

interface IntakeWizardProps {
  onClose: () => void;
  onSuccess: (poId: string) => void;
}

interface Contact {
  id: string;
  name: string;
  company_name?: string;
}

interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
}

export function IntakeWizard({ onClose, onSuccess }: IntakeWizardProps) {
  const { selectedCompany } = useCompany();
  const { showToast } = useToast();
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [loading, setLoading] = useState(false);

  const [intakeType, setIntakeType] = useState<IntakeType | null>(null);
  const [commercialModel, setCommercialModel] = useState<CommercialModel>('we_buy');
  const [processingIntent, setProcessingIntent] = useState<ProcessingIntent>('resale');
  const [supplierId, setSupplierId] = useState('');
  const [clientPartyId, setClientPartyId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [itadProjectName, setItadProjectName] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [revenueSharePercentage, setRevenueSharePercentage] = useState('');
  const [expectedWeightKg, setExpectedWeightKg] = useState('');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (selectedCompany) {
      loadSuppliers();
      loadContacts();
    }
  }, [selectedCompany]);

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, contact_name')
      .eq('company_id', selectedCompany!.id)
      .order('name');
    setSuppliers(data || []);
  };

  const loadContacts = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('id, name, company_name')
      .eq('company_id', selectedCompany!.id)
      .order('name');
    setContacts(data || []);
  };

  const handleTypeSelection = (type: IntakeType) => {
    setIntakeType(type);
    if (type === 'resale') {
      setCommercialModel('we_buy');
      setProcessingIntent('resale');
    } else if (type === 'itad') {
      setCommercialModel('client_pays');
      setProcessingIntent('resale');
    } else if (type === 'recycling') {
      setCommercialModel('we_buy');
      setProcessingIntent('recycle');
    }
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !intakeType) return;

    setLoading(true);
    try {
      const result = await procurementService.createIntake({
        companyId: selectedCompany.id,
        intakeType,
        commercialModel,
        processingIntent,
        supplierId: supplierId || undefined,
        clientPartyId: clientPartyId || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        sourceChannel: 'manual',
        itadProjectName: itadProjectName || undefined,
        serviceFee: serviceFee ? parseFloat(serviceFee) : undefined,
        revenueSharePercentage: revenueSharePercentage ? parseFloat(revenueSharePercentage) : undefined,
        expectedWeightKg: expectedWeightKg ? parseFloat(expectedWeightKg) : undefined
      });

      showToast(`${intakeType.toUpperCase()} intake created successfully`, 'success');
      onSuccess(result.purchaseOrder.id);
    } catch (error: any) {
      console.error('Failed to create intake:', error);
      showToast(error.message || 'Failed to create intake', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            {step === 'details' && (
              <button
                onClick={() => setStep('type')}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-2xl font-bold">Create New Intake</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {step === 'type' && (
            <div>
              <p className="text-gray-600 mb-6">
                Select the type of inbound material you're receiving:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <IntakeTypeCard
                  icon={<ShoppingCart className="w-12 h-12 text-blue-600" />}
                  title="Resale"
                  description="Purchasing equipment from suppliers to refurbish and resell"
                  color="blue"
                  onClick={() => handleTypeSelection('resale')}
                />
                <IntakeTypeCard
                  icon={<Shield className="w-12 h-12 text-purple-600" />}
                  title="ITAD Project"
                  description="Client sends equipment for secure data destruction and recycling"
                  color="purple"
                  onClick={() => handleTypeSelection('itad')}
                />
                <IntakeTypeCard
                  icon={<Recycle className="w-12 h-12 text-green-600" />}
                  title="Recycling"
                  description="Bulk material intake for commodity extraction"
                  color="green"
                  onClick={() => handleTypeSelection('recycling')}
                />
              </div>
            </div>
          )}

          {step === 'details' && intakeType && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  {intakeType === 'resale' && <ShoppingCart className="w-8 h-8 text-blue-600" />}
                  {intakeType === 'itad' && <Shield className="w-8 h-8 text-purple-600" />}
                  {intakeType === 'recycling' && <Recycle className="w-8 h-8 text-green-600" />}
                  <div>
                    <h3 className="text-lg font-semibold capitalize">{intakeType} Intake</h3>
                    <p className="text-sm text-gray-600">
                      {intakeType === 'resale' && 'Buy equipment to refurbish and resell'}
                      {intakeType === 'itad' && 'Client sends equipment for secure destruction'}
                      {intakeType === 'recycling' && 'Bulk material for commodity extraction'}
                    </p>
                  </div>
                </div>
              </div>

              {intakeType === 'resale' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier *
                    </label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select supplier...</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {intakeType === 'itad' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client *
                    </label>
                    <select
                      value={clientPartyId}
                      onChange={(e) => setClientPartyId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select client...</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name} {contact.company_name ? `(${contact.company_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={itadProjectName}
                      onChange={(e) => setItadProjectName(e.target.value)}
                      placeholder="e.g., ABC Corp Data Center Decommission"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service Fee
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={serviceFee}
                        onChange={(e) => setServiceFee(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Revenue Share %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={revenueSharePercentage}
                        onChange={(e) => setRevenueSharePercentage(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </>
              )}

              {intakeType === 'recycling' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Commercial Model
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="we_buy"
                          checked={commercialModel === 'we_buy'}
                          onChange={(e) => setCommercialModel(e.target.value as CommercialModel)}
                          className="mr-2"
                        />
                        We Buy (from supplier)
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="client_pays"
                          checked={commercialModel === 'client_pays'}
                          onChange={(e) => setCommercialModel(e.target.value as CommercialModel)}
                          className="mr-2"
                        />
                        Client Pays (customer sends scrap)
                      </label>
                    </div>
                  </div>

                  {commercialModel === 'we_buy' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Supplier *
                      </label>
                      <select
                        value={supplierId}
                        onChange={(e) => setSupplierId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select supplier...</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Client *
                      </label>
                      <select
                        value={clientPartyId}
                        onChange={(e) => setClientPartyId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select client...</option>
                        {contacts.map((contact) => (
                          <option key={contact.id} value={contact.id}>
                            {contact.name} {contact.company_name ? `(${contact.company_name})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={expectedWeightKg}
                      onChange={(e) => setExpectedWeightKg(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Processing Intent
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="recycle"
                          checked={processingIntent === 'recycle'}
                          onChange={(e) => setProcessingIntent(e.target.value as ProcessingIntent)}
                          className="mr-2"
                        />
                        Recycle Only
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="hybrid"
                          checked={processingIntent === 'hybrid'}
                          onChange={(e) => setProcessingIntent(e.target.value as ProcessingIntent)}
                          className="mr-2"
                        />
                        Hybrid (cherry-pick then recycle)
                      </label>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes or instructions..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-white font-medium ${
                    intakeType === 'resale' ? 'bg-blue-600 hover:bg-blue-700' :
                    intakeType === 'itad' ? 'bg-purple-600 hover:bg-purple-700' :
                    'bg-green-600 hover:bg-green-700'
                  } disabled:opacity-50`}
                >
                  {loading ? 'Creating...' : 'Create Intake'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function IntakeTypeCard({ icon, title, description, color, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`p-6 border-2 border-gray-200 rounded-lg hover:border-${color}-500 hover:shadow-lg transition-all text-left group`}
    >
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2 group-hover:text-${color}-600">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </button>
  );
}
