// Step 16 item 2 — starter Document Requirement Master, exactly the two
// example lists the spec gives. Fully editable/deletable per tenant from
// the Document Requirements screen afterward — nothing here is hard-coded
// into any route.
export const DEFAULT_DOCUMENT_REQUIREMENTS = [
  // Full-Time Employee
  { name: 'Identity Proof', category: 'Identity', employmentType: 'FULL_TIME', isRequired: true },
  { name: 'PAN', category: 'Statutory', employmentType: 'FULL_TIME', isRequired: true },
  { name: 'Address Proof', category: 'Identity', employmentType: 'FULL_TIME', isRequired: true },
  { name: 'Degree Certificate', category: 'Education', employmentType: 'FULL_TIME', isRequired: true },
  { name: 'Experience Letter', category: 'Employment', employmentType: 'FULL_TIME', isRequired: false },
  { name: 'Relieving Letter', category: 'Employment', employmentType: 'FULL_TIME', isRequired: true },
  { name: 'Previous Payslip', category: 'Employment', employmentType: 'FULL_TIME', isRequired: false },
  { name: 'Photograph', category: 'Other', employmentType: 'FULL_TIME', isRequired: true, requiresVerification: false },
  { name: 'Cancelled Cheque', category: 'Bank', employmentType: 'FULL_TIME', isRequired: true },

  // Intern
  { name: 'Identity Proof', category: 'Identity', employmentType: 'INTERNSHIP', isRequired: true },
  { name: 'College ID', category: 'Education', employmentType: 'INTERNSHIP', isRequired: true },
  { name: 'Resume', category: 'Other', employmentType: 'INTERNSHIP', isRequired: true, requiresVerification: false },
  { name: 'Photograph', category: 'Other', employmentType: 'INTERNSHIP', isRequired: true, requiresVerification: false },
]
