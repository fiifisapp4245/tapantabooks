/**
 * The FY2025 annual report for Kumasi Traders Ltd, as first created.
 * Narrative is written to match the figures; the CFO's statement and the
 * directors' report are drafted from the numbers so they always agree.
 */
import { formatMoney } from "@/lib/money"
import type { AnnualFigures } from "./figures"
import type { AnnualReport, Section, SectionData, SectionType, Part } from "./types"
import { THEMES } from "./types"

const gh = (n: number) => formatMoney(n, "GHS", { whole: true })
const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const grow = (cur: number, prev: number) => (prev ? (cur - prev) / Math.abs(prev) : 0)

/** A CFO's statement written from the year's numbers. Edited freely afterwards. */
export function draftCfoStatement(f: AnnualFigures) {
  const { cur, prev } = f.pl
  return [
    "Dear shareholders,",
    `I am pleased to present the financial results of Kumasi Traders Ltd for the year ended 31 December ${f.year}.`,
    "## Revenue",
    `Revenue rose by ${pct(grow(cur.revenue, prev.revenue))} to ${gh(cur.revenue)} (${f.prior}: ${gh(prev.revenue)}). Sales of goods remained our main source of income, supported by steady growth in delivery and handling services across our three branches.`,
    "## Margins and costs",
    `Gross profit grew to ${gh(cur.grossProfit)}, a gross margin of ${pct(cur.grossProfit / cur.revenue)}. Operating expenses were ${gh(cur.operatingExpenses)}, of which staff costs were ${gh(cur.staff)}. We kept premises and running costs in line with the growth of the business.`,
    "## Profit",
    `Profit before tax was ${gh(cur.profitBeforeTax)} and, after income tax of ${gh(cur.tax)}, profit for the year was ${gh(cur.profitForYear)} (${f.prior}: ${gh(prev.profitForYear)}), an increase of ${pct(grow(cur.profitForYear, prev.profitForYear))}. Earnings per share were GH₵ ${cur.eps.toFixed(2)}.`,
    "## Cash and financing",
    `Net cash from operating activities was ${gh(f.cashflow.netOperating)}. We invested ${gh(-f.cashflow.capex)} in vehicles and equipment, repaid ${gh(-f.cashflow.loanRepaid)} of our Stanbic term loan and paid dividends of ${gh(f.dividends.paid2025)}. Cash and cash equivalents closed the year at ${gh(f.bs.cur.cash)}.`,
    "## Dividend",
    `The Board recommends a final dividend of GH₵ ${f.dividends.proposedPerShare.toFixed(2)} per share, a total of ${gh(f.dividends.proposedTotal)}, for approval at the Annual General Meeting.`,
    "Thank you for your continued confidence in Kumasi Traders.",
  ].join("\n\n")
}

/** The statutory directors' report, drafted from the numbers. */
export function draftDirectorsReport(f: AnnualFigures) {
  const { cur } = f.pl
  return [
    `The Directors have pleasure in presenting their report and the audited financial statements of Kumasi Traders Ltd for the year ended 31 December ${f.year}.`,
    "## Principal activities",
    "The Company distributes food, household and building goods to retailers, institutions and consumers from branches in Kumasi, Accra and Takoradi, and provides delivery and handling services.",
    "## Financial results",
    `Revenue for the year was ${gh(cur.revenue)}. Profit before tax was ${gh(cur.profitBeforeTax)} and profit for the year was ${gh(cur.profitForYear)}. Retained earnings at 31 December ${f.year} were ${gh(f.bs.cur.retained)}.`,
    "## Dividend",
    `An interim dividend of ${gh(f.dividends.paid2025)} was paid during the year. The Directors recommend a final dividend of GH₵ ${f.dividends.proposedPerShare.toFixed(2)} per share (${gh(f.dividends.proposedTotal)}), subject to shareholders' approval.`,
    "## Statement of Directors' responsibilities",
    "The Directors are responsible for preparing financial statements that give a true and fair view of the financial position, performance and cash flows of the Company, in accordance with IFRS for SMEs and the Companies Act, 2019 (Act 992). The Directors have taken reasonable steps to safeguard the assets of the Company and to prevent and detect fraud and other irregularities.",
    "## Going concern",
    "The Directors have assessed the Company's ability to continue as a going concern and are satisfied that it has adequate resources to continue in business for the foreseeable future.",
    "## Auditors",
    "Asante & Partners Chartered Accountants have expressed their willingness to continue in office in accordance with section 139(5) of the Companies Act, 2019 (Act 992).",
  ].join("\n\n")
}

const s = <T extends SectionType>(id: string, type: T, title: string, part: Part, data: SectionData[T], enabled = true): Section<T> => ({ id, type, title, part, enabled, data })

export function defaultReport(f: AnnualFigures): AnnualReport {
  const sections: Section[] = [
    s("cover", "cover", "Cover", "Opening", { title: "Annual report 2025", subtitle: "Trading with purpose across Ghana" }),
    s("contents", "contents", "Contents", "Opening", {}),
    s("about", "about", "About this report", "Opening", {
      body: [
        `This annual report covers Kumasi Traders Ltd for the financial year 1 January to 31 December ${f.year}. It sets out how we performed, how we are governed, and our audited financial statements.`,
        "The financial statements have been prepared in accordance with IFRS for SMEs and the Companies Act, 2019 (Act 992). Every figure in this report is drawn directly from our accounting records in Tapanta Books and has been reviewed by the Board and our external auditors.",
        "## Forward-looking statements",
        "Some statements in this report relate to future plans and expectations. They involve risks and uncertainties, and actual results may differ.",
      ].join("\n\n"),
    }),
    s("agm-notice", "agm-notice", "Notice of annual general meeting", "Notices", {
      agmNumber: "Third",
      date: "Tuesday, 24 March 2026",
      time: "10:00",
      venue: "Golden Tulip Kumasi City, Kumasi",
      body: "Notice is hereby given that the Third Annual General Meeting of the Shareholders of Kumasi Traders Ltd will be held to transact the following business:",
      resolutions: [
        { id: "r1", kind: "ordinary", text: `To receive and consider the audited financial statements for the year ended 31 December ${f.year}, together with the reports of the Directors and the Auditors.` },
        { id: "r2", kind: "ordinary", text: `To declare a final dividend of GH₵ ${f.dividends.proposedPerShare.toFixed(2)} per share for the year ended 31 December ${f.year}.` },
        { id: "r3", kind: "ordinary", text: "To re-elect Abena Owusu-Ansah, who retires by rotation and, being eligible, offers herself for re-election." },
        { id: "r4", kind: "ordinary", text: "To approve Directors' fees for the year ending 31 December 2026." },
        { id: "r5", kind: "ordinary", text: "To authorise the Directors to fix the remuneration of the Auditors." },
      ],
    }),
    s("proxy-form", "proxy-form", "Proxy form", "Notices", { returnBy: "Friday, 20 March 2026" }),
    s("dividend", "dividend", "Declaration of final dividend", "Notices", {
      perShare: f.dividends.proposedPerShare,
      exDate: "Thursday, 26 March 2026",
      qualifyingDate: "Monday, 30 March 2026",
      paymentDate: "Thursday, 16 April 2026",
      body: `Notice is hereby given that the Board has recommended a final dividend of GH₵ ${f.dividends.proposedPerShare.toFixed(2)} per share for the year ended 31 December ${f.year}, subject to approval by shareholders at the Annual General Meeting. Dividends are subject to the deduction of withholding tax.`,
    }),
    s("who-we-are", "who-we-are", "Who we are", "Who we are", {
      intro: "Kumasi Traders Ltd is a Ghanaian distribution business founded in Adum, Kumasi. We supply food, household and building goods to retailers, hospitals, schools and households, and we deliver them on time.",
      vision: "To be the most trusted trading partner in Ghana.",
      mission: "To get quality goods to every customer, at a fair price, when they need them.",
      values: ["Honesty in every transaction", "Respect for customers and suppliers", "Reliability you can plan around", "Growing together with our community"],
    }),
    s("highlights", "highlights", "The year in numbers", "Who we are", {
      items: [
        { id: "h1", value: "3", unit: "branches", caption: "serving customers in Kumasi, Accra and Takoradi" },
        { id: "h2", value: "12,400", unit: "deliveries", caption: "made on time across Ghana in 2025" },
        { id: "h3", value: "64", unit: "colleagues", caption: "employed full time, 41% of them women" },
      ],
    }),
    s("salient", "salient", "Salient features", "Performance", { intro: "Three years of our key figures, with growth on the year." }),
    s("chairman", "chairman", "Chairman's statement", "Performance", {
      name: "Nana Yaw Boakye",
      role: "Board chairman",
      body: [
        "Ladies and gentlemen, esteemed shareholders,",
        "It is my pleasure to welcome you to the Third Annual General Meeting of Kumasi Traders Ltd. On behalf of the Board, I thank you for your continued trust in our company.",
        "## The operating environment",
        "2025 was a year of recovery for the Ghanaian economy. Inflation eased steadily, the cedi stabilised and interest rates began to fall. Our customers felt the relief, and so did we: demand for staple goods held up, and our suppliers were able to plan with more confidence.",
        "## Our performance",
        `Against this backdrop, Kumasi Traders delivered its strongest year yet. Revenue grew to ${gh(f.pl.cur.revenue)} and profit for the year rose to ${gh(f.pl.cur.profitForYear)}. We opened no new branches, choosing instead to deepen our presence in Kumasi, Accra and Takoradi and to invest in our delivery fleet.`,
        "## Governance",
        "The Board met four times during the year. We strengthened our controls by moving our books to Tapanta Books, introducing second-person approval for large journal entries and monthly period locks.",
        "## Looking ahead",
        "We enter 2026 with a strong balance sheet, a lower loan balance and a team that knows its customers well. The Board is confident in the company's prospects.",
        "I thank my fellow Directors, our management team and every colleague for their dedication.",
      ].join("\n\n"),
    }),
    s("ceo", "ceo", "Managing director's statement", "Performance", {
      name: "Ama Mensah",
      role: "Managing director",
      body: [
        "Dear shareholders,",
        "2025 was a year in which our focus on doing the basics well paid off. We delivered more, wasted less and served our customers faster.",
        "## Customers",
        "We now serve more than 900 active trade customers, from neighbourhood shops to hospitals and schools. Our on-time delivery rate reached 96%, and repeat orders from our largest customers grew by a fifth.",
        "## Operations",
        "We added two delivery vans to the fleet and moved our Adum warehouse to a new layout that cut picking times by a third. Mobile money now accounts for a growing share of our collections, which has shortened the time customers take to pay us.",
        "## People",
        "Our 64 colleagues are the heart of the business. In 2025 we introduced a structured training programme for branch staff and promoted four colleagues into supervisory roles.",
        "## Outlook",
        "In 2026 we will continue to invest in our fleet and our systems, grow our institutional customer base and keep a careful eye on costs.",
      ].join("\n\n"),
    }),
    s("cfo", "cfo", "Finance director's statement", "Performance", { name: "Kofi Boateng", role: "Finance director", body: draftCfoStatement(f) }),
    s("board", "board", "Our board of directors", "Governance", {
      intro: "Our Board brings together experience in trade, finance, law and public service.",
      people: [
        { id: "b1", name: "Nana Yaw Boakye", role: "Board chairman · Non-executive", appointed: "March 2023", qualifications: "BA Economics, MBA", bio: "A former regional director of a leading Ghanaian bank, with over 25 years in commercial lending to traders and manufacturers." },
        { id: "b2", name: "Ama Mensah", role: "Managing director · Executive", appointed: "March 2023", qualifications: "BSc Business Administration", bio: "Founder of Kumasi Traders. Ama has led the business from a single shop in Adum to three branches." },
        { id: "b3", name: "Kofi Boateng", role: "Finance director · Executive", appointed: "June 2023", qualifications: "BCom, Chartered Accountant (ICAG)", bio: "Kofi leads finance, tax and treasury, and oversaw the move of the company's books to Tapanta." },
        { id: "b4", name: "Abena Owusu-Ansah", role: "Independent non-executive", appointed: "March 2023", qualifications: "LLB, BL", bio: "A commercial lawyer advising family businesses on governance and contracts. Chairs the Audit and Risk Committee." },
        { id: "b5", name: "Kwesi Adu", role: "Non-executive", appointed: "January 2024", qualifications: "BSc Logistics", bio: "An operations specialist with experience running distribution networks across West Africa." },
      ],
    }),
    s("management", "management", "Our management team", "Governance", {
      intro: "The people who run Kumasi Traders day to day.",
      people: [
        { id: "m1", name: "Ama Mensah", role: "Managing director", bio: "Leads the business and its strategy." },
        { id: "m2", name: "Kofi Boateng", role: "Finance director", bio: "Leads finance, tax and treasury." },
        { id: "m3", name: "Yaw Asare", role: "Head of operations", bio: "Runs the warehouse, fleet and deliveries." },
        { id: "m4", name: "Akosua Frimpong", role: "Branch manager, Osu – Accra", bio: "Leads our Accra branch and institutional sales." },
        { id: "m5", name: "Efua Owusu", role: "Accounts officer", bio: "Keeps the books, from invoices to reconciliations." },
      ],
    }),
    s("governance", "governance", "Statement on corporate governance", "Governance", {
      body: [
        "The Board is committed to high standards of corporate governance, guided by the Companies Act, 2019 (Act 992).",
        "## The Board",
        "The Board has five members: a non-executive chairman, two executive directors and two non-executive directors, one of whom is independent. The roles of chairman and managing director are held by different people.",
        "## Meetings and attendance",
        "The Board met four times in 2025. All Directors attended every meeting except one, for which an apology was received.",
        "## Internal control",
        "The Directors are responsible for the company's system of internal control. Key controls include second-person approval of journal entries above GH₵ 50,000, monthly bank reconciliations and period locks after each month-end close.",
      ].join("\n\n"),
    }),
    s("directors-report", "directors-report", "Report of the directors", "Governance", { body: draftDirectorsReport(f) }),
    s("committees", "committees", "Committee reports", "Governance", {
      items: [
        { id: "c1", name: "Audit and Risk Committee", chair: "Abena Owusu-Ansah", body: "The Committee met three times in 2025. It reviewed the half-year and annual financial statements, the external auditor's plan and findings, and the company's risk register. It recommended the audited financial statements to the Board for approval." },
        { id: "c2", name: "Remuneration Committee", chair: "Nana Yaw Boakye", body: "The Committee met twice. It reviewed staff pay against the market, approved the 2025 bonus pool and recommended Directors' fees for 2026." },
      ],
    }),
    s("auditor", "auditor", "Independent auditor's report", "Financial statements", {
      firm: "Asante & Partners Chartered Accountants",
      partner: "Kwabena Asante",
      licence: "ICAG/P/2025/118",
      signedOn: "26 February 2026",
      body: [
        "## Opinion",
        `We have audited the financial statements of Kumasi Traders Ltd, which comprise the statement of financial position as at 31 December ${f.year}, and the statement of comprehensive income, statement of changes in equity and statement of cash flows for the year then ended, and notes to the financial statements, including a summary of significant accounting policies.`,
        `In our opinion, the accompanying financial statements give a true and fair view of the financial position of Kumasi Traders Ltd as at 31 December ${f.year}, and of its financial performance and cash flows for the year then ended, in accordance with IFRS for SMEs and the requirements of the Companies Act, 2019 (Act 992).`,
        "## Basis for opinion",
        "We conducted our audit in accordance with International Standards on Auditing. We are independent of the Company in accordance with the ethical requirements relevant to our audit, and we believe the audit evidence we have obtained is sufficient and appropriate to provide a basis for our opinion.",
        "## Responsibilities of the Directors",
        "The Directors are responsible for preparing financial statements that give a true and fair view, and for such internal control as they determine is necessary.",
      ].join("\n\n"),
    }),
    s("sci", "sci", "Statement of comprehensive income", "Financial statements", {}),
    s("sofp", "sofp", "Statement of financial position", "Financial statements", {}),
    s("soce", "soce", "Statement of changes in equity", "Financial statements", {}),
    s("socf", "socf", "Statement of cash flows", "Financial statements", {}),
    s("notes", "notes", "Notes to the financial statements", "Financial statements", {
      policies: [
        "## Reporting entity",
        "Kumasi Traders Ltd is a private limited liability company incorporated and domiciled in Ghana. Its registered office is on Adum Road, Kumasi.",
        "## Basis of preparation",
        "The financial statements have been prepared in accordance with IFRS for SMEs and the Companies Act, 2019 (Act 992), on the historical cost basis. They are presented in Ghana cedis (GH₵).",
        "## Revenue",
        "Revenue is recognised when goods are delivered or services are performed, at the amount the Company expects to receive, excluding VAT.",
        "## Property, plant and equipment",
        "Property, plant and equipment are stated at cost less accumulated depreciation. Depreciation is charged on a straight-line basis over the useful lives of the assets: vehicles, 5 years; furniture and equipment, 5 years.",
        "## Inventories",
        "Inventories are stated at the lower of cost and net realisable value, using the weighted average cost method.",
        "## Foreign currency",
        "Transactions in foreign currencies are translated at the rate on the date of the transaction. Monetary balances are revalued at the closing rate, and differences are recognised in profit or loss.",
      ].join("\n\n"),
    }),
    s("shareholders", "shareholders", "Shareholder information", "Shareholder information", {
      intro: `Kumasi Traders Ltd had ${f.sharesInIssue.toLocaleString("en-GB")} ordinary shares in issue at 31 December ${f.year}.`,
      holders: [
        { id: "s1", name: "Ama Mensah", shares: 104_000 },
        { id: "s2", name: "Mensah Family Trust", shares: 40_000 },
        { id: "s3", name: "Nana Yaw Boakye", shares: 20_000 },
        { id: "s4", name: "Kofi Boateng", shares: 12_000 },
        { id: "s5", name: "Ashanti Growth Fund", shares: 24_000 },
      ],
    }),
    s("five-year", "five-year", "Five-year financial summary", "Shareholder information", {}),
    s("administration", "administration", "Administration", "Shareholder information", {
      registeredOffice: "Adum Road, PO Box 1182, Kumasi, Ghana",
      registrationNumber: "CS123452023",
      tin: "C0004417201",
      secretary: "Abena Owusu-Ansah",
      auditors: "Asante & Partners Chartered Accountants, Kumasi",
      bankers: ["GCB Bank PLC", "Ecobank Ghana PLC", "Stanbic Bank Ghana Ltd"],
      solicitors: "Owusu-Ansah & Co., Kumasi",
    }),
  ]

  return {
    id: "ar-2025",
    year: f.year,
    companyId: "kt",
    status: "draft",
    sections,
    theme: { ...THEMES.crimson, pattern: "adinkra" },
    signoffs: [{ role: "preparer" }, { role: "reviewer" }, { role: "director" }],
    updatedAt: "2026-10-05T09:00",
  }
}
