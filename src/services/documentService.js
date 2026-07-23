import { supabase } from '../lib/supabase.js'

const BUCKET = 'client-documents'
const DOCUMENT_COLUMNS = '*, uploader:profiles!uploaded_by(id, first_name, last_name)'

export async function listClientDocuments(clientId) {
  const { data, error } = await supabase
    .from('client_documents')
    .select(DOCUMENT_COLUMNS)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function uploadDocument({
  clientId = null,
  referralId = null,
  programId = null,
  programSessionId = null,
  incidentId = null,
  documentType = null,
  file,
  confidential,
  uploadedBy,
}) {
  if (!clientId && !referralId && !programId && !incidentId) {
    throw new Error('A client, referral, program, or incident is required.')
  }
  const documentId = crypto.randomUUID()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const folder = clientId || (referralId ? `referral-${referralId}` : programId ? `program-${programId}` : `incident-${incidentId}`)
  const filePath = `${folder}/${documentId}-${safeName}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('client_documents')
    .insert({
      id: documentId,
      client_id: clientId,
      referral_id: referralId,
      program_id: programId,
      program_session_id: programSessionId,
      incident_id: incidentId,
      document_type: documentType || null,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      confidential,
      uploaded_by: uploadedBy,
    })
    .select(DOCUMENT_COLUMNS)
    .single()

  if (error) {
    // Don't leave an orphaned file in storage with no metadata row
    // pointing at it if the database insert fails.
    await supabase.storage.from(BUCKET).remove([filePath])
    throw error
  }
  return data
}

export async function uploadClientDocument({ clientId, documentType, file, confidential, uploadedBy }) {
  return uploadDocument({ clientId, documentType, file, confidential, uploadedBy })
}

export async function listReferralDocuments(referralId) {
  const { data, error } = await supabase
    .from('client_documents')
    .select(DOCUMENT_COLUMNS)
    .eq('referral_id', referralId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Every document across every client, for the Reports/Dashboard
// compliance rollup.
export async function listAllDocuments() {
  const { data, error } = await supabase.from('client_documents').select(DOCUMENT_COLUMNS).not('client_id', 'is', null)
  if (error) throw error
  return data
}

// Every program/camp risk assessment document (program_id set) - covers
// both annual Program/Activity uploads (program_session_id null) and
// per-camp uploads (program_session_id set), split out client-side.
export async function listAllRiskAssessmentDocuments() {
  const { data, error } = await supabase
    .from('client_documents')
    .select(DOCUMENT_COLUMNS)
    .not('program_id', 'is', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listIncidentDocuments(incidentId) {
  const { data, error } = await supabase
    .from('client_documents')
    .select(DOCUMENT_COLUMNS)
    .eq('incident_id', incidentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// Called whenever a referral is linked/re-linked/unlinked to a client, so
// any documents already attached to the referral follow it onto (or off)
// that client's Documents tab.
export async function syncReferralDocumentsClient(referralId, clientId) {
  const { error } = await supabase.from('client_documents').update({ client_id: clientId }).eq('referral_id', referralId)
  if (error) throw error
}

export async function getDocumentDownloadUrl(filePath) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60)
  if (error) throw error
  return data.signedUrl
}

export async function deleteClientDocument(document) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([document.file_path])
  if (storageError) throw storageError
  const { error } = await supabase.from('client_documents').delete().eq('id', document.id)
  if (error) throw error
}
