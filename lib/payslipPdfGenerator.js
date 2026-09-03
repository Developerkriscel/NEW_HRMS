import PDFDocument from 'pdfkit'

function formatCurrency(amount) {
  if (!amount) amount = 0
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount)
  return 'Rs. ' + formatted
}

export function generatePayslipPdfBuffer(payslip, tenant) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const monthName = monthNames[payslip.month - 1]
    const year = payslip.year

    const emp = payslip.employee || {}
    const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
    const empCode = emp.employeeCode || 'N/A'
    
    // Header
    doc.font('Helvetica-Bold').fontSize(20).text(tenant?.companyName || tenant?.name || 'NexaHR Company', { align: 'center' })
    doc.moveDown(0.5)
    doc.font('Helvetica').fontSize(12).fillColor('#666666').text(`Payslip for the month of ${monthName} ${year}`, { align: 'center' })
    doc.fillColor('#000000')
    doc.moveDown(2)

    // Employee Details Table-like layout
    doc.font('Helvetica-Bold').fontSize(10).text('Employee Details')
    doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).stroke('#dddddd')
    doc.moveDown(1)
    
    const startY = doc.y
    doc.font('Helvetica-Bold').text('Employee Name:', 50, startY)
    doc.font('Helvetica').text(empName, 150, startY)
    doc.font('Helvetica-Bold').text('Employee Code:', 300, startY)
    doc.font('Helvetica').text(empCode, 400, startY)
    
    doc.font('Helvetica-Bold').text('Working Days:', 50, startY + 20)
    doc.font('Helvetica').text(payslip.workingDays || 0, 150, startY + 20)
    doc.font('Helvetica-Bold').text('Present Days:', 300, startY + 20)
    doc.font('Helvetica').text(payslip.presentDays || 0, 400, startY + 20)

    doc.moveDown(3)

    // Earnings and Deductions Table
    const tableTop = doc.y + 20

    doc.font('Helvetica-Bold').fontSize(10)
    doc.text('EARNINGS', 50, tableTop)
    doc.text('AMOUNT', 220, tableTop, { width: 70, align: 'right' })
    
    doc.text('DEDUCTIONS', 310, tableTop)
    doc.text('AMOUNT', 480, tableTop, { width: 65, align: 'right' })
    
    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke('#aaaaaa')

    doc.font('Helvetica').fontSize(10)
    
    let yE = tableTop + 25
    
    const drawRow = (labelE, valE, labelD, valD, y) => {
      if (labelE) doc.text(labelE, 50, y)
      if (valE !== undefined) doc.text(formatCurrency(valE), 220, y, { width: 70, align: 'right' })
      if (labelD) doc.text(labelD, 310, y)
      if (valD !== undefined) doc.text(formatCurrency(valD), 480, y, { width: 65, align: 'right' })
    }

    const earnings = [
      { label: 'Basic Salary', val: payslip.basicSalary },
      { label: 'HRA', val: payslip.hraAllowance },
      { label: 'Conveyance', val: payslip.conveyanceAllowance },
      { label: 'Medical', val: payslip.medicalAllowance },
      { label: 'Special Allowance', val: payslip.specialAllowance },
      { label: 'Bonus', val: payslip.bonus },
      { label: 'Overtime', val: payslip.overtimePay },
      { label: 'Incentives', val: payslip.incentive },
      { label: 'Arrears', val: payslip.arrears }
    ].filter(e => e.val > 0)

    const deductions = [
      { label: 'PF Deduction', val: payslip.pfDeduction },
      { label: 'ESI Deduction', val: payslip.esiDeduction },
      { label: 'TDS Deduction', val: payslip.tdsDeduction },
      { label: 'Professional Tax', val: payslip.professionalTax },
      { label: 'Loan Deduction', val: payslip.loanDeduction },
      { label: 'Leave Deduction', val: payslip.leaveDeduction },
      { label: 'Advance Deduction', val: payslip.advanceDeduction }
    ].filter(d => d.val > 0)

    const maxRows = Math.max(earnings.length, deductions.length)
    
    for (let i = 0; i < maxRows; i++) {
      const earn = earnings[i] || {}
      const ded = deductions[i] || {}
      drawRow(earn.label, earn.val, ded.label, ded.val, yE)
      yE += 20
    }

    doc.moveTo(50, yE).lineTo(545, yE).stroke('#aaaaaa')
    yE += 10

    doc.font('Helvetica-Bold')
    drawRow('Total Earnings', payslip.grossSalary, 'Total Deductions', payslip.totalDeductions, yE)
    
    yE += 25
    doc.moveTo(50, yE).lineTo(545, yE).stroke('#000000')
    yE += 10
    
    doc.fontSize(12).fillColor('#2e7d32')
    doc.text('NET PAY:', 310, yE)
    doc.text(formatCurrency(payslip.netSalary), 450, yE, { width: 95, align: 'right' })

    doc.fillColor('#000000').fontSize(9)
    doc.moveDown(4)
    doc.text('This is a system generated document and does not require a signature.', 50, doc.y, { align: 'center' })

    doc.end()
  })
}
