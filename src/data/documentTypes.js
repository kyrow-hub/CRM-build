export const DOCUMENT_TYPES = [
  'Consent Form',
  'Privacy Consent',
  'Media Consent',
  'Transport Consent',
  'Camp Consent',
  'Medical Information',
  'Referral Document',
  'Other',
]

// Always required for every client, regardless of circumstances. Camp
// Consent is required conditionally (only if the client has attended an
// overnight camp) rather than listed here - see complianceService.js.
// Transport Consent has no supporting data source yet (nothing in the app
// records whether transport was actually provided), so it isn't enforced.
export const CORE_MANDATORY_DOCUMENT_TYPES = [
  'Consent Form',
  'Privacy Consent',
  'Media Consent',
  'Medical Information',
  'Referral Document',
]
