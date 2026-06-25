import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { IntakeFormData } from '@/types/intake';
import { Json } from '@/integrations/supabase/types';

interface CaseData {
  id: string;
  user_id: string;
  status: string;
  dispute_type: string | null;
  dispute_type_other: string | null;
  your_name: string | null;
  your_role: string | null;
  other_party_name: string | null;
  other_party_role: string | null;
  relationship: string | null;
  issue_description: string | null;
  timeline: string | null;
  attempted_resolution: string | null;
  desired_outcome: string | null;
  priorities: string[] | null;
  open_to_compromise: boolean | null;
  additional_notes: string | null;
  ai_summary: Json | null;
  created_at: string;
  updated_at: string;
}

export function useCaseStorage() {
  const [isSaving, setIsSaving] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);

  const formDataToCaseData = (formData: IntakeFormData): Partial<CaseData> => ({
    dispute_type: formData.disputeType || null,
    dispute_type_other: formData.disputeTypeOther || null,
    your_name: getPartyDisplayName({
      name: formData.yourName,
      firstName: formData.yourFirstName,
      lastName: formData.yourLastName,
      companyTitle: formData.yourCompanyTitle,
    }) || null,
    your_role: formData.yourRole || null,
    other_party_name: getPartyDisplayName({
      name: formData.otherPartyName,
      firstName: formData.otherPartyFirstName,
      lastName: formData.otherPartyLastName,
      companyTitle: formData.otherPartyCompanyTitle,
    }) || null,
    other_party_role: formData.otherPartyRole || null,
    relationship: formData.relationship || null,
    issue_description: formData.issueDescription || null,
    timeline: formData.timeline || null,
    attempted_resolution: formData.attemptedResolution || null,
    desired_outcome: formData.desiredOutcome || null,
    priorities: formData.priorities.length > 0 ? formData.priorities : null,
    open_to_compromise: formData.openToCompromise,
    additional_notes: formData.additionalNotes || null,
  });

  const caseDataToFormData = (caseData: CaseData): Partial<IntakeFormData> => ({
    disputeType: (caseData.dispute_type as IntakeFormData['disputeType']) || '',
    disputeTypeOther: caseData.dispute_type_other || '',
    yourName: caseData.your_name || '',
    yourRole: (caseData.your_role as IntakeFormData['yourRole']) || '',
    otherPartyName: caseData.other_party_name || '',
    otherPartyRole: (caseData.other_party_role as IntakeFormData['otherPartyRole']) || '',
    relationship: caseData.relationship || '',
    issueDescription: caseData.issue_description || '',
    timeline: caseData.timeline || '',
    attemptedResolution: caseData.attempted_resolution || '',
    desiredOutcome: caseData.desired_outcome || '',
    priorities: caseData.priorities || [],
    openToCompromise: caseData.open_to_compromise ?? true,
    additionalNotes: caseData.additional_notes || '',
  });

  const createCase = async (userId: string): Promise<string | null> => {
    setIsSaving(true);
    const { data, error } = await supabase
      .from('cases')
      .insert({ user_id: userId, status: 'draft' })
      .select('id')
      .single();

    setIsSaving(false);
    
    if (error) {
      console.error('Error creating case:', error);
      return null;
    }
    
    setCaseId(data.id);
    return data.id;
  };

  const loadCase = async (id: string): Promise<Partial<IntakeFormData> | null> => {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      console.error('Error loading case:', error);
      return null;
    }

    setCaseId(data.id);
    return caseDataToFormData(data as CaseData);
  };

  const saveCase = async (
    id: string, 
    formData: IntakeFormData, 
    status?: string
  ): Promise<boolean> => {
    setIsSaving(true);
    const updateData = {
      ...formDataToCaseData(formData),
      ...(status && { status }),
    };

    const { error } = await supabase
      .from('cases')
      .update(updateData)
      .eq('id', id);

    setIsSaving(false);

    if (error) {
      console.error('Error saving case:', error);
      return false;
    }

    return true;
  };

  const saveSummary = async (
    id: string, 
    summary: Json
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('cases')
      .update({ ai_summary: summary })
      .eq('id', id);

    if (error) {
      console.error('Error saving summary:', error);
      return false;
    }

    return true;
  };

  const submitMediatorRequest = async (
    caseId: string,
    userId: string,
    preferredDates: string[],
    preferredTime: string,
    sessionType: string,
    notes?: string
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('mediator_requests')
      .insert({
        case_id: caseId,
        user_id: userId,
        preferred_dates: preferredDates,
        preferred_time: preferredTime,
        session_type: sessionType,
        notes: notes || null,
        status: 'pending',
      });

    if (error) {
      console.error('Error submitting mediator request:', error);
      return false;
    }

    // Update case status
    await supabase
      .from('cases')
      .update({ status: 'submitted' })
      .eq('id', caseId);

    return true;
  };

  return {
    caseId,
    setCaseId,
    isSaving,
    createCase,
    loadCase,
    saveCase,
    saveSummary,
    submitMediatorRequest,
  };
}

function getPartyDisplayName(party: { name?: string; firstName?: string; lastName?: string; companyTitle?: string }) {
  return (
    party.name ||
    [party.firstName, party.lastName].filter(Boolean).join(' ') ||
    party.companyTitle ||
    ''
  ).trim();
}
