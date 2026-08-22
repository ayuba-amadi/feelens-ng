const currencyFormatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 })

const formatAmount = (amount, currency = 'NGN') => currency === 'NGN' ? currencyFormatter.format(amount) : `${new Intl.NumberFormat('en-NG').format(amount)} ${currency}`
const unavailableAmountLabel = (feeOption) => feeOption?.publicationStatus === 'published' && feeOption.verificationStatus === 'pending'
  ? 'Current amount not yet verified in FeeLens'
  : 'Official amount not publicly located'

export function formatFee(feeOption) {
  if (!feeOption) return unavailableAmountLabel(feeOption)
  switch (feeOption.pricingModel) {
    case 'fixed': return typeof feeOption.amount === 'number' ? formatAmount(feeOption.amount, feeOption.currency) : unavailableAmountLabel(feeOption)
    case 'free': return feeOption.amount === 0 ? 'FREE' : unavailableAmountLabel(feeOption)
    case 'range': return typeof feeOption.minAmount === 'number' && typeof feeOption.maxAmount === 'number' ? `${formatAmount(feeOption.minAmount, feeOption.currency)} – ${formatAmount(feeOption.maxAmount, feeOption.currency)}` : unavailableAmountLabel(feeOption)
    case 'percentage': return typeof feeOption.percentageRate === 'number' ? `${feeOption.percentageRate}%` : unavailableAmountLabel(feeOption)
    case 'formula': return feeOption.formulaDescription ? 'Calculated according to official formula' : unavailableAmountLabel(feeOption)
    case 'variable': return 'Variable — see conditions'
    case 'unknown':
    default: return unavailableAmountLabel(feeOption)
  }
}
