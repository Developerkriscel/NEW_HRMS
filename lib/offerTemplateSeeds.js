// Step 13 item 5 — starter Offer Letter Templates. This is the ONLY place
// offer legal/boilerplate wording lives in this codebase ("avoid building
// legal text directly into code") — everything here is fully editable by
// HR afterward via the Offer Templates screen; these are just sensible
// defaults so day one isn't a blank page. `## Heading` lines are rendered
// as section headings by lib/offerPdfGenerator.js and the on-screen preview.
const STANDARD_CLOSING = `## Confidentiality
During and after your employment, you must keep confidential all proprietary, technical and business information belonging to {{company_name}} and its clients, and must not disclose it to any third party without prior written consent.

## Background Verification
This offer is contingent upon satisfactory completion of a background verification check, including employment history, education credentials, and any other checks {{company_name}} deems necessary. {{company_name}} reserves the right to withdraw this offer, or terminate employment if already commenced, should any discrepancy be found.

## Document Verification
You are required to submit original documents (education certificates, prior employment records, government-issued identification) for verification on or before your joining date. Employment is subject to satisfactory verification of these documents.

## Other Terms
This offer letter, along with the company's policies as amended from time to time, constitutes the full understanding between you and {{company_name}} regarding the terms of your employment. Any changes to this offer must be agreed in writing by both parties.`

export const DEFAULT_OFFER_TEMPLATES = [
  {
    name: 'Full-Time Employee',
    category: 'Full-Time Employee',
    description: 'Standard offer letter for a permanent, full-time position.',
    content: `Dear {{candidate_name}},

We are pleased to offer you the position of {{designation}} in the {{department}} department at {{company_name}}. We were impressed by your background and are confident you will be a valuable addition to our team.

## Employment Details
Designation: {{designation}}
Department: {{department}}
Employment Type: {{employment_type}}
Reporting Manager: {{reporting_manager}}
Work Location: {{location}}
Work Mode: {{work_mode}}

## Compensation Summary
Your Annual Cost to Company (CTC) will be {{annual_ctc}}, payable as per the company's standard salary structure and payroll cycle.

## Joining Date
Your date of joining will be {{joining_date}}. Please confirm your availability to join on this date at your earliest convenience.

## Probation Terms
You will be on probation for a period of {{probation_period}} from your date of joining, during which your performance and conduct will be reviewed.

## Notice Terms
Either party may terminate this employment by providing {{notice_period}} written notice, or pay in lieu of notice as per company policy, after successful completion of probation.

## Work Location
Your primary work location will be {{location}}. You may be required to travel or relocate as per business requirements, with prior notice.

## Working Hours
Standard working hours are as defined by company policy, currently in effect at {{location}}.

${STANDARD_CLOSING}

## Offer Validity
This offer is valid until {{offer_expiry}}. Please confirm your acceptance before this date, failing which this offer shall stand withdrawn.

We look forward to welcoming you to {{company_name}}.

Warm regards,
HR Team, {{company_name}}`,
  },
  {
    name: 'Intern',
    category: 'Intern',
    description: 'Offer letter for a fixed-term internship.',
    content: `Dear {{candidate_name}},

We are pleased to offer you an internship position as {{designation}} in the {{department}} department at {{company_name}}.

## Employment Details
Designation: {{designation}} (Intern)
Department: {{department}}
Employment Type: Internship
Reporting Manager: {{reporting_manager}}
Work Location: {{location}}
Work Mode: {{work_mode}}

## Compensation Summary
You will receive a stipend as part of this internship, equivalent to an annualized value of {{annual_ctc}}, disbursed monthly as per company policy.

## Joining Date
Your internship will commence on {{joining_date}}.

## Probation Terms
As an internship, this engagement is not subject to a separate probation period; performance will be reviewed periodically throughout the internship.

## Notice Terms
Either party may end this internship with {{notice_period}} written notice.

## Work Location
Your work location will be {{location}}.

## Working Hours
Working hours will be as defined by company policy and your team's schedule.

${STANDARD_CLOSING}

## Offer Validity
This offer is valid until {{offer_expiry}}.

We look forward to having you with us.

Warm regards,
HR Team, {{company_name}}`,
  },
  {
    name: 'Contract Employee',
    category: 'Contract Employee',
    description: 'Offer letter for a fixed-term contract engagement.',
    content: `Dear {{candidate_name}},

We are pleased to offer you a contract position as {{designation}} in the {{department}} department at {{company_name}}.

## Employment Details
Designation: {{designation}}
Department: {{department}}
Employment Type: Contract
Reporting Manager: {{reporting_manager}}
Work Location: {{location}}
Work Mode: {{work_mode}}

## Compensation Summary
Your contract compensation will be {{annual_ctc}} on an annualized basis, payable as per the agreed billing/payroll cycle for the duration of this contract.

## Joining Date
This engagement will commence on {{joining_date}}.

## Probation Terms
This is a fixed-term contract engagement and is not subject to a probation period.

## Notice Terms
Either party may terminate this contract with {{notice_period}} written notice, subject to the terms of the contract agreement.

## Work Location
Your work location will be {{location}}.

## Working Hours
Working hours will be as defined by company policy and the specific contract terms.

${STANDARD_CLOSING}

## Offer Validity
This offer is valid until {{offer_expiry}}.

Warm regards,
HR Team, {{company_name}}`,
  },
  {
    name: 'Senior Management',
    category: 'Senior Management',
    description: 'Offer letter for senior/leadership positions.',
    content: `Dear {{candidate_name}},

On behalf of {{company_name}}, it is my pleasure to extend this offer for the position of {{designation}}, leading the {{department}} function.

## Employment Details
Designation: {{designation}}
Department: {{department}}
Employment Type: {{employment_type}}
Reporting Manager: {{reporting_manager}}
Work Location: {{location}}
Work Mode: {{work_mode}}

## Compensation Summary
Your total Annual Cost to Company (CTC) will be {{annual_ctc}}, structured as per the senior management compensation framework, payable per the company's standard payroll cycle.

## Joining Date
We propose {{joining_date}} as your date of joining, and welcome a discussion if an alternate date better suits a smooth transition from your current role.

## Probation Terms
You will be on probation for {{probation_period}} from your date of joining.

## Notice Terms
Either party may terminate this employment with {{notice_period}} written notice, or pay in lieu thereof, in line with company policy for senior management roles.

## Work Location
Your primary work location will be {{location}}.

## Working Hours
Given the nature of this role, working hours are expected to align with business needs beyond standard company hours.

${STANDARD_CLOSING}

## Offer Validity
This offer is valid until {{offer_expiry}}.

We are excited about the impact you will have at {{company_name}} and look forward to your acceptance.

Warm regards,
HR Team, {{company_name}}`,
  },
  {
    name: 'Remote Employee',
    category: 'Remote Employee',
    description: 'Offer letter for a fully remote position.',
    content: `Dear {{candidate_name}},

We are pleased to offer you the position of {{designation}} in the {{department}} department at {{company_name}}, working in a fully remote capacity.

## Employment Details
Designation: {{designation}}
Department: {{department}}
Employment Type: {{employment_type}}
Reporting Manager: {{reporting_manager}}
Work Mode: Remote
Base Location (for records): {{location}}

## Compensation Summary
Your Annual Cost to Company (CTC) will be {{annual_ctc}}, payable as per the company's standard payroll cycle.

## Joining Date
Your date of joining will be {{joining_date}}.

## Probation Terms
You will be on probation for {{probation_period}} from your date of joining.

## Notice Terms
Either party may terminate this employment with {{notice_period}} written notice, or pay in lieu of notice as per company policy.

## Work Location
This is a fully remote role. You are expected to maintain a stable internet connection and a suitable home working environment; occasional travel to company offices may be required with prior notice.

## Working Hours
You are expected to maintain overlapping working hours with your team as communicated by your reporting manager, in line with company policy.

${STANDARD_CLOSING}

## Offer Validity
This offer is valid until {{offer_expiry}}.

We look forward to welcoming you to {{company_name}}.

Warm regards,
HR Team, {{company_name}}`,
  },
]
