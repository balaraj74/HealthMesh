# Design Guidelines: AI Clinical Care Orchestrator

## Design Approach

**Selected System**: Microsoft Fluent Design System
**Justification**: Azure-native healthcare application requiring enterprise-grade reliability, accessibility compliance (WCAG 2.1 AA), and professional clinical workflows. Fluent's data-dense patterns and enterprise component library align perfectly with healthcare information systems.

**Key Design Principles**:
- Clinical Clarity: Information hierarchy that prioritizes patient safety and decision-critical data
- Professional Trust: Enterprise aesthetic that conveys medical-grade reliability
- Cognitive Efficiency: Reduce mental load for time-pressured clinicians
- Explainable Interface: Visual transparency in AI reasoning and confidence levels

---

## Typography

**Font Family**: 
- Primary: 'Segoe UI', system-ui, sans-serif (Microsoft Fluent standard)
- Monospace: 'Consolas', monospace (for FHIR data, lab values)

**Type Scale**:
- Page Titles: text-3xl font-semibold (clinical case headers)
- Section Headers: text-xl font-semibold (agent outputs, patient sections)
- Subsections: text-lg font-medium (lab categories, medication groups)
- Body Text: text-base (patient data, recommendations)
- Metadata: text-sm (timestamps, sources, confidence scores)
- Critical Alerts: text-sm font-bold uppercase tracking-wide (safety warnings)

**Hierarchy Rules**:
- Patient identifiers always bold
- AI-generated content uses regular weight with clear labeling
- Critical values/alerts use font-bold and increased letter-spacing

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8
- Component padding: p-4, p-6
- Section margins: mb-6, mb-8
- Card spacing: gap-4, gap-6
- Dashboard grids: gap-6

**Grid Philosophy**:
- Dashboard: 12-column grid for flexible data panels
- Main content: 8-column max-width for readability
- Sidebar navigation: 250px fixed width
- Multi-panel layouts for agent orchestration view

---

## Component Library

### Navigation & Layout
- **Persistent Sidebar**: Fixed left navigation (250px) with agent status indicators, case management, settings
- **Top Bar**: Patient context strip showing active case, critical alerts, user profile
- **Breadcrumb Trail**: For multi-step workflows (case upload → analysis → review)

### Dashboard Components
- **Agent Status Cards**: Grid of 6 cards (2 rows × 3 columns on desktop) showing each agent's state, last activity, and health status
- **Patient Summary Panel**: Sticky left panel with demographics, active diagnoses, allergies (always visible during case review)
- **Timeline View**: Vertical timeline for case progression and agent interactions
- **Orchestrator Flow Diagram**: Visual representation of agent communication with directional indicators

### Data Display
- **FHIR Data Tables**: Structured tables with sortable columns for medications, conditions, observations
- **Lab Results Grid**: Tabular display with visual flags for abnormal values (use border treatments, not just color)
- **Recommendation Cards**: Agent output displayed in elevated cards with clear attribution, confidence score badge, and expandable evidence section
- **Risk Alert Banners**: Prominent banner system with severity levels (critical/warning/info) using border-left accent, icon, and clear action items

### Forms & Input
- **Case Upload Form**: Multi-step wizard with progress indicator
  - Step 1: Patient demographics (structured form fields)
  - Step 2: FHIR JSON import (file upload + validation preview)
  - Step 3: Lab reports (PDF/image upload with drag-drop)
  - Step 4: Clinical question input (text area with character count)
- **File Upload Zones**: Large drop zones with clear file type indicators and processing status
- **Feedback Interface**: Inline correction tools for clinicians to annotate AI recommendations

### Clinical Decision Support
- **Decision Summary Report**: Multi-section document layout
  - Executive Summary (top-level recommendations)
  - Agent Findings (tabbed or accordion sections per agent)
  - Evidence Citations (expandable reference list)
  - Risk Assessment (highlighted safety concerns)
  - Audit Trail (timestamped action log)
- **Confidence Scoring**: Progress bar style indicators (0-100%) with textual labels (Low/Medium/High Confidence)
- **Explainability Panel**: Expandable drawer showing AI reasoning chain with step-by-step logic

### Modals & Overlays
- **Agent Detail Modal**: Full-screen overlay for deep-diving into specific agent analysis
- **Evidence Viewer**: Slide-out panel for research citations and guideline references
- **Confirmation Dialogs**: Critical actions (submit case, override AI recommendation) require explicit confirmation

---

## Interaction Patterns

**Navigation Flow**:
1. Dashboard → View active cases and agent health
2. Create Case → Upload patient data and reports
3. Analysis View → Monitor agent orchestration in real-time
4. Review → Clinician examines recommendations
5. Report → Generate decision summary

**Feedback Mechanisms**:
- Inline "Mark as Helpful/Not Helpful" for each AI recommendation
- Comment annotation system for clinician notes
- Correction interface for AI errors (feeds back to system)

**Loading States**:
- Skeleton screens for data tables
- Progress indicators for agent processing (show which agent is active)
- Indeterminate spinners for orchestrator coordination

---

## Accessibility & Compliance

- All interactive elements meet minimum 44px touch target
- ARIA labels for all agent status indicators and confidence scores
- Keyboard navigation throughout entire application
- Focus indicators with 2px offset ring
- Screen reader announcements for critical alerts
- Form validation with inline error messages and summary at top

---

## Animations: MINIMAL USE ONLY

- Agent status transitions: Subtle pulse on state change (0.3s)
- Loading indicators: Smooth spinner rotation
- Panel expansion: 0.2s ease-out for accordions/drawers
- NO decorative animations - clinical focus requires static, predictable interface

---

## Images

**Usage**: Minimal - this is a clinical data tool, not a marketing site

**Where Images Appear**:
- **No Hero Image**: Application loads directly to dashboard
- **Empty States**: Simple illustrations for "no cases uploaded" or "no active alerts" (use iconography, not photography)
- **User Avatars**: Small circular avatars for clinician profiles (32px, top-right corner)
- **Agent Icons**: Consistent iconography for each of the 6 agents (use Fluent System Icons)

**No stock photography of doctors/patients** - maintain professional, data-focused aesthetic throughout.