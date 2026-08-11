// Client-side mirrors of lib/compensationHelpers.js's pure math — kept
// separate because the server helper also imports Mongoose models
// (CompensationProposal/CompensationApproval) that have no place in a
// client bundle. The server always recomputes and is the source of truth;
// this is purely for live feedback as HR types.
export function computeTotalCtc(fields) {
  const { fixedPay = 0, variablePay = 0, performanceBonus = 0, joiningBonus = 0, retentionBonus = 0, allowances = 0, benefits = 0 } = fields
  const sum = [fixedPay, variablePay, performanceBonus, joiningBonus, retentionBonus, allowances, benefits]
    .reduce((total, n) => total + (Number(n) || 0), 0)
  return Math.round(sum * 100) / 100
}

export function computeIncreaseAnalysis(currentCtc, expectedCtc, proposedCtc) {
  const increasePercent = currentCtc ? Math.round(((proposedCtc - currentCtc) / currentCtc) * 1000) / 10 : null
  const expectedDelta = expectedCtc != null ? Math.round((proposedCtc - expectedCtc) * 100) / 100 : null
  const expectedDeltaPercent = expectedCtc ? Math.round(((proposedCtc - expectedCtc) / expectedCtc) * 1000) / 10 : null
  return { increasePercent, expectedDelta, expectedDeltaPercent }
}

export function computeBudgetFit(totalCtc, budgetMin, budgetMax) {
  if (budgetMax == null) return { withinBudget: true, variance: 0, variancePercent: 0 }
  if (totalCtc <= budgetMax) return { withinBudget: true, variance: 0, variancePercent: 0 }
  const variance = Math.round((totalCtc - budgetMax) * 100) / 100
  const variancePercent = Math.round((variance / budgetMax) * 1000) / 10
  return { withinBudget: false, variance, variancePercent }
}
