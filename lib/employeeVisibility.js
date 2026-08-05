// Fields a MANAGER must never see on a direct report, per the Manager Panel
// spec: bank details, full salary, personal documents, government IDs.
// There is no granular per-manager permission-grant mechanism in this app
// (RBAC is role-array only, see lib/auth.js#requireRole) — this is a hard
// block, always, for the MANAGER role.
const MANAGER_HIDDEN_FIELDS = [
  'bankName',
  'bankAccountNumber',
  'bankIfscCode',
  'accountHolderName',
  'bankBranch',
  'aadhaarNumber',
  'panNumber',
  'pfNumber',
  'uanNumber',
  'esiNumber',
  'ctc',
  'basicSalary',
  'password',
]

export function sanitizeForManager(employeeObj, role) {
  if (role !== 'MANAGER') return employeeObj
  const clone = { ...employeeObj }
  for (const field of MANAGER_HIDDEN_FIELDS) delete clone[field]
  return clone
}
