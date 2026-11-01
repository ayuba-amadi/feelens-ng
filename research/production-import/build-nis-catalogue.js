const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const pdfPath = path.join(root, 'research/repo/nis_SERVICE-LEVEL-AGREEMENT-2026_.pdf');
const outputPath = path.join(__dirname, 'nis-service-catalogue.json');
const matrixPath = path.join(root, 'research/nis-service-evidence-matrix.md');
const reviewed = '2026-10-31';
const suppliedSha256 = 'f4436cca8d37085482096b458794cfa1647a7086313cfc030496fc6b2268f29e';

const sources = {
  'nis-sla-2026': {
    title: 'Nigeria Immigration Service — Service Level Agreement, Revised Edition, April 2026',
    sourceType: 'service_level_agreement',
    url: 'https://immigration.gov.ng/wp-content/uploads/2026/04/SERVICE-LEVEL-AGREEMENT-2026_.pdf',
    publicationDate: '2026-04-26',
    effectiveDate: null,
    lastChecked: reviewed,
    evidenceTier: 2,
    publisher: 'Nigeria Immigration Service',
    documentReference: '93-page supplied PDF; service list pp. 10–76; roles and service standards pp. 77–79; Appendix I pp. 83–89; Appendix II pp. 90–91; Appendix III pp. 92–93',
    notes: `Supplied filename: nis_SERVICE-LEVEL-AGREEMENT-2026_.pdf. Supplied-file SHA-256: ${suppliedSha256}. The cover says Revised Edition, April 2026 and the foreword is dated 26 April 2026. The version history calls April 2026 the Third Edition but describes it as the Second Edition, 2026. No effective date is stated. The official URL is indexed and readable through the official NIS site, but local binary download/checksum comparison was unavailable because the host could not be resolved from this environment.`,
  },
  'nis-official-site': {
    title: 'Nigeria Immigration Service official website', sourceType: 'official_website', url: 'https://immigration.gov.ng/', publicationDate: null, effectiveDate: null, lastChecked: reviewed, evidenceTier: 2, publisher: 'Nigeria Immigration Service', documentReference: 'Official NIS navigation and contact links', notes: 'Official NIS site used to validate ownership of the linked passport, visa, e-Visa, CERPAC and complaint channels.'
  },
  'nis-passports': {
    title: 'Passports — Nigeria Immigration Service', sourceType: 'official_process_page', url: 'https://immigration.gov.ng/passports/', publicationDate: null, effectiveDate: null, lastChecked: reviewed, evidenceTier: 2, publisher: 'Nigeria Immigration Service', documentReference: 'Passport types, eligibility, requirements, online application and biometric attendance', notes: 'Current official passport guidance. It lists normal passport variants including 32-page/5-year, 64-page/5-year and 64-page/10-year, but does not publish a fee for the 64-page/5-year variant.'
  },
  'nis-passport-portal': {
    title: 'Nigerian Immigration Services — Passport application portal', sourceType: 'official_portal', url: 'https://passport.immigration.gov.ng/', publicationDate: null, effectiveDate: null, lastChecked: reviewed, evidenceTier: 2, publisher: 'Nigeria Immigration Service', documentReference: 'Fresh passport, renewal/re-issue, correction, appointment and application status portal', notes: 'Destination linked by the current official NIS passport page. The SLA text contains the older/malformed www.passport.gov.ng spelling; FeeLens uses the validated immigration.gov.ng portal.'
  },
  'nis-passport-fee-notice': {
    title: 'NIS upward review of Nigerian standard passport fees', sourceType: 'official_notice', url: 'https://immigration.gov.ng/nigeria-immigration-service-announces-upward-review-of-nigerian-standard-passport-fees/', publicationDate: null, effectiveDate: '2025-09-01', lastChecked: reviewed, evidenceTier: 2, publisher: 'Nigeria Immigration Service', documentReference: 'Domestic standard passport fee thresholds', notes: 'Official notice states that domestic 32-page/5-year fees became ₦100,000 and 64-page/10-year fees became ₦200,000 from 1 September 2025; diaspora values remained US$150 and US$230.'
  },
  'nis-visa-classes': {
    title: 'Nigeria Visas — Nigeria Immigration Service', sourceType: 'official_process_page', url: 'https://immigration.gov.ng/nigerian-visa/', publicationDate: null, effectiveDate: null, lastChecked: reviewed, evidenceTier: 2, publisher: 'Nigeria Immigration Service', documentReference: 'Short-stay, e-Visa, temporary residence and permanent residence classes', notes: 'Current official service-class and eligibility guidance. It confirms the official e-Visa and regular visa portal links but does not publish a complete fee table outside the SLA appendix.'
  },
  'nis-visa-portal': {
    title: 'Nigerian Immigration Services — Visa portal', sourceType: 'official_portal', url: 'https://visa.immigration.gov.ng/', publicationDate: null, effectiveDate: null, lastChecked: reviewed, evidenceTier: 2, publisher: 'Nigeria Immigration Service', documentReference: 'Regular visa application portal', notes: 'Validated by the current official NIS visa page.'
  },
  'nis-evisa-portal': {
    title: 'Nigerian Immigration Services — e-Visa portal', sourceType: 'official_portal', url: 'https://evisa.immigration.gov.ng/', publicationDate: null, effectiveDate: null, lastChecked: reviewed, evidenceTier: 2, publisher: 'Nigeria Immigration Service', documentReference: 'Short-stay e-Visa application portal', notes: 'Validated by the current official NIS visa page and knowledge base. The SLA contains a malformed www.evisa@immigration.gov.ng string; FeeLens uses the validated evisa.immigration.gov.ng destination.'
  },
  'nis-cerpac-page': {
    title: 'Combined Expatriate Residence Permit and Aliens Card (CERPAC)', sourceType: 'official_process_page', url: 'https://immigration.gov.ng/combined-expatriate-residence-permit-and-aliens-card-cerpac/', publicationDate: null, effectiveDate: null, lastChecked: reviewed, evidenceTier: 2, publisher: 'Nigeria Immigration Service', documentReference: 'CERPAC purpose, eligibility, documents, payment and biometric process', notes: 'Current official CERPAC page states online application, document upload, payment, designated-office biometrics, and example amounts of USD 2,000 for employed foreigners, USD 600 for students and gratis for foreigners married to Nigerian citizens. These are CERPAC page claims and are not silently substituted for the SLA nationality-based visa tables.'
  },
  'nis-cerpac-portal': {
    title: 'Nigerian Immigration e-CERPAC', sourceType: 'official_portal', url: 'https://cerpac.immigration.gov.ng/', publicationDate: null, effectiveDate: null, lastChecked: reviewed, evidenceTier: 2, publisher: 'Nigeria Immigration Service', documentReference: 'e-CERPAC registration, application and payment portal', notes: 'Official NIS subdomain. The rendered portal was reachable through web inspection but exposes an application interface; FeeLens does not collect applicant data or credentials.'
  },
  'nis-contact': {
    title: 'Contact Us — Nigeria Immigration Service', sourceType: 'official_process_page', url: 'https://immigration.gov.ng/contact/', publicationDate: null, effectiveDate: null, lastChecked: reviewed, evidenceTier: 2, publisher: 'Nigeria Immigration Service', documentReference: 'Passport, visa, CERPAC and complaint contacts', notes: 'Current official contact page used for complaint and escalation links. The SLA lists the same NIS Servicom and reform-champion contacts, with a 72-hour complaint resolution target unless the complainant is informed otherwise.'
  },
  'nis-knowledge-base': {
    title: 'Knowledge Base — Nigeria Immigration Service', sourceType: 'official_faq', url: 'https://immigration.gov.ng/knowledge-base/', publicationDate: null, effectiveDate: null, lastChecked: reviewed, evidenceTier: 2, publisher: 'Nigeria Immigration Service', documentReference: 'e-Visa payment, eligibility, documents and portal-safety guidance', notes: 'Current official guidance confirms online account, document upload, payment and email confirmation for e-Visa, while noting that exact requirements and fees vary by category and portal/country.'
  },
};

const page = (printed) => `Printed p. ${printed}; PDF p. ${printed}`;
const sourceEvidence = (sourceKeys, sourcePage, evidenceNote) => ({ sourceKeys, page: sourcePage, evidenceNote });
const fee = (label, pricingModel, currency, amount, sourceKeys, sourcePage, evidenceNote, extra = {}) => ({ label, pricingModel, currency, amount, verificationStatus: extra.verificationStatus || 'verified', sourceKeys, page: sourcePage, evidenceNote, conditions: extra.conditions || null, notes: extra.notes || null, minimumAmount: extra.minimumAmount ?? null, maximumAmount: extra.maximumAmount ?? null, formula: extra.formula || null });

const passportReq = ['NIN slip or Nigerian identity evidence as specified by NIS.', 'Birth certificate or declaration of age from a High Court.', 'Local Government or State of Origin/Indigene Certificate where required.', 'ICAO-compliant passport photograph.'];
const passportSteps = ['Complete the application online, upload the required documents, pay through the official portal and book an appointment.', 'Submit the payment and appointment slips in person at the selected passport office.', 'Attend photograph and biometric data capture; diaspora applicants use the nearest Nigerian Embassy, High Commission or Consulate.'];
const visaReq = ['Valid passport with at least six months validity and any blank-page requirement stated for the class.', 'Recent passport photograph, return/onward ticket, accommodation or host evidence and proof of funds where the class requires them.', 'Category-specific invitation, admission, employment, investment, MOU, clearance or relationship documents stated by NIS.'];
const visaSteps = ['Use the official e-Visa or regular visa channel named for the class.', 'Upload the required documents and pay the applicable official fee.', 'Complete any required interview, biometric enrolment or embassy/consulate attendance before issuance.'];
const residenceReq = ['Valid passport with at least six months validity and recent passport photograph.', 'Class-specific quota, employment, admission, relationship, investment, retirement, MOU or authority documents stated by NIS.', 'Supporting application by the employer, institution, sponsor or responsible organisation where the class requires Immigration Responsibility.'];
const residenceSteps = ['Obtain the required approval, quota, invitation or sponsoring documents.', 'Apply through the official NIS visa/CERPAC channel or Nigerian mission named for the class.', 'Attend interview and biometric capture where required, then complete residence or work-permit regularisation.'];

function scheduleOption(schedule, label, pageRef, note) {
  return fee(label, 'variable', 'USD', null, ['nis-sla-2026'], pageRef, note, {
    conditions: `Amount varies by nationality and the ${schedule} class. Use the NIS Appendix I or Appendix II schedule; FeeLens does not collapse the country rows into one amount.`,
    notes: 'The SLA service row points to the visa-fee appendix rather than printing one universal amount.',
  });
}

function classService(slug, name, category, audience, sourcePage, schedule, options = {}) {
  const feeOption = options.noFee
    ? fee('SLA prints N/A for this service', 'unknown', 'USD', null, ['nis-sla-2026'], sourcePage, options.note, { verificationStatus: 'pending', conditions: 'The SLA prints N/A; this is not treated as free.' })
    : scheduleOption(schedule, options.feeLabel || `Fee varies by nationality — ${schedule}`, 'Printed pp. 83–89; PDF pp. 83–89', options.note || `The SLA lists ${name} and directs applicants to the ${schedule} fee schedule.`);
  return {
    slug, name, category, jurisdiction: options.jurisdiction || 'Nigeria and applicants abroad where stated',
    description: options.description || `${name}. Eligibility, documents and restrictions are stated in the NIS April 2026 SLA.`,
    requirements: options.requirements || (category === 'Passport' ? passportReq : category.includes('Visa') || category.includes('Residence') ? (category.includes('Residence') ? residenceReq : visaReq) : []),
    processSteps: options.processSteps || (category === 'Passport' ? passportSteps : category.includes('Residence') ? residenceSteps : visaSteps),
    notes: options.notes || `The SLA states a ${options.timeline || 'category-specific'} service standard. It is an agency target, not a guaranteed completion time.`,
    officialActionUrl: options.officialActionUrl === undefined ? (category === 'Short visit e-Visa' ? 'https://evisa.immigration.gov.ng/' : category === 'Passport' ? 'https://passport.immigration.gov.ng/' : category.includes('CERPAC') ? 'https://cerpac.immigration.gov.ng/' : 'https://visa.immigration.gov.ng/') : options.officialActionUrl,
    officialChannelType: options.officialChannelType || 'portal',
    paymentGuide: options.paymentGuide || 'Use only the official NIS channel and confirm the applicable fee, bank charge and appointment requirements before payment.',
    feeOptions: options.feeOptions || [feeOption],
  };
}

const services = [];
services.push({
  slug: 'standard-passport-32-pages-5-years', name: 'Standard passport — 32 pages / 5 years', category: 'Passport', jurisdiction: 'Nigeria and diaspora',
  description: 'Standard Nigerian passport option for fresh, renewal/reissue and applicable correction workflows.', requirements: passportReq, processSteps: passportSteps,
  notes: 'Fresh/change-data timeline is 42 days after successful enrolment; renewal/reissue is 21 days after successful enrolment. Prices exclude bank charges.', officialActionUrl: 'https://passport.immigration.gov.ng/', officialChannelType: 'portal', paymentGuide: 'Apply through the official passport portal, select the 32-page/5-year option and confirm whether the application is domestic or diaspora before payment.',
  feeOptions: [
    fee('Domestic application — fresh or renewal/reissue', 'fixed', 'NGN', 100000, ['nis-sla-2026', 'nis-passport-fee-notice', 'nis-passports'], page(10), 'The SLA states 32 pages/5-year validity at N100,000; the official 2025 notice states the same domestic amount effective 1 September 2025.', { conditions: 'Domestic application; bank charges excluded.' }),
    fee('Diaspora application — fresh or renewal/reissue', 'fixed', 'USD', 150, ['nis-sla-2026', 'nis-passport-fee-notice'], page(10), 'The SLA states 32 pages/5-year validity at $150; the official 2025 notice says diaspora fees remained $150.', { conditions: 'Diaspora application; bank charges excluded.' }),
  ],
});
services.push({
  slug: 'standard-passport-64-pages-10-years', name: 'Standard passport — 64 pages / 10 years', category: 'Passport', jurisdiction: 'Nigeria and diaspora',
  description: 'Standard Nigerian ten-year passport option for fresh, renewal/reissue and applicable correction workflows.', requirements: passportReq, processSteps: passportSteps,
  notes: 'Fresh/change-data timeline is 42 days after successful enrolment; renewal/reissue is 21 days after successful enrolment. Prices exclude bank charges.', officialActionUrl: 'https://passport.immigration.gov.ng/', officialChannelType: 'portal', paymentGuide: 'Apply through the official passport portal, select the 64-page/10-year option and confirm whether the application is domestic or diaspora before payment.',
  feeOptions: [
    fee('Domestic application — fresh or renewal/reissue', 'fixed', 'NGN', 200000, ['nis-sla-2026', 'nis-passport-fee-notice', 'nis-passports'], page(10), 'The SLA states 64 pages/10-year validity at N200,000; the official 2025 notice states the same domestic amount effective 1 September 2025.', { conditions: 'Domestic application; bank charges excluded.' }),
    fee('Diaspora application — fresh or renewal/reissue', 'fixed', 'USD', 230, ['nis-sla-2026', 'nis-passport-fee-notice'], page(10), 'The SLA states 64 pages/10-year validity at $230; the official 2025 notice says diaspora fees remained $230.', { conditions: 'Diaspora application; bank charges excluded.' }),
  ],
});
services.push(classService('standard-passport-64-pages-5-years', 'Standard passport — 64 pages / 5 years', 'Passport', 'Eligible Nigerian passport applicants', 'Official page; no PDF page', null, {
  description: 'A 64-page/5-year normal passport variant listed on the current NIS passport page, but not priced in the April 2026 SLA or located in the current fee notice.',
  requirements: passportReq, processSteps: passportSteps, officialActionUrl: 'https://passport.immigration.gov.ng/', officialChannelType: 'portal',
  noFee: true, note: 'The current official passport page lists this variant, but the supplied SLA lists 32-page/5-year and 64-page/10-year fees only. No fee is inferred.',
}));
services.push(classService('passport-correction-of-data', 'Passport correction of data', 'Passport', 'Nigerian passport holders requesting correction or change of data', page(12), null, {
  description: 'Correction of marital-status data, errors and other name changes in a current passport.',
  requirements: ['Birth certificate or declaration of age, State of Origin certificate, application letter, marriage certificate where applicable, newspaper publication, court affidavit and passport datapage as required by the correction.', 'Current passport booklet for the appointment.'],
  processSteps: ['Complete the passport application online and pay the non-refundable administrative charge.', 'Upload the documents required for the specific correction.', 'Book an appointment and attend in person with the payment and appointment slips and current passport booklet.'],
  notes: 'The SLA states a ₦30,000 correction-of-data administrative charge and says prices exclude bank charges.',
  feeOptions: [fee('Correction-of-data administrative charge', 'fixed', 'NGN', 30000, ['nis-sla-2026', 'nis-passports'], page(10), 'The SLA lists correction-of-data administrative charges at ₦30,000; the official passport page confirms a non-refundable administrative charge but does not state a different amount.', { conditions: 'Bank charges excluded; applicable correction scope must be confirmed in the portal.' })],
}));
services.push(classService('official-passport', 'Official passport', 'Passport', 'Eligible Nigerian government and public-office applicants', page(16), null, {
  description: 'Official passport for eligible government and public-office holders listed by NIS.', timeline: '7 days after successful enrolment',
  requirements: ['Letter of introduction from the applicant’s organisation.', 'Two passport photographs, promotion or appointment letter, birth certificate or declaration of age, valid official identity card, and INEC/SIEC certificate of return or appointment letter where applicable.'],
  processSteps: ['Apply online through the passport portal.', 'Choose a processing centre and book a data-enrolment appointment.', 'Appear for data enrolment at the selected processing centre.'],
  notes: 'SLA timeline: 7 days after successful enrolment.', feeOptions: [fee('Official passport service', 'fixed', 'NGN', 40000, ['nis-sla-2026'], page(16), 'The SLA lists the Official Passport fee as ₦40,000.', { conditions: 'Bank-charge treatment is not stated in this service row.' })],
}));
services.push(classService('diplomatic-passport', 'Diplomatic passport', 'Passport', 'Nigerian diplomats and approved top government officials', page(17), null, {
  description: 'Diplomatic passport requests for eligible diplomats and approved officials.', timeline: '7 days after successful enrolment', officialActionUrl: null, officialChannelType: 'website',
  requirements: ['Letter of introduction from the organisation, two passport photographs, promotion or appointment letter where applicable, birth certificate or declaration of age, valid official identity card, and INEC/SIEC certificate of return or Presidential letter where applicable.'],
  processSteps: ['Submit requests to the office of the Comptroller General of Immigration at NIS Headquarters, Abuja.', 'Follow the official NIS instructions for enrolment and issuance.'],
  notes: 'The SLA lists the fee as Gratis and states that no person shall hold two valid passports of the same type concurrently.', feeOptions: [fee('Diplomatic passport', 'free', 'NGN', null, ['nis-sla-2026'], page(17), 'The SLA lists Diplomatic Passport as Gratis.', { conditions: 'Eligibility and request route are restricted to the stated diplomatic/official applicants.' })],
}));
services.push(classService('ecowas-national-biometric-identity-card', 'ECOWAS National Biometric Identity Card (ENBIC)', 'Other identity and border services', 'Nigerian applicants, including minors with parent consent documents', page(18), null, {
  description: 'ECOWAS National Biometric Identity Card application, change of data and enrolment.', timeline: '14 days after successful enrolment', officialActionUrl: null, officialChannelType: 'website',
  requirements: ['NIN, passport datapage where applicable, birth certificate, indigene certificate and passport photograph.', 'Minors also provide consent and identification documents for both parents.'],
  processSteps: ['Create an account at the ENBIC destination named by the SLA.', 'Verify NIN, complete biodata, upload documents and submit.', 'Use the emailed payment link, complete vetting/clearance, then attend enrolment before personalisation and issuance.'],
  notes: 'The SLA destination www.enbic.immigration.gov.ng was not independently reachable in this review, so FeeLens does not present it as a validated apply button. Amounts include stated bank-charge totals.', feeOptions: [
    fee('Fresh application — stated service fee', 'fixed', 'NGN', 33000, ['nis-sla-2026'], page(18), 'The SLA states Fresh Application N33,000 and a total of N33,500 inclusive of bank charges.', { conditions: 'The separate N33,500 total inclusive of bank charges is recorded below; do not treat it as the government fee alone.' }),
    fee('Fresh application — total inclusive of bank charges', 'fixed', 'NGN', 33500, ['nis-sla-2026'], page(18), 'The SLA states a total of N33,500 inclusive of bank charges.', { conditions: 'Total shown by SLA; includes bank charges.' }),
    fee('Change of data — stated service fee', 'fixed', 'NGN', 15000, ['nis-sla-2026'], page(18), 'The SLA states Change Of Data N15000 and a total of N17,500 inclusive of bank charges.', { conditions: 'The separate N17,500 total inclusive of bank charges is recorded below.' }),
    fee('Change of data — total inclusive of bank charges', 'fixed', 'NGN', 17500, ['nis-sla-2026'], page(18), 'The SLA states a total of N17,500 inclusive of bank charges.', { conditions: 'Total shown by SLA; includes bank charges.' }),
  ],
}));
services.push(classService('contactless-biometric-passport-diaspora', 'Contactless biometric passport service', 'Passport', 'Nigerians in the diaspora', page(20), null, {
  description: 'Contactless biometric service for Nigerians in the diaspora using the NIS mobile application and embassy processing.', jurisdiction: 'Nigerians in diaspora',
  requirements: ['NIN slip, birth certificate or declaration of age, Local Government/Indigene certificate, ICAO-compliant passport photograph and current passport.'],
  processSteps: ['Download the NIS mobile application from the Google Play Store or iOS App Store and create a profile.', 'Complete the online form, post the payment receipt and current passport booklet to the nearest Nigerian Embassy in a self-addressed envelope.', 'Complete embassy processing and biometric requirements stated by NIS.'],
  notes: 'SLA timeline: 21 days after successful enrolment if no local objection. Prices exclude bank charges.', feeOptions: [
    fee('32 pages / 5 years — passport fee', 'fixed', 'USD', 130, ['nis-sla-2026'], page(20), 'The SLA lists 32 pages/5 years validity at $130 for the contactless biometric service.', { conditions: 'Diaspora only; bank charges excluded.' }),
    fee('32 pages / 5 years — contactless biometric service', 'fixed', 'USD', 100, ['nis-sla-2026'], page(20), 'The SLA lists the Contactless Biometric Service at $100 for the 32-page option.', { conditions: 'Diaspora only; bank charges excluded.' }),
    fee('64 pages / 10 years — passport fee', 'fixed', 'USD', 230, ['nis-sla-2026'], page(20), 'The SLA lists 64 pages/10 years validity at $230 for the contactless biometric service.', { conditions: 'Diaspora only; bank charges excluded.' }),
    fee('64 pages / 10 years — contactless biometric service', 'fixed', 'USD', 100, ['nis-sla-2026'], page(20), 'The SLA lists the Contactless Biometric Service at $100 for the 64-page option.', { conditions: 'Diaspora only; bank charges excluded.' }),
  ],
}));

const eVisa = [
  ['f3b-transit-visa', 'F3B — Transit Visa', 'Travellers transiting Nigeria to another destination for 1–7 days.', page(20), 'Single Entry', { note: 'SLA timeline: 48 hours if no local objection. Validity 1–7 days; no employment; group applications up to 10.' }],
  ['f4a-business-single-entry-visa', 'F4A — Business Visa (single entry)', 'Foreign visitors attending business meetings, conferences, seminars, negotiations, trade fairs or job interviews without employment.', page(21), 'Single Entry', { note: 'SLA timeline: 48 hours if no local objection. Validity 90 days; stay 30 days single entry; no employment.' }],
  ['f4b-business-multiple-entry-visa', 'F4B — Business Visa (multiple entry)', 'Foreign business visitors making repeated business trips without employment.', page(22), 'Multiple Entry', { note: 'SLA timeline: 48 hours if no local objection. Multiple-entry validity and stay are subject to the stated schedule and reciprocity conditions.' }],
  ['f5a-tourism-visa', 'F5A — Tourism Visa', 'Non-ECOWAS nationals visiting Nigeria for tourism, subject to visa-waiver and abolition agreements.', page(23), 'Single Entry', { note: 'SLA timeline: 48 hours if no local objection. Validity 90 days; stay 30 days single entry; no employment.' }],
  ['f6a-visiting-visa-single-entry', 'F6A — Visiting Visa (single entry)', 'Foreign nationals invited by Nigerian residents or citizens for social visits to family or friends.', page(24), 'Single Entry', { note: 'SLA timeline: 48 hours if no local objection. Validity 90 days; stay 30 days single entry; no employment.' }],
  ['f7e-sport-visa', 'F7E — Sport Visa', 'Athletes, officials and authorised support teams attending or participating in sports activities.', page(25), 'Single Entry', { note: 'SLA timeline: 48 hours if no local objection. Stay 30 days single entry; no employment beyond sporting activity.' }],
  ['f7f-creative-arts-visa', 'F7F — Creative Arts Visa', 'Performers, artists, entertainers and musicians visiting for artistic or musical performance.', page(27), 'Single Entry', { note: 'SLA timeline: 48 hours if no local objection. Stay 30 days single entry; no other employment.' }],
  ['f7g-study-tour-visa', 'F7G — Study Tour Visa', 'Students, scholars and course participants attending approved short-term study tours.', page(28), 'Single Entry', { note: 'SLA timeline: 48 hours if no local objection. Stay 30 days single entry; no employment.' }],
  ['f7h-academic-exchange-programme-visa', 'F7H — Academic Exchange Programme Visa', 'Students, lecturers and researchers participating under approved institutional agreements or MOUs.', page(29), 'Single Entry', { note: 'SLA timeline: 48 hours if no local objection. Stay 30 days single entry; no employment.' }],
  ['f7i-international-cultural-exchange-visa', 'F7I — International Cultural Exchange Visa', 'Citizens of countries with recognised cultural-exchange agreements under an official MOU with Nigeria.', page(29), 'Single Entry', { note: 'SLA timeline: 48 hours if no local objection. Stay up to 30 days single entry; no employment.' }],
  ['f7k-emergency-relief-work-visa', 'F7K — Emergency/Relief Work Visa', 'Individuals providing emergency or relief assistance under a government agency or recognised NGO.', page(30), 'Single Entry', { note: 'SLA timeline: 48 hours if no local objection. Stay 30 days single entry; extension only where applicable and no unrelated employment.' }],
  ['f9a-returning-nigerian-by-birth-foreign-passport', 'F9A — Returning holder of foreign passport who is Nigerian by birth', 'Nigerians by birth travelling on a foreign passport.', page(31), 'Single Entry', { note: 'SLA timeline: 48 hours if no local objection. Multiple-entry stay is subject to the stated class limits; no employment.' }],
  ['f9b-returning-nigerian-minor-foreign-passport', 'F9B — Returning minor Nigerian by birth on a foreign passport', 'Nigerian minors travelling on a foreign passport with Nigerian parents by birth.', page(32), 'Single Entry', { note: 'SLA timeline: 48 hours if no local objection. Family applications only; no employment.' }],
];
for (const [slug, name, description, sourcePage, schedule, opts] of eVisa) services.push(classService(slug, name, 'Short visit e-Visa', description, sourcePage, schedule, { description, officialActionUrl: 'https://evisa.immigration.gov.ng/', timeline: '48 hours after enrolment/no local objection', notes: opts.note }));

const embassyVisas = [
  ['f2a-diplomatic-non-accredited-visa', 'F2A — Diplomatic Visa (non-accredited)', 'Non-accredited diplomats or temporary diplomatic staff travelling for official duties.', page(34), 'Single Entry'],
  ['f3a-transit-without-visa', 'F3A — Transit Without Visa', 'Passengers remaining airside and transferring through a Nigerian airport within 48 hours.', page(34), 'Single Entry', { noFee: true, note: 'The SLA prints N/A for timeline and fee. This is a transit-without-visa condition, not a free visa.' }],
  ['f4c-frequently-travelled-business-executives-visa', 'F4C — Business Visa for Frequently Travelled Executives', 'Foreign executives with documented investment of at least USD 250,000 in Nigeria.', page(35), 'Multiple Entry'],
  ['f6b-visiting-visa-multiple-entry', 'F6B — Visiting Visa (multiple entry)', 'Nationals of countries offering reciprocal multiple-entry visit privileges to Nigerians.', page(36), 'Multiple Entry'],
  ['f7a-journalist-visa', 'F7A — Journalist Visa', 'Journalists and media practitioners on assignment in Nigeria.', page(37), 'Single Entry'],
  ['f7b-cleric-visa', 'F7B — Cleric Visa', 'Religious leaders formally invited by a recognised Nigerian religious organisation.', page(38), 'Single Entry'],
  ['f7c-medical-tourism-visa', 'F7C — Medical Tourism Visa', 'Patients and accompanying persons travelling to Nigeria for medical care.', page(39), 'Single Entry'],
  ['f7d-religious-tourism-visa', 'F7D — Religious Tourism Visa', 'Participants attending religious activities, programmes or pilgrimages.', page(40), 'Single Entry'],
  ['f7j-humanitarian-services-visa', 'F7J — Humanitarian Services Visa', 'Humanitarian staff working under an MOU or authorisation from the relevant Nigerian body.', page(41), 'Single Entry'],
  ['f7l-ingo-staff-visa', 'F7L — Staff of INGO Visa', 'Employees or volunteers of INGOs with a Nigerian-government MOU.', page(42), 'Single Entry'],
  ['f7m-ngo-staff-visa', 'F7M — Staff of NGO Visa', 'Employees or volunteers of Nigerian-based NGOs.', page(43), 'Single Entry'],
];
for (const [slug, name, description, sourcePage, schedule, opts = {}] of embassyVisas) services.push(classService(slug, name, 'Short visit embassy visa', description, sourcePage, schedule, { description, officialActionUrl: opts.noFee ? 'https://immigration.gov.ng/nigerian-visa/' : 'https://visa.immigration.gov.ng/', timeline: '10 days from enrolment/interview and biometric capture', noFee: opts.noFee, note: opts.note, notes: opts.note }));

const residence = [
  ['r10-temporary-work-permit-visa', 'R10 — Temporary Work Permit Visa', 'Experts invited by corporate bodies for specialised short-term projects after Comptroller General approval.', page(44), 'TWP Fees', 'Temporary residence visa'],
  ['r11-temporary-work-permit-180-day-visa', 'R11 — Temporary Work Permit Visa (180-day)', 'Experts invited by corporate bodies for specialised skilled services under the stated company-registration process.', page(45), 'TWP Fees', 'Temporary residence visa'],
  ['r1a-accredited-diplomat-visa', 'R1A — Accredited Diplomat Visa', 'Fully accredited foreign diplomats posted to Nigeria.', page(46), 'STR Visa Fees', 'Temporary residence visa'],
  ['r1b-spouse-of-accredited-diplomat-visa', 'R1B — Spouse of Accredited Diplomat Visa', 'Spouse dependant of an accredited diplomat.', page(46), 'STR Visa Fees', 'Temporary residence visa'],
  ['r1c-minor-dependant-of-accredited-diplomat-visa', 'R1C — Minor Dependant of Accredited Diplomat Visa', 'Minor dependant of an accredited diplomat.', page(46), 'STR Visa Fees', 'Temporary residence visa'],
  ['r1d-adult-dependant-of-accredited-diplomat-visa', 'R1D — Adult Dependant of Accredited Diplomat Visa', 'Adult dependant of an accredited diplomat.', page(46), 'STR Visa Fees', 'Temporary residence visa'],
  ['r1e-aged-parent-dependant-of-accredited-diplomat-visa', 'R1E — Aged-parent Dependant of Accredited Diplomat Visa', 'Aged parent dependant of an accredited diplomat.', page(46), 'STR Visa Fees', 'Temporary residence visa'],
  ['r2a-employment-expatriate-permit', 'R2A — Employment (Expatriate) Permit', 'Foreign national employed by a Nigerian employer with a valid expatriate quota.', page(47), 'STR Visa Fees', 'Temporary residence visa'],
  ['r2b-spouse-of-expatriate-permit', 'R2B — Spouse of Expatriate Permit', 'Spouse dependant of an expatriate permit holder.', page(47), 'STR Visa Fees', 'Temporary residence visa'],
  ['r2c-minor-dependant-of-expatriate-permit', 'R2C — Minor Dependant of Expatriate Permit', 'Minor dependant of an expatriate permit holder.', page(47), 'STR Visa Fees', 'Temporary residence visa'],
  ['r2d-adult-dependant-of-expatriate-permit', 'R2D — Adult Dependant of Expatriate Permit', 'Adult dependant of an expatriate permit holder.', page(47), 'STR Visa Fees', 'Temporary residence visa'],
  ['r2e-aged-parent-dependant-of-expatriate-permit', 'R2E — Aged-parent Dependant of Expatriate Permit', 'Aged parent dependant of an expatriate permit holder.', page(47), 'STR Visa Fees', 'Temporary residence visa'],
  ['r3a-free-zone-employment-visa', 'R3A — Employment (Expatriate Free Zone) Visa', 'Expatriates employed by a recognised enterprise in a Nigerian free zone.', page(48), 'STR Visa Fees', 'Temporary residence visa'],
  ['r3b-spouse-of-free-zone-expatriate', 'R3B — Spouse of Free Zone Expatriate', 'Spouse dependant of a free-zone expatriate.', page(50), 'STR Visa Fees', 'Temporary residence visa'],
  ['r3c-minor-dependant-of-free-zone-expatriate', 'R3C — Minor Dependant of Free Zone Expatriate', 'Minor dependant of a free-zone expatriate.', page(50), 'STR Visa Fees', 'Temporary residence visa'],
  ['r3d-adult-dependant-of-free-zone-expatriate', 'R3D — Adult Dependant of Free Zone Expatriate', 'Adult dependant of a free-zone expatriate.', page(50), 'STR Visa Fees', 'Temporary residence visa'],
  ['r3e-aged-parent-dependant-of-free-zone-expatriate', 'R3E — Aged-parent Dependant of Free Zone Expatriate', 'Aged parent dependant of a free-zone expatriate.', page(50), 'STR Visa Fees', 'Temporary residence visa'],
  ['r4a-government-official-expatriate-visa', 'R4A — Employment (Expatriate Government Official) Visa', 'Foreign nationals employed directly by the Nigerian Government.', page(52), 'STR Visa Fees', 'Temporary residence visa'],
  ['r4b-spouse-of-government-official', 'R4B — Spouse of Government Official', 'Spouse dependant of a government-official expatriate.', page(53), 'STR Visa Fees', 'Temporary residence visa'],
  ['r4c-minor-dependant-of-government-official', 'R4C — Minor Dependant of Government Official', 'Minor dependant of a government-official expatriate.', page(53), 'STR Visa Fees', 'Temporary residence visa'],
  ['r4d-adult-dependant-of-government-official', 'R4D — Adult Dependant of Government Official', 'Adult dependant of a government-official expatriate.', page(53), 'STR Visa Fees', 'Temporary residence visa'],
  ['r4e-aged-parent-dependant-of-government-official', 'R4E — Aged-parent Dependant of Government Official', 'Aged parent dependant of a government-official expatriate.', page(53), 'STR Visa Fees', 'Temporary residence visa'],
  ['r5a-ingo-employment-visa', 'R5A — Employment (INGO) Visa', 'Expatriates working with an INGO that has a formal Nigerian-government MOU.', page(55), 'STR Visa Fees', 'Temporary residence visa'],
  ['r5b-spouse-of-ingo-staff', 'R5B — Spouse of INGO Staff Visa', 'Spouse dependant of INGO staff.', page(56), 'STR Visa Fees', 'Temporary residence visa'],
  ['r5c-minor-dependant-of-ingo-staff', 'R5C — Minor Dependant of INGO Staff Visa', 'Minor dependant of INGO staff.', page(56), 'STR Visa Fees', 'Temporary residence visa'],
  ['r5d-adult-dependant-of-ingo-staff', 'R5D — Adult Dependant of INGO Staff Visa', 'Adult dependant of INGO staff.', page(56), 'STR Visa Fees', 'Temporary residence visa'],
  ['r5e-aged-parent-dependant-of-ingo-staff', 'R5E — Aged-parent Dependant of INGO Staff Visa', 'Aged parent dependant of INGO staff.', page(56), 'STR Visa Fees', 'Temporary residence visa'],
  ['r6a-cleric-employment-permit', 'R6A — Employment (Cleric) Permit', 'Foreign clerics taking long-term religious appointments in Nigeria with pre-approval.', page(58), 'STR Visa Fees', 'Temporary residence visa'],
  ['r6b-spouse-of-cleric-permit', 'R6B — Spouse of Cleric Employment Permit', 'Spouse dependant of a cleric permit holder.', page(59), 'STR Visa Fees', 'Temporary residence visa'],
  ['r6c-minor-dependant-of-cleric', 'R6C — Minor Dependant of Cleric Permit', 'Minor dependant of a cleric permit holder.', page(59), 'STR Visa Fees', 'Temporary residence visa'],
  ['r6d-adult-dependant-of-cleric', 'R6D — Adult Dependant of Cleric Permit', 'Adult dependant of a cleric permit holder.', page(59), 'STR Visa Fees', 'Temporary residence visa'],
  ['r6e-aged-parent-dependant-of-cleric', 'R6E — Aged-parent Dependant of Cleric Permit', 'Aged parent dependant of a cleric permit holder.', page(59), 'STR Visa Fees', 'Temporary residence visa'],
  ['r7a-student-visa', 'R7A — Student Visa', 'International students accepted by an accredited Nigerian institution.', page(61), 'STR Visa Fees', 'Temporary residence visa'],
  ['r7b-spouse-of-student-visa', 'R7B — Spouse of Student Visa', 'Spouse dependant of an international student.', page(62), 'STR Visa Fees', 'Temporary residence visa'],
  ['r8a-academic-exchange-programme-residence-visa', 'R8A — Academic Exchange Programme (AEP) Visa', 'Students, scholars, lecturers, researchers, sabbaticals, law-enforcement and security officers under approved AEP arrangements.', page(63), 'STR Visa Fees', 'Temporary residence visa'],
  ['r8b-spouse-of-aep-visa', 'R8B — Spouse of AEP Visa', 'Spouse dependant of an AEP participant.', page(64), 'STR Visa Fees', 'Temporary residence visa'],
  ['r9a-interns-visa', 'R9A — Interns Visa', 'Persons undertaking a resident internship programme in Nigeria.', page(65), 'STR Visa Fees', 'Temporary residence visa'],
];
for (const [slug, name, description, sourcePage, schedule, category] of residence) services.push(classService(slug, name, category, description, sourcePage, schedule, { description, timeline: '10 days from enrolment/interview and biometric capture', notes: 'The SLA states a 10-day target from enrolment, interview and biometric capture; actual approval and regularisation remain subject to the required authorities and documents.' }));

const permanent = [
  ['n1a-spouse-of-nigerian-citizen-visa', 'N1A — Spouse of Nigerian Citizen Visa', 'Spouses of Nigerian citizens under section 37(10) of the Immigration Act 2015.', page(66), 'STR Visa Fees'],
  ['n2a-nigerian-by-birth-renounced-citizenship-visa', 'N2A — Nigerian by Birth Who Renounced Nigerian Citizenship Visa', 'Nigerians by birth who renounced Nigerian citizenship and seek residence/entry under the stated legal framework.', page(67), 'STR Visa Fees'],
  ['n3a-small-investor-visa', 'N3A — Investors Visa (small enterprise)', 'Investors importing and retaining USD 250,000–1,000,000 in capital.', page(68), 'STR Visa Fees'],
  ['n3b-medium-investor-visa', 'N3B — Investors Visa (medium enterprise)', 'Investors importing and retaining USD 1,000,000–10,000,000 in capital.', page(69), 'STR Visa Fees'],
  ['n3c-large-corporations-investor-visa', 'N3C — Investors Visa (large corporations)', 'Large-scale corporate investors importing and retaining USD 10,000,000–100,000,000 in capital.', page(70), 'STR Visa Fees'],
  ['n3d-ultra-large-corporations-investor-visa', 'N3D — Investors Visa (ultra-large corporations)', 'Ultra-large corporations investing USD 10,000,000 and above as stated by the SLA.', page(70), 'Appendix II'],
  ['n3e-oil-gas-power-investor-visa', 'N3E — Investors Visa (oil/gas/power sector)', 'Oil, gas and power-sector investors with evidence of USD 100,000,000 investment.', page(71), 'Appendix II'],
  ['n4a-highly-skilled-immigrant-visa', 'N4A — Highly Skilled Immigrant Visa', 'Foreign nationals with specialised knowledge, abilities or technical expertise relevant to Nigeria’s economic needs.', page(72), 'Appendix II'],
  ['n5a-retirement-visa-retired-in-nigeria', 'N5A — Retirement Visa (retired in Nigeria)', 'Foreign nationals aged 65 or older who retired in Nigeria after at least 20 years of service.', page(74), 'Appendix II'],
  ['n5b-retirement-visa-retiree-from-abroad', 'N5B — Retirement Visa (retiree from abroad)', 'Foreign nationals aged 65 or older who retired abroad and seek residence in Nigeria.', page(74), 'Appendix II'],
  ['n6-spouse-and-dependant-of-permanent-resident', 'N6 — Spouse and Dependant of Permanent Resident Visa', 'Spouses, minors, adult children and aged parents of permanent-resident visa holders.', page(76), 'Appendix II'],
];
for (const [slug, name, description, sourcePage, schedule] of permanent) services.push(classService(slug, name, 'Permanent residence visa', description, sourcePage, schedule, { description, timeline: '10 days from enrolment/interview and biometric capture', notes: 'The SLA states a 10-day target from enrolment, interview and biometric capture; the residence outcome and permit conditions remain subject to the relevant approval and documents.' }));

services.push({
  slug: 'cerpac-e-cerpac-application', name: 'CERPAC / e-CERPAC application', category: 'Residence and permits', jurisdiction: 'Foreign nationals residing or working in Nigeria',
  description: 'CERPAC is the residence permit and identity card route for eligible foreign nationals; the current NIS page describes online application, payment and biometric capture.',
  requirements: ['Valid passport with Nigerian visa, proof of employment/business/student status or other supporting documents.', 'Biometric data at a designated NIS office.'],
  processSteps: ['Submit the online application through the official CERPAC portal.', 'Upload supporting documents and pay the applicable CERPAC fee.', 'Attend designated-office biometric capture and await NIS processing.'],
  notes: 'This is a current official NIS page service context, not a separate named row in the SLA list. Its fee examples are retained separately from the SLA nationality-based visa tables.', officialActionUrl: 'https://cerpac.immigration.gov.ng/', officialChannelType: 'portal', paymentGuide: 'Use the official e-CERPAC portal and confirm the applicable category before payment.',
  feeOptions: [
    fee('Employed foreigner — current CERPAC page example', 'fixed', 'USD', 2000, ['nis-cerpac-page', 'nis-cerpac-portal'], 'Official page; no PDF page', 'The current official NIS CERPAC page states USD 2,000 for employed foreigners.', { conditions: 'CERPAC page example; not silently substituted for the SLA’s STR nationality table.' }),
    fee('Student — current CERPAC page example', 'fixed', 'USD', 600, ['nis-cerpac-page', 'nis-cerpac-portal'], 'Official page; no PDF page', 'The current official NIS CERPAC page states USD 600 for students.', { conditions: 'CERPAC page example; confirm category and current portal amount.' }),
    fee('Foreigner married to Nigerian citizen — current CERPAC page example', 'free', 'USD', null, ['nis-cerpac-page', 'nis-cerpac-portal'], 'Official page; no PDF page', 'The current official NIS CERPAC page states gratis for foreigners married to Nigerian citizens.', { conditions: 'CERPAC page example; gratis does not imply no unrelated bank or document costs.' }),
  ],
});

function parseToken(token) {
  const original = token;
  if (token === 'Gratis' || /^\$0$/.test(token)) return { pricingModel: 'free', currency: 'USD', amount: null, note: `SLA original value: ${original}` };
  if (token === '—' || token === 'N/A') return { pricingModel: 'unknown', currency: 'USD', amount: null, status: 'pending', note: `SLA original value: ${original}; no amount is inferred.` };
  const marked = token.endsWith('*');
  token = token.replace(/\*$/, '');
  const match = token.match(/^(?:US)?\$([\d,]+(?:\.\d+)?)$/);
  if (!match) throw new Error(`Unparsed NIS fee token: ${original}`);
  return { pricingModel: 'fixed', currency: 'USD', amount: Number(match[1].replace(/,/g, '')), note: `SLA original value: ${original}${marked ? '; the SLA marks this multiple-entry amount with an asterisk without defining the mark in the supplied text.' : ''}`, marked };
}

function parseAppendixRows(text) {
  const rows = [];
  let currentPage = 1;
  const start = text.indexOf('Country                  Single Entry');
  const end = text.indexOf('9. TABLE OF MULTIPLE VISA FEE', start);
  for (const raw of text.slice(start, end).split('\n')) {
    const parts = raw.replace(/\f/g, '').trim();
    if (!parts) continue;
    if (/^\d+$/.test(parts)) { currentPage = Number(parts); continue; }
    const match = parts.match(/^(.*?)\s+((?:US\$|\$|Gratis|—)\S*)\s+((?:US\$|\$|Gratis|—)\S*)\s+((?:US\$|\$|Gratis|—)\S*)\s+((?:US\$|\$|Gratis|—)\S*)$/);
    if (!match) continue;
    rows.push({ country: match[1].trim(), values: match.slice(2), page: currentPage });
  }
  return rows;
}

function parseAppendixIIRows(text) {
  const expected = {
    'United Kingdom': ['US$144', 'US$472', 'US$944', 'US$2360', 'US$472', 'US$472'],
    'United States': ['US$160', 'US$160', 'US$160', 'N/A', 'US$160', 'US$160'],
    Kenya: ['US$25', 'N/A', 'N/A', 'US$100', 'US$25', 'US$25'],
  };
  if (!text.includes('9. TABLE OF MULTIPLE VISA FEE') || !text.includes('US$2360')) throw new Error('Appendix II multiple-visa table was not found.');
  return Object.entries(expected).map(([country, values]) => ({ country, values, page: 89 }));
}

function scheduleService(slug, name, label, column, rows, pageRange) {
  const columnIndex = { 'Single Entry': 0, 'Multiple Entry': 1, 'TWP Fees': 2, 'STR Visa Fees': 3 }[column];
  const feeOptions = rows.map((row) => {
    const parsed = parseToken(row.values[columnIndex]);
    return fee(`${row.country} — ${column}`, parsed.pricingModel, parsed.currency, parsed.amount, ['nis-sla-2026'], `Printed p. ${row.page}; PDF p. ${row.page}`, `The SLA Appendix I lists ${row.country} ${column} as ${row.values[columnIndex]}.`, { verificationStatus: parsed.status || 'verified', conditions: `${label}; preserve the country and entry-class scope.${parsed.marked ? ' The SLA’s asterisk is retained but not defined in the supplied document.' : ''}`, notes: parsed.note });
  });
  return { slug, name, category: 'Visa fee schedules', jurisdiction: 'Applicants by nationality and visa class', description: `${label} extracted from the NIS April 2026 SLA Appendix I.`, requirements: [], processSteps: ['Identify the applicant nationality and visa class.', 'Use the matching country row and fee column.', 'Confirm the official portal’s current amount and any payment/bank charge before payment.'], notes: 'This schedule is exhaustive as extracted from Appendix I; it is not a universal fee for every visa class.', officialActionUrl: 'https://immigration.gov.ng/nigerian-visa/', officialChannelType: 'website', paymentGuide: 'Confirm nationality, visa class, reciprocity and any bank or payment charges on the official NIS channel before payment.', feeOptions };
}

function appendixIISchedule(rows) {
  const labels = ['Single Entry (within 6 months)', 'Multiple Entry 1 Year', 'Multiple Entry 2 Years', 'Multiple Entry 5 Years', 'TWP Fees', 'STR Visa Fees'];
  const feeOptions = [];
  for (const row of rows) for (let index = 0; index < labels.length; index += 1) {
    const parsed = parseToken(row.values[index]);
    feeOptions.push(fee(`${row.country} — ${labels[index]}`, parsed.pricingModel, parsed.currency, parsed.amount, ['nis-sla-2026'], page(89), `The SLA Appendix II multiple-visa table lists ${row.country} ${labels[index]} as ${row.values[index]}.`, { verificationStatus: parsed.status || 'verified', conditions: 'Appendix II special multiple-visa schedule; N/A is retained as unresolved, not free.', notes: parsed.note }));
  }
  return { slug: 'appendix-ii-special-multiple-visa-fees', name: 'Appendix II special multiple-visa fee table', category: 'Visa fee schedules', jurisdiction: 'United Kingdom, United States and Kenya applicants where applicable', description: 'Special multiple-entry, TWP and STR fee rows for the three countries listed in SLA Appendix II.', requirements: [], processSteps: ['Confirm the applicant country and visa class.', 'Use the matching Appendix II row.', 'Confirm the current official portal amount before payment.'], notes: 'The table includes N/A entries; those remain pending and are not presented as zero.', officialActionUrl: 'https://immigration.gov.ng/nigerian-visa/', officialChannelType: 'website', paymentGuide: 'Confirm the applicable special-country schedule with NIS before payment.', feeOptions };
}

function displayFee(option) {
  if (option.pricingModel === 'free') return 'Gratis / free';
  if (option.pricingModel === 'unknown') return 'Not established';
  if (option.pricingModel === 'variable') return 'Variable by scope';
  if (option.pricingModel === 'range') return `${option.minimumAmount}–${option.maximumAmount} ${option.currency}`;
  return `${option.currency} ${option.amount}`;
}

function markdownCell(value) {
  return String(value || 'Not stated').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function buildMatrix(output) {
  const rows = [];
  let index = 1;
  for (const service of output.services) for (const option of service.feeOptions) {
    rows.push(`| ${index++} | ${service.name} | ${service.category} | ${option.label} | ${displayFee(option)} | ${option.verificationStatus} | ${option.page || 'Not stated'} | ${option.sourceKeys.join(', ')} |`);
  }
  const serviceRows = output.services.map((service, serviceIndex) => `| ${serviceIndex + 1} | ${markdownCell(service.name)} | ${markdownCell(service.category)} | ${markdownCell(service.jurisdiction)} | ${markdownCell(service.requirements.join('; '))} | ${markdownCell(service.processSteps.join('; '))} | ${markdownCell(service.officialActionUrl)} | ${markdownCell(service.notes)} |`).join('\n');
  const sourceRows = Object.entries(output.sources).map(([key, source]) => `| ${key} | ${source.title} | ${source.url} | ${source.documentReference} |`).join('\n');
  const statusCounts = {};
  for (const service of output.services) for (const option of service.feeOptions) statusCounts[option.verificationStatus] = (statusCounts[option.verificationStatus] || 0) + 1;
  return `# Nigeria Immigration Service evidence matrix

Reviewed 31 October 2026 from the supplied research/repo/nis_SERVICE-LEVEL-AGREEMENT-2026_.pdf, the official NIS 2026 SLA URL and current official NIS pages and portals.

Supplied filename: nis_SERVICE-LEVEL-AGREEMENT-2026_.pdf. Supplied-file SHA-256: ${suppliedSha256}. The official remote file could not be downloaded locally because DNS resolution failed, so a byte-for-byte checksum match is not claimed.

The supplied file is 93 PDF pages. Its visible printed page number matches the PDF page number for the service list and appendices inspected here. The SLA cover says **Revised Edition, April 2026**; the foreword is dated 26 April 2026. The version history records April 2026 as **Third Edition** while the description says **Second Edition, 2026**. No effective date is stated.

## Accounting

| Measure | Count | Method |
|---|---:|---|
| Catalogue service records | ${output.services.length} | One card per distinct service/class or clearly labelled fee schedule; dependant classes remain separate where the SLA names them separately. |
| Catalogue fee options | ${Object.values(statusCounts).reduce((a, b) => a + b, 0)} | Every service fee option plus every Appendix I country/column cell and Appendix II country/column cell. |
| Verified | ${statusCounts.verified || 0} | Official NIS SLA or current official NIS source supports the stated amount, free status or variable schedule scope. |
| Pending | ${statusCounts.pending || 0} | The SLA prints a dash/N/A or a current official page lists a service variant without establishing its fee. No amount is inferred. |
| Conflicting | ${statusCounts.conflicting || 0} | No NIS amount conflict was silently resolved in this pass; the CERPAC examples are kept as a separately scoped current-page service rather than merged with SLA STR rows. |
| Excluded service/fee rows | 1 metadata item | The SLA version-history inconsistency is preserved as source metadata, not fabricated into a service. No fee row was deleted for convenience. |

Appendix I contains ${output.appendixCounts.appendixICountries} country rows × 4 columns = ${output.appendixCounts.appendixIFeeCells} fee cells. Appendix II contains ${output.appendixCounts.appendixIISpecialRows} country rows × 6 columns = ${output.appendixCounts.appendixIIFeeCells} fee cells. Original symbols such as Gratis, $0, —, N/A and multiple-entry asterisks are preserved in option notes.

## Complete catalogue matrix

| # | Service | Category | Fee option | Published fee/state | Outcome | Exact SLA page | Source keys |
|---:|---|---|---|---|---|---|---|
${rows.join('\n')}

## Service-level eligibility, requirements, process and channel matrix

The fee rows above link to these service-level fields. Where a requirement or route is category-level rather than individually established, the catalogue says so instead of inventing a narrower rule.

| # | Service | Category | Eligibility/location | Requirements | Process | Official route | Timeline/conditions |
|---:|---|---|---|---|---|---|---|
${serviceRows}

## Source register

| Key | Source title | Official URL | Exact role/reference |
|---|---|---|---|
${sourceRows}

## Material discrepancies and gaps

- **Edition/version:** the source’s version history says April 2026 is the Third Edition but its description says Second Edition, 2026. This is retained as an explicit source inconsistency.
- **Passport application URL:** the SLA table visually/textually prints www.passport.gov.ng; the current official NIS passport page and official portal resolve to https://passport.immigration.gov.ng/. The catalogue uses the validated current portal and retains the discrepancy in source notes.
- **e-Visa URL:** the SLA contains a malformed www.evisa@immigration.gov.ng string. The current official NIS visa page links to https://evisa.immigration.gov.ng/, which is used as the application channel.
- **64-page/5-year passport:** the current official passport page lists this variant, but the April 2026 SLA and current passport fee notice do not publish its fee. It remains pending with no inferred amount.
- **Appendix symbols:** multiple-entry asterisks are preserved because the supplied SLA does not define them. Appendix I dashes and Appendix II N/A entries remain pending, not free.
- **CERPAC scope:** the current official CERPAC page gives examples of USD 2,000 employed, USD 600 student and gratis spouse-of-Nigerian fees. Those are retained under a separately named CERPAC service and are not substituted for the SLA’s country-based STR fee tables.
- **Remote origin/checksum:** the official 2026 SLA URL is accessible through the official NIS web source and its content matches the supplied title, date, services and appendices. A local binary download failed DNS resolution, so byte-for-byte checksum equality with the supplied PDF is not established.

## Application, attendance and complaint channels

- Passport applicants apply online but must attend the selected processing centre for appointment, photograph and biometric capture. Diaspora applicants use the nearest Nigerian mission where the SLA says so.
- Eligible e-Visa applicants use the official e-Visa portal, upload documents, pay online and receive an email decision/approval; exact fee and requirements remain class- and nationality-dependent.
- Embassy, temporary-residence and permanent-residence routes require the relevant embassy/mission, interview or biometric steps where stated; FeeLens does not describe them as fully self-service.
- CERPAC uses online application and payment followed by designated-office biometric capture.
- Current official complaint routes include nis.servicom@nigeriaimmigration.gov.ng, nis.reformchampion@immigration.gov.ng, the NIS support lines and the [official NIS contact page](https://immigration.gov.ng/contact/). The SLA states a 72-hour complaint-resolution target, with notice if resolution will take longer.

## Publication rule

The public catalogue may show a verified amount only where the exact amount/scope is supported by the linked official evidence. Pending values are shown as unavailable or unresolved; they are never rendered as free. Agency timelines are displayed as NIS service targets, not guarantees. FeeLens remains independent and does not collect passport details, identity numbers, credentials or payments.
`;
}

function main() {
  let text;
  try {
    text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { encoding: 'utf8' });
  } catch (error) {
    if (error.stdout) text = error.stdout;
    else throw error;
  }
  const appendixI = parseAppendixRows(text);
  const appendixII = parseAppendixIIRows(text);
  services.push(scheduleService('appendix-i-single-entry-visa-fees', 'Appendix I — single-entry visa fee schedule', 'Single-entry visa fees by nationality', 'Single Entry', appendixI, '83–89'));
  services.push(scheduleService('appendix-i-multiple-entry-visa-fees', 'Appendix I — multiple-entry visa fee schedule', 'Multiple-entry visa fees by nationality', 'Multiple Entry', appendixI, '83–89'));
  services.push(scheduleService('appendix-i-twp-fees', 'Appendix I — TWP fee schedule', 'Temporary Work Permit fees by nationality', 'TWP Fees', appendixI, '83–89'));
  services.push(scheduleService('appendix-i-str-fees', 'Appendix I — STR visa fee schedule', 'Subject-to-Regularisation visa fees by nationality', 'STR Visa Fees', appendixI, '83–89'));
  services.push(appendixIISchedule(appendixII));
  const output = {
    version: reviewed,
    mda: {
      name: 'Nigeria Immigration Service', acronym: 'NIS', slug: 'nigeria-immigration-service', officialWebsite: 'https://immigration.gov.ng/', coverageStatus: 'pilot',
      description: 'Nigeria Immigration Service passport, visa, residence, permit, ENBIC, CERPAC and complaint-channel information.',
      officialChannels: [
        { channelType: 'website', name: 'NIS official website', url: 'https://immigration.gov.ng/', contactValue: null, instructions: 'Use the official NIS website to confirm service instructions, notices and current channels.' },
        { channelType: 'portal', name: 'Passport application portal', url: 'https://passport.immigration.gov.ng/', contactValue: null, instructions: 'Use for domestic and diaspora passport applications, renewal/reissue, correction and appointments.' },
        { channelType: 'portal', name: 'Regular visa portal', url: 'https://visa.immigration.gov.ng/', contactValue: null, instructions: 'Use for visa application routes that the current NIS site directs to the regular visa portal.' },
        { channelType: 'portal', name: 'e-Visa portal', url: 'https://evisa.immigration.gov.ng/', contactValue: null, instructions: 'Use for eligible short-visit e-Visa classes.' },
        { channelType: 'portal', name: 'e-CERPAC portal', url: 'https://cerpac.immigration.gov.ng/', contactValue: null, instructions: 'Use for the e-CERPAC application route; FeeLens does not collect passport details, credentials or payments.' },
        { channelType: 'email', name: 'NIS Servicom complaints', url: null, contactValue: 'nis.servicom@nigeriaimmigration.gov.ng', instructions: 'Use for official complaint and service-redress enquiries.' },
        { channelType: 'email', name: 'NIS Reform Champion', url: null, contactValue: 'nis.reformchampion@immigration.gov.ng', instructions: 'Use the official escalation route where supported.' },
        { channelType: 'phone', name: 'NIS customer support', url: null, contactValue: '+2349121900655; +2349121556359; +2349121477092', instructions: 'Use the official NIS support lines listed in the SLA and current contact page.' },
      ],
    },
    sources,
    services,
    excludedRows: [
      { name: 'SLA source version inconsistency', count: 1, reason: 'Retained as source metadata, not a service or fee row: version history says Third Edition but description says Second Edition, 2026.' },
    ],
    appendixCounts: { appendixICountries: appendixI.length, appendixIFeeCells: appendixI.length * 4, appendixIISpecialRows: appendixII.length, appendixIIFeeCells: appendixII.length * 6 },
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(matrixPath, `${buildMatrix(output)}\n`);
  console.log(JSON.stringify({ outputPath, matrixPath, serviceCount: services.length, appendixICountries: appendixI.length, appendixIFeeCells: appendixI.length * 4, appendixIIFeeCells: appendixII.length * 6 }, null, 2));
}

main();
