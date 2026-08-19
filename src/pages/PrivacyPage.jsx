import PageIntro from '../components/common/PageIntro'

function PrivacyPage() {
  return <><PageIntro eyebrow="Privacy" title="A simple MVP, plainly described" description="FeeLens currently provides a static information dataset and client-side browsing tools." /><div className="mx-auto max-w-3xl space-y-8 px-5 py-10 text-sm leading-7 text-slate-600 sm:px-8 lg:px-10"><section><h2 className="text-xl font-bold text-slate-950">Current MVP reality</h2><ul className="mt-4 list-disc space-y-2 pl-5"><li>No user accounts</li><li>No payment-card processing</li><li>No government payments</li><li>No government application submission</li><li>Static information dataset</li><li>Client-side search and filtering</li></ul></section><section><h2 className="text-xl font-bold text-slate-950">What this means</h2><p className="mt-3">FeeLens does not currently ask you to create an account or submit an application. No analytics or cookie collection claims are made here because those services are not part of the current MVP.</p></section></div></>
}

export default PrivacyPage
