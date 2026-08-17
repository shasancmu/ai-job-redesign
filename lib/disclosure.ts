// ============================================================================
// Vendor Disclosure — a generalized adaptation of the HAIP AI Vendor Disclosure
// Framework (Health AI Partnership). The original is healthcare-/AI-specific;
// this keeps the five domains and the "minimum information for transparency"
// questions, generalizes them to any vendor/product, and gates the AI-specific
// rigor (model metrics, subgroup bias, drift) behind an `aiOnly` flag that
// surfaces only when the buyer marks the vendor as AI/ML-based.
//   Source: Health AI Partnership, "HAIP AI Vendor Disclosure Framework".
// ============================================================================

export type DiscQ = { key: string; label: string; help?: string; aiOnly?: boolean };
export type DiscDomain = { key: string; title: string; blurb: string; questions: DiscQ[] };

export const DISCLOSURE_DOMAINS: DiscDomain[] = [
  {
    key: "capabilities",
    title: "Capabilities & intended use",
    blurb: "What the product does, who it's for, where its edges are, and how mature it is.",
    questions: [
      { key: "capabilities", label: "What does the product do?", help: "Core functionalities, in specific terms." },
      { key: "intended_use", label: "What is it used for?", help: "The concrete use cases it's designed for." },
      { key: "intended_user", label: "Who is the intended user?", help: "Roles, and any training or expertise required to use it appropriately." },
      { key: "impact", label: "Who does it impact?", help: "All affected stakeholders — direct users, downstream people, and any differential impact across groups." },
      { key: "limitations", label: "What does it NOT do, and what limitations apply?", help: "Known limitations and edge cases where it may not perform well; restrictions on use." },
      { key: "inclusion_exclusion", label: "When should it — and shouldn't it — be used?", help: "The parameters/scenarios that determine appropriate vs. inappropriate use." },
      { key: "context", label: "Where will it be used?", help: "Intended deployment context (enterprise-wide vs. team-specific) and environment factors that affect performance." },
      { key: "essential_response", label: "What's required to act on its outputs?", help: "The capabilities/resources a buyer must have in place to respond to what the product produces." },
      { key: "cadence", label: "When and how often is it used?", help: "Appropriate timing and frequency of use within a process." },
      { key: "maturity", label: "Is this experimental or well-established?", help: "Development history and adoption in comparable settings. Experimental = early/limited validation; well-established = widely deployed and evidenced. Back maturity claims with the evidence in the next domain." },
    ],
  },
  {
    key: "performance",
    title: "Performance & compliance",
    blurb: "Evidence it works, how risk and bias are handled, and its regulatory / contractual standing.",
    questions: [
      { key: "performance", label: "What evidence do you have that it works?", help: "Metrics used, how it was evaluated, results, and — critically — validation done BEYOND your own development environment." },
      { key: "model_performance", label: "Model performance detail", help: "Training data source and composition, preprocessing, handling of missing data; model-level and full-system-level metrics; external validation studies.", aiOnly: true },
      { key: "subgroup", label: "How is bias assessed and mitigated across subgroups?", help: "Equity of training data and assessment methodology; performance across the subgroups a buyer would care about. For LLMs: safety prompts, languages supported, any translation layer.", aiOnly: true },
      { key: "risks", label: "What are ALL known risks, and how are they mitigated?", help: "Include failure metrics/thresholds. For AI: also hallucination, off-label use, performance drift from test conditions, and cold-start risk." },
      { key: "regulatory", label: "What is the regulatory / compliance status?", help: "Which regulations apply; if you assert no clearance is required, give the rationale." },
      { key: "contract", label: "What are your contract expectations on liability and indemnification?", help: "Any non-negotiable liability clauses, indemnification terms, and how new functionality introduced mid-contract is communicated." },
    ],
  },
  {
    key: "data",
    title: "Data stewardship",
    blurb: "How our data is secured, used, retained, owned, and returned — including if you exit.",
    questions: [
      { key: "data_security", label: "What data governance and security practices are in place?", help: "Storage, security controls, and compliance with privacy laws (e.g., GDPR, CCPA, HIPAA where relevant)." },
      { key: "secondary_use", label: "What are your policies for secondary use of our data?", help: "Whether our data trains your base models; who owns product enhancements/IP derived from our data; commercial use of derived insights." },
      { key: "retention_qa", label: "What are the data retention periods and quality-assurance mechanisms?", help: "Exact timeframes, access protocols for both sides, and anonymization/protection practices." },
      { key: "exit", label: "How do you prevent lock-in on exit?", help: "Guaranteed data portability, standardized formats, transfer mechanisms, and a reasonable exit strategy that limits transition cost." },
      { key: "ownership", label: "What are the data ownership rights and transfer protocols?", help: "Explicit ownership, and a complete, verifiable data-retrieval process." },
      { key: "destruction", label: "What is the plan for data retention and destruction post-contract?", help: "Precise timeline after termination and compliance with data-protection rules." },
      { key: "discontinuation", label: "What's the contingency if your business is discontinued?", help: "Minimum notice period, financial provisions for an orderly transition, and buyer protections." },
    ],
  },
  {
    key: "integration",
    title: "Integration & cost",
    blurb: "The real total cost of ownership — technical fit, effort, people, and money.",
    questions: [
      { key: "interoperability", label: "How does it interface with our existing systems?", help: "Data-exchange mechanisms with the systems we already run." },
      { key: "infrastructure", label: "What infrastructure prerequisites are required?", help: "Hardware, software, cloud services, or APIs; data locations, processing needs, network specs." },
      { key: "integration_path", label: "What integration paths are available, and the risks of each?", help: "Standalone / partial / full integration — advantages, limitations, and risks of each option." },
      { key: "personnel", label: "What people and time are required?", help: "Roles/expertise for implementation and ongoing management, with time commitments broken down by role and activity." },
      { key: "cost", label: "What is the complete cost estimate?", help: "Upfront (licensing, install, customization), operational (maintenance, updates, support), and likely hidden costs (downtime, incompatibilities, scaling)." },
    ],
  },
  {
    key: "lifecycle",
    title: "Lifecycle & support",
    blurb: "What you commit to after go-live — monitoring, incidents, value, and service levels.",
    questions: [
      { key: "maintenance", label: "How is it maintained and updated, and by whom?", help: "Update criteria and frequency, and how updates are communicated back to us. For AI: prompt/response changes from model updates and their impact." },
      { key: "monitoring", label: "How is performance monitored, and how is degradation handled?", help: "Specific thresholds, remediation for drift/degradation, pause triggers, and the process to evaluate/approve/restore service." },
      { key: "uat", label: "How will user feedback be gathered (acceptance testing)?", help: "Criteria and methodology for evaluating real-world performance, including human-in-the-loop testing where relevant." },
      { key: "incidents", label: "What is the incident / adverse-event reporting protocol?", help: "Who is notified, timeliness, dedicated channels, and root-cause analysis + preventive measures afterward." },
      { key: "value", label: "What metrics support long-term value tracking?", help: "Operational, financial, and outcome metrics; preliminary outcome data from you, and long-term tracking protocols for us." },
      { key: "oversight_contact", label: "Who is the designated oversight / accountability contact?", help: "Name, role, contact info, and their expertise in the technical and operational aspects of the product." },
      { key: "response_time", label: "What are your support response-time estimates?", help: "Lead time from first response to resolution, and the escalation path from support to engineering." },
      { key: "audit", label: "How frequently will post-implementation audits be conducted?", help: "Cadence of performance and update reporting after go-live." },
    ],
  },
];

// The original HAIP framework in its native healthcare + AI context (for the
// Healthcare AI Vendor Disclosure module). Keeps the clinical/HDO/patient
// framing and the healthcare-specific references (Section 1557, HIPAA, FDA,
// HEDIS, adverse-event reporting).
export const HAIP_DOMAINS: DiscDomain[] = [
  {
    key: "capabilities",
    title: "System capabilities & intended use",
    blurb: "What the AI system does, who it's for and affects, its limits, and its maturity.",
    questions: [
      { key: "capabilities", label: "What does the AI system do?", help: "Detailed documentation of specific functionalities." },
      { key: "intended_use", label: "What is the AI system used for?", help: "Documented clinical/operational use cases." },
      { key: "intended_user", label: "Who is the intended user?", help: "Specific roles, required training, and expertise levels for appropriate use." },
      { key: "impact", label: "Who does the AI system impact?", help: "All affected stakeholders — direct users, patients, and auxiliary clinical/administrative staff — with attention to differential impacts across groups." },
      { key: "limitations", label: "What does it NOT do, and what limitations apply?", help: "Known limitations and edge cases where the system may not perform optimally, and restrictions on use." },
      { key: "inclusion_exclusion", label: "What are the inclusion / exclusion criteria for use?", help: "Patient characteristics and clinical scenarios that determine when the system should or should not be used." },
      { key: "context", label: "Where will the AI system be used?", help: "Care setting (inpatient / outpatient / virtual / direct-to-patient), level of care (urgent / ED / ICU), enterprise-wide vs. department-specific, and environment factors affecting performance." },
      { key: "essential_response", label: "What critical-care capabilities are required to act on its insights?", help: "Essential-intervention alignment — e.g., for a model predicting respiratory decline, ventilators must be available to respond to alerts." },
      { key: "cadence", label: "At what point, and how often, during a care episode is it used?", help: "Appropriate timing and frequency (e.g., how frequently a readmissions risk score is reported), and time-sensitive aspects." },
      { key: "maturity", label: "Is the AI experimental or well-established?", help: "Development history and adoption metrics in comparable settings. Experimental = early/limited validation; well-established = validated across settings with evidence of effectiveness and safety. Back the claim with the validation studies below." },
    ],
  },
  {
    key: "performance",
    title: "System performance & compliance",
    blurb: "Metrics and external validation, subgroup bias, risks, regulatory status, and contract terms.",
    questions: [
      { key: "model_performance", label: "What performance metrics were used, how was the model evaluated, and what were the results?", help: "Training data source and composition, preprocessing, handling of missing data; performance metrics with rationale; EXTERNAL validation beyond the development context. Disclose model-level and full-system-level performance. (The Duke DIHI model-facts label is a useful template.) For LLMs, detail the metrics and evaluation approach." },
      { key: "subgroup", label: "How has bias been assessed and mitigated across patient subgroups?", help: "Under HHS OCR Section 1557 of the ACA: demonstrate efforts to assess and mitigate bias, with equitable training data and assessment methods, and performance for the subgroups relevant to the population. (See the HEAAL framework.) For LLMs: safety prompts, supported languages, and any translation layer." },
      { key: "risks", label: "What are all known risks, and how are they mitigated?", help: "Include system failure metrics/thresholds. Known risks may include hallucination (LLMs), off-label use, performance varying from test data, and cold-start risk." },
      { key: "regulatory", label: "What is the regulatory status of the AI system?", help: "Whether it's regulated and under which state/local/federal rules (e.g., FDA). If you assert no clearance is required, provide the rationale for the HDO to validate." },
      { key: "contract", label: "What are your contract expectations, including liability and indemnification?", help: "Any non-negotiable liability clauses, indemnification terms, and notification of new functionality introduced during implementation." },
    ],
  },
  {
    key: "data",
    title: "Data stewardship",
    blurb: "Security and HIPAA compliance, secondary use and IP, retention, ownership, and exit.",
    questions: [
      { key: "data_security", label: "What data governance practices ensure security and compliance?", help: "Data storage, security, and compliance with HIPAA and state privacy laws (e.g., CCPA)." },
      { key: "secondary_use", label: "What are the policies for secondary use of the HDO's data?", help: "Model-performance monitoring and conditions for training/updates; who retains IP rights to enhancements developed from the HDO's data; whether the HDO's data trains base models; and commercial applications of derived insights." },
      { key: "retention_qa", label: "What are the data retention periods and quality-assurance mechanisms?", help: "Exact timeframes, access protocols for vendor and HDO, anonymization/protection, and conditions for retrospective use." },
      { key: "exit", label: "How is vendor lock-in prevented on exit / model removal?", help: "Guaranteed data portability, standardized formats, mechanisms to transfer systems and algorithms, and reasonable exit strategies." },
      { key: "ownership", label: "What are the data ownership rights and transfer protocols?", help: "Explicit ownership and a complete, verifiable data-retrieval process." },
      { key: "destruction", label: "What is the plan for data retention and destruction post-contract?", help: "Precise timeline after termination and compliance with data-protection regulations." },
      { key: "discontinuation", label: "What's the contingency if your business is discontinued?", help: "Minimum notice period, financial provisions for an orderly transition, and liability protections for the health system." },
    ],
  },
  {
    key: "integration",
    title: "Integration requirements",
    blurb: "EHR interoperability, infrastructure, integration paths, people, and total cost of ownership.",
    questions: [
      { key: "interoperability", label: "How does the AI system interface with existing systems?", help: "Data-exchange mechanisms with the EHR, data warehouses, and workflow tools already in place." },
      { key: "infrastructure", label: "What infrastructure prerequisites are required?", help: "Hardware, software, cloud services, or APIs; data storage locations, processing requirements, and network specifications." },
      { key: "integration_path", label: "What integration paths are available, and the risks of each?", help: "Standalone, partial integration (e.g., EHR data input only), or full integration — with the advantages, limitations, and risks of each." },
      { key: "personnel", label: "What roles and time commitments are needed?", help: "IT specialists, clinical staff, data analysts for implementation and ongoing management; time by role and activity (data collection, validation, testing, training, post-implementation adjustments)." },
      { key: "cost", label: "What is the complete cost estimate?", help: "Upfront (licensing, installation, customization), operational (maintenance, updates, support), and hidden costs (downtime, incompatibilities, future scaling)." },
    ],
  },
  {
    key: "lifecycle",
    title: "Lifecycle management",
    blurb: "Maintenance, drift monitoring, UAT, adverse-event reporting, value tracking, and SLAs.",
    questions: [
      { key: "maintenance", label: "How is the system maintained and updated, and by whom?", help: "How models are fine-tuned, criteria for updates, frequency, performance distributions showing improvement, and how updates are communicated to the HDO. For LLMs: prompt/response changes from updates and their impact." },
      { key: "monitoring", label: "What performance thresholds and remediation address model drift?", help: "Specific thresholds; remediation including automated service-pausing triggers and manual override; process to evaluate/approve/restore service; and conditions for temporary suspension and permanent termination." },
      { key: "uat", label: "How will user feedback be gathered (UAT criteria)?", help: "Technical metrics (e.g., AUC-ROC) plus methodology for real-world clinical performance via human-in-the-loop testing (A/B studies or before/after comparisons)." },
      { key: "incidents", label: "What is the adverse-event reporting protocol?", help: "Reporting to the vendor, the HDO, and/or regulators — responsiveness, timeliness, dedicated channels, and post-event root-cause analysis and preventive measures." },
      { key: "value", label: "What metrics support long-term tracking by the HDO?", help: "Clinical, operational, and financial performance; patient-outcome tracking (preliminary vendor data + long-term HDO protocols); workflow/efficiency gains; and how it meets quality reporting such as HEDIS / QI eligibility." },
      { key: "oversight_contact", label: "Who is the designated oversight & accountability contact?", help: "Name, role, contact info, and expertise in the technical and operational aspects; plus system-update communication protocols." },
      { key: "response_time", label: "What are the support response-time estimates?", help: "Lead time from first response to resolution, and the escalation rate from customer support to technical teams." },
      { key: "audit", label: "How frequently will post-implementation audits be conducted?", help: "Cadence of model-performance and update reporting based on established audit processes." },
    ],
  },
];

// The questions that apply given whether the vendor is AI/ML-based.
export function activeDomains(isAi: boolean): DiscDomain[] {
  return DISCLOSURE_DOMAINS.map((d) => ({
    ...d,
    questions: d.questions.filter((q) => isAi || !q.aiOnly),
  }));
}

export type DiscVariant = "general" | "haip";

// The domain set for a disclosure: the healthcare-native HAIP set, or the
// generalized set (AI questions gated by `isAi`).
export function domainsFor(variant: DiscVariant, isAi: boolean): DiscDomain[] {
  return variant === "haip" ? HAIP_DOMAINS : activeDomains(isAi);
}

export function variantForExercise(exercise: string): DiscVariant {
  return exercise === "disclosure-haip" ? "haip" : "general";
}

export function questionByKey(key: string): DiscQ | undefined {
  for (const d of DISCLOSURE_DOMAINS) for (const q of d.questions) if (q.key === key) return q;
  return undefined;
}

// Is the vendor's disclosure substantive enough to review? (avoids reviewing an
// empty form)
export function answeredCount(responses: Record<string, string> | undefined): number {
  if (!responses) return 0;
  return Object.values(responses).filter((v) => (v || "").trim().length > 10).length;
}
