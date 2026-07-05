import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, DollarSign, Printer, Trash2, Edit2, X, Edit3, Type } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { HamburgerMenu } from '../components/HamburgerMenu'
import { MobileSelect } from '../components/MobileSelect'
import { getThisWeekDateRange, getThisMonthDateRange, getPayrollCutoffDateRange } from '../utils/dateHelpers'
import dayjs from 'dayjs'
import { pdf } from '@react-pdf/renderer'
import RouteSheetDocument, { RouteVisit } from '../components/RouteSheetDocument'
import { getImageBase64 } from '../utils/helper'
import toast from 'react-hot-toast'
import SignatureCanvas from 'react-signature-canvas'
import { useTranslation } from 'react-i18next'

const getClientServices = (t: any) => [
  { code: "IV", name: t('services.initialVisit'), isClientRequired: true, permission: ["Case Manager", "Registered Nurse", "MSW", "Director of Nurse", "LPN", "Medical Director", "Chaplain"] },
  { code: "PRN", name: "PRN", isClientRequired: true, permission: ["Case Manager", "Registered Nurse", "Director of Nurse", "LPN", "Medical Director"] },
  { code: "DC", name: t('services.discharge'), isClientRequired: true, permission: ["Case Manager", "Registered Nurse", "Director of Nurse"] },
  { code: "SUP", name: t('services.supervisoryVisit'), isClientRequired: true, permission: ["Case Manager", "Registered Nurse", "Director of Nurse"] },
  { code: "HUV", name: "HUV", isClientRequired: true, permission: ["Case Manager", "Registered Nurse", "Director of Nurse"] },
  { code: "SFV", name: "SFV", isClientRequired: true, permission: ["Case Manager", "Registered Nurse", "Director of Nurse", "LPN"] },
  { code: "IDT-PR", name: t('services.idtMeetingInPerson'), isClientRequired: false, permission: ["*"] },
  { code: "IDT-NT", name: t('services.idtMeetingThruNotes'), isClientRequired: false, permission: ["*"] },
  { code: "IDT-PH", name: t('services.idtMeetingViaPhone'), isClientRequired: false, permission: ["*"] },
  { code: "OC", name: t('services.onCall'), isClientRequired: false, permission: ["*"] },
  { code: "RC", name: t('services.recertificationVisit'), isClientRequired: true, permission: ["Case Manager", "Registered Nurse", "Director of Nurse"] },
  { code: "SM", name: t('services.staffMeeting'), isClientRequired: false, permission: ["*"] },
  { code: "IN", name: t('services.inService'), isClientRequired: false, permission: ["*"] },
  { code: "EV", name: t('services.evaluationVisit'), isClientRequired: true, permission: ["Case Manager", "Registered Nurse", "Director of Nurse", "Nurse Practioner"] },
  { code: "SWV", name: t('services.socialWorkerVisit'), isClientRequired: true, permission: ["MSW"] },
  { code: "RV", name: t('services.regularVisit'), isClientRequired: true, permission: ["Certified Nurse Assistant", "Case Manager", "Registered Nurse", "MSW", "Director of Nurse", "LPN", "Medical Director", "Chaplain"] },
  { code: "BV", name: t('services.bereavementVisit'), isClientRequired: true, permission: ["Chaplain", "Bereavement"] },
  { code: "F/UV", name: t('services.followUpVisit'), isClientRequired: true, permission: ["Case Manager", "MSW", "Director of Nurse", "Registered Nurse", "LPN", "Medical Director", "Chaplain"] },
  { code: "O", name: t('services.orientation'), isClientRequired: false, permission: ["*"] },
  { code: "VV", name: t('services.volunteerVisit'), isClientRequired: true, permission: ["Volunteer"] },
  { code: "DPV", name: t('services.deathPronouncement'), isClientRequired: true, permission: ["Case Manager", "Registered Nurse", "Director of Nurse"] },
  { code: "SOC", name: t('services.socAssessment'), isClientRequired: true, permission: ["Case Manager", "Registered Nurse", "Director of Nurse"] },
  { code: "APV", name: t('services.admissionVisit'), isClientRequired: true, permission: ["Case Manager", "Registered Nurse", "Director of Nurse"] },
  { code: "PAV", name: t('services.potentialAdmissionVisit'), isClientRequired: false, permission: ["Certified Nurse Assistant", "Case Manager", "Registered Nurse", "MSW", "Director of Nurse", "LPN", "Medical Director", "Chaplain"] },
  { code: "REA", name: t('services.reassessmentVisit'), isClientRequired: true, permission: ["Case Manager", "Registered Nurse", "Director of Nurse"] },
  { code: "ATD", name: t('services.attendance'), isClientRequired: false, permission: ["Administrative Manager", "Case Manager", "Director of Nurse", "Registered Nurse", "Office Manager", "Administrator"] },
  { code: "OTH", name: t('services.other'), isClientRequired: false, permission: ["*"] }
]

const getCommentOptions = (t: any) => [
  { value: '', label: t('comments.selectComment') },
  { value: 'Refused Visit', label: t('comments.refusedVisit') },
  { value: 'No One Answering', label: t('comments.noOneAnswering') },
  { value: 'Client Hospitalized', label: t('comments.clientHospitalized') },
  { value: 'Client Unavailable / Not Home', label: t('comments.clientUnavailable') },
  { value: 'Visit Rescheduled', label: t('comments.visitRescheduled') },
  { value: 'Client Deceased', label: t('comments.clientDeceased') },
  { value: 'Client on Vacation / Out of Town', label: t('comments.clientOnVacation') },
  { value: 'Caregiver Cancelled', label: t('comments.caregiverCancelled') },
  { value: 'Weather / Road Conditions', label: t('comments.weatherConditions') },
  { value: 'Wrong Address / Unable to Locate Client', label: t('comments.wrongAddress') },
  { value: 'Client Transferred to Facility', label: t('comments.clientTransferred') },
  { value: 'Visit Completed – No Issues', label: t('comments.visitCompleted') },
  { value: 'HUV1', label: 'HUV1' },
  { value: 'HUV2', label: 'HUV2' },
  { value: 'Hope Admission', label: t('comments.hopeAdmission') },
  { value: 'SFV1', label: 'SFV1' },
  { value: 'SFV2', label: 'SFV2' },
  { value: 'SFV Admission', label: t('comments.sfvAdmission') },
  { value: 'Other', label: t('comments.other') }
]

interface Routesheet {
  id: string
  dosStart: string
  dosEnd?: string
  timeIn?: string
  timeOut?: string
  patientCd: string
  service: string
  serviceCd?: string
  signature_based?: string
  comments?: string
  estimatedPayment: number
}

export function EarningsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { employee } = useAuth()
  const [routesheets, setRoutesheets] = useState<Routesheet[]>([])
  const [loading, setLoading] = useState(true)
  const [printLoading, setPrintLoading] = useState(false)
  const [totalEarnings, setTotalEarnings] = useState(0)

  // Date range state - default based on position
  // MSW and Chaplain: This Month
  // All others: Payroll Cutoff Period (11-25, 26-10)
  const employeePosition = employee?.position?.trim()
  const isMonthlyUser = employeePosition === 'MSW' || employeePosition === 'Chaplain'
  const defaultDateRange = isMonthlyUser ? getThisMonthDateRange() : getPayrollCutoffDateRange()

  const [dateStart, setDateStart] = useState(dayjs(defaultDateRange.from).format('YYYY-MM-DD'))
  const [dateEnd, setDateEnd] = useState(dayjs(defaultDateRange.to).format('YYYY-MM-DD'))

  // Confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; patientCd: string } | null>(null)

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Routesheet | null>(null)
  const [editForm, setEditForm] = useState({
    serviceDate: '',
    timeIn: '',
    timeOut: '',
    service: '',
    patientCd: '',
    selectedComment: '',
    otherComments: '',
    estimatedPayment: ''
  })
  const [patients, setPatients] = useState<string[]>([])
  const [isClientRequired, setIsClientRequired] = useState(false)

  // Signature state
  const sigCanvasRef = useRef<SignatureCanvas>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw')
  const [typedName, setTypedName] = useState('')
  const [selectedFont, setSelectedFont] = useState('Dancing Script')

  const fetchRoutesheets = async () => {
    if (!employee?.id || !employee?.companyId) return

    try {
      setLoading(true)
      console.log('📊 Fetching routesheets for earnings:', {
        employeeId: employee.id,
        companyId: employee.companyId,
        from: dateStart,
        to: dateEnd
      })

      // Format dates as YYYY-MM-DD HH:MM:SS for Supabase
      const fromDateTime = `${dateStart} 00:00:00`
      const toDateTime = `${dateEnd} 23:59:59`

      console.log('📅 Query date range:', { fromDateTime, toDateTime })

      const { data, error } = await supabase
        .from('routesheets')
        .select('id, dosStart, dosEnd, timeIn, timeOut, patientCd, service, serviceCd, signature_based, comments, estimatedPayment')
        .eq('companyId', employee.companyId)
        .eq('requestorId', employee.id)
        .gte('dosStart', fromDateTime)
        .lte('dosStart', toDateTime)
        .order('dosStart', { ascending: false })

      if (error) throw error

      console.log('✅ Routesheets fetched:', data?.length)
      setRoutesheets(data || [])

      // Calculate total earnings
      const total = (data || []).reduce((sum, sheet) => {
        return sum + (parseFloat(sheet.estimatedPayment?.toString() || '0'))
      }, 0)
      setTotalEarnings(total)

    } catch (error) {
      console.error('❌ Error fetching routesheets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoutesheets()
  }, [employee?.id])

  const handleApply = () => {
    fetchRoutesheets()
  }

  const handlePrint = async () => {
    if (!routesheets || routesheets.length === 0) {
      toast.error(t('earnings.noDataToPrint'))
      return
    }

    try {
      setPrintLoading(true)
      toast.loading(t('earnings.generatingPdf'), { id: 'pdf-generation' })

      // Load header image from Supabase
      const headerUrl = 'https://acwocotrngkeaxtzdzfz.supabase.co/storage/v1/object/public/images/headerdoc.png'
      let headerBase64: string | undefined = undefined

      try {
        headerBase64 = await getImageBase64(headerUrl)
        console.log('✅ Header image loaded successfully')
      } catch (error) {
        console.error('⚠️ Failed to load header image, continuing without it:', error)
        // Continue without header if it fails to load
      }

      // Transform routesheets data to RouteVisit format
      const visits: RouteVisit[] = routesheets.map(sheet => {
        // Normalize patient code - remove digits and dots
        const client = sheet.patientCd
          ?.replace(/\d/g, '')
          ?.replace(/\./g, '')
          ?.trim() || ''

        // Extract time from dosStart/dosEnd if timeIn/timeOut not available
        const timeIn = sheet.timeIn || dayjs(sheet.dosStart).format('HH:mm')
        const timeOut = sheet.timeOut || (sheet.dosEnd ? dayjs(sheet.dosEnd).format('HH:mm') : '')

        return {
          client,
          serviceCode: sheet.serviceCd || '',
          date: sheet.dosStart, // ISO date string
          timeIn,
          timeOut,
          signatureImage: sheet.signature_based,
          signatureName: employee?.name,
          rate: parseFloat(sheet.estimatedPayment?.toString() || '0'),
          comment: sheet.comments || ''
        }
      })

      // Determine reporting period from date range
      const period = `${dayjs(dateStart).format('MMMM YYYY')}`

      // Generate PDF with new RouteSheetDocument
      const pdfDocument = (
        <RouteSheetDocument
          data={{
            staffName: employee?.name || '',
            credential: '', // Add credential if available in employee data
            position: employee?.position || '',
            period,
            visits,
            minRows: 20,
            headerImageBase64: headerBase64
          }}
        />
      )

      const blob = await pdf(pdfDocument).toBlob()

      // Create filename with date
      const dateStr = dayjs().format('YYYY-MM-DD')
      const filename = `route_sheet_${dateStr}.pdf`

      // Download the PDF
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()

      toast.success(t('earnings.pdfGeneratedSuccess'), { id: 'pdf-generation' })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error(t('earnings.pdfGenerationError'), { id: 'pdf-generation' })
    } finally {
      setPrintLoading(false)
    }
  }

  const handleDeleteClick = (routesheetId: string, patientCd: string) => {
    // Show confirmation modal
    setDeleteTarget({ id: routesheetId, patientCd })
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      console.log('🗑️ Deleting routesheet:', deleteTarget.id)
      toast.loading(t('earnings.deletingService'), { id: 'delete-service' })

      const { error } = await supabase
        .from('routesheets')
        .delete()
        .eq('id', deleteTarget.id)

      if (error) throw error

      console.log('✅ Routesheet deleted successfully')

      // Close modal
      setShowDeleteModal(false)
      setDeleteTarget(null)

      // Refresh the list after deletion
      await fetchRoutesheets()

      toast.success(t('earnings.deleteSuccess'), { id: 'delete-service' })
    } catch (error) {
      console.error('❌ Error deleting routesheet:', error)
      toast.error(t('earnings.deleteError'), { id: 'delete-service' })
      setShowDeleteModal(false)
      setDeleteTarget(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  const fetchPatients = async () => {
    if (!employee?.id || !employee?.companyId) return

    try {
      const { data: assignmentData, error } = await supabase
        .from('assignments')
        .select('patientCd')
        .eq('companyId', employee.companyId)
        .eq('disciplineId', employee.id)

      if (error) throw error

      const uniquePatients = Array.from(
        new Set((assignmentData || []).map((a: any) => a.patientCd))
      )
      setPatients(uniquePatients as string[])
    } catch (error) {
      console.error('Error fetching patients:', error)
    }
  }

  const handleEditClick = async (sheet: Routesheet) => {
    // Populate edit form with current values
    setEditTarget(sheet)

    console.log('📝 Edit Click - Sheet Data:', {
      dosStart: sheet.dosStart,
      timeIn: sheet.timeIn,
      timeOut: sheet.timeOut,
      timeInType: typeof sheet.timeIn,
      timeOutType: typeof sheet.timeOut
    })

    // Helper function to check if service is a visit type
    const isVisitService = (serviceName: string) => {
      const lowerService = serviceName.toLowerCase()
      // Services that contain "visit" in the name
      if (lowerService.includes('visit')) return true

      // Additional service codes and names that should get "Visit Completed" comment
      const visitServices = [
        'rv', 'swv', 'huv', 'sfv', 'prn',
        t('services.regularVisit').toLowerCase(),
        t('services.socialWorkerVisit').toLowerCase(),
        t('services.huv').toLowerCase(),
        t('services.sfv').toLowerCase(),
        t('services.prn').toLowerCase(),
        t('services.socAssessment').toLowerCase(),
        t('services.deathPronouncement').toLowerCase(),
        t('services.discharge').toLowerCase()
      ]

      return visitServices.some(service => lowerService === service || lowerService.includes(service))
    }

    // Parse comments - check if it matches a predefined option
    let commentValue = sheet.comments || ''

    // Check if original comment matches a preset option
    const COMMENT_OPTIONS = getCommentOptions(t)
    const isPresetComment = COMMENT_OPTIONS.some(opt => opt.value === commentValue && opt.value !== '')

    // If no comment, set default based on service type
    if (!commentValue) {
      if (sheet.service === t('services.potentialAdmissionVisit')) {
        commentValue = 'Other'
      } else if (isVisitService(sheet.service)) {
        commentValue = 'Visit Completed – No Issues'
      }
    }

    // Format timeIn and timeOut - handle both "HH:mm:ss" and "HH:mm" formats
    // Also try to extract from dosStart/dosEnd if timeIn/timeOut are not available
    const formatTime = (time: string | undefined, fallbackDateTime?: string) => {
      if (!time && fallbackDateTime) {
        // Try to extract time from datetime string
        const timePart = fallbackDateTime.split(' ')[1] || fallbackDateTime.split('T')[1]
        if (timePart) {
          const parts = timePart.split(':')
          return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : ''
        }
        return ''
      }
      if (!time) return ''
      // If format is HH:mm:ss, take only HH:mm
      const parts = time.split(':')
      return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time
    }

    const formattedTimeIn = formatTime(sheet.timeIn, sheet.dosStart)
    const formattedTimeOut = formatTime(sheet.timeOut, sheet.dosEnd)

    console.log('⏰ Formatted Times:', {
      formattedTimeIn,
      formattedTimeOut
    })

    // Check if service requires client
    const CLIENT_SERVICES = getClientServices(t)
    const selectedService = CLIENT_SERVICES.find(s => s.name === sheet.service)
    const clientRequired = selectedService?.isClientRequired || false
    setIsClientRequired(clientRequired)

    // Fetch patients if client is required
    if (clientRequired) {
      await fetchPatients()
    }

    // Determine final selectedComment and otherComments
    // If commentValue is now set (either from DB or defaulted), check if it's a preset
    const finalIsPreset = COMMENT_OPTIONS.some(opt => opt.value === commentValue && opt.value !== '')

    setEditForm({
      serviceDate: dayjs(sheet.dosStart).format('YYYY-MM-DD'),
      timeIn: formattedTimeIn,
      timeOut: formattedTimeOut,
      service: sheet.service || '',
      patientCd: sheet.patientCd || '',
      selectedComment: finalIsPreset ? commentValue : (commentValue ? 'Other' : ''),
      otherComments: !finalIsPreset && commentValue ? commentValue : '',
      estimatedPayment: sheet.estimatedPayment?.toString() || '0'
    })
    // Set existing signature
    setSignature(sheet.signature_based || null)
    setShowEditModal(true)
  }

  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }))

    // If service type changes, check if client is required
    if (field === 'service') {
      const CLIENT_SERVICES = getClientServices(t)
      const selectedService = CLIENT_SERVICES.find(s => s.name === value)
      const clientRequired = selectedService?.isClientRequired || false
      setIsClientRequired(clientRequired)

      // Fetch patients if client is now required
      if (clientRequired) {
        fetchPatients()
      }

      // Helper function to check if service is a visit type
      const isVisitService = (serviceName: string) => {
        const lowerService = serviceName.toLowerCase()
        // Services that contain "visit" in the name
        if (lowerService.includes('visit')) return true

        // Additional service codes and names that should get "Visit Completed" comment
        const visitServices = [
          'rv', 'swv', 'huv', 'sfv', 'prn',
          t('services.regularVisit').toLowerCase(),
          t('services.socialWorkerVisit').toLowerCase(),
          t('services.huv').toLowerCase(),
          t('services.sfv').toLowerCase(),
          t('services.prn').toLowerCase(),
          t('services.socAssessment').toLowerCase(),
          t('services.deathPronouncement').toLowerCase(),
          t('services.discharge').toLowerCase()
        ]

        return visitServices.some(service => lowerService === service || lowerService.includes(service))
      }

      // Always reset and set default comment based on service type when service changes
      if (value === t('services.potentialAdmissionVisit')) {
        setEditForm(prev => ({
          ...prev,
          service: value,
          selectedComment: 'Other',
          otherComments: ''
        }))
      } else if (isVisitService(value)) {
        setEditForm(prev => ({
          ...prev,
          service: value,
          selectedComment: 'Visit Completed – No Issues',
          otherComments: ''
        }))
      } else {
        // For all other services (IDT, Staff Meeting, etc.), reset to empty
        setEditForm(prev => ({
          ...prev,
          service: value,
          selectedComment: '',
          otherComments: ''
        }))
      }
    }
  }

  const handleSignatureCapture = () => {
    if (signatureMode === 'draw') {
      if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
        const dataUrl = sigCanvasRef.current.toDataURL()
        setSignature(dataUrl)
        setShowSignatureModal(false)
        toast.success(t('earnings.signatureCaptured'))
      } else {
        toast.error(t('routesheet.pleaseDrawSignature'))
      }
    } else if (signatureMode === 'type') {
      if (typedName.trim()) {
        // Create typed signature as image
        const canvas = document.createElement('canvas')
        canvas.width = 400
        canvas.height = 150
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = 'black'
          ctx.font = `48px ${selectedFont}, cursive`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(typedName, canvas.width / 2, canvas.height / 2)
          const dataUrl = canvas.toDataURL()
          setSignature(dataUrl)
          setShowSignatureModal(false)
          toast.success(t('earnings.signatureCreated'))
        }
      } else {
        toast.error(t('routesheet.pleaseTypeName'))
      }
    }
  }

  const handleClearSignature = () => {
    setSignature(null)
    toast.info(t('earnings.signatureCleared'))
  }

  const confirmEdit = async () => {
    if (!editTarget) return

    // Validate required fields
    let isValid = true

    // Validate service type
    if (!editForm.service) {
      toast.error(t('routesheet.pleaseSelectService'), { id: 'edit-service' })
      return
    }

    // Validate client if required by service type
    if (isClientRequired && !editForm.patientCd) {
      toast.error(t('earnings.pleaseSelectClient'), { id: 'edit-service' })
      return
    }

    // Validate signature
    if (!signature) {
      toast.error(t('routesheet.signatureRequired'), { id: 'edit-service' })
      return
    }

    // Validate "Other" comments
    if (editForm.selectedComment === 'Other' && !editForm.otherComments.trim()) {
      toast.error(t('routesheet.pleaseSpecifyComment'), { id: 'edit-service' })
      return
    }

    // Validate service date
    if (!editForm.serviceDate) {
      toast.error(t('earnings.pleaseSelectDate'), { id: 'edit-service' })
      return
    }

    try {
      console.log('✏️ Updating routesheet:', editTarget.id)
      toast.loading(t('earnings.updatingService'), { id: 'edit-service' })

      // Determine the final comment value
      const finalComment = editForm.selectedComment === 'Other'
        ? editForm.otherComments
        : editForm.selectedComment

      // Combine date and time for dosStart
      const dosStartDateTime = editForm.timeIn
        ? `${editForm.serviceDate} ${editForm.timeIn}:00`
        : `${editForm.serviceDate} 00:00:00`

      const dosEndDateTime = editForm.timeOut
        ? `${editForm.serviceDate} ${editForm.timeOut}:00`
        : null

      const { error } = await supabase
        .from('routesheets')
        .update({
          dosStart: dosStartDateTime,
          dosEnd: dosEndDateTime,
          timeIn: editForm.timeIn || null,
          timeOut: editForm.timeOut || null,
          patientCd: editForm.patientCd || null,
          service: editForm.service,
          comments: finalComment || null,
          estimatedPayment: parseFloat(editForm.estimatedPayment) || 0,
          signature_based: signature || null
        })
        .eq('id', editTarget.id)

      if (error) throw error

      console.log('✅ Routesheet updated successfully')

      // Close modal and reset
      setShowEditModal(false)
      setEditTarget(null)
      setSignature(null)

      // Refresh the list after update
      await fetchRoutesheets()

      toast.success(t('earnings.updateSuccess'), { id: 'edit-service' })
    } catch (error) {
      console.error('❌ Error updating routesheet:', error)
      toast.error(t('earnings.updateError'), { id: 'edit-service' })
    }
  }

  const cancelEdit = () => {
    setShowEditModal(false)
    setEditTarget(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <HamburgerMenu />
            <div className="flex flex-col items-center flex-1">
              <img
                src="/images/myroutecare.png"
                alt="MyRouteCare Logo"
                className="h-20 w-auto mb-2"
                style={{ mixBlendMode: 'multiply' }}
              />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
                {t('earnings.title')}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Date Filter Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="w-full sm:w-auto sm:flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('earnings.dateStart')}
              </label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="w-full sm:w-auto sm:flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('earnings.dateEnd')}
              </label>
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleApply}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {t('earnings.apply')}
            </button>
          </div>
        </div>

        {/* Total Earnings Card */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-md p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">{t('earnings.totalEarnings')}</p>
              <p className="text-4xl font-bold mt-1">${totalEarnings.toFixed(2)}</p>
              <p className="text-green-100 text-sm mt-2">
                {dayjs(dateStart).format('MMM D, YYYY')} - {dayjs(dateEnd).format('MMM D, YYYY')}
              </p>
            </div>
            <div className="text-green-100">
              <DollarSign className="w-16 h-16 opacity-50" />
            </div>
          </div>
        </div>

        {/* Routesheets List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('earnings.serviceDetails')}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {routesheets.length} {routesheets.length === 1 ? t('earnings.serviceOne') : t('earnings.servicesMany')} {t('earnings.completed')}
              </p>
            </div>
            <button
              onClick={handlePrint}
              disabled={printLoading || routesheets.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Printer className="w-5 h-5" />
              <span className="hidden sm:inline">{printLoading ? t('earnings.generating') : t('earnings.print')}</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">{t('earnings.loadingServices')}</p>
            </div>
          ) : routesheets.length > 0 ? (
            <div className="max-h-[600px] overflow-y-auto">
              <div className="p-4 space-y-3">
                {routesheets.map((sheet) => {
                  // Normalize patient code - remove digits and dots
                  const normalizedPatientCd = sheet.patientCd
                    ?.replace(/\d/g, '') // Remove all digits
                    ?.replace(/\./g, '') // Remove all dots
                    ?.trim()

                  return (
                    <div
                      key={sheet.id}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-lg mb-1">
                            {normalizedPatientCd}
                          </p>
                          <p className="text-sm text-gray-600">{sheet.service}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              ${parseFloat(sheet.estimatedPayment?.toString() || '0').toFixed(2)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditClick(sheet)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={t('earnings.editServiceEntry')}
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(sheet.id, normalizedPatientCd || sheet.patientCd)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('earnings.deleteServiceEntry')}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{dayjs(sheet.dosStart).format('MMM D, YYYY')}</span>
                        </div>
                        <div>
                          <span>{dayjs(sheet.dosStart).format('h:mm A')}</span>
                          <span className="ml-2 text-xs">({dayjs(sheet.dosStart).format('ddd')})</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">{t('earnings.noServicesFound')}</p>
              <p className="text-gray-500 text-sm mt-2">
                {t('earnings.adjustDateRange')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Beautiful Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{t('earnings.deleteModalTitle')}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t('earnings.deleteModalSubtitle')}</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-gray-700 leading-relaxed">
                {t('earnings.deleteConfirmation')}{' '}
                <span className="font-semibold text-gray-900">{deleteTarget?.patientCd}</span>?
              </p>
              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm text-red-800">
                  <span className="font-semibold">{t('earnings.warning')}:</span> {t('earnings.deleteWarningMessage')}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
              >
                {t('earnings.noKeepIt')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {t('earnings.yesDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Beautiful Edit Modal */}
      {showEditModal && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full transform transition-all animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Edit2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{t('earnings.editModalTitle')}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t('earnings.editModalSubtitle')}</p>
                  </div>
                </div>
                <button
                  onClick={cancelEdit}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t('earnings.close')}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Service Information Section */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('routesheet.serviceInformation')}</h3>

                {/* Service Type - Dropdown FIRST */}
                <div className="mb-4">
                  <MobileSelect
                    label={t('routesheet.selectServiceType')}
                    required
                    value={editForm.service}
                    onChange={(value) => handleEditFormChange('service', value)}
                    options={getClientServices(t).map(s => ({ value: s.name, label: s.name }))}
                    placeholder={t('routesheet.selectServiceTypePlaceholder')}
                    searchable
                  />
                </div>

                {/* Select Client - Conditional SECOND (only if service requires it) */}
                {editForm.service && isClientRequired && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('routesheet.selectClient')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editForm.patientCd}
                      onChange={(e) => handleEditFormChange('patientCd', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">{t('routesheet.selectClientPlaceholder')}</option>
                      {patients.map((patient) => (
                        <option key={patient} value={patient}>
                          {patient}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Visit Details Section */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('routesheet.visitDetails')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Service Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('routesheet.serviceDate')}
                    </label>
                    <input
                      type="date"
                      value={editForm.serviceDate}
                      onChange={(e) => handleEditFormChange('serviceDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Time In */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('routesheet.timeIn')}
                    </label>
                    <input
                      type="time"
                      value={editForm.timeIn}
                      onChange={(e) => handleEditFormChange('timeIn', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Time Out */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('routesheet.timeOut')}
                    </label>
                    <input
                      type="time"
                      value={editForm.timeOut}
                      onChange={(e) => handleEditFormChange('timeOut', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('routesheet.comments')}</h3>
                <div className="space-y-4">
                  {/* Comment Selection */}
                  <div>
                    <select
                      value={editForm.selectedComment}
                      onChange={(e) => {
                        handleEditFormChange('selectedComment', e.target.value)
                        if (e.target.value !== 'Other') {
                          handleEditFormChange('otherComments', '')
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {getCommentOptions(t).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Other Comments - Show if "Other" is selected */}
                  {editForm.selectedComment === 'Other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('earnings.pleaseSpecify')}
                      </label>
                      <textarea
                        value={editForm.otherComments}
                        onChange={(e) => handleEditFormChange('otherComments', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder={t('routesheet.enterNameOrInitial')}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Signature Section */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('routesheet.signature')}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 bg-gray-50">
                  {signature ? (
                    <div className="space-y-3">
                      <img src={signature} alt={t('routesheet.signature')} className="max-h-32 mx-auto border border-gray-200 rounded-lg bg-white p-2" />
                      <div className="flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={() => setShowSignatureModal(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          {t('earnings.changeSignature')}
                        </button>
                        <button
                          type="button"
                          onClick={handleClearSignature}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          {t('earnings.clear')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-500 mb-3">{t('earnings.noSignatureYet')}</p>
                      <button
                        type="button"
                        onClick={() => setShowSignatureModal(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                      >
                        {t('routesheet.addSignature')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Estimated Payment Display - Read Only */}
              <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  {t('routesheet.estimatedPayment')}
                </h3>
                <p className="text-3xl font-bold text-green-900">
                  ${parseFloat(editForm.estimatedPayment || '0').toFixed(2)}
                </p>
                <p className="text-sm text-green-700 mt-2">
                  {t('earnings.contractBasedAmount')}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 rounded-b-2xl flex gap-3 sticky bottom-0">
              <button
                onClick={cancelEdit}
                className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmEdit}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {t('earnings.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Capture Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{t('routesheet.addYourSignature')}</h3>
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="p-6 pb-4">
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSignatureMode('draw')}
                  className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
                    signatureMode === 'draw'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  {t('routesheet.draw')}
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('type')}
                  className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
                    signatureMode === 'type'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Type className="w-4 h-4" />
                  {t('routesheet.type')}
                </button>
              </div>

              {/* Draw Mode */}
              {signatureMode === 'draw' && (
                <div>
                  <div className="border-2 border-gray-300 rounded-lg bg-white">
                    <SignatureCanvas
                      ref={sigCanvasRef}
                      canvasProps={{
                        className: 'w-full h-40',
                        style: { touchAction: 'none' }
                      }}
                      backgroundColor="white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => sigCanvasRef.current?.clear()}
                    className="mt-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    {t('routesheet.clearCanvas')}
                  </button>
                </div>
              )}

              {/* Type Mode */}
              {signatureMode === 'type' && (
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('routesheet.fontStyle')}
                    </label>
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Dancing Script">{t('signatureFonts.dancingScript')}</option>
                      <option value="Pacifico">{t('signatureFonts.pacifico')}</option>
                      <option value="Great Vibes">{t('signatureFonts.greatVibes')}</option>
                      <option value="Allura">{t('signatureFonts.allura')}</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('routesheet.typeYourName')}
                    </label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('earnings.yourName')}
                    />
                  </div>
                  <div className="border-2 border-gray-200 rounded-lg p-4 bg-white min-h-[100px] flex items-center justify-center">
                    <div style={{ fontFamily: selectedFont, fontSize: '36px' }}>
                      {typedName || t('earnings.preview')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 pt-4 bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={() => setShowSignatureModal(false)}
                className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSignatureCapture}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200"
              >
                {t('earnings.saveSignature')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
