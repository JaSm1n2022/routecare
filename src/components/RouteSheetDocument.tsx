import {
  Document, Page, View, Text, StyleSheet, Font, Image,
  Svg, Line, Circle, Path,
} from '@react-pdf/renderer';
import dayjs from 'dayjs';

// ---- fonts: register the TTFs from src/assets/fonts/ ----
import InterRegular from '../assets/fonts/Inter-Regular.ttf';
import InterMedium  from '../assets/fonts/Inter-Medium.ttf';
import InterSemi    from '../assets/fonts/Inter-Semi.ttf';
import InterBold    from '../assets/fonts/Inter-Bold.ttf';
import FrauncesSemi from '../assets/fonts/Fraunces-Semi.ttf';
import FrauncesItal from '../assets/fonts/Fraunces-Italic.ttf';

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
  headerImageBase64?: string;
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

  // header image
  headerImage:{ width:'100%', height:80, objectFit:'contain', marginBottom:15 },

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

        {/* header - use custom image if provided, otherwise use built-in masthead */}
        {data.headerImageBase64 ? (
          <Image src={data.headerImageBase64} style={s.headerImage} />
        ) : (
          <>
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
          </>
        )}

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

        {/* table header */}
        <View style={s.tHead}>
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
