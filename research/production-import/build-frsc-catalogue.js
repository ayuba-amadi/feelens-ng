const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const pdfPath = path.join(root, 'research/repo/frsc_REVIEWED_SLA_2026_276a6818e9.pdf');
const outputPath = path.join(__dirname, 'frsc-service-catalogue.json');
const matrixPath = path.join(root, 'research/frsc-service-evidence-matrix.md');
const reviewed = '2026-10-31';
const expectedSha256 = '3a38011ca7c790cef0c3ffe98c7e2521df51fa4a8f60594985a99c3699c12a18';

const sources = {
  'frsc-drivers-licence-faq': {
    title: "Nigeria Driver's Licence official FAQ",
    sourceType: 'official_faq',
    url: 'https://nigeriadriverslicence.frsc.gov.ng/faq',
    publicationDate: null,
    effectiveDate: null,
    lastChecked: reviewed,
    evidenceTier: 2,
    publisher: 'Federal Road Safety Corps',
    documentReference: "National Driver's Licence portal FAQ — application steps, validity classes, biometric capture and prescribed fees",
    notes: "Official Nigeria Driver's Licence portal FAQ (nigeriadriverslicence.frsc.gov.ng). Confirms the JTB/FRSC baseline driver's licence fees of ₦7,000 (Class A motorcycle/tricycle, 3 years), ₦11,000 (Class A, 5 years), ₦15,000 (other motor vehicle classes, 3 years) and ₦21,000 (other motor vehicle classes, 5 years), as well as accredited driving school prerequisite, VIO test, payment confirmation, FRSC DLC biometric capture, 60-day temporary licence and State IRS/MVAA permanent card collection. Note: DNS resolution to nigeriadriverslicence.frsc.gov.ng failed from the local test runner on 31 October 2026; the previously verified official FAQ record and matching April 2026 SLA schedule (pp. 6–9) are retained.",
  },
  'frsc-ndl-portal': {
    title: "Nigeria Driver's Licence official application portal",
    sourceType: 'official_portal',
    url: 'https://nigeriadriverslicence.frsc.gov.ng/',
    publicationDate: null,
    effectiveDate: null,
    lastChecked: reviewed,
    evidenceTier: 2,
    publisher: 'Federal Road Safety Corps',
    documentReference: "Official National Driver's Licence application, renewal and re-issue portal",
    notes: "Official FRSC subdomain for National Driver's Licence applications, renewals and re-issues. The April 2026 SLA text (pp. 6–8) prints the legacy www.nigeriadriverslicence.org domain; FeeLens links to the official .gov.ng portal while recording the SLA domain string in source notes.",
  },
  'frsc-official-website': {
    title: 'Federal Road Safety Corps official website',
    sourceType: 'official_website',
    url: 'https://frsc.gov.ng/',
    publicationDate: null,
    effectiveDate: null,
    lastChecked: reviewed,
    evidenceTier: 2,
    publisher: 'Federal Road Safety Corps',
    documentReference: 'Official FRSC website navigation, documentation links and public service portals',
    notes: 'Official FRSC website (HTTP 200 on 31 October 2026; root redirects to https://frsc.gov.ng/home/). Used to validate official ownership of FRSC portals, documentation pages and complaint channels.',
  },
  'frsc-services-page': {
    title: 'Services — Federal Road Safety Corps',
    sourceType: 'official_process_page',
    url: 'https://frsc.gov.ng/services',
    publicationDate: null,
    effectiveDate: null,
    lastChecked: reviewed,
    evidenceTier: 2,
    publisher: 'Federal Road Safety Corps',
    documentReference: "FRSC public service overview: National Driver's Licence, NVIS & Number Plates, Signage Plant (Gwagwalada), DSSP, Speed Limiting Device and Roadside Clinics",
    notes: 'Publicly accessible FRSC services page (HTTP 200 on 31 October 2026). Substantiates the scope of FRSC services, the Gwagwalada Signage Plant, the Driving School Standardization Programme (DSSP), Speed Limiting Device vendor regulation, National Vehicle Identification Scheme (NVIS) and Roadside Clinics, without publishing a standalone numeric fee table.',
  },
  'frsc-ndl-verification-portal': {
    title: "National Driver's Licence Online Verification Portal",
    sourceType: 'official_portal',
    url: 'https://ndlverification.frsc.gov.ng/',
    publicationDate: null,
    effectiveDate: null,
    lastChecked: reviewed,
    evidenceTier: 2,
    publisher: 'Federal Road Safety Corps',
    documentReference: "Online Driver's Licence Verification home page, verification workflow and FAQs (https://ndlverification.frsc.gov.ng/faqs)",
    notes: "Publicly accessible official FRSC portal (HTTP 200 on 31 October 2026). Confirms that processed verification documents are addressed only to established organisations (Private, Government or NGO, not personal/residential addresses), requires account creation, application letter, front/back of driver's licence and valid ID, states 3–10 working days in-house verification plus shipping, and states that payment is required for verification and/or shipping by debit card without publishing a numeric fee on the public page. The restricted April 2026 SLA (Printed p. 11; PDF p. 11) mentions ₦50,000 via Remita and a 10-working-day Default Approval rule (Printed pp. 26–27; PDF pp. 26–27); because the ₦50,000 figure is not substantiated on the non-confidential public portal, the fee remains pending.",
  },
  'frsc-nvis-portal': {
    title: 'National Vehicle Identification Scheme (NVIS) Portal',
    sourceType: 'official_portal',
    url: 'https://nvis.frsc.gov.ng/',
    publicationDate: null,
    effectiveDate: null,
    lastChecked: reviewed,
    evidenceTier: 2,
    publisher: 'Federal Road Safety Corps',
    documentReference: 'NVIS public portal — New Vehicle Registration (Form MVA 01), Old Plate Revalidation and Plate Number Verification (/VehicleManagement/VerifyPlateNo)',
    notes: 'Publicly accessible official FRSC portal (HTTP 200 on 31 October 2026). Confirms the online Form MVA 01 vehicle registration, number plate revalidation and plate verification workflows, and directs applicants to State Boards of Internal Revenue (SBIR) / Motor Licensing Authorities (MLA) for costing, payment and physical plate collection. Does not publish a public number-plate fee schedule on the portal.',
  },
  'frsc-dssp-portal': {
    title: 'FRSC Driving School Standardization Programme (DSSP) Portal',
    sourceType: 'official_portal',
    url: 'https://dssp.frsc.gov.ng/',
    publicationDate: null,
    effectiveDate: null,
    lastChecked: reviewed,
    evidenceTier: 2,
    publisher: 'Federal Road Safety Corps',
    documentReference: 'Official DSSP portal for accredited driving schools, learner registration and certificate generation',
    notes: 'Publicly accessible official FRSC portal (HTTP 200 on 31 October 2026). Used by prospective drivers/riders to select an accredited driving school and by driving school operators for DSSP registration and certification.',
  },
  'frsc-dssp-sop': {
    title: 'Standard Operating Procedure for Driving School Operations in Nigeria',
    sourceType: 'official_guideline',
    url: 'https://staging.frsc.gov.ng/frsc-admin/uploads/sopds_e1cd918588.pdf',
    publicationDate: null,
    effectiveDate: null,
    lastChecked: reviewed,
    evidenceTier: 2,
    publisher: 'Federal Road Safety Corps',
    documentReference: 'Section 5.1 (p. 2) — Application for Registration (Form TSC0001); Sections 6–10 — Inspection, Certification, Approved Driving School Certificate and Sanctions',
    notes: 'Publicly linked from the official FRSC Standard Operating Procedures page (https://frsc.gov.ng/documentations/standard-operating-procedures, HTTP 200 on 31 October 2026). Section 5.1 states that prospective driving school operators obtain Form TSC0001 from the nearest FRSC office at no cost or download it online, whereas the April 2026 SLA (Printed p. 21; PDF p. 21) states under Form TRG00001 that no driving school shall be registered unless the prescribed fee is paid to the authority (without stating the numeric fee).',
  },
  'frsc-towing-sop-2019': {
    title: 'Standard Operating Procedure for Towing, Payment and Release of Road Obstruction/Abandoned Vehicles by Field Commands',
    sourceType: 'official_guideline',
    url: 'https://frsc.gov.ng/wp-content/uploads/2019/11/FINALa.pdf',
    publicationDate: '2019-10-22',
    effectiveDate: null,
    lastChecked: reviewed,
    evidenceTier: 2,
    publisher: 'Federal Road Safety Corps',
    documentReference: '8-page PDF signed 22 October 2019; Scope & Limitations pp. 3–4; Towing on Request & Broken-down Vehicles p. 5; Mode of Payment & Release p. 6; Recommended Tow Charges table p. 7; Towing Requisition Form p. 8',
    notes: 'Publicly linked from https://frsc.gov.ng/documentations/standard-operating-procedures (HTTP 200 on 31 October 2026). Paragraph 15 (p. 7) states that FRSC tow charges are the average of prevailing commercial charges subject to distance, tonnage, terrain and PMS/AGO price regime, and publishes a recommended guide ranging from ₦5,000 to ₦95,000 across 6 distance/time bands and 4 vehicle/terrain columns. Paragraph 10(c) (p. 5) states that a broken-down vehicle undergoing long repairs with the owner in sight is towed off the road to a safe place at no cost. The April 2026 SLA (Printed p. 17; PDF p. 17) retains the variable commercial-average formula and daily custody fee after 20 hours (Printed p. 14; PDF p. 14) without reprinting the 2019 numeric table.',
  },
  'frsc-service-charter': {
    title: 'Federal Road Safety Corps Service Charter',
    sourceType: 'official_guideline',
    url: 'https://staging.frsc.gov.ng/frsc-admin/uploads/fsc_0b3dd86863.pdf',
    publicationDate: null,
    effectiveDate: null,
    lastChecked: reviewed,
    evidenceTier: 2,
    publisher: 'Federal Road Safety Corps',
    documentReference: '22-page PDF; Appendix B (p. 20) — Legacy Number Plate & Driver Licence Fee Schedule; Customer Care & Complaint Mechanism pp. 13–16',
    notes: "Publicly linked from the official FRSC documentation menu (HTTP 200 on 31 October 2026). Appendix B (p. 20) still prints legacy pre-revision rates (₦12,500 standard motor vehicle plate, ₦40,000 out-of-series plate, ₦20,000 articulated plate, ₦15,000 government plate, ₦2,500 motorcycle plate, ₦30,000 dealer plate, and ₦6,000 3-year NDL). Those legacy rates conflict with the revised JTB/FRSC schedule in the April 2026 SLA (Printed p. 12; PDF p. 12).",
  },
  'frsc-contact-page': {
    title: 'Contact Us — Federal Road Safety Corps',
    sourceType: 'official_process_page',
    url: 'https://frsc.gov.ng/contact-us',
    publicationDate: null,
    effectiveDate: null,
    lastChecked: reviewed,
    evidenceTier: 2,
    publisher: 'Federal Road Safety Corps',
    documentReference: 'Official FRSC headquarters address (No. 4 Maputo Street, Wuse Zone 3, Abuja), emergency toll-free number 122, 0700-CALL-FRSC and email contacts',
    notes: 'Publicly accessible official FRSC contact page (HTTP 200 on 31 October 2026). Used alongside the SLA SERVICOM channels (servicom@frsc.gov.ng, 09139600034, 09139600096) for official enquiries and complaints.',
  },
};

const tripartiteAuthorityNote = 'Multi-authority governance (FRSC / VIO / State IRS & JTB): FRSC designs and produces the National Driver\'s Licence and Number Plates and captures biometrics at Driver\'s Licence Centres (DLCs); State Vehicle Inspection Officers (VIO) conduct driver proficiency testing; State Boards of Internal Revenue (SBIR / FCT-IRS) and Motor Licensing Authorities (MLA / MVAA) determine state collectible charges through the Joint Tax Board (JTB), confirm payments and distribute permanent cards/plates.';

const licenceSeparateCostsCondition = 'Baseline JTB/FRSC licence fee only. Excludes separate Learner\'s Permit fee (set by State BIR/MVAA), accredited driving-school training fee, VIO driving test fee, medical examination fee (where applicable), state administrative charges and bank/payment-gateway transaction charges.';

function fee(label, pricingModel, currency, amount, sourceKeys, sourcePage, evidenceNote, extra = {}) {
  return {
    label,
    pricingModel,
    currency,
    amount,
    minimumAmount: extra.minimumAmount ?? null,
    maximumAmount: extra.maximumAmount ?? null,
    percentage: extra.percentage ?? null,
    formula: extra.formula ?? null,
    conditions: extra.conditions ?? null,
    notes: extra.notes ?? null,
    verificationStatus: extra.verificationStatus || 'verified',
    sourceKeys,
    page: sourcePage,
    evidenceNote,
  };
}

const services = [
  // 1–4: Preserve the existing 4 Batch-1 slugs first, ordered prominently for common user needs
  {
    slug: 'drivers-licence-other-classes-3-years',
    name: "Driver's licence — motor vehicle (other classes, 3 years)",
    category: "Driver's licence (new, renewal & replacement)",
    jurisdiction: 'Federal baseline (with State IRS / VIO / MVAA steps)',
    description: "Three-year National Driver's Licence for motor vehicles (Private, Commercial/Professional and other non-Class A categories), covering fresh applications, renewals and re-issues.",
    requirements: [
      'Minimum age of 18 years for a Private Driver\'s Licence, or 26 years with an existing Private Driver\'s Licence for a Commercial/Professional Driver\'s Licence.',
      'For fresh applicants: valid Learner\'s Permit issued by State BIR/MVAA, DSSP completion certificate code (26 sessions + CBT with at least 60% score, valid for 6 months) from an FRSC-accredited driving school, and VIO Driver\'s Test Certificate.',
      'For renewals: existing National Driver\'s Licence (renewable within 1 calendar month before expiration; SLA p. 7 states a VIO retest applies if 6 months have elapsed since holding a valid licence).',
      'For lost or damaged replacement: police extract and court sworn affidavit as required on the NDL portal.',
      'Vision Acuity Test at the FRSC Driver\'s Licence Centre (DLC) and in-person biometric capture (unless eligible for odd-renewal Bypass Capture).',
    ],
    processSteps: [
      'Fresh applicants first obtain a Learner\'s Permit from the State BIR/MVAA, complete 26 training sessions and CBT at an accredited driving school (https://dssp.frsc.gov.ng/), and pass the VIO proficiency test.',
      'Complete the National Driver\'s Licence application or renewal form online on https://nigeriadriverslicence.frsc.gov.ng/.',
      'Pay the prescribed ₦15,000 fee online or at a designated bank/payment channel and have payment confirmed by the State Board of Internal Revenue (BIR) / MVAA.',
      'Attend the FRSC Driver\'s Licence Centre (DLC) in person for Vision Acuity Test and biometric capture (fingerprints, facial photo and signature) to receive a Temporary Driver\'s Licence valid for 60 days (odd renewals 1st, 3rd, 5th, 7th may use Bypass Capture online).',
      'Collect the permanent National Driver\'s Licence in person from the State IRS / MVAA office after FRSC production (service standard: 60 days from temporary card issuance at the DLC).',
    ],
    notes: `${tripartiteAuthorityNote} Service standard timeline: 60 days from issuance of the Temporary Driver's Licence at the FRSC DLC.`,
    officialActionUrl: 'https://nigeriadriverslicence.frsc.gov.ng/',
    officialChannelType: 'portal',
    paymentGuide: 'Apply through the official Nigeria Driver\'s Licence portal (https://nigeriadriverslicence.frsc.gov.ng/) and pay through the approved portal/bank channel. Keep State BIR learner permit, driving school, VIO test and bank charges separate from the ₦15,000 licence fee.',
    feeOptions: [
      fee(
        "Motor vehicle driver's licence (3-year validity — fresh, renewal or replacement)",
        'fixed',
        'NGN',
        15000,
        ['frsc-drivers-licence-faq', 'frsc-ndl-portal', 'frsc-services-page'],
        'Official NDL FAQ; SLA Printed pp. 6–9, PDF pp. 6–9',
        "The official Nigeria Driver's Licence FAQ and the April 2026 SLA (pp. 6–9) both state ₦15,000 for a 3-year motor vehicle driver's licence. Note: the older FRSC Service Charter Appendix B (p. 20) still prints a superseded ₦6,000 rate.",
        {
          conditions: licenceSeparateCostsCondition,
          notes: 'Applies to 3-year Motor Vehicle Driver\'s Licence (New, Renewal, Commercial/Professional). Do not treat this baseline fee as the total out-of-pocket cost in FCT or states where learner permit, driving school, VIO test or state administrative fees apply.',
        },
      ),
    ],
  },
  {
    slug: 'drivers-licence-other-classes-5-years',
    name: "Driver's licence — motor vehicle (other classes, 5 years)",
    category: "Driver's licence (new, renewal & replacement)",
    jurisdiction: 'Federal baseline (with State IRS / VIO / MVAA steps)',
    description: "Five-year National Driver's Licence for motor vehicles (Private, Commercial/Professional and other non-Class A categories), covering fresh applications, renewals and re-issues.",
    requirements: [
      'Minimum age of 18 years for a Private Driver\'s Licence, or 26 years with an existing Private Driver\'s Licence for a Commercial/Professional Driver\'s Licence.',
      'For fresh applicants: valid Learner\'s Permit issued by State BIR/MVAA, DSSP completion certificate code (26 sessions + CBT with at least 60% score, valid for 6 months) from an FRSC-accredited driving school, and VIO Driver\'s Test Certificate.',
      'For renewals: existing National Driver\'s Licence (renewable within 1 calendar month before expiration; SLA p. 7 states a VIO retest applies if 6 months have elapsed since holding a valid licence).',
      'Vision Acuity Test at the FRSC Driver\'s Licence Centre (DLC) and in-person biometric capture (unless eligible for odd-renewal Bypass Capture).',
    ],
    processSteps: [
      'Fresh applicants first obtain a Learner\'s Permit from the State BIR/MVAA, complete 26 training sessions and CBT at an accredited driving school (https://dssp.frsc.gov.ng/), and pass the VIO proficiency test.',
      'Complete the National Driver\'s Licence application or renewal form online on https://nigeriadriverslicence.frsc.gov.ng/ and select 5-year validity.',
      'Pay the prescribed ₦21,000 fee online or at a designated bank/payment channel and have payment confirmed by the State Board of Internal Revenue (BIR) / MVAA.',
      'Attend the FRSC Driver\'s Licence Centre (DLC) in person for Vision Acuity Test and biometric capture to receive a Temporary Driver\'s Licence valid for 60 days (unless eligible for odd-renewal Bypass Capture).',
      'Collect the permanent National Driver\'s Licence in person from the State IRS / MVAA office after FRSC production (service standard: 60 days from temporary card issuance at the DLC).',
    ],
    notes: `${tripartiteAuthorityNote} Service standard timeline: 60 days from issuance of the Temporary Driver's Licence at the FRSC DLC.`,
    officialActionUrl: 'https://nigeriadriverslicence.frsc.gov.ng/',
    officialChannelType: 'portal',
    paymentGuide: 'Apply through the official Nigeria Driver\'s Licence portal (https://nigeriadriverslicence.frsc.gov.ng/) and select 5-year validity. Keep State BIR learner permit, driving school, VIO test and bank charges separate from the ₦21,000 licence fee.',
    feeOptions: [
      fee(
        "Motor vehicle driver's licence (5-year validity — fresh, renewal or replacement)",
        'fixed',
        'NGN',
        21000,
        ['frsc-drivers-licence-faq', 'frsc-ndl-portal', 'frsc-services-page'],
        'Official NDL FAQ; SLA Printed pp. 6–9, PDF pp. 6–9',
        "The official Nigeria Driver's Licence FAQ and the April 2026 SLA (pp. 6–9) both state ₦21,000 for a 5-year motor vehicle driver's licence.",
        {
          conditions: licenceSeparateCostsCondition,
          notes: 'Applies to 5-year Motor Vehicle Driver\'s Licence (New, Renewal, Commercial/Professional). Excludes separate driving school, learner permit, VIO test and bank/gateway charges.',
        },
      ),
    ],
  },
  {
    slug: 'drivers-licence-class-a-3-years',
    name: "Driver's licence — Class A motorcycle / tricycle (3 years)",
    category: "Driver's licence (new, renewal & replacement)",
    jurisdiction: 'Federal baseline (with State IRS / VIO / MVAA steps)',
    description: "Three-year Class A National Driver's / Rider's Licence for motorcycles and tricycles, covering fresh applications, renewals and re-issues.",
    requirements: [
      'Minimum age of 18 years (or 26 years for Commercial/Professional rider category).',
      'For fresh rider applicants: valid Learner\'s Permit from State BIR/MVAA, DSSP Rider Certification code (7 training sessions of at least 1 hour each + 8th session physical capture and CBT with at least 60% score, valid for 6 months), and VIO proficiency test certificate.',
      'Vision Acuity Test and in-person biometric capture at an FRSC Driver\'s Licence Centre (DLC).',
    ],
    processSteps: [
      'Fresh rider applicants obtain a Learner\'s Permit from State BIR/MVAA, complete the 8-session Rider Certification programme at an accredited driving school (https://dssp.frsc.gov.ng/), and pass the VIO test.',
      'Complete the Class A application or renewal online at https://nigeriadriverslicence.frsc.gov.ng/ and select 3-year validity.',
      'Pay the prescribed ₦7,000 fee via the approved portal/bank channel and confirm payment with State BIR/MVAA.',
      'Complete Vision Acuity Test and biometric capture at the FRSC DLC to receive a 60-day Temporary Licence, then collect the permanent card from State IRS/MVAA after 60 days.',
    ],
    notes: `${tripartiteAuthorityNote} Service standard timeline: 60 days from issuance of the Temporary Licence at the FRSC DLC.`,
    officialActionUrl: 'https://nigeriadriverslicence.frsc.gov.ng/',
    officialChannelType: 'portal',
    paymentGuide: 'Apply through the official Nigeria Driver\'s Licence portal (https://nigeriadriverslicence.frsc.gov.ng/) and select Class A (3 years). Payment-channel, learner permit, driving school and VIO test charges are separate.',
    feeOptions: [
      fee(
        "Class A motorcycle / tricycle rider's licence (3-year validity)",
        'fixed',
        'NGN',
        7000,
        ['frsc-drivers-licence-faq', 'frsc-ndl-portal', 'frsc-services-page'],
        'Official NDL FAQ; SLA Printed pp. 6, 9, PDF pp. 6, 9',
        "The official Nigeria Driver's Licence FAQ and the April 2026 SLA (pp. 6, 9) both state ₦7,000 for a 3-year Class A (motorcycle and tricycle) licence.",
        {
          conditions: licenceSeparateCostsCondition,
          notes: 'Applies to 3-year Class A (motorcycle/tricycle) licence. Excludes separate learner permit, driving school, VIO test and payment-gateway charges.',
        },
      ),
    ],
  },
  {
    slug: 'drivers-licence-class-a-5-years',
    name: "Driver's licence — Class A motorcycle / tricycle (5 years)",
    category: "Driver's licence (new, renewal & replacement)",
    jurisdiction: 'Federal baseline (with State IRS / VIO / MVAA steps)',
    description: "Five-year Class A National Driver's / Rider's Licence for motorcycles and tricycles, covering fresh applications, renewals and re-issues.",
    requirements: [
      'Minimum age of 18 years (or 26 years for Commercial/Professional rider category).',
      'For fresh rider applicants: valid Learner\'s Permit from State BIR/MVAA, DSSP Rider Certification code (7 training sessions of at least 1 hour each + 8th session physical capture and CBT with at least 60% score, valid for 6 months), and VIO proficiency test certificate.',
      'Vision Acuity Test and in-person biometric capture at an FRSC Driver\'s Licence Centre (DLC).',
    ],
    processSteps: [
      'Fresh rider applicants obtain a Learner\'s Permit from State BIR/MVAA, complete the 8-session Rider Certification programme at an accredited driving school (https://dssp.frsc.gov.ng/), and pass the VIO test.',
      'Complete the Class A application or renewal online at https://nigeriadriverslicence.frsc.gov.ng/ and select 5-year validity.',
      'Pay the prescribed ₦11,000 fee via the approved portal/bank channel and confirm payment with State BIR/MVAA.',
      'Complete Vision Acuity Test and biometric capture at the FRSC DLC to receive a 60-day Temporary Licence, then collect the permanent card from State IRS/MVAA after 60 days.',
    ],
    notes: `${tripartiteAuthorityNote} Service standard timeline: 60 days from issuance of the Temporary Licence at the FRSC DLC.`,
    officialActionUrl: 'https://nigeriadriverslicence.frsc.gov.ng/',
    officialChannelType: 'portal',
    paymentGuide: 'Apply through the official Nigeria Driver\'s Licence portal (https://nigeriadriverslicence.frsc.gov.ng/) and select Class A (5 years). Payment-channel, learner permit, driving school and VIO test charges are separate.',
    feeOptions: [
      fee(
        "Class A motorcycle / tricycle rider's licence (5-year validity)",
        'fixed',
        'NGN',
        11000,
        ['frsc-drivers-licence-faq', 'frsc-ndl-portal', 'frsc-services-page'],
        'Official NDL FAQ; SLA Printed pp. 6, 9, PDF pp. 6, 9',
        "The official Nigeria Driver's Licence FAQ and the April 2026 SLA (pp. 6, 9) both state ₦11,000 for a 5-year Class A (motorcycle and tricycle) licence.",
        {
          conditions: licenceSeparateCostsCondition,
          notes: 'Applies to 5-year Class A (motorcycle/tricycle) licence. Excludes separate learner permit, driving school, VIO test and payment-gateway charges.',
        },
      ),
    ],
  },

  // 5: Commercial / Professional Driver's Licence
  {
    slug: 'frsc-commercial-professional-drivers-licence',
    name: "Commercial or Professional Driver's Licence",
    category: "Driver's licence (new, renewal & replacement)",
    jurisdiction: 'Federal baseline (with Government Hospital, VIO & State IRS steps)',
    description: "Issuance of a Commercial or Professional National Driver's Licence for drivers employed by registered transport companies or belonging to recognised transport associations.",
    requirements: [
      'Applicant must NOT be below 26 years of age and must already possess a valid Private Driver\'s Licence.',
      'Evidence of membership of a professional transport association (such as NURTW or NARTO) or letter of employment from a registered transport company.',
      'Medical Certificate of Fitness from a designated Government Hospital covering: (1) Blood pressure/hypertension, (2) Visual acuity & colour blindness, (3) Blood sugar, (4) Arthritis, (5) Electroencephalogram (EEG) screening for epilepsy, and (6) Ear examination.',
      'Pass the VIO driving proficiency test and obtain a Driver\'s Test Certificate (unsuccessful applicants wait 1 calendar month before re-examination).',
      'Vision Acuity Test and in-person biometric capture at an FRSC Driver\'s Licence Centre (DLC).',
    ],
    processSteps: [
      'Obtain the required Medical Certificate of Fitness from a designated Government Hospital and evidence of NURTW/NARTO membership or company employment.',
      'Undergo the driving proficiency test with the State Vehicle Inspection Officer (VIO) and obtain the Driver\'s Test Certificate.',
      'Complete the application on https://nigeriadriverslicence.frsc.gov.ng/, pay the prescribed licence fee (₦15,000 for 3 years or ₦21,000 for 5 years for motor vehicles; ₦7,000 for 3 years or ₦11,000 for 5 years for motorcycles/tricycles), and confirm payment at State BIR/MVAA.',
      'Present documents and complete Vision Acuity Test and biometric capture at the FRSC DLC to receive a 60-day Temporary Driver\'s Licence.',
      'Collect the permanent Commercial/Professional Driver\'s Licence at the State IRS/MVAA after 60 days.',
    ],
    notes: `SLA Printed pp. 8–9; PDF pp. 8–9. ${tripartiteAuthorityNote} Service standard timeline: 60 days from issuance of the Temporary Driver's Licence at the FRSC DLC.`,
    officialActionUrl: 'https://nigeriadriverslicence.frsc.gov.ng/',
    officialChannelType: 'portal',
    paymentGuide: 'Apply through https://nigeriadriverslicence.frsc.gov.ng/. Government hospital medical examination fees, VIO test charges and bank/gateway charges are separate from the baseline licence fee.',
    feeOptions: [
      fee(
        'Commercial / Professional Motor Vehicle Licence — 3 years',
        'fixed',
        'NGN',
        15000,
        ['frsc-drivers-licence-faq', 'frsc-ndl-portal', 'frsc-services-page'],
        'Official NDL FAQ; SLA Printed p. 9, PDF p. 9',
        'The official NDL FAQ confirms ₦15,000 for 3-year motor vehicle classes; SLA p. 9 specifies the same ₦15,000 rate and the age 26+, medical fitness and association/employer requirements for Commercial/Professional licences.',
        { conditions: `${licenceSeparateCostsCondition} Government hospital medical examination (including EEG) is billed separately by the hospital.` },
      ),
      fee(
        'Commercial / Professional Motor Vehicle Licence — 5 years',
        'fixed',
        'NGN',
        21000,
        ['frsc-drivers-licence-faq', 'frsc-ndl-portal', 'frsc-services-page'],
        'Official NDL FAQ; SLA Printed p. 9, PDF p. 9',
        'The official NDL FAQ confirms ₦21,000 for 5-year motor vehicle classes; SLA p. 9 specifies the same ₦21,000 rate for 5-year Commercial/Professional motor vehicle licences.',
        { conditions: `${licenceSeparateCostsCondition} Government hospital medical examination (including EEG) is billed separately by the hospital.` },
      ),
      fee(
        'Commercial / Professional Motorcycle or Tricycle Licence (Class A) — 3 years',
        'fixed',
        'NGN',
        7000,
        ['frsc-drivers-licence-faq', 'frsc-ndl-portal', 'frsc-services-page'],
        'Official NDL FAQ; SLA Printed p. 9, PDF p. 9',
        'The official NDL FAQ and SLA p. 9 state ₦7,000 for a 3-year Class A (tricycle/motorcycle) rider licence.',
        { conditions: licenceSeparateCostsCondition },
      ),
      fee(
        'Commercial / Professional Motorcycle or Tricycle Licence (Class A) — 5 years',
        'fixed',
        'NGN',
        11000,
        ['frsc-drivers-licence-faq', 'frsc-ndl-portal', 'frsc-services-page'],
        'Official NDL FAQ; SLA Printed p. 9, PDF p. 9',
        'The official NDL FAQ and SLA p. 9 state ₦11,000 for a 5-year Class A (tricycle/motorcycle) rider licence.',
        { conditions: licenceSeparateCostsCondition },
      ),
    ],
  },

  // 6: Foreign Driver's Licence Reciprocity
  {
    slug: 'frsc-foreign-drivers-licence-reciprocity',
    name: "Foreign Driver's Licence Reciprocity (conversion to Nigerian Driver's Licence)",
    category: "Driver's licence (new, renewal & replacement)",
    jurisdiction: 'Federal (FRSC DLC, RSHQ Abuja Foreign Desk, VIO & State BIR)',
    description: "Conversion of a valid foreign driver's licence into a Nigerian National Driver's Licence through FRSC reciprocity verification and VIO re-testing, bypassing the 26-session driving school training.",
    requirements: [
      'Data page of International Passport.',
      'Valid Foreign Driver\'s Licence.',
      'Proof of residence in Nigeria.',
      'Letter of authentication or Driving History from the country of origin / issuance of the foreign licence.',
      'Driver\'s Test Certificate issued by the State VIO / Testing Officer after a proficiency re-test.',
    ],
    processSteps: [
      'Stage 1: Report physically to the Sector or Unit Head of the FRSC Driver\'s Licence Centre (DLC) with the foreign licence, passport data page, proof of residence and authentication/driving history.',
      'Stage 2: Undergo a driving re-test conducted by the State VIO/Testing Officer to obtain a Driver\'s Test Certificate.',
      'Stage 3: The DLC scans and forwards all required documents to the FRSC National Headquarters (RSHQ) Abuja Foreign Desk Officer via foreigndriverslicence@frsc.gov.ng.',
      'Stage 4: The Reviewing Officer and Approving Officer at RSHQ review and approve the application on the DSSP portal to generate a unique identity number without the 26-session driving school requirement.',
      'Stage 5: Complete the driver\'s licence form online or at the centre using the generated code, pay the applicable fee via bank/e-payment, and obtain payment confirmation from the State Board of Internal Revenue (BIR).',
      'Stage 6: Complete in-person biometric capture at the FRSC DLC to receive a Temporary Driver\'s Licence while the permanent card is produced.',
    ],
    notes: 'SLA Printed pp. 9–10; PDF pp. 9–10. Neither the April 2026 SLA nor current public FRSC pages state whether reciprocity applicants pay only the standard NDL class fee or an additional reciprocity verification charge. The fee therefore remains pending.',
    officialActionUrl: 'https://nigeriadriverslicence.frsc.gov.ng/',
    officialChannelType: 'portal',
    paymentGuide: 'Start in person at an FRSC Driver\'s Licence Centre (DLC) for document verification and VIO re-test before paying through the State BIR-confirmed portal/bank route.',
    feeOptions: [
      fee(
        "Foreign driver's licence reciprocity fee",
        'unknown',
        'NGN',
        null,
        ['frsc-ndl-portal', 'frsc-services-page'],
        'SLA Printed pp. 9–10, PDF pp. 9–10',
        'SLA Stage 5 (p. 10) states that the applicant makes payment through the bank/e-payment platform confirmed by the State Board of Internal Revenue, but does not state a specific reciprocity fee amount. No public FRSC schedule independently establishes the total reciprocity fee.',
        {
          verificationStatus: 'pending',
          conditions: 'Requires in-person submission at an FRSC DLC, VIO re-test, RSHQ Foreign Desk approval (foreigndriverslicence@frsc.gov.ng) and State BIR payment confirmation.',
          notes: 'Missing price in the SLA is recorded as pending/unknown, not free.',
        },
      ),
    ],
  },

  // 7: Driver's Licence Online Verification & Default Approval
  {
    slug: 'frsc-drivers-licence-online-verification',
    name: "National Driver's Licence Online Verification & Driving Record Extract",
    category: 'Verification & clearance',
    jurisdiction: 'Federal (FRSC National Headquarters / Online Verification Portal)',
    description: "Official FRSC verification of a Nigerian National Driver's Licence and issuance of an official verification report/driving record extract addressed to an established organisation (embassy, foreign licensing authority, government body, private company or NGO).",
    requirements: [
      'Account registration on https://ndlverification.frsc.gov.ng/ with valid contact details.',
      'Signed formal Application Letter.',
      'Clear front and back scan/upload of the Nigerian National Driver\'s Licence.',
      'Valid means of identification (Voter\'s Card, International Passport or NIN).',
      'Full official receiver address of an established organisation (Private, Government or NGO). Personal or residential delivery addresses are not accepted.',
    ],
    processSteps: [
      'Sign up or log in at https://ndlverification.frsc.gov.ng/ and verify your account via the emailed link.',
      'Complete the verification request form, providing the receiving organisation\'s address (not a personal address).',
      'Upload the signed application letter, front and back of the driver\'s licence, and valid ID.',
      'Pay the applicable verification and/or shipping fee online via Remita using a debit card and retain the confirmation receipt.',
      'Track processing on the portal: the public portal FAQ states 3–10 working days for in-house verification plus shipping. Under SLA Item 28 (pp. 26–27), a 10-working-day service standard and Default Approval procedure apply to complete, unflagged requests.',
    ],
    notes: 'Public portal: https://ndlverification.frsc.gov.ng/ and /faqs. SLA Printed pp. 10–11, 26–27; PDF pp. 10–11, 26–27. Default Approval applies ONLY to driver\'s record verification requests not decided or queried within 10 working days from receipt of a complete, paid application, excluding: (a) flagged records under investigation, (b) unsigned application, (c) irregular/cut-and-paste signature, (d) wrong licence uploaded, (e) no agency receiver address, (f) security/sensitive cases, and (g) face mismatch.',
    officialActionUrl: 'https://ndlverification.frsc.gov.ng/',
    officialChannelType: 'portal',
    paymentGuide: 'Apply only on https://ndlverification.frsc.gov.ng/. Because the ₦50,000 figure appears only in the confidential SLA copy (p. 11) and is not published on the public portal FAQ, confirm the exact Remita verification/shipping charge displayed inside the official portal before paying.',
    feeOptions: [
      fee(
        "Driver's licence verification and/or shipping charge",
        'unknown',
        'NGN',
        null,
        ['frsc-ndl-verification-portal', 'frsc-official-website'],
        'Public portal FAQ (https://ndlverification.frsc.gov.ng/faqs); SLA Printed pp. 10–11, 26–27, PDF pp. 10–11, 26–27',
        'The live public portal FAQ states: "You will be required to make payment for verification or shipping fee or both using the debit card" without publishing a numeric price. The supplied April 2026 SLA (marked -CONFIDENTIAL-, p. 11) mentions "payment of N50,000 for verification or shipping through REMITA", which is not independently substantiated on any non-confidential public FRSC page.',
        {
          verificationStatus: 'pending',
          conditions: 'Processed verification documents are addressed only to established organisations (Private, Government or NGO), never to personal addresses. Standard timeline: 10 working days (3–10 working days in-house verification on portal FAQ).',
          notes: 'Marked pending under the FeeLens confidentiality and public-evidence rule because the ₦50,000 SLA figure lacks independent non-confidential public substantiation.',
        },
      ),
    ],
  },

  // 8: Driver & Rider Certification from Accredited Driving Schools (DSSP)
  {
    slug: 'frsc-driving-school-driver-and-rider-certification',
    name: 'Driver and Rider Certification from Accredited Driving Schools (DSSP)',
    category: 'Driving schools & certification (DSSP)',
    jurisdiction: 'Federal (FRSC DSSP) & State BIR/MVAA (Learner\'s Permit)',
    description: 'Mandatory pre-licensing training, physical capture and Computer Based Test (CBT) at an FRSC-accredited driving school under the Driving School Standardization Programme (DSSP) for fresh motor vehicle drivers (26 sessions) and motorcycle/tricycle riders (8 sessions).',
    requirements: [
      'Registration with an FRSC-accredited driving school listed on https://dssp.frsc.gov.ng/.',
      'Valid Learner\'s Permit obtained from the State Board of Internal Revenue (BIR) / Motor Licensing Authority.',
      'For Motor Vehicle Driver Certification (SLA pp. 23–24): completion of 25 theoretical and practical training sessions of at least 1 hour each, followed by physical capture and CBT on the 26th session (minimum pass mark: 60%; 7-day wait to rewrite if below 60%).',
      'For Motorcycle/Tricycle Rider Certification (SLA pp. 24–25): completion of 7 theoretical and practical training sessions of at least 1 hour each, followed by physical capture and CBT on the 8th session (minimum pass mark: 60%; 7-day wait to rewrite if below 60%).',
    ],
    processSteps: [
      'Visit https://dssp.frsc.gov.ng/ to choose a certified driving school and enrol.',
      'Obtain a Learner\'s Permit from the State Board of Internal Revenue (BIR) / MVAA so the driving school can log your permit number on the DSSP portal.',
      'Complete the mandatory training sessions (25 sessions for motor vehicle drivers; 7 sessions for motorcycle/tricycle riders) of at least 1 hour per session.',
      'Attend the final session (26th session for drivers; 8th session for riders) for physical capture and the Computer Based Test (CBT); score at least 60% to pass (or wait 7 days to re-sit).',
      'Receive the DSSP Driving/Rider Certificate code (valid for 6 months) and proceed to https://nigeriadriverslicence.frsc.gov.ng/ and the VIO driving test.',
    ],
    notes: 'SLA Printed pp. 23–25; PDF pp. 23–25; Public DSSP portal: https://dssp.frsc.gov.ng/. The DSSP certificate is valid for 6 months from issuance.',
    officialActionUrl: 'https://dssp.frsc.gov.ng/',
    officialChannelType: 'portal',
    paymentGuide: 'Select an accredited driving school on https://dssp.frsc.gov.ng/. Learner\'s Permit fees are paid to your State BIR/MVAA, and training tuition is paid to the accredited driving school.',
    feeOptions: [
      fee(
        "Motor vehicle driver DSSP training (26 sessions + CBT) & State BIR Learner's Permit",
        'variable',
        'NGN',
        null,
        ['frsc-dssp-portal', 'frsc-drivers-licence-faq', 'frsc-services-page'],
        'Public DSSP portal; SLA Printed pp. 23–24, PDF pp. 23–24',
        'Official FRSC sources confirm mandatory enrolment at an accredited driving school and a State BIR Learner\'s Permit, but neither the SLA nor the public DSSP portal fixes a uniform national tuition or Learner\'s Permit tariff.',
        {
          verificationStatus: 'pending',
          conditions: '25 training sessions (minimum 1 hour each) + 26th session physical capture and CBT (60% pass mark; 6-month certificate validity). Tuition varies by accredited driving school; Learner\'s Permit fee is set by the relevant State BIR/MVAA.',
          notes: 'Separate from the ₦15,000 / ₦21,000 National Driver\'s Licence fee.',
        },
      ),
      fee(
        "Motorcycle / tricycle rider DSSP training (8 sessions + CBT) & State BIR Learner's Permit",
        'variable',
        'NGN',
        null,
        ['frsc-dssp-portal', 'frsc-drivers-licence-faq', 'frsc-services-page'],
        'Public DSSP portal; SLA Printed pp. 24–25, PDF pp. 24–25',
        'The SLA (pp. 24–25) specifies 7 training sessions + 8th session physical capture and CBT for riders, with Learner\'s Permit issued by State BIR and tuition set by the accredited driving school.',
        {
          verificationStatus: 'pending',
          conditions: '7 training sessions (minimum 1 hour each) + 8th session physical capture and CBT (60% pass mark; 6-month certificate validity). Tuition varies by accredited driving school; Learner\'s Permit fee is set by State BIR/MVAA.',
          notes: 'Separate from the ₦7,000 / ₦11,000 Class A Rider\'s Licence fee.',
        },
      ),
    ],
  },

  // 9: Driving School Registration & Certification (DSSP Operator Accreditation)
  {
    slug: 'frsc-driving-school-registration-and-accreditation',
    name: 'Driving School Registration, Certification and Branch Accreditation (DSSP)',
    category: 'Driving schools & certification (DSSP)',
    jurisdiction: 'Federal (FRSC Sector Commands & National Headquarters)',
    description: 'Registration, facility inspection, certification and annual permit renewal for corporate or individual operators establishing a main or branch driving school in Nigeria under the FRSC Driving School Standardization Programme (DSSP).',
    requirements: [
      'Completed application form (Form TSC0001 in the public SOP; Form TRG00001 in the April 2026 SLA) via https://dssp.frsc.gov.ng/ or the nearest FRSC Command.',
      'CAC Certificate of Incorporation / Business Name registration and current Tax Clearance Certificate.',
      'Required instructional facilities and equipment: Conducive classroom, Administrative office, Functional convenience, Practice/manoeuvring range, Roadworthy learner vehicles (at least 1 vehicle per category applied for, fitted with dual brake/clutch controls, First Aid box, fire extinguisher, L-plates and school name), Highway Code, traffic-sign charts, magnetic board, workbench/car Engines & Gear system, desktop computer with internet access, driving simulator and projector.',
      'Qualified instructors holding a valid certificate from an FRSC-accredited driving school and a valid National Driver\'s Licence with at least 3 years driving experience without conviction for drunken driving.',
    ],
    processSteps: [
      'Obtain and complete the driving school registration form on https://dssp.frsc.gov.ng/ or at the nearest FRSC Command (if opening a branch, apply as a new school with a copy of the main school\'s approval certificate).',
      'FRSC Sector Command DSSP committee conducts physical inspection of the proposed school\'s classroom, range, vehicles, simulator, instructional aids and instructors.',
      'Sector Commander forwards the inspection report to FRSC National Headquarters (RSHQ) Abuja within 1 week of inspection.',
      'Following RSHQ verification and approval, FRSC issues a Certificate of Compliance (valid for 1 year and renewable annually upon re-inspection) and activates portal access on https://dssp.frsc.gov.ng/.',
    ],
    notes: 'Public SOP: https://staging.frsc.gov.ng/frsc-admin/uploads/sopds_e1cd918588.pdf (pp. 1–7); SLA Printed pp. 21–23, PDF pp. 21–23. Service standard in SLA: Sector Command forwards inspection report to RSHQ within 1 week; Approved Driving School Certificate is valid for 1 year and renewable annually.',
    officialActionUrl: 'https://dssp.frsc.gov.ng/',
    officialChannelType: 'portal',
    paymentGuide: 'Apply through https://dssp.frsc.gov.ng/ or the nearest FRSC Sector Command. Confirm with FRSC whether a registration fee currently applies under Form TRG00001 before making payment.',
    feeOptions: [
      fee(
        'Driving school registration and certification (Form TSC0001 / TRG00001)',
        'unknown',
        'NGN',
        null,
        ['frsc-dssp-sop', 'frsc-dssp-portal', 'frsc-services-page'],
        'Public Driving School SOP p. 2 (Section 5.1); SLA Printed p. 21, PDF p. 21 (Sections B.2 & C)',
        'Official FRSC documents disagree on whether a fee applies: the public Driving School SOP (sopds_e1cd918588.pdf, Section 5.1, p. 2) states that prospective operators obtain Form TSC0001 from the nearest FRSC office "at no cost" or download it online, whereas the April 2026 SLA (Printed p. 21; PDF p. 21, Sections B.2 & C) states under Form TRG00001 that "no driving school shall be registered unless the prescribed fee is paid to the authority" without printing the numeric fee.',
        {
          verificationStatus: 'conflicting',
          conditions: 'Applies to main school and branch registration under DSSP. Approval certificate is valid for 1 year and subject to annual renewal and monthly re-inspection.',
          notes: 'Marked conflicting (with unknown amount) because the public SOP states Form TSC0001 is obtained at no cost while the 2026 SLA states a prescribed registration fee is mandatory without publishing the amount.',
        },
      ),
    ],
  },

  // 10: National Vehicle Number Plates (NVIS) — all 12 categories from SLA p. 12 compared against public Service Charter p. 20
  {
    slug: 'frsc-national-vehicle-number-plates',
    name: 'National Vehicle Number Plates & Registration (NVIS — 12 categories)',
    category: 'Vehicle number plates (NVIS)',
    jurisdiction: 'Federal production (FRSC NVIS) & State BIR / MLA costing and collection',
    description: 'Production, registration, revalidation and verification of National Vehicle Number Plates across 12 private, commercial, motorcycle, articulated, out-of-series, fancy, dealer and government categories through the National Vehicle Identification Scheme (NVIS) and State Boards of Internal Revenue (SBIR).',
    requirements: [
      'Completed Form MVA 01 on https://nvis.frsc.gov.ng/ (30 mandatory fields: 17 vehicle description fields including chassis/VIN, engine number, make/model, colour and capacity, plus 13 owner identification and contact fields).',
      'Custom duty papers / original purchase receipt / proof of ownership and valid identification (NIN / Driver\'s Licence / CAC documents for corporate bodies).',
      'Police verification and physical vehicle inspection endorsement.',
      'Costing assessment and payment confirmation by the State Board of Internal Revenue (SBIR) / Motor Licensing Authority (MLA).',
    ],
    processSteps: [
      'Initiate vehicle registration on https://nvis.frsc.gov.ng/VehicleManagement/RegisterVehicle (or revalidation at /VehicleManagement/Revalidation) to complete Form MVA 01, or obtain Form MVA 01 at the State Motor Licensing Authority (MLA).',
      'Submit the form to the State Board of Internal Revenue (SBIR) / MLA for official costing and undergo Police verification and vehicle inspection.',
      'Pay the assessed plate and registration charges into the designated State BIR / treasury bank account and obtain payment confirmation.',
      'FRSC NVIS Desk Officer captures the verified vehicle and owner biometrics/data into the NVIS portal.',
      'State BIR prints the Proof of Ownership Certificate (POC) and issues the physical National Vehicle Number Plate.',
    ],
    notes: `Public NVIS portal: https://nvis.frsc.gov.ng/; Public FRSC Service Charter Appendix B (p. 20); SLA Printed pp. 11–12, PDF pp. 11–12. ${tripartiteAuthorityNote} Because the public FRSC Service Charter PDF still lists legacy pre-revision plate rates (e.g. ₦12,500 standard motor vehicle, ₦2,500 motorcycle) while the restricted April 2026 SLA (p. 12) lists the revised 12-category JTB schedule (e.g. ₦30,000 standard motor vehicle, ₦12,000 motorcycle, ₦400,000 fancy) and notes that costing is done by State BIR, all 12 categories are preserved with their exact amounts and marked conflicting/pending state BIR confirmation.`,
    officialActionUrl: 'https://nvis.frsc.gov.ng/',
    officialChannelType: 'portal',
    paymentGuide: 'Start on https://nvis.frsc.gov.ng/ and complete costing and payment only through your State Board of Internal Revenue (SBIR) / Motor Licensing Authority (MLA). Note that State BIRs often bundle vehicle licence, roadworthiness, insurance and Proof of Ownership charges with the number plate fee.',
    feeOptions: [
      fee(
        '1. Standard Private Motor Vehicle Number Plate',
        'fixed',
        'NGN',
        30000,
        ['frsc-nvis-portal', 'frsc-service-charter', 'frsc-services-page'],
        'SLA Printed p. 12, PDF p. 12 (Row 1); FRSC Service Charter Appendix B p. 20',
        'The April 2026 SLA (p. 12, Row 1) lists Standard Private Motor Vehicle Number Plate at ₦30,000 (JTB revised baseline), whereas the publicly hosted FRSC Service Charter Appendix B (p. 20) still prints the legacy ₦12,500 rate and the public NVIS portal does not publish a fee table.',
        {
          verificationStatus: 'conflicting',
          conditions: 'Baseline plate fee only; SLA p. 11 states "Costing is done by State Board of Internal Revenue." Excludes separate state vehicle licence, roadworthiness, insurance and POC charges.',
          notes: 'Conflicting between the restricted April 2026 SLA (₦30,000) and the public FRSC Service Charter PDF (₦12,500). Confirm your State BIR/MVAA total assessment before paying.',
        },
      ),
      fee(
        '2. Standard Commercial Motor Vehicle Number Plate',
        'fixed',
        'NGN',
        30000,
        ['frsc-nvis-portal', 'frsc-service-charter', 'frsc-services-page'],
        'SLA Printed p. 12, PDF p. 12 (Row 2); FRSC Service Charter Appendix B p. 20',
        'The April 2026 SLA (p. 12, Row 2) lists Standard Commercial Motor Vehicle Number Plate at ₦30,000, whereas the publicly hosted FRSC Service Charter Appendix B (p. 20) prints the legacy ₦12,500 standard motor vehicle rate.',
        {
          verificationStatus: 'conflicting',
          conditions: 'Baseline plate fee only; costing and collection are handled by the State Board of Internal Revenue (SBIR).',
          notes: 'Conflicting between the restricted April 2026 SLA (₦30,000) and the public FRSC Service Charter PDF (₦12,500).',
        },
      ),
      fee(
        '3. Fancy Motor Vehicle Number Plate',
        'fixed',
        'NGN',
        400000,
        ['frsc-nvis-portal', 'frsc-service-charter', 'frsc-services-page'],
        'SLA Printed p. 12, PDF p. 12 (Row 3); FRSC Service Charter Appendix B p. 20',
        'The April 2026 SLA (p. 12, Row 3) lists Fancy Motor Vehicle Number Plate at ₦400,000, whereas the public FRSC Service Charter Appendix B (p. 20) prints ₦80,000 for Fancy Plates and the public NVIS portal does not publish a fee schedule.',
        {
          verificationStatus: 'conflicting',
          conditions: 'Custom/fancy motor vehicle plate produced by FRSC upon State BIR costing and Remita/bank payment.',
          notes: 'Conflicting between the restricted April 2026 SLA (₦400,000) and the public FRSC Service Charter PDF (₦80,000).',
        },
      ),
      fee(
        '4. Motorcycle Number Plate (Standard)',
        'fixed',
        'NGN',
        12000,
        ['frsc-nvis-portal', 'frsc-service-charter', 'frsc-services-page'],
        'SLA Printed p. 12, PDF p. 12 (Row 4); FRSC Service Charter Appendix B p. 20',
        'The April 2026 SLA (p. 12, Row 4) lists Motorcycle Number Plate at ₦12,000, whereas the public FRSC Service Charter Appendix B (p. 20) prints the legacy ₦2,500 rate.',
        {
          verificationStatus: 'conflicting',
          conditions: 'Standard motorcycle number plate; costing and collection are administered by State BIR.',
          notes: 'Conflicting between the restricted April 2026 SLA (₦12,000) and the public FRSC Service Charter PDF (₦2,500).',
        },
      ),
      fee(
        '5. Articulated Vehicle Number Plate',
        'fixed',
        'NGN',
        90000,
        ['frsc-nvis-portal', 'frsc-service-charter', 'frsc-services-page'],
        'SLA Printed p. 12, PDF p. 12 (Row 5); FRSC Service Charter Appendix B p. 20',
        'The April 2026 SLA (p. 12, Row 5) lists Articulated Vehicles Number Plate at ₦90,000, whereas the public FRSC Service Charter Appendix B (p. 20) prints the legacy ₦20,000 rate.',
        {
          verificationStatus: 'conflicting',
          conditions: 'Articulated motor vehicle number plate; costing and collection are administered by State BIR.',
          notes: 'Conflicting between the restricted April 2026 SLA (₦90,000) and the public FRSC Service Charter PDF (₦20,000).',
        },
      ),
      fee(
        '6. Out of Series Number Plate',
        'fixed',
        'NGN',
        150000,
        ['frsc-nvis-portal', 'frsc-service-charter', 'frsc-services-page'],
        'SLA Printed p. 12, PDF p. 12 (Row 6); FRSC Service Charter Appendix B p. 20',
        'The April 2026 SLA (p. 12, Row 6) lists Out of Series Number Plate at ₦150,000, whereas the public FRSC Service Charter Appendix B (p. 20) prints the legacy ₦40,000 rate.',
        {
          verificationStatus: 'conflicting',
          conditions: 'Out-of-series motor vehicle number plate; costing and collection are administered by State BIR.',
          notes: 'Conflicting between the restricted April 2026 SLA (₦150,000) and the public FRSC Service Charter PDF (₦40,000).',
        },
      ),
      fee(
        '7. Government Fancy Motor Vehicle Number Plate',
        'fixed',
        'NGN',
        120000,
        ['frsc-nvis-portal', 'frsc-service-charter', 'frsc-services-page'],
        'SLA Printed p. 12, PDF p. 12 (Row 7); FRSC Service Charter Appendix B p. 20',
        'The April 2026 SLA (p. 12, Row 7) lists Government Fancy Motor Vehicle Number Plate at ₦120,000, whereas the public FRSC Service Charter Appendix B (p. 20) lists Government Fancy Plate at ₦40,000.',
        {
          verificationStatus: 'conflicting',
          conditions: 'Official government fancy motor vehicle number plate.',
          notes: 'Conflicting between the restricted April 2026 SLA (₦120,000) and the public FRSC Service Charter PDF (₦40,000).',
        },
      ),
      fee(
        '8. Government Standard Motor Vehicle Number Plate',
        'fixed',
        'NGN',
        80000,
        ['frsc-nvis-portal', 'frsc-service-charter', 'frsc-services-page'],
        'SLA Printed p. 12, PDF p. 12 (Row 8); FRSC Service Charter Appendix B p. 20',
        'The April 2026 SLA (p. 12, Row 8) lists Government Standard Motor Vehicle Number Plate at ₦80,000, whereas the public FRSC Service Charter Appendix B (p. 20) lists Government Standard Plate at ₦15,000.',
        {
          verificationStatus: 'conflicting',
          conditions: 'Official government standard motor vehicle number plate.',
          notes: 'Conflicting between the restricted April 2026 SLA (₦80,000) and the public FRSC Service Charter PDF (₦15,000).',
        },
      ),
      fee(
        '9. Government Fancy Motorcycle Number Plate',
        'fixed',
        'NGN',
        50000,
        ['frsc-nvis-portal', 'frsc-service-charter', 'frsc-services-page'],
        'SLA Printed p. 12, PDF p. 12 (Row 9); FRSC Service Charter Appendix B p. 20',
        'The April 2026 SLA (p. 12, Row 9) lists Government Fancy Motorcycle Number Plate at ₦50,000; this specific sub-category is not separately priced on the public NVIS portal or legacy Service Charter.',
        {
          verificationStatus: 'conflicting',
          conditions: 'Official government fancy motorcycle number plate.',
          notes: 'Appears in the restricted April 2026 SLA (₦50,000) while the public FRSC Service Charter PDF lists only legacy motorcycle/government rates.',
        },
      ),
      fee(
        '10. Government Standard Motorcycle Number Plate',
        'fixed',
        'NGN',
        20000,
        ['frsc-nvis-portal', 'frsc-service-charter', 'frsc-services-page'],
        'SLA Printed p. 12, PDF p. 12 (Row 10); FRSC Service Charter Appendix B p. 20',
        'The April 2026 SLA (p. 12, Row 10) lists Government Standard Motorcycle Number Plate at ₦20,000, whereas the public FRSC Service Charter Appendix B (p. 20) lists legacy motorcycle/government rates (₦2,500 / ₦15,000).',
        {
          verificationStatus: 'conflicting',
          conditions: 'Official government standard motorcycle number plate.',
          notes: 'Conflicting between the restricted April 2026 SLA (₦20,000) and the public FRSC Service Charter PDF.',
        },
      ),
      fee(
        '11. Dealer Vehicle Number Plate',
        'fixed',
        'NGN',
        100000,
        ['frsc-nvis-portal', 'frsc-service-charter', 'frsc-services-page'],
        'SLA Printed p. 12, PDF p. 12 (Row 11); FRSC Service Charter Appendix B p. 20',
        'The April 2026 SLA (p. 12, Row 11) lists Dealer Vehicle Number Plate at ₦100,000, whereas the public FRSC Service Charter Appendix B (p. 20) prints the legacy ₦30,000 Dealers rate.',
        {
          verificationStatus: 'conflicting',
          conditions: 'Motor vehicle dealer number plate.',
          notes: 'Conflicting between the restricted April 2026 SLA (₦100,000) and the public FRSC Service Charter PDF (₦30,000).',
        },
      ),
      fee(
        '12. Fancy Motorcycle Number Plate',
        'fixed',
        'NGN',
        50000,
        ['frsc-nvis-portal', 'frsc-service-charter', 'frsc-services-page'],
        'SLA Printed p. 12, PDF p. 12 (Row 12); FRSC Service Charter Appendix B p. 20',
        'The April 2026 SLA (p. 12, Row 12) lists Fancy Motorcycle Number Plate at ₦50,000; this specific sub-category is not separately priced on the public NVIS portal or legacy Service Charter.',
        {
          verificationStatus: 'conflicting',
          conditions: 'Fancy motorcycle number plate.',
          notes: 'Appears in the restricted April 2026 SLA (₦50,000) while the public FRSC Service Charter PDF lists only legacy motorcycle/fancy rates.',
        },
      ),
    ],
  },

  // 11: Road Sign Production (FRSC Signage Plant, Gwagwalada)
  {
    slug: 'frsc-road-sign-production',
    name: 'Road Sign Production (FRSC Signage Plant, Gwagwalada)',
    category: 'Road signage, towing & technical services',
    jurisdiction: 'Federal (FRSC Headquarters Abuja & FRSC Signage Plant, Gwagwalada)',
    description: 'Custom production and supply of regulatory, warning and informational road traffic signs by the FRSC Signage Plant in Gwagwalada, Abuja for government agencies and private organisations.',
    requirements: [
      'Formal written application/order addressed to the Corps Marshal through the Deputy Corps Marshal, Motor Vehicle Administration — DCM (MVA) at FRSC National Headquarters, Abuja.',
      'Exact technical specifications of the requested road signs: sign type, dimensions/sizes, reflectivity grade and quantity.',
      'Remita payment receipt upon receiving the official FRSC costing assessment.',
    ],
    processSteps: [
      'Submit a formal road-sign production order to the Corps Marshal through DCM (MVA) specifying sign type, specification, sizes, grade and quantity.',
      'DCM (MVA) acknowledges receipt of the order within 24 hours and forwards the specifications to the FRSC Signage Plant (Gwagwalada) for costing by the production officer.',
      'Corps Commander (Signage) forwards the calculated production cost to the customer within 7 days.',
      'Customer pays the assessed amount into the designated FRSC account via Remita and submits payment evidence to DCM (MVA).',
      'FRSC Finance & Accounts Department confirms payment, after which DCM (MVA) communicates the delivery timeline, directs immediate production at the Signage Plant, and arranges dispatch.',
    ],
    notes: 'Public FRSC Services page (https://frsc.gov.ng/services) confirms the FRSC Signage Plant in Gwagwalada produces road signs; SLA Printed pp. 12–13, PDF pp. 12–13 details the 9-step order, 24-hour acknowledgement, 7-day costing and Remita payment workflow.',
    officialActionUrl: 'https://frsc.gov.ng/services',
    officialChannelType: 'website',
    paymentGuide: 'Submit specifications to the Corps Marshal through DCM (MVA) at FRSC National Headquarters, wait for the official 7-day Signage Plant costing quotation, and pay only via Remita.',
    feeOptions: [
      fee(
        'Custom road sign production quotation (by sign type, size, grade and quantity)',
        'variable',
        'NGN',
        null,
        ['frsc-services-page', 'frsc-contact-page'],
        'FRSC Services page; SLA Printed pp. 12–13, PDF pp. 12–13',
        'The FRSC Services page confirms the FRSC Signage Plant in Gwagwalada produces road signs; the April 2026 SLA (pp. 12–13) states that each order is costed individually by the Signage Plant production officer within 7 days based on sign type, specification, size and grade, and paid via Remita.',
        {
          verificationStatus: 'pending',
          conditions: 'Bespoke quotation issued within 7 days of order acknowledgement (acknowledged within 24 hours). Paid via Remita before production commences.',
          notes: 'Variable by order specification; marked pending because the detailed 9-step costing workflow appears in the restricted SLA copy while the public FRSC services page provides only high-level plant information.',
        },
      ),
    ],
  },

  // 12: Vehicle Towing, Custody & Release of Towed Vehicles
  {
    slug: 'frsc-vehicle-towing-and-release',
    name: 'Vehicle Towing, Custody and Release of Towed Vehicles',
    category: 'Road signage, towing & technical services',
    jurisdiction: 'Federal highways & FRSC Field Commands nationwide',
    description: 'Towing of crashed, broken-down, obstructing or abandoned vehicles on highways, towing of non-crashed vehicles on owner request, and release of towed vehicles from FRSC custody.',
    requirements: [
      'For Towing on Request (non-crash vehicle, Public Towing SOP p. 5): Police report, vehicle papers certifying ownership, handwritten application, photocopy of valid ID (Driver\'s Licence, NIN or International Passport), completed Towing Requisition Form and Remita Retrieval Reference (RRR) payment receipt before towing.',
      'For Claiming / Release of a Towed or Abandoned Vehicle (Public Towing SOP p. 6; SLA pp. 14, 16–17): Notice of Offence Sheet (where applicable), original Proof of Ownership (not handwritten) or court sworn affidavit, valid ID (Driver\'s Licence / Utility Bill / NIN), valid Vehicle Licence, two (2) passport-size photographs, and Remita receipts for tow charges, fines and any accrued custody fee.',
      'Mandatory in-person verification at the FRSC Field Command: photograph of claimant standing beside the vehicle showing its registration number, MVA Central Databank verification, endorsement of the Vehicle Release Certificate (VRC) and issuance of a signed Gate Pass.',
    ],
    processSteps: [
      'Contact FRSC via the toll-free emergency line 122 or 0700-CALL-FRSC (070022553772), or report to the relevant FRSC Field Command Duty Room Officer (DRO).',
      'Note: Under Public Towing SOP paragraph 10(c) (p. 5), a broken-down vehicle obstructing the highway with the owner in sight undergoing long repairs is towed off the road to a safe place at no cost.',
      'For chargeable towing (FRSC-owned or PPP-coordinated tow trucks), generate a Remita Retrieval Reference (RRR) and pay the tow charge into CBN Account 0020104861033 ("FRSC Drivers Training, Towing Truck Donation and Others"), and pay any applicable traffic fine or daily custody fee (accruing after the initial 20 hours following arrest, SLA p. 14) into CBN Account 0020054141107 ("FRSC Consolidated Revenue Funds").',
      'Present original payment receipts, proof of ownership, vehicle licence, ID and 2 passport photographs to the Duty Room Officer; take the mandatory verification photograph beside the vehicle.',
      'Endorse the Vehicle Release Certificate (VRC), complete the Public Enlightenment Office (PEO) session where applicable, and present the signed Gate Pass at the Command gate to exit with the vehicle (Note: SLA p. 14 warns that impounded vehicles unclaimed after 6 months are subject to auction/forfeiture proceedings under Section 5(b) of the FRSC Act 2007).',
    ],
    notes: 'Public Towing SOP (22 October 2019, https://frsc.gov.ng/wp-content/uploads/2019/11/FINALa.pdf, pp. 1–8) and SLA Printed pp. 14–18; PDF pp. 14–18. Both sources state that FRSC tow charges are the average of prevailing commercial charges subject to distance, vehicle tonnage, terrain and PMS/AGO fuel price regime.',
    officialActionUrl: 'https://frsc.gov.ng/documentations/standard-operating-procedures',
    officialChannelType: 'website',
    paymentGuide: 'Pay only via Remita into the designated CBN accounts listed in the FRSC Towing SOP and present the original receipt to the Field Command Duty Room Officer. Do not pay cash to patrol or tow-truck operatives.',
    feeOptions: [
      fee(
        'Emergency roadside clearance of broken-down vehicle undergoing repairs with owner in sight (to a nearby safe place)',
        'free',
        'NGN',
        null,
        ['frsc-towing-sop-2019'],
        'Public Towing SOP (FINALa.pdf) Paragraph 10(c), PDF p. 5',
        'Paragraph 10(c) of the published FRSC Towing SOP (22 October 2019, p. 5) states: "Tow the vehicle off the road to a safe place at no cost if the repairs will take a long time."',
        {
          verificationStatus: 'verified',
          conditions: 'Applies only when a broken-down vehicle obstructing the highway is undergoing repairs with the owner in sight and the patrol team leader determines repairs will take a long time, towing it off the road to an immediate safe place.',
          notes: 'Substantiated directly by Paragraph 10(c) of the public 2019 FRSC Towing SOP.',
        },
      ),
      fee(
        'Standard & on-request vehicle towing — 2019 SOP recommended guide (₦5,000–₦95,000) vs commercial-average formula',
        'range',
        'NGN',
        null,
        ['frsc-towing-sop-2019', 'frsc-services-page'],
        'Public Towing SOP (FINALa.pdf) Paragraph 15, PDF p. 7; SLA Printed p. 17, PDF p. 17',
        'Paragraph 15 of the public 2019 Towing SOP (p. 7) states that tow charges are the average of prevailing commercial charges subject to distance, tonnage, terrain and PMS/AGO price regime, and publishes a recommended table from ₦5,000 (cars/light vehicles <3 km, normal terrain) up to ₦95,000 (heavy-duty vehicles in difficult terrain/ditch or night-time towing). The April 2026 SLA (p. 17) retains the variable commercial-average formula without re-publishing the 2019 numeric table.',
        {
          minimumAmount: 5000,
          maximumAmount: 95000,
          verificationStatus: 'conflicting',
          conditions: '2019 SOP recommended bands: <3 km (₦5,000–₦20,000), 3–5 km (₦10,000–₦40,000), 5–10 km (₦15,000–₦60,000), >10 km (₦25,000–₦80,000), 25–50 km (₦35,000–₦85,000), Night towing (₦40,000–₦95,000) across Cars/Light vs Heavy-Duty and Normal vs Difficult Terrain/Ditch. Subject to current PMS/AGO fuel regime and prevailing commercial rates.',
          notes: 'Marked conflicting because the public 2019 SOP prints the ₦5,000–₦95,000 recommended table while both the SOP and the 2026 SLA state that actual charges fluctuate with prevailing commercial rates and PMS/AGO fuel prices.',
        },
      ),
      fee(
        'Impounded / towed vehicle daily custody fee (after initial 20-hour grace period)',
        'unknown',
        'NGN',
        null,
        ['frsc-towing-sop-2019', 'frsc-contact-page'],
        'Public Towing SOP (FINALa.pdf) Paragraph 11(b), PDF p. 6; SLA Printed p. 14, PDF p. 14',
        'Both the public 2019 Towing SOP (p. 6, Paragraph 11b) and the April 2026 SLA (p. 14, Note iii) state that a Custody Fee is payable into the FRSC Consolidated Revenue Fund (CBN Account 0020054141107) and accrues daily after the initial 20 hours following arrest, but neither document states the numeric daily custody rate.',
        {
          verificationStatus: 'pending',
          conditions: 'Accrues daily only after the initial 20 hours following vehicle arrest/impoundment; paid via Remita into FRSC Consolidated Revenue Funds.',
          notes: 'Daily naira rate is not stated in the SLA or public Towing SOP; recorded as pending/unknown.',
        },
      ),
    ],
  },

  // 13: Speed Limiting Device (SLD) Vendor Accreditation
  {
    slug: 'frsc-speed-limiting-device-vendor-accreditation',
    name: 'Speed Limiting Device (SLD) Vendor Accreditation',
    category: 'Road signage, towing & technical services',
    jurisdiction: 'Federal (FRSC National Headquarters Abuja, SON & NADDC)',
    description: 'Corporate accreditation and biannual inspection of vendors authorised to supply, install, calibrate and maintain Speed Limiting Devices (SLDs) in motor vehicles in Nigeria.',
    requirements: [
      '1. Certificate of Incorporation with the Corporate Affairs Commission (CAC).',
      '2. Comprehensive Company Profile.',
      '3. Evidence of filing of Annual Returns to CAC for the last 3 years.',
      '4. Curriculum Vitae (CV) of key technical personnel.',
      '5. Current Tax Clearance Certificate (TCC) for the last 3 years.',
      '6. Value Added Tax (VAT) Registration Certificate.',
      '7. Audited Accounts of the company for the last 3 years.',
      '8. Reference letter from a reputable bank.',
      '9. Verifiable list of at least 3 similar projects successfully executed by the company.',
      '10. Evidence of compliance with the Industrial Training Fund (ITF).',
      '11. Evidence of compliance with the Pension Reform Act (PENCOM).',
      '12. Standards Organisation of Nigeria (SON) Speed Limiting Device Product Certificate.',
    ],
    processSteps: [
      'Submit a formal application with all 12 pre-qualification documents to the Corps Marshal at FRSC National Headquarters, Abuja.',
      'Undergo document screening and technical evaluation by the Inter-Agency Technical Committee comprising FRSC, Standards Organisation of Nigeria (SON) and National Automotive Design and Development Council (NADDC); minimum cut-off score is 60% (notified within 2 weeks).',
      'Undergo physical inspection of the vendor\'s Fitness/Installation Centre(s) across the federation within 6 weeks.',
      'Successful vendors receive their FRSC Accreditation Certificate within 2 weeks after inspection approval and are onboarded to the FRSC Speed Limiting Device portal.',
      'Submit to mandatory biannual (twice-yearly) post-accreditation inspection by the Technical Committee.',
    ],
    notes: 'Public FRSC Services page (https://frsc.gov.ng/services) confirms the Speed Limiting Device programme; SLA Printed pp. 18–20, PDF pp. 18–20 details the 12 pre-qualification requirements, 60% Technical Committee threshold, 2-week screening notification, 6-week facility inspection, 2-week certificate presentation and biannual re-inspection.',
    officialActionUrl: 'https://frsc.gov.ng/services',
    officialChannelType: 'website',
    paymentGuide: 'Submit pre-qualification documents to the Corps Marshal at FRSC National Headquarters, Abuja and confirm any applicable accreditation or inspection fee directly with FRSC.',
    feeOptions: [
      fee(
        'Speed Limiting Device (SLD) vendor accreditation fee',
        'unknown',
        'NGN',
        null,
        ['frsc-services-page', 'frsc-contact-page'],
        'FRSC Services page; SLA Printed pp. 18–20, PDF pp. 18–20',
        'Neither the public FRSC Services page nor the April 2026 SLA (pp. 18–20) states a fee amount for Speed Limiting Device vendor accreditation.',
        {
          verificationStatus: 'pending',
          conditions: 'Corporate vendor accreditation subject to 12 pre-qualification documents, 60% FRSC/SON/NADDC Technical Committee evaluation score and physical fitness-centre inspection.',
          notes: 'No fee is stated in the SLA or public FRSC pages; recorded as pending/unknown, never assumed free.',
        },
      ),
    ],
  },
];

const excludedRows = [
  {
    itemNumber: 'SLA Item 1',
    name: 'Authorization Table & Edition Metadata',
    slaPage: 'Printed p. 2; PDF p. 2',
    disposition: 'Excluded as a service card (retained as source governance metadata)',
    reason: 'Document control table recording Preparation by Nodal Officer/FRSC PEBEC Reform Champion, Review by PSO-CM/Management Representative ISO, Approval by Corps Marshal, Edition 2, Date: April, 2026.',
  },
  {
    itemNumber: 'SLA Item 2',
    name: 'Introduction — Tripartite Roles of FRSC, VIO and State IRS/JTB',
    slaPage: 'Printed p. 5; PDF p. 5',
    disposition: 'Included as procedural/authority guidance across all Driver\'s Licence and Number Plate services',
    reason: 'Defines institutional division of labour (FRSC design/production/biometrics; VIO driver testing; State IRS/JTB pricing, collection and permanent card distribution) rather than a standalone fee item.',
  },
  {
    itemNumber: 'SLA Item 5',
    name: 'Bypass Capture Feature for Renewal of Driver\'s Licence',
    slaPage: 'Printed p. 8; PDF p. 8',
    disposition: 'Included as procedural guidance within Driver\'s Licence Renewal options',
    reason: 'Portal workflow feature ("Recapture Biometric Information: YES/NO") permitting online biometric bypass only on odd renewals (1st, 3rd, 5th, 7th renewal). Not a separate fee.',
  },
  {
    itemNumber: 'SLA Item 13',
    name: 'Procedure for Payment of Fines by Traffic Violators',
    slaPage: 'Printed pp. 13–15; PDF pp. 13–15',
    disposition: 'Excluded from public service fee catalogue (documented in evidence matrix & complaint channels)',
    reason: 'Traffic offence enforcement penalty and vehicle release procedure (7-day window to pay via Remita under MDA: FRSC / Service: OFFENCE, Duty Room verification, Public Enlightenment session, Gate Pass, and 6-month unclaimed vehicle forfeiture rule under Section 5(b) of FRSC Act 2007). Penalties/fines for law violations are distinct from citizen service/licensing fees; the custody fee rule after 20 hours and SERVICOM complaint channels are incorporated into the Towing/Release service and MDA channels.',
  },
  {
    itemNumber: 'SLA Item 20',
    name: 'Procedure for Treatment of Road Traffic Crash (RTC) Victims by FRSC Roadside Clinics',
    slaPage: 'Printed p. 18; PDF p. 18',
    disposition: 'Excluded from priced service cards (emergency medical rescue protocol)',
    reason: 'Describes emergency ambulance rescue (toll-free 122 / ZEBRA), triage, resuscitation, stabilization and hospital referral at FRSC Roadside Clinics. No fee is stated in the SLA, and emergency clinical triage is an operational medical response rather than a priced licensing transaction.',
  },
  {
    itemNumber: 'SLA Item 28',
    name: 'Default Approval Application Process',
    slaPage: 'Printed pp. 26–27; PDF pp. 26–27',
    disposition: 'Included as procedural & service-standard guidance within National Driver\'s Licence Online Verification',
    reason: 'Remedial SLA mechanism applying exclusively to Driver\'s Record Verification requests exceeding 10 working days (with 7 explicit exclusions). Not a separate priced service.',
  },
];

function displayFee(option) {
  if (option.pricingModel === 'free') return 'Free (no cost)';
  if (option.pricingModel === 'unknown') return 'Not established (pending)';
  if (option.pricingModel === 'variable') return 'Variable by scope';
  if (option.pricingModel === 'range') return `${option.currency} ${option.minimumAmount.toLocaleString('en-NG')}–${option.maximumAmount.toLocaleString('en-NG')}`;
  return `${option.currency} ${option.amount.toLocaleString('en-NG')}`;
}

function md(value) {
  return String(value ?? 'Not stated').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function buildMatrix(output, sha256) {
  const feeRows = [];
  let rowIndex = 1;
  const statusCounts = { verified: 0, pending: 0, conflicting: 0, unable_to_verify: 0 };
  for (const service of output.services) {
    for (const option of service.feeOptions) {
      statusCounts[option.verificationStatus] = (statusCounts[option.verificationStatus] || 0) + 1;
      feeRows.push(
        `| ${rowIndex++} | ${md(service.name)} (\`${service.slug}\`) | ${md(service.category)} | ${md(option.label)} | ${md(displayFee(option))} | \`${option.verificationStatus}\` | ${md(option.page)} | ${md(option.sourceKeys.join(', '))} |`,
      );
    }
  }

  const serviceRows = output.services.map((service, idx) => (
    `| ${idx + 1} | ${md(service.name)} (\`${service.slug}\`) | ${md(service.jurisdiction)} | ${md(service.requirements.join(' '))} | ${md(service.processSteps.join(' '))} | ${md(service.officialActionUrl)} | ${md(service.notes)} |`
  )).join('\n');

  const excludedTable = output.excludedRows.map((item, idx) => (
    `| ${idx + 1} | ${md(item.itemNumber)} | ${md(item.name)} | ${md(item.slaPage)} | ${md(item.disposition)} | ${md(item.reason)} |`
  )).join('\n');

  const sourceTable = Object.entries(output.sources).map(([key, src]) => (
    `| \`${key}\` | ${md(src.title)} | \`${src.sourceType}\` | ${md(src.url)} | ${md(src.publicationDate || 'Date not stated')} | ${md(src.effectiveDate || 'Date not stated')} | ${md(src.lastChecked)} | ${md(src.documentReference)} |`
  )).join('\n');

  return `# Federal Road Safety Corps (FRSC) Service & Fee Evidence Matrix

Reviewed **${reviewed}** from the supplied restricted document \`research/repo/frsc_REVIEWED_SLA_2026_276a6818e9.pdf\` (27 PDF pages) and independently checked against current official public FRSC websites, portals and Standard Operating Procedures.

## 1. Document Identification & Confidentiality / Public-Release Check

| Field | Finding |
|---|---|
| Supplied repository path | \`research/repo/frsc_REVIEWED_SLA_2026_276a6818e9.pdf\` |
| File size & page count | 582,471 bytes; 27 PDF pages (Printed pages 1–27 match PDF pages 1–27) |
| Supplied file SHA-256 | \`${sha256}\` |
| Cover title & edition | *Federal Road Safety Corps — Service Level Agreements — Second Edition — April, 2026* (Printed p. 1; PDF p. 1) |
| Authorization table (Printed p. 2; PDF p. 2) | Prepared by *Nodal Officer/ FRSC PEBEC Reform Champion*; Reviewed by *PSO-CM/ Management Representative ISO*; Approved by *Corps Marshal*; Edition: \`2\`; Date: \`April, 2026\` (edition/approval month; no day of month or separate effective date is stated) |
| Confidentiality marking | Every page header/banner (PDF pp. 1–27) is explicitly stamped **\`-CONFIDENTIAL-\`** |
| Official website / CMS check (\`${reviewed}\`) | FRSC's public documentation page (\`https://frsc.gov.ng/documentations/service-level-agreements\`, HTTP 200) queries FRSC's Strapi CMS endpoint (\`https://staging.frsc.gov.ng/frsc-admin/api/service-level-agreements?populate=*&sort=ReleaseDate:desc\`), which links to \`https://staging.frsc.gov.ng/frsc-admin/uploads/REVIEWED_SLA_2026_276a6818e9.pdf\`. That remote file has the **exact same SHA-256** (\`${sha256}\`), but still bears the **\`-CONFIDENTIAL-\`** stamp on every page and carries inconsistent CMS metadata (\`Period: "2025"\`, \`ReleaseDate: "2025-02-05"\`, \`Description: "FRSC Service Level Agreement for 2026"\`, \`publishedAt: "2026-05-07T12:21:12.376Z"\`). |
| **Confidentiality & Hosting Decision** | An identical checksum proves only that the two files are byte-for-byte identical; it does **not** independently establish public-release authorisation or waive the \`-CONFIDENTIAL-\` marking on every page. Accordingly, \`frsc_REVIEWED_SLA_2026_276a6818e9.pdf\` is retained **strictly inside \`research/repo/\`**, is **not** copied to \`frontend/public/sources/\`, is **not** exposed through an embedded PDF viewer or public source URL, and SLA-only fee claims (such as the ₦50,000 online verification figure on p. 11) are marked **\`pending\`** rather than \`verified\`. |

## 2. Summary Accounting

| Measure | Count | Notes |
|---|---:|---|
| Substantive SLA Table-of-Contents items (Items 1–28, pp. 1–27) | 28 | Every section of the 27-page SLA is accounted for below without silent omission. |
| Published FRSC catalogue service records | ${output.services.length} | Preserves the 4 existing Batch-1 driver's licence slugs first, plus 9 expanded FRSC service records covering Commercial/Professional licences, Foreign Licence Reciprocity, Online Verification, DSSP Driver/Rider Certification, DSSP Driving School Registration, Vehicle Number Plates (12 categories), Road Sign Production, Vehicle Towing/Release, and SLD Vendor Accreditation. |
| Published FRSC fee options | ${feeRows.length} | Every distinct fee option across the ${output.services.length} services. |
| \`verified\` fee options | ${statusCounts.verified} | Substantiated by non-confidential public FRSC sources (the 8 JTB/FRSC driver's licence options across 3-year/5-year motor vehicle & Class A categories, plus free roadside clearance of a broken-down vehicle undergoing long repairs with owner in sight under Paragraph 10(c) of the public 2019 Towing SOP). |
| \`pending\` fee options | ${statusCounts.pending} | Foreign licence reciprocity (no fee stated), Online driver's licence verification (₦50,000 in confidential SLA p. 11 not published on public portal FAQ), DSSP driver/rider training & State BIR learner's permit (variable by school/state), Road sign production (custom 7-day costing by Signage Plant), Daily custody fee after 20 hours (rate not stated), and SLD vendor accreditation (no fee stated). Never shown as free. |
| \`conflicting\` fee options | ${statusCounts.conflicting} | 12 National Vehicle Number Plate categories (April 2026 SLA p. 12 lists ₦12,000–₦400,000 revised JTB rates while the public FRSC Service Charter Appendix B p. 20 still prints legacy ₦2,500–₦80,000 rates and State BIRs perform actual costing), Driving School Registration under DSSP (SLA p. 21 requires a prescribed fee on Form TRG00001 while public SOP p. 2 says Form TSC0001 is obtained at no cost), and Standard/On-Request Towing (public 2019 SOP p. 7 prints a ₦5,000–₦95,000 recommended table while both the SOP and 2026 SLA state charges vary by prevailing commercial rates and PMS/AGO fuel regime). |
| Non-service / procedural / excluded SLA items | ${output.excludedRows.length} | Explicitly accounted for in Section 5 below (Authorization metadata, Tripartite roles intro, Bypass Capture renewal feature, Traffic fine payment procedure, Roadside crash victim clinical care, and Default Approval rules). |

## 3. Complete SLA Item-by-Item Accounting (Items 1–28, Pages 1–27)

| SLA TOC Item | SLA Section Title | Printed / PDF Pages | Item Type | Catalogue Disposition | Public Status & Reason |
|---:|---|---|---|---|---|
| 1 | Authorization | Printed p. 2; PDF p. 2 | Document metadata | Excluded as service card | Governance metadata (Edition 2, April 2026; no day or effective date stated). |
| 2 | Introduction (FRSC, VIO & State IRS/JTB roles) | Printed p. 5; PDF p. 5 | Institutional framework | Included as multi-authority guidance | Explains tripartite roles of FRSC, State VIO and State IRS/JTB across all licence and plate services. |
| 3 | Procedure for obtaining a valid National Driver's Licence (1. Issuance of New Driver's Licence) | Printed pp. 5–6; PDF pp. 5–6 | Citizen licensing service | Included (\`drivers-licence-other-classes-3-years\`, \`drivers-licence-other-classes-5-years\`, \`drivers-licence-class-a-3-years\`, \`drivers-licence-class-a-5-years\`) | \`verified\` — ₦15,000 (3yr motor vehicle), ₦21,000 (5yr motor vehicle), ₦7,000 (3yr Class A), ₦11,000 (5yr Class A) substantiated by public NDL FAQ. Excludes learner permit, driving school, VIO test & bank charges. |
| 4 | 2. Issuance of Renewal of Driver's Licence | Printed p. 7; PDF p. 7 | Citizen licensing service | Included in the 4 core Driver's Licence services | \`verified\` — Same JTB/FRSC baseline fees (₦15,000 / ₦21,000 motor vehicle; ₦7,000 / ₦11,000 Class A). Includes 1-month pre-expiry window and SLA 6-month elapsed VIO retest note. |
| 5 | Bypass Capture feature for renewal of Driver's Licence | Printed p. 8; PDF p. 8 | Portal workflow step | Included as procedural guidance in Driver's Licence services | Procedural option on \`nigeriadriverslicence.frsc.gov.ng\` allowing biometric bypass on odd renewals (1st, 3rd, 5th, 7th) only. Not a separate fee. |
| 6 | 3. Issuance of Commercial or Professional Driver's Licence | Printed pp. 8–9; PDF pp. 8–9 | Citizen/professional licensing service | Included (\`frsc-commercial-professional-drivers-licence\`) | \`verified\` — Baseline licence fees (₦15,000 / ₦21,000 motor vehicle; ₦7,000 / ₦11,000 Class A) substantiated by NDL FAQ; age 26+, NURTW/NARTO/employer letter, 6-part Government Hospital medical exam (including EEG) and VIO test documented. |
| 7–9 | Foreign Driver's Licence Reciprocity (Requirements & 6-Stage Procedure) | Printed pp. 9–10; PDF pp. 9–10 | Licensing conversion service | Included (\`frsc-foreign-drivers-licence-reciprocity\`) | \`pending\` (\`unknown\`) — SLA Stage 5 requires bank/e-payment confirmed by State BIR without stating the reciprocity amount; no public schedule establishes the fee. |
| 10 | Procedure for National Driver's Licence Online Verification | Printed pp. 10–11; PDF pp. 10–11 | Verification & clearance service | Included (\`frsc-drivers-licence-online-verification\`) | \`pending\` (\`unknown\`) — Public portal (\`https://ndlverification.frsc.gov.ng/faqs\`) confirms debit-card payment for verification/shipping and organisation-only receiver address, but does not publish the ₦50,000 Remita figure printed in the confidential SLA (p. 11). |
| 11 | Process of obtaining National Vehicle Number Plates (12 plate categories) | Printed pp. 11–12; PDF pp. 11–12 | Vehicle registration & number plates | Included (\`frsc-national-vehicle-number-plates\`, 12 fee options) | \`conflicting\` — SLA p. 12 lists 12 revised JTB plate prices (₦12,000–₦400,000), while the public FRSC Service Charter Appendix B (p. 20) still prints legacy rates (₦2,500–₦80,000) and State BIR performs costing. |
| 12 | Procedure for obtaining Road Signs | Printed pp. 12–13; PDF pp. 12–13 | Institutional / organisational production service | Included (\`frsc-road-sign-production\`) | \`pending\` (\`variable\`) — Public FRSC Services page confirms the Gwagwalada Signage Plant; SLA pp. 12–13 states custom costing within 7 days of order (acknowledged within 24 hours) and Remita payment. |
| 13 | Procedure for payment of fines by traffic violators | Printed pp. 13–15; PDF pp. 13–15 | Enforcement penalty & release procedure | Excluded as a service card; custody fee & SERVICOM channels integrated | Enforcement fines for traffic offences (7-day Remita payment window under MDA: FRSC / Service: OFFENCE) are penalties, not citizen service applications. Daily custody fee after 20 hours and 6-month auction warning are captured under Vehicle Towing & Release. |
| 14–19 | Procedure for Towing and Claiming of Towed Vehicles (Categories, Procedures, Release, Tow Charges & Mode of Payment) | Printed pp. 15–18; PDF pp. 15–18 | Highway operations, on-request towing & vehicle release | Included (\`frsc-vehicle-towing-and-release\`, 3 fee options) | Public 2019 Towing SOP (\`FINALa.pdf\`) substantiates \`verified\` free roadside clearance to a safe place for broken-down vehicles undergoing long repairs with owner in sight (p. 5), \`conflicting\`/\`range\` ₦5,000–₦95,000 recommended table vs commercial-average formula (p. 7 vs SLA p. 17), and \`pending\` daily custody fee after 20 hours (p. 6 & SLA p. 14). |
| 20 | Procedure for Treatment of Road Traffic Crash Victims by FRSC RTC Clinics | Printed p. 18; PDF p. 18 | Emergency medical rescue & clinical triage | Excluded as a priced service card | Emergency ambulance rescue (\`122\` / ZEBRA) and Roadside Clinic triage/stabilization/referral. No fee is stated in the SLA. |
| 21 | Procedure for Accreditation of Speed Limiting Device (SLD) Vendors in Nigeria | Printed pp. 18–20; PDF pp. 18–20 | Corporate vendor accreditation | Included (\`frsc-speed-limiting-device-vendor-accreditation\`) | \`pending\` (\`unknown\`) — 12 pre-qualification documents, 60% FRSC/SON/NADDC Technical Committee screening, 6-week facility inspection and biannual re-inspection documented; no fee stated in SLA or public pages. |
| 22–25 | Driving School Standardization Programme (DSSP): Registration & Branch Opening | Printed pp. 21–23; PDF pp. 21–23 | Institutional accreditation | Included (\`frsc-driving-school-registration-and-accreditation\`) | \`conflicting\` (\`unknown\`) — Public Driving School SOP (\`sopds_e1cd918588.pdf\`, p. 2) states Form TSC0001 is obtained at no cost, whereas SLA p. 21 states under Form TRG00001 that no school shall be registered unless the prescribed fee is paid (amount unstated). |
| 26 | Procedure for obtaining Driver's Certification from Driving Schools | Printed pp. 23–24; PDF pp. 23–24 | Mandatory pre-licensing training & CBT | Included (\`frsc-driving-school-driver-and-rider-certification\`, Option 1) | \`pending\` (\`variable\`) — 25 sessions + 26th session physical capture & CBT (60% pass mark; 6-month certificate validity). Learner's Permit fee set by State BIR; tuition set by accredited driving school. |
| 27 | Procedure for obtaining Rider's Certification from Driving Schools | Printed pp. 24–25; PDF pp. 24–25 | Mandatory pre-licensing training & CBT | Included (\`frsc-driving-school-driver-and-rider-certification\`, Option 2) | \`pending\` (\`variable\`) — 7 sessions + 8th session physical capture & CBT (60% pass mark; 6-month certificate validity). Learner's Permit fee set by State BIR; tuition set by accredited driving school. |
| 28 | Default Approval Application Process | Printed pp. 26–27; PDF pp. 26–27 | SLA remedial procedure | Included in \`frsc-drivers-licence-online-verification\` | Applies solely to Driver's Record Verification requests exceeding 10 working days (with 7 explicit exclusions on p. 27). |

## 4. Complete Catalogue Fee Option Matrix

| # | Service | Category | Fee option | Published fee / state | Status | Source / SLA page reference | Linked source keys |
|---:|---|---|---|---|---|---|---|
${feeRows.join('\n')}

## 5. Service-Level Eligibility, Multi-Authority Roles, Requirements, Process & Channels

| # | Service | Jurisdiction & Authorities | Requirements | Process steps (online vs in-person) | Official channel | Service standard & notes |
|---:|---|---|---|---|---|---|
${serviceRows}

## 6. Explicitly Accounted Non-Service / Procedural / Excluded SLA Items

| # | SLA Item | Title | Exact SLA Page | Disposition | Reason |
|---:|---|---|---|---|---|
${excludedTable}

## 7. Official Source Register for FRSC Integration

| Source key | Title | Type | Official URL | Publication date | Effective date | Last checked | Reference / scope |
|---|---|---|---|---|---|---|---|
${sourceTable}

## 8. Portal Ownership, Reachability & Discrepancy Notes

1. **Driver's Licence Application Portal (\`https://nigeriadriverslicence.frsc.gov.ng/\` vs \`www.nigeriadriverslicence.org\`)**:
   - The April 2026 SLA (pp. 6–8) prints \`www.nigeriadriverslicence.org\`. FRSC's official \`.gov.ng\` portal is \`https://nigeriadriverslicence.frsc.gov.ng/\` (with FAQ at \`https://nigeriadriverslicence.frsc.gov.ng/faq\`). Both hosts failed local DNS resolution from this environment during the 31 October 2026 run, so FeeLens retains the validated \`.gov.ng\` portal URL and documents the SLA string and reachability status transparently.
2. **Online Driver's Licence Verification Portal (\`https://ndlverification.frsc.gov.ng/\`)**:
   - Reachable (HTTP 200 on 31 October 2026). The SLA (p. 10) omits the \`s\` in \`ndlverification\`; FeeLens uses the verified live \`https://ndlverification.frsc.gov.ng/\` URL.
3. **National Vehicle Identification Scheme Portal (\`https://nvis.frsc.gov.ng/\`)**:
   - Reachable (HTTP 200 on 31 October 2026). Provides online Form MVA 01 (\`/VehicleManagement/RegisterVehicle\`), old plate revalidation (\`/VehicleManagement/Revalidation\`) and plate verification (\`/VehicleManagement/VerifyPlateNo\`).
4. **Driving School Standardization Programme Portal (\`https://dssp.frsc.gov.ng/\`)**:
   - Reachable (HTTP 200 on 31 October 2026). Confirmed official portal for accredited driving schools and learner certification.
5. **Foreign Driver's Licence Desk (\`foreigndriverslicence@frsc.gov.ng\`)**:
   - SLA p. 10 Stage 3 prints \`http://foreigndriverslicence.frsc.gov.ng\`, which is actually an official FRSC email address (\`foreigndriverslicence@frsc.gov.ng\`) used by DLCs to forward scanned reciprocity documents to RSHQ Abuja. It is not a public web portal and is therefore not used as a public apply link.
`;
}

function main() {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const actualSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  if (actualSha256 !== expectedSha256) {
    throw new Error(`Unexpected SHA-256 for ${pdfPath}: got ${actualSha256}, expected ${expectedSha256}`);
  }

  const output = {
    version: reviewed,
    confidentiality: {
      suppliedFilename: 'frsc_REVIEWED_SLA_2026_276a6818e9.pdf',
      suppliedPath: 'research/repo/frsc_REVIEWED_SLA_2026_276a6818e9.pdf',
      sha256: actualSha256,
      pageCount: 27,
      coverEdition: 'Second Edition, April 2026',
      markedConfidential: true,
      remoteCmsUrl: 'https://staging.frsc.gov.ng/frsc-admin/uploads/REVIEWED_SLA_2026_276a6818e9.pdf',
      remoteChecksumMatches: true,
      publiclyHostedByFeeLens: false,
      decision: 'Retained in research/repo only. Although FRSC\'s Strapi CMS serves an identical binary, every page is stamped -CONFIDENTIAL- and CMS metadata is inconsistent. Identical checksum does not independently establish publication authority or permission.',
    },
    mda: {
      name: 'Federal Road Safety Corps',
      acronym: 'FRSC',
      slug: 'frsc-drivers-licence',
      officialWebsite: 'https://frsc.gov.ng/',
      jurisdiction: 'Federal',
      coverageStatus: 'pilot',
      description: "Federal Road Safety Corps (FRSC) National Driver's Licence, driver/rider certification (DSSP), licence verification, National Vehicle Identification Scheme (NVIS) number plates, road signage, vehicle towing/release and vendor accreditation services, including multi-authority workflows with State Boards of Internal Revenue (SBIR / JTB) and Vehicle Inspection Officers (VIO).",
      officialChannels: [
        {
          channelType: 'portal',
          name: "Nigeria Driver's Licence official portal",
          url: 'https://nigeriadriverslicence.frsc.gov.ng/',
          contactValue: null,
          instructions: "Use for fresh National Driver's Licence applications, renewals (including odd-renewal Bypass Capture) and replacements before attending State BIR/VIO/FRSC DLC steps.",
        },
        {
          channelType: 'portal',
          name: "National Driver's Licence Online Verification portal",
          url: 'https://ndlverification.frsc.gov.ng/',
          contactValue: null,
          instructions: "Use to request official FRSC driver's licence verification and driving record extracts addressed to established organisations (embassies, government bodies, private companies or NGOs).",
        },
        {
          channelType: 'portal',
          name: 'National Vehicle Identification Scheme (NVIS) portal',
          url: 'https://nvis.frsc.gov.ng/',
          contactValue: null,
          instructions: 'Use for Form MVA 01 new vehicle registration, old number plate revalidation and plate number verification before State BIR costing and payment.',
        },
        {
          channelType: 'portal',
          name: 'Driving School Standardization Programme (DSSP) portal',
          url: 'https://dssp.frsc.gov.ng/',
          contactValue: null,
          instructions: 'Use to find FRSC-accredited driving schools, track mandatory 26-session driver or 8-session rider training, and apply for driving school registration.',
        },
        {
          channelType: 'website',
          name: 'FRSC official website & service directory',
          url: 'https://frsc.gov.ng/services',
          contactValue: null,
          instructions: 'Use to review official FRSC service descriptions, Standard Operating Procedures and public notices.',
        },
        {
          channelType: 'email',
          name: 'FRSC SERVICOM & public enquiries',
          url: 'https://frsc.gov.ng/contact-us',
          contactValue: 'servicom@frsc.gov.ng; info@frsc.gov.ng; verification@frsc.gov.ng',
          instructions: 'Official FRSC SERVICOM complaint and enquiry emails (servicom@frsc.gov.ng, info@frsc.gov.ng, verification@frsc.gov.ng).',
        },
        {
          channelType: 'phone',
          name: 'FRSC emergency toll-free & SERVICOM complaint lines',
          url: 'https://frsc.gov.ng/contact-us',
          contactValue: '122; 0700-CALL-FRSC (070022553772); 09139600034; 09139600096',
          instructions: 'Call 122 (toll-free emergency/towing/crash response), 0700-CALL-FRSC (070022553772), or SERVICOM lines 09139600034 and 09139600096 for service redress.',
        },
      ],
    },
    sources,
    services,
    excludedRows,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(matrixPath, `${buildMatrix(output, actualSha256)}\n`);

  const feeOptionCount = services.reduce((sum, s) => sum + s.feeOptions.length, 0);
  console.log(JSON.stringify({
    outputPath,
    matrixPath,
    serviceCount: services.length,
    feeOptionCount,
    excludedCount: excludedRows.length,
    sha256: actualSha256,
  }, null, 2));
}

main();
