const currencyFormatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 })

const formatAmount = (amount, currency = 'NGN') => currency === 'NGN' ? currencyFormatter.format(amount) : `${new Intl.NumberFormat('en-NG').format(amount)} ${currency}`

export function formatFee(feeOption) {
  if (!feeOption) return 'Official amount not publicly located'
  switch (feeOption.pricingModel) {
    case 'fixed': return typeof feeOption.amount === 'number' ? formatAmount(feeOption.amount, feeOption.currency) : 'Official amount not publicly located'
    case 'free': return feeOption.amount === 0 ? 'FREE' : 'Official amount not publicly located'
    case 'range': return typeof feeOption.minAmount === 'number' && typeof feeOption.maxAmount === 'number' ? `${formatAmount(feeOption.minAmount, feeOption.currency)} – ${formatAmount(feeOption.maxAmount, feeOption.currency)}` : 'Official amount not publicly located'
    case 'percentage': return typeof feeOption.percentageRate === 'number' ? `${feeOption.percentageRate}%` : 'Official amount not publicly located'
    case 'formula': return feeOption.formulaDescription ? 'Calculated according to official formula' : 'Official amount not publicly located'
    case 'variable': return 'Variable — see conditions'
    case 'unknown':
    default: return 'Official amount not publicly located'
  }
}
