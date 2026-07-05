# Route Sheet PDF — Format Specification

A build spec for the **Haloes Touch Hospice** Route Sheet PDF, written for the
`routecare-clinician` stack. Follow this to generate a print-ready route sheet
with `@react-pdf/renderer`. A complete drop-in component is in
[§10](#10-reference-implementation).

---

## 1. Purpose

Render a clinician's route sheet as a single, print-friendly PDF document:

- A branded masthead + title block + staff identity card.
- A **Visit Log table** that holds up to ~20 visits (blank rows are padded in so
  it works as a reusable sheet), flows onto extra pages if there are more, and
  **repeats its column header** on every page.
- A **Total Earnings** line that sums the Rate column.
- A **Service Code Reference** legend kept together on the **last page**.

## 2. Rendering stack & hard constraints

Target: **`@react-pdf/renderer` ^4.5** (already a dependency). This is **not**
HTML/CSS — it renders a React tree of PDF primitives. Respect these limits:

- Layout is **flexbox only**. No CSS Grid, no `float`, no `position: absolute`
  except via the `fixed` prop. Default `flexDirection` is `column` — set
  `flexDirection: 'row'` explicitly for every horizontal row.
- **No** `box-shadow`, **no** background gradients, **no** `font-variant`. Use
  flat fills and hairline borders only (this is what makes it print cleanly).
- Widths accept `%` or points (`pt`, 1pt = 1/72"). Letter page = `612 × 792 pt`.
- Custom fonts must be **static TTFs** registered via `Font.register`. Variable
  fonts are not reliably supported — use the static instances shipped alongside
  this spec (`route-sheet-fonts.zip`).
- A repeating table header is achieved with the **`fixed` prop** on the header
  row `View`. Prevent a row from splitting across pages with `wrap={false}`.

## 3. Fonts

Add these six static TTFs to the project (e.g. `src/assets/fonts/`), then register
them once at module load. They are provided in `route-sheet-fonts.zip`; both
families are from Google Fonts (OFL).

| Family     | Weight / style      | File                  | Used for                          |
|------------|---------------------|-----------------------|-----------------------------------|
| Inter      | 400 regular         | `Inter-Regular.ttf`   | body, table cells, comments       |
| Inter      | 500 medium          | `Inter-Medium.ttf`    | field values                      |
| Inter      | 600 semibold        | `Inter-Semi.ttf`      | labels, chips, section headers    |
| Inter      | 700 bold            | `Inter-Bold.ttf`      | rate, "Confidential" tag          |
| Fraunces   | 600 semibold        | `Fraunces-Semi.ttf`   | title, staff names, totals, code  |
| Fraunces   | italic              | `Fraunces-Italic.ttf` | subtitle, signature text          |

> **Fallback:** if you can't bundle fonts, register nothing and swap
> `Fraunces → 'Times-Roman'` and `Inter → 'Helvetica'` (both built into
> react-pdf). The layout still holds; only the type character changes.

## 4. Design tokens

### Colors — **print-safe, white background, no green fills**

```ts
const C = {
  ink:       '#242A27', // primary text
  muted:     '#6F6C64', // comments, secondary
  faint:     '#9C988E', // labels, hairline captions
  terra:     '#C15E38', // warm accent (eyebrow, § number, code border)
  terraSoft: '#F4E7DF', // monogram tint (only soft fill allowed)
  gold:      '#B58A34', // "$" glyph accent
  brandGreen:'#20443B', // logo + title text ONLY — never a background fill
  sage:      '#2E7D6E', // logo detail only
  line:      '#E4DED2', // table & card borders
  lineSoft:  '#EFEADF', // inner cell dividers
  head:      '#F5F0E7', // table header row fill (very light warm)
  tint:      '#FBF8F2', // filled-visit row + total box (near-white)
  white:     '#FFFFFF',
};
```

Rules: the page background is **white**. The only fills permitted are `head`,
`tint`, and `terraSoft` — all near-white and safe on a black-and-white printer.
`brandGreen`/`sage` appear **only** in the logo mark, the "Route Sheet" title,
and the signature text — **never** as a block/background.

### Type scale (points)

| Token            | Family / weight        | Size | Notes                        |
|------------------|------------------------|------|------------------------------|
| title            | Fraunces 600           | 24   | letterSpacing -0.4           |
| subtitle         | Fraunces italic        | 9.5  | terra                        |
| wordmark         | Fraunces 600           | 14   |                              |
| section header   | Inter 600              | 7.5  | uppercase, letterSpacing 1.6 |
| staff value      | Fraunces 600           | 11.5 |                              |
| label (eyebrow/k)| Inter 600              | 6    | uppercase, letterSpacing 1.8 |
| table header     | Inter 600              | 5.6  | uppercase, letterSpacing 0.8 |
| table cell       | Inter 400              | 6.6  | client cell 600              |
| total amount     | Fraunces 600           | 16   |                              |
| code label       | Inter 700              | 6    | reference chips              |
| code desc        | Inter 400              | 6.2  | muted                        |
| footer           | Inter 400              | 5.4  | faint                        |

### Spacing (points)

Page padding `36 40 30 40` (T R B L). Section gap `14`. Card radius `8`,
table/box radius `6`, chip radius `3`. Cell padding `4 6`, row min-height `18`.

## 5. Page & document

- One `<Document>` → one `<Page size="LETTER">`.
- Page `style` carries the padding above and `fontFamily: 'Inter'`,
  `color: C.ink`, `backgroundColor: C.white`.
- Everything is normal top-to-bottom flow. Page breaks are automatic; the visit
  table and reference block handle their own break behavior (see §6.4 / §6.5).

## 6. Section specs (top → bottom)

### 6.1 Masthead
Row, `justifyContent: space-between`. Left: logo mark (SVG, §10) + wordmark
`HALOES TOUCH` (Fraunces 600, "TOUCH" in `terra`) with a `HOSPICE INC.` tag
(Inter 600, 5pt, letterSpacing 2.4, `faint`). Right: contact block, right-aligned,
`faint`/`muted`, org name bold. Follow with a 1pt `line` rule.

### 6.2 Title block
Row, bottom-aligned. Left: eyebrow `FIELD STAFF DOCUMENTATION` (terra), title
`Route Sheet` (Fraunces 600, `brandGreen`), subtitle `Visit log & service record`
(Fraunces italic, terra). Right: `REPORTING PERIOD` label + value (e.g. the
month/period, Fraunces 600).

### 6.3 Staff card
Bordered (`line`) rounded row. Left: 78pt-wide monogram box, `terraSoft` fill,
initials in `terra` (Fraunces 600). Then one or two fields, each with an
uppercase `faint` label and a Fraunces value; a `RN`/credential renders as a
small `terra` superscript-style suffix. Divider between fields = `lineSoft`.

### 6.4 Visit Log table  ← the core

Section header: `01  VISIT LOG`.

**Columns, in this exact order, with these widths:**

| # | Column        | Width | Align  | Notes                                   |
|---|---------------|-------|--------|-----------------------------------------|
| 1 | Client        | 13%   | left   | Inter 600                               |
| 2 | Service Code  | 8%    | left   | rendered as a small bordered chip label |
| 3 | Date          | 11%   | center | `YYYY-MM-DD` (format with dayjs)        |
| 4 | Time In       | 8%    | center | `HH:mm`                                 |
| 5 | Time Out      | 8%    | center | `HH:mm`                                 |
| 6 | Signature     | 15%   | left   | image if present, else typed name       |
| 7 | Rate          | 9%    | right  | `$0.00`, Inter 600                      |
| 8 | Comment       | 28%   | left   | `muted`                                 |

**Header row:** fill `head`, 1pt outer border, top corners rounded, header text
per type scale. **Mark this header `View` with `fixed`** so it repeats at the top
of every page the table spans.

**Body rows:** each row is a `flexDirection: row` `View` with `wrap={false}`
(never split a visit across a page). Cells have `4 6` padding, `minHeight: 18`,
bottom border `lineSoft`, left divider `lineSoft`; first/last cell carry the
outer `line` border. A **filled** row (has a client) gets a `tint` background and
its code chip border becomes `terra`. **Blank** rows render empty cells so the
sheet is writable/printable.

**Row padding logic:** always render at least `minRows` rows (default **20**).
If `visits.length < minRows`, pad with blank rows; if greater, render them all
(the table simply flows to more pages, header repeating).

### 6.5 Total Earnings
Right-aligned. A `tint`-filled, `line`-bordered rounded box containing the label
`TOTAL EARNINGS` (uppercase, `faint`) and the amount (Fraunces 600, `brandGreen`)
with a `terra` `$`. Amount = **sum of every row's `rate`**, `toFixed(2)`.

### 6.6 Service Code Reference  ← always on the last page
Section header `02  SERVICE CODE REFERENCE`, then a plain legend.

- Wrap the header **and** the legend in a single `<View wrap={false}>` so the
  block never splits; because it is the **last** element in the document, it
  lands on the last page.
- Legend = a wrapping row (`flexWrap: 'wrap'`) of items, **4 per row (25% each)**.
- Each item: a small **plain** bordered label (the code, e.g. `RV`, `IV`) + the
  description in `muted`. **No highlight, no tint, no emphasis on any code** —
  every code is styled identically. Keep it minimal; this is just a key.
- Full code list in [§8](#8-service-code-data).

### 6.7 Footer
Top hairline `line`, then a row: left `Confidential.` (Inter 700, muted) +
"Contains protected health information — handle per HIPAA & agency policy."
(faint); right `HALOES TOUCH HOSPICE` (Fraunces 600, faint). Not `fixed` — it
sits after content.

## 7. Data model (TypeScript)

```ts
export interface RouteVisit {
  client: string;            // e.g. "SUN-PATRI" ("" for a blank row)
  serviceCode: string;       // e.g. "RV"
  date: string;              // ISO or display string; formatted with dayjs
  timeIn: string;            // "HH:mm"
  timeOut: string;           // "HH:mm"
  signatureName?: string;    // typed fallback, e.g. "R. Velasco"
  signatureImage?: string;   // data URL from react-signature-canvas (preferred)
  rate?: number;             // numeric; undefined/null on blank rows
  comment?: string;
}

export interface RouteSheetData {
  staffName: string;         // "Richard Velasco"
  credential?: string;       // "RN"
  position: string;          // "Registered Nurse"
  period: string;            // "June 2026"
  visits: RouteVisit[];
  minRows?: number;          // default 20 — pad with blank rows to this count
}
```

Total earnings is **derived**, never stored:
`data.visits.reduce((s, v) => s + (v.rate ?? 0), 0)`.

## 8. Service code data

Render in this order (reading left→right, 4 per row):

```ts
export const SERVICE_CODES: [string, string][] = [
  ['IV','Initial Visit'], ['PRN','PRN'], ['DC','Discharge'], ['SUP','Supervisory Visit'],
  ['HUV','HUV'], ['SFV','SFV'], ['IDT-PR','IDT Meeting In Person'], ['IDT-NT','IDT Meeting Thru Notes'],
  ['IDT-PH','IDT Meeting Via Phone'], ['OC','On-Call'], ['RC','Recertification Visit'], ['SM','Staff Meeting'],
  ['IN','In-Service'], ['EV','Evaluation Visit'], ['SWV','Social Worker Visit'], ['RV','Regular Visit'],
  ['BV','Bereavement Visit'], ['F/UV','Follow Up Visit'], ['O','Orientation'], ['VV','Volunteer Visit'],
  ['DPV','Death Pronouncement'], ['SOC','SOC / Assessment'], ['APV','Admission Visit'], ['REA','Reassessment Visit'],
  ['ATD','Attendance'], ['OTH','Other'],
];
```

## 9. Behavior & QA rules

- **Print-first:** white background, hairline borders, no gradients/shadows.
  Verify the file prints legibly in **grayscale**.
- **Header repeats** on every page (test with 21+ visits → 2 pages, header on both).
- **Reference on last page**, undivided (`wrap={false}`).
- **Rows never split** across a page boundary (`wrap={false}` per row).
- **Signature:** if `signatureImage` is present, render it as an `<Image>` scaled
  to ~16pt tall (`objectFit: 'contain'`); otherwise show `signatureName`; blank rows show nothing.
- **Weight-loss / clinical fields are out of scope** — this is a scheduling/earnings sheet only.
- **Never hardcode** the total; always sum the Rate column.
- Do not restyle a single code in the reference (no "current code" highlight).

## 10. Reference implementation

Drop-in `RouteSheetDocument.tsx`. Render/download it with react-pdf's
`<PDFDownloadLink>` / `<PDFViewer>` or `pdf(<RouteSheetDocument data={...} />).toBlob()`.

```tsx
import {
  Document, Page, View, Text, StyleSheet, Font, Image,
  Svg, Line, Circle, Path,
} from '@react-pdf/renderer';
import dayjs from 'dayjs';

// ---- fonts: add these TTFs to src/assets/fonts/ (see route-sheet-fonts.zip) ----
import InterRegular from '@/assets/fonts/Inter-Regular.ttf';
import InterMedium  from '@/assets/fonts/Inter-Medium.ttf';
import InterSemi    from '@/assets/fonts/Inter-Semi.ttf';
import InterBold    from '@/assets/fonts/Inter-Bold.ttf';
import FrauncesSemi from '@/assets/fonts/Fraunces-Semi.ttf';
import FrauncesItal from '@/assets/fonts/Fraunces-Italic.ttf';

Font.register({ family: 'Inter', fonts: [
  { src: InterRegular, fontWeight: 400 },
  { src: InterMedium,  fontWeight: 500 },
  { src: InterSemi,    fontWeight: 600 },
  { src: InterBold,    fontWeight: 700 },
]});
Font.register({ family: 'Fraunces', fonts: [
  { src: FrauncesSemi, fontWeight: 600 },
  { src: FrauncesItal, fontStyle: 'italic' },
]});
Font.registerHyphenationCallback((w) => [w]); // don't hyphenate

export interface RouteVisit {
  client: string; serviceCode: string; date: string;
  timeIn: string; timeOut: string;
  signatureName?: string; signatureImage?: string;
  rate?: number; comment?: string;
}
export interface RouteSheetData {
  staffName: string; credential?: string; position: string;
  period: string; visits: RouteVisit[]; minRows?: number;
}

const C = {
  ink:'#242A27', muted:'#6F6C64', faint:'#9C988E',
  terra:'#C15E38', terraSoft:'#F4E7DF', gold:'#B58A34',
  brandGreen:'#20443B', sage:'#2E7D6E',
  line:'#E4DED2', lineSoft:'#EFEADF', head:'#F5F0E7', tint:'#FBF8F2', white:'#FFFFFF',
};
const W = { client:'13%', code:'8%', date:'11%', tin:'8%', tout:'8%', sig:'15%', rate:'9%', cmt:'28%' };

export const SERVICE_CODES: [string, string][] = [
  ['IV','Initial Visit'],['PRN','PRN'],['DC','Discharge'],['SUP','Supervisory Visit'],
  ['HUV','HUV'],['SFV','SFV'],['IDT-PR','IDT Meeting In Person'],['IDT-NT','IDT Meeting Thru Notes'],
  ['IDT-PH','IDT Meeting Via Phone'],['OC','On-Call'],['RC','Recertification Visit'],['SM','Staff Meeting'],
  ['IN','In-Service'],['EV','Evaluation Visit'],['SWV','Social Worker Visit'],['RV','Regular Visit'],
  ['BV','Bereavement Visit'],['F/UV','Follow Up Visit'],['O','Orientation'],['VV','Volunteer Visit'],
  ['DPV','Death Pronouncement'],['SOC','SOC / Assessment'],['APV','Admission Visit'],['REA','Reassessment Visit'],
  ['ATD','Attendance'],['OTH','Other'],
];

const s = StyleSheet.create({
  page: { paddingTop:36, paddingRight:40, paddingBottom:30, paddingLeft:40,
          fontFamily:'Inter', fontSize:8, color:C.ink, backgroundColor:C.white },

  // masthead
  head:{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' },
  brand:{ flexDirection:'row', alignItems:'center' },
  wm:{ marginLeft:8 },
  wmName:{ fontFamily:'Fraunces', fontWeight:600, fontSize:14, color:C.brandGreen },
  wmTag:{ fontFamily:'Inter', fontWeight:600, fontSize:5, letterSpacing:2.4, color:C.faint, marginTop:2 },
  contact:{ textAlign:'right', fontSize:5.6, color:C.muted, lineHeight:1.5 },
  contactOrg:{ fontFamily:'Inter', fontWeight:700, fontSize:6.2, color:'#33372F' },
  rule:{ height:1, backgroundColor:C.line, marginTop:9 },

  // title
  titleRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end', marginTop:12 },
  eyebrow:{ fontFamily:'Inter', fontWeight:600, fontSize:6, letterSpacing:2.4, color:C.terra, textTransform:'uppercase' },
  title:{ fontFamily:'Fraunces', fontWeight:600, fontSize:24, color:C.brandGreen, marginTop:4, letterSpacing:-0.4 },
  subtitle:{ fontFamily:'Fraunces', fontStyle:'italic', fontSize:9.5, color:C.terra, marginTop:3 },
  periodLbl:{ fontSize:5.4, letterSpacing:1.8, color:C.faint, fontWeight:600, textTransform:'uppercase', textAlign:'right' },
  periodVal:{ fontFamily:'Fraunces', fontWeight:600, fontSize:11, color:C.ink, marginTop:2, textAlign:'right' },

  // staff card
  staff:{ marginTop:12, flexDirection:'row', border:`1 solid ${C.line}`, borderRadius:8, minHeight:44 },
  mono:{ width:78, alignItems:'center', justifyContent:'center', backgroundColor:C.terraSoft,
         borderRight:`1 solid ${C.line}`, borderTopLeftRadius:8, borderBottomLeftRadius:8 },
  monoTxt:{ fontFamily:'Fraunces', fontWeight:600, fontSize:18, color:C.terra },
  sf:{ flex:1, paddingVertical:9, paddingHorizontal:14, justifyContent:'center' },
  sfDiv:{ borderLeft:`1 solid ${C.lineSoft}` },
  k:{ fontSize:5.6, letterSpacing:1.8, fontWeight:600, color:C.faint, textTransform:'uppercase' },
  v:{ fontFamily:'Fraunces', fontWeight:600, fontSize:11.5, color:C.ink, marginTop:3 },
  vCred:{ fontFamily:'Inter', fontWeight:600, fontSize:7, color:C.terra },

  // section header
  sec:{ flexDirection:'row', alignItems:'center', marginTop:14, marginBottom:7 },
  secNo:{ fontFamily:'Fraunces', fontWeight:600, fontSize:9, color:C.terra, marginRight:6 },
  secH:{ fontFamily:'Inter', fontWeight:600, fontSize:7.5, letterSpacing:1.6, textTransform:'uppercase', color:'#33372F', marginRight:6 },
  secFill:{ flex:1, height:1, backgroundColor:C.line },

  // table
  tHead:{ flexDirection:'row', backgroundColor:C.head, borderTop:`1 solid ${C.line}`,
          borderBottom:`1 solid ${C.line}`, borderLeft:`1 solid ${C.line}`, borderRight:`1 solid ${C.line}`,
          borderTopLeftRadius:6, borderTopRightRadius:6 },
  th:{ paddingVertical:6, paddingHorizontal:6, fontFamily:'Inter', fontWeight:600, fontSize:5.6,
       letterSpacing:0.8, textTransform:'uppercase', color:'#4A4E45' },
  tRow:{ flexDirection:'row' },
  tRowFilled:{ backgroundColor:C.tint },
  td:{ minHeight:18, paddingVertical:4, paddingHorizontal:6, fontSize:6.6, justifyContent:'center',
       borderBottom:`1 solid ${C.lineSoft}`, borderLeft:`1 solid ${C.lineSoft}` },
  tdFirst:{ borderLeft:`1 solid ${C.line}` },
  tdLast:{ borderRight:`1 solid ${C.line}` },
  ctr:{ textAlign:'center' },
  right:{ textAlign:'right' },
  client:{ fontFamily:'Inter', fontWeight:600, color:C.ink },
  cmt:{ color:C.muted },
  sig:{ fontFamily:'Fraunces', fontStyle:'italic', fontSize:8, color:C.brandGreen },
  chip:{ alignSelf:'flex-start', fontFamily:'Inter', fontWeight:700, fontSize:6, color:'#33372F',
         border:`1 solid ${C.line}`, borderRadius:3, paddingVertical:1, paddingHorizontal:4 },
  chipFilled:{ borderColor:C.terra, color:C.terra },

  // total
  total:{ flexDirection:'row', justifyContent:'flex-end', marginTop:9 },
  totalBox:{ flexDirection:'row', alignItems:'center', border:`1 solid ${C.line}`, borderRadius:6,
             paddingVertical:8, paddingHorizontal:16, backgroundColor:C.tint },
  totalLbl:{ fontSize:6, letterSpacing:2, fontWeight:600, color:C.faint, textTransform:'uppercase', marginRight:14 },
  totalAmt:{ fontFamily:'Fraunces', fontWeight:600, fontSize:16, color:C.brandGreen },
  totalCur:{ fontSize:10, color:C.terra },

  // reference
  codes:{ border:`1 solid ${C.line}`, borderRadius:6, paddingVertical:6, paddingHorizontal:10 },
  codeGrid:{ flexDirection:'row', flexWrap:'wrap' },
  ci:{ width:'25%', flexDirection:'row', alignItems:'center', paddingVertical:2.5, paddingHorizontal:4 },
  ciCode:{ fontFamily:'Inter', fontWeight:700, fontSize:6, color:'#33372F', border:`1 solid ${C.line}`,
           borderRadius:3, paddingVertical:1, paddingHorizontal:4, textAlign:'center', minWidth:26, marginRight:6 },
  ciDesc:{ fontSize:6.2, color:C.muted },

  // footer
  foot:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:12,
         paddingTop:8, borderTop:`1 solid ${C.line}` },
  footC:{ fontSize:5.4, color:C.faint },
  footB:{ fontFamily:'Inter', fontWeight:700, color:C.muted },
  footP:{ fontFamily:'Fraunces', fontWeight:600, fontSize:6, color:C.faint, letterSpacing:1 },
});

const Logo = () => (
  <Svg width={38} height={38} viewBox="0 0 100 100">
    <Line x1={50} y1={22} x2={50} y2={8}  stroke={C.terra}      strokeWidth={6} strokeLinecap="round" />
    <Line x1={71} y1={31} x2={81} y2={21} stroke={C.gold}       strokeWidth={6} strokeLinecap="round" />
    <Line x1={80} y1={52} x2={94} y2={52} stroke={C.sage}       strokeWidth={6} strokeLinecap="round" />
    <Line x1={29} y1={31} x2={19} y2={21} stroke={C.brandGreen} strokeWidth={6} strokeLinecap="round" />
    <Line x1={20} y1={52} x2={6}  y2={52} stroke={C.terra}      strokeWidth={6} strokeLinecap="round" />
    <Circle cx={50} cy={49} r={7} fill={C.brandGreen} />
    <Path d="M35 78 C35 58 43 52 50 52 C57 52 65 58 65 78 Z" fill={C.sage} />
  </Svg>
);

const initials = (name: string) =>
  name.trim().split(/\s+/).map(p => p[0]).slice(0,2).join('').toUpperCase();

export default function RouteSheetDocument({ data }: { data: RouteSheetData }) {
  const minRows = data.minRows ?? 20;
  const rows: RouteVisit[] = [...data.visits];
  while (rows.length < minRows) {
    rows.push({ client:'', serviceCode:'', date:'', timeIn:'', timeOut:'' });
  }
  const total = data.visits.reduce((sum, v) => sum + (v.rate ?? 0), 0);

  return (
    <Document>
      <Page size="LETTER" style={s.page}>

        {/* masthead */}
        <View style={s.head}>
          <View style={s.brand}>
            <Logo />
            <View style={s.wm}>
              <Text style={s.wmName}>HALOES <Text style={{ color: C.terra }}>TOUCH</Text></Text>
              <Text style={s.wmTag}>HOSPICE  INC.</Text>
            </View>
          </View>
          <View style={s.contact}>
            <Text style={s.contactOrg}>Haloes Touch Hospice Inc.</Text>
            <Text>11500 S Eastern Ave, Ste. 150 #1509 · Henderson, NV 89052</Text>
            <Text>Ph 702 625 4644 · Fax 702 960 4605 · hello@haloestouch.com</Text>
            <Text>haloestouch.com</Text>
          </View>
        </View>
        <View style={s.rule} />

        {/* title */}
        <View style={s.titleRow}>
          <View>
            <Text style={s.eyebrow}>Field Staff Documentation</Text>
            <Text style={s.title}>Route Sheet</Text>
            <Text style={s.subtitle}>Visit log &amp; service record</Text>
          </View>
          <View>
            <Text style={s.periodLbl}>Reporting Period</Text>
            <Text style={s.periodVal}>{data.period}</Text>
          </View>
        </View>

        {/* staff */}
        <View style={s.staff}>
          <View style={s.mono}><Text style={s.monoTxt}>{initials(data.staffName)}</Text></View>
          <View style={s.sf}>
            <Text style={s.k}>Staff Member</Text>
            <Text style={s.v}>{data.staffName}{data.credential ? <Text style={s.vCred}>  {data.credential}</Text> : null}</Text>
          </View>
          <View style={[s.sf, s.sfDiv]}>
            <Text style={s.k}>Position</Text>
            <Text style={s.v}>{data.position}</Text>
          </View>
        </View>

        {/* visit log */}
        <View style={s.sec}>
          <Text style={s.secNo}>01</Text><Text style={s.secH}>Visit Log</Text><View style={s.secFill} />
        </View>

        {/* repeating header */}
        <View style={s.tHead} fixed>
          <Text style={[s.th, { width: W.client }]}>Client</Text>
          <Text style={[s.th, { width: W.code }]}>Service Code</Text>
          <Text style={[s.th, { width: W.date }, s.ctr]}>Date</Text>
          <Text style={[s.th, { width: W.tin }, s.ctr]}>Time In</Text>
          <Text style={[s.th, { width: W.tout }, s.ctr]}>Time Out</Text>
          <Text style={[s.th, { width: W.sig }]}>Signature</Text>
          <Text style={[s.th, { width: W.rate }, s.right]}>Rate</Text>
          <Text style={[s.th, { width: W.cmt }]}>Comment</Text>
        </View>

        {rows.map((v, i) => {
          const filled = !!v.client;
          return (
            <View key={i} style={[s.tRow, filled && s.tRowFilled]} wrap={false}>
              <View style={[s.td, s.tdFirst, { width: W.client }]}><Text style={s.client}>{v.client}</Text></View>
              <View style={[s.td, { width: W.code }]}>
                {v.serviceCode ? <Text style={[s.chip, filled && s.chipFilled]}>{v.serviceCode}</Text> : <Text> </Text>}
              </View>
              <View style={[s.td, { width: W.date }]}><Text style={s.ctr}>{v.date ? dayjs(v.date).format('YYYY-MM-DD') : ''}</Text></View>
              <View style={[s.td, { width: W.tin }]}><Text style={s.ctr}>{v.timeIn}</Text></View>
              <View style={[s.td, { width: W.tout }]}><Text style={s.ctr}>{v.timeOut}</Text></View>
              <View style={[s.td, { width: W.sig }]}>
                {v.signatureImage
                  ? <Image src={v.signatureImage} style={{ height: 16, objectFit: 'contain' }} />
                  : <Text style={s.sig}>{v.signatureName ?? ''}</Text>}
              </View>
              <View style={[s.td, { width: W.rate }]}><Text style={s.right}>{v.rate != null ? `$${v.rate.toFixed(2)}` : ''}</Text></View>
              <View style={[s.td, s.tdLast, { width: W.cmt }]}><Text style={s.cmt}>{v.comment ?? ''}</Text></View>
            </View>
          );
        })}

        {/* total */}
        <View style={s.total}>
          <View style={s.totalBox}>
            <Text style={s.totalLbl}>Total Earnings</Text>
            <Text style={s.totalAmt}><Text style={s.totalCur}>$</Text>{total.toFixed(2)}</Text>
          </View>
        </View>

        {/* reference — kept together, lands on last page */}
        <View wrap={false}>
          <View style={s.sec}>
            <Text style={s.secNo}>02</Text><Text style={s.secH}>Service Code Reference</Text><View style={s.secFill} />
          </View>
          <View style={s.codes}>
            <View style={s.codeGrid}>
              {SERVICE_CODES.map(([code, desc]) => (
                <View key={code} style={s.ci}>
                  <Text style={s.ciCode}>{code}</Text>
                  <Text style={s.ciDesc}>{desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* footer */}
        <View style={s.foot}>
          <Text style={s.footC}><Text style={s.footB}>Confidential. </Text>Contains protected health information — handle per HIPAA &amp; agency policy.</Text>
          <Text style={s.footP}>HALOES TOUCH HOSPICE</Text>
        </View>

      </Page>
    </Document>
  );
}
```

### Example usage

```tsx
import { PDFDownloadLink } from '@react-pdf/renderer';
import RouteSheetDocument, { RouteSheetData } from './RouteSheetDocument';

const data: RouteSheetData = {
  staffName: 'Richard Velasco',
  credential: 'RN',
  position: 'Registered Nurse',
  period: 'June 2026',
  minRows: 20,
  visits: [
    { client:'SUN-PATRI', serviceCode:'RV', date:'2026-06-29',
      timeIn:'19:57', timeOut:'21:42', signatureName:'R. Velasco',
      rate:100, comment:'Visit completed — no issues' },
  ],
};

<PDFDownloadLink document={<RouteSheetDocument data={data} />} fileName="route-sheet.pdf">
  {({ loading }) => (loading ? 'Preparing…' : 'Download Route Sheet')}
</PDFDownloadLink>
```

## 11. Do / Don't checklist

**Do**
- Keep the page background white; use only `head`/`tint`/`terraSoft` fills.
- Register static TTFs; call `Font.registerHyphenationCallback` to stop word splits.
- Put `fixed` on the header row; `wrap={false}` on every body row and on the reference block.
- Pad to `minRows` and sum the Rate column for the total.
- Format dates through dayjs; prefer the signature **image** over the name.

**Don't**
- No gradients, shadows, CSS Grid, or absolute positioning.
- No green (or any) background blocks — green is for the logo/title/signature text only.
- No highlight or special styling on any code in the reference legend.
- Don't hardcode Total Earnings or the reporting period.
- Don't let a visit row split across pages.
