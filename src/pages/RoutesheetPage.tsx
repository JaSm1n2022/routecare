import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { HamburgerMenu } from '../components/HamburgerMenu'
import { MobileSelect } from '../components/MobileSelect'
import toast from 'react-hot-toast'
import { Save, X, Edit3, Type } from 'lucide-react'
import dayjs from 'dayjs'
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

interface Assignment {
  id: string
  patientCd: string
  frequencyVisit: string
  visitType: string
  dayOfTheWeek: string[]
  timeOfVisit: string
  disciplineId: string
}

interface Contract {
  id: string
  serviceType: string
  serviceRate: number
  mileageRate?: number
  maxReimbursement?: number
  isMileageRate?: boolean
  serviceRateType?: string
  patientCd?: string
  employeeId?: string
}

export function RoutesheetPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { employee, authUser } = useAuth()
  const sigCanvasRef = useRef<SignatureCanvas>(null)

  // Form state
  const [patients, setPatients] = useState<string[]>([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [service, setService] = useState('')
  const [availableServices, setAvailableServices] = useState<ReturnType<typeof getClientServices>>([])
  const [isClientRequired, setIsClientRequired] = useState(false)
  const [serviceDate, setServiceDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [timeIn, setTimeIn] = useState(dayjs().format('HH:mm'))
  const [timeOut, setTimeOut] = useState(dayjs().add(45, 'minute').format('HH:mm'))
  const [mileage, setMileage] = useState(0)
  const [comments, setComments] = useState('')
  const [otherComments, setOtherComments] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Signature modal state
  const [signatureModal, setSignatureModal] = useState(false)
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw')
  const [typedName, setTypedName] = useState('')
  const [selectedFont, setSelectedFont] = useState('Dancing Script')

  // Data
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [contract, setContract] = useState<Contract | null>(null)

  // Errors
  const [errors, setErrors] = useState({
    patient: '',
    signature: ''
  })

  // Filter services based on employee position and set default
  useEffect(() => {
    if (!employee?.position) return

    const CLIENT_SERVICES = getClientServices(t)
    const filtered = CLIENT_SERVICES.filter(s => {
      if (s.permission.length === 1 && s.permission[0] === '*') {
        return true
      }
      return s.permission.includes(employee.position)
    })

    setAvailableServices(filtered)

    // Set default service to "Regular Visit" if available and no service is currently selected
    if (!service) {
      const regularVisit = filtered.find(s => s.name === t('services.regularVisit'))
      if (regularVisit) {
        setService(t('services.regularVisit'))
        setIsClientRequired(regularVisit.isClientRequired)
        // Set default comment for visit service
        if (!comments) {
          setComments('Visit Completed – No Issues')
        }
        console.log('✅ Default service set to Regular Visit with default comment')
      }
    }

    console.log('📋 Available services for', employee.position, ':', filtered)
  }, [employee?.position, t])

  // Load assignments and contracts
  useEffect(() => {
    if (!employee?.companyId || !employee?.id) return

    loadData()
  }, [employee])

  async function loadData() {
    try {
      setLoading(true)
      console.log('📋 Loading routesheet data...')

      const companyId = employee?.companyId
      const employeeId = employee?.id

      // Fetch assignments
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .eq('companyId', companyId)
        .eq('disciplineId', employeeId)

      if (assignmentError) throw assignmentError

      const assignmentList = assignmentData || []
      setAssignments(assignmentList)

      // Get unique patient codes
      const uniquePatients = Array.from(
        new Set(assignmentList.map((a: Assignment) => a.patientCd))
      )
      setPatients(uniquePatients)

      // Auto-select if only one patient
      if (uniquePatients.length === 1) {
        setSelectedPatient(uniquePatients[0])
      }

      // Fetch contracts
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('companyId', companyId)

      if (contractError) throw contractError

      setContracts(contractData || [])

      console.log('✅ Data loaded:', {
        assignments: assignmentList.length,
        patients: uniquePatients.length,
        contracts: contractData?.length || 0
      })

    } catch (error: any) {
      console.error('❌ Error loading data:', error)
      toast.error('Failed to load data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle service change
  const handleServiceChange = (serviceName: string) => {
    setService(serviceName)

    // Find the service to check if client is required
    const selectedService = availableServices.find(s => s.name === serviceName)
    setIsClientRequired(selectedService?.isClientRequired || false)

    // If client not required, clear selected patient
    if (!selectedService?.isClientRequired) {
      setSelectedPatient('')
    }

    // Special handling for Attendance service - set time to 8am-5pm
    if (serviceName === t('services.attendance')) {
      setTimeIn('08:00')
      setTimeOut('17:00')
    }

    // Helper function to check if service is a visit type
    const isVisitService = (name: string) => {
      const lowerService = name.toLowerCase()
      return lowerService.includes('visit') ||
             lowerService === 'rv' ||
             lowerService === t('services.regularVisit').toLowerCase() ||
             lowerService === 'swv' ||
             lowerService === t('services.socialWorkerVisit').toLowerCase()
    }

    // Always set default comment based on service type when service changes
    if (serviceName === t('services.potentialAdmissionVisit')) {
      setComments('Other')
      console.log('✅ Default comment set to Other for Potential Admission Visit')
    } else if (isVisitService(serviceName)) {
      setComments('Visit Completed – No Issues')
      console.log('✅ Default comment set to Visit Completed for visit service')
    }

    console.log('📝 Service changed:', serviceName, 'Client required:', selectedService?.isClientRequired)
  }

  // Update contract when patient or service changes
  useEffect(() => {
    if (!service || !employee?.id) return
    if (isClientRequired && !selectedPatient) return

    // Find contract for this patient and service
    let foundContract = contracts.find(
      c =>
        c.serviceType?.toLowerCase() === service.toLowerCase() &&
        c.patientCd === selectedPatient &&
        c.employeeId === employee.id
    )

    // Fallback to default contract for this service
    if (!foundContract) {
      foundContract = contracts.find(
        c =>
          c.serviceType?.toLowerCase() === service.toLowerCase() &&
          c.employeeId === employee.id
      )
    }

    setContract(foundContract || null)
    console.log('💰 Contract found:', foundContract)
  }, [selectedPatient, service, contracts, employee, isClientRequired])

  const handlePatientChange = (patientCd: string) => {
    setSelectedPatient(patientCd)
    setErrors({ ...errors, patient: '' })

    // Find assignment for this patient
    const assignment = assignments.find(
      a => a.patientCd === patientCd && a.disciplineId === employee?.id
    )

    if (assignment && assignment.timeOfVisit && assignment.timeOfVisit !== 'Open') {
      // Set time from assignment
      const [hours, minutes] = assignment.timeOfVisit.split(':')
      setTimeIn(`${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`)
      setTimeOut(dayjs().hour(parseInt(hours)).minute(parseInt(minutes)).add(45, 'minute').format('HH:mm'))
    }
  }

  const calculateDuration = () => {
    const start = dayjs(`${serviceDate} ${timeIn}`)
    const end = dayjs(`${serviceDate} ${timeOut}`)
    const diffMinutes = end.diff(start, 'minute')

    if (diffMinutes < 0) return '0h 0m'

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    return `${hours}h ${minutes}m`
  }

  const calculateEstimatedPayment = () => {
    if (!contract) return 0

    let servicePayment = parseFloat(contract.serviceRate?.toString() || '0')

    // If hourly rate, calculate based on duration
    if (contract.serviceRateType?.toLowerCase() === 'hourly') {
      const start = dayjs(`${serviceDate} ${timeIn}`)
      const end = dayjs(`${serviceDate} ${timeOut}`)
      const durationMinutes = end.diff(start, 'minutes')
      const durationHours = durationMinutes / 60
      servicePayment = durationHours * servicePayment
    }

    // Add mileage cost
    let mileageCost = 0
    if (contract.isMileageRate && contract.mileageRate && mileage > 0) {
      mileageCost = contract.mileageRate * mileage
      if (contract.maxReimbursement && mileageCost > contract.maxReimbursement) {
        mileageCost = contract.maxReimbursement
      }
    }

    return servicePayment + mileageCost
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    let isValid = true
    const newErrors = { patient: '', signature: '' }

    if (!service) {
      toast.error(t('routesheet.pleaseSelectService'))
      isValid = false
    }

    // Only require patient if service requires it
    if (isClientRequired && !selectedPatient) {
      newErrors.patient = t('routesheet.pleaseSelectClient')
      isValid = false
    }

    if (!signature) {
      newErrors.signature = t('routesheet.signatureRequired')
      isValid = false
    }

    // Validate "Other" comments
    if (comments === 'Other' && !otherComments.trim()) {
      toast.error(t('routesheet.pleaseSpecifyComment'))
      isValid = false
    }

    setErrors(newErrors)

    if (!isValid) return

    try {
      setSubmitting(true)

      const combinedDosStart = `${serviceDate} ${timeIn}`
      const combinedDosEnd = `${serviceDate} ${timeOut}`
      const dayOfWeek = dayjs(serviceDate).format('ddd')

      const estimatedPayment = calculateEstimatedPayment()

      // Find service code
      const selectedService = availableServices.find(s => s.name === service)
      const serviceCode = selectedService?.code || service

      const routesheetData = {
        companyId: employee?.companyId,
        patientCd: selectedPatient || null,
        service: service,
        serviceCd: serviceCode,
        dosStart: combinedDosStart,
        dosEnd: combinedDosEnd,
        day: dayOfWeek,
        requestor: employee?.name,
        requestorId: employee?.id,
        requestorTitle: employee?.position,
        mileage: mileage || 0,
        isMileageRate: contract?.isMileageRate || false,
        serviceRate: contract?.serviceRate || 0,
        serviceRateType: contract?.serviceRateType || '',
        mileageRate: contract?.mileageRate || 0,
        mileageMaxReimbursement: contract?.maxReimbursement || 0,
        mileageCost: contract?.mileageRate ? contract.mileageRate * mileage : 0,
        totalMileageReimbursement: contract?.isMileageRate
          ? Math.min(
              (contract?.mileageRate || 0) * mileage,
              contract?.maxReimbursement || 0
            )
          : 0,
        estimatedPayment: estimatedPayment.toFixed(2),
        approvedPayment: estimatedPayment.toFixed(2),
        comments: comments === 'Other' ? `Other: ${otherComments}` : comments,
        signature_based: signature,
        created_at: new Date().toISOString(),
        createdUser: {
          name: authUser?.email || '',
          userId: authUser?.id || '',
          date: new Date().toISOString()
        },
        updatedUser: {
          name: authUser?.email || '',
          userId: authUser?.id || '',
          date: new Date().toISOString()
        }
      }

      console.log('📤 Submitting routesheet:', routesheetData)

      const { error } = await supabase
        .from('routesheets')
        .insert([routesheetData])

      if (error) throw error

      toast.success(t('routesheet.submitSuccess'))

      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)

    } catch (error: any) {
      console.error('❌ Error submitting routesheet:', error)
      toast.error(t('routesheet.submitError') + ': ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClearSignature = () => {
    setSignature(null)
    setTypedName('')
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear()
    }
  }

  const handleConfirmSignature = () => {
    if (signatureMode === 'draw') {
      if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
        const dataURL = sigCanvasRef.current.toDataURL('image/png')
        setSignature(dataURL)
        setSignatureModal(false)
        setErrors({ ...errors, signature: '' })
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
          ctx.font = `48px "${selectedFont}", cursive`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(typedName, canvas.width / 2, canvas.height / 2)
          const dataURL = canvas.toDataURL('image/png')
          setSignature(dataURL)
          setSignatureModal(false)
          setErrors({ ...errors, signature: '' })
        }
      } else {
        toast.error(t('routesheet.pleaseTypeName'))
      }
    }
  }

  const handleOpenSignatureModal = () => {
    setSignatureModal(true)
    setSignatureMode('draw')
    setTypedName('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    )
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
                {t('routesheet.title')}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Selection - FIRST */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">{t('routesheet.serviceInformation')}</h2>
            <div className="space-y-4">
              <MobileSelect
                label={t('routesheet.selectServiceType')}
                required
                value={service}
                onChange={handleServiceChange}
                options={availableServices.map(s => ({ value: s.name, label: s.name }))}
                placeholder={t('routesheet.selectServiceTypePlaceholder')}
                searchable
              />

              {/* Client Selection - Only if service requires it */}
              {service && isClientRequired && (
                <div>
                  <MobileSelect
                    label={t('routesheet.selectClient')}
                    required
                    value={selectedPatient}
                    onChange={handlePatientChange}
                    options={patients.map(p => ({ value: p, label: p }))}
                    placeholder={t('routesheet.selectClientPlaceholder')}
                    error={!!errors.patient}
                  />
                  {errors.patient && (
                    <p className="text-red-500 text-sm mt-1">{errors.patient}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">{t('routesheet.visitDetails')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('routesheet.serviceDate')}
                </label>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('routesheet.timeIn')}
                </label>
                <input
                  type="time"
                  value={timeIn}
                  onChange={(e) => {
                    const newTimeIn = e.target.value
                    setTimeIn(newTimeIn)
                    // Auto-calculate Time Out as 45 minutes after Time In
                    if (newTimeIn) {
                      const [hours, minutes] = newTimeIn.split(':')
                      const timeInMoment = dayjs().hour(parseInt(hours)).minute(parseInt(minutes))
                      const timeOutMoment = timeInMoment.add(45, 'minute')
                      setTimeOut(timeOutMoment.format('HH:mm'))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('routesheet.timeOut')}
                </label>
                <input
                  type="time"
                  value={timeOut}
                  onChange={(e) => setTimeOut(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{t('routesheet.duration')}:</strong> {calculateDuration()}
              </p>
            </div>
          </div>

          {/* Mileage */}
          {contract?.isMileageRate && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">{t('routesheet.mileage')}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('routesheet.milesDriven')}
                </label>
                <input
                  type="number"
                  value={mileage || ''}
                  onChange={(e) => setMileage(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                  placeholder={t('routesheet.enterMiles')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {contract.mileageRate && (
                  <p className="text-sm text-gray-600 mt-2">
                    {t('routesheet.rate')}: ${contract.mileageRate.toFixed(2)}/mile
                    {contract.maxReimbursement && ` (${t('routesheet.max')}: $${contract.maxReimbursement.toFixed(2)})`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">{t('routesheet.comments')}</h2>
            <div className="space-y-4">
              <MobileSelect
                label=""
                value={comments}
                onChange={(value) => {
                  setComments(value)
                  if (value !== 'Other') {
                    setOtherComments('')
                  }
                }}
                options={getCommentOptions(t)}
                placeholder={t('comments.selectComment')}
              />

              {comments === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('routesheet.otherComment')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={otherComments}
                    onChange={(e) => setOtherComments(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('routesheet.enterNameOrInitial')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Signature */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">
              {t('routesheet.signature')} <span className="text-red-500">*</span>
            </h2>
            <div className="border-2 border-gray-300 rounded-lg p-4">
              {signature ? (
                <div>
                  <img src={signature} alt={t('routesheet.signature')} className="max-h-32 mx-auto" />
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    {t('routesheet.clearSignature')}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">{t('routesheet.signatureRequired')}</p>
                  <button
                    type="button"
                    onClick={handleOpenSignatureModal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('routesheet.addSignature')}
                  </button>
                </div>
              )}
              {errors.signature && (
                <p className="text-red-500 text-sm mt-2">{errors.signature}</p>
              )}
            </div>
          </div>

          {/* Estimated Payment */}
          {contract && (
            <div className="bg-green-50 p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-green-800 mb-2">
                {t('routesheet.estimatedPayment')}
              </h2>
              <p className="text-3xl font-bold text-green-900">
                ${calculateEstimatedPayment().toFixed(2)}
              </p>
              <div className="mt-3 space-y-1">
                <p className="text-sm text-green-700">
                  {t('routesheet.service')}: ${(() => {
                    let servicePayment = parseFloat(contract.serviceRate?.toString() || '0')
                    if (contract.serviceRateType?.toLowerCase() === 'hourly') {
                      const start = dayjs(`${serviceDate} ${timeIn}`)
                      const end = dayjs(`${serviceDate} ${timeOut}`)
                      const durationMinutes = end.diff(start, 'minutes')
                      const durationHours = durationMinutes / 60
                      servicePayment = durationHours * servicePayment
                    }
                    return servicePayment.toFixed(2)
                  })()} ({contract.serviceRateType || 'flat'})
                </p>
                {contract.isMileageRate && mileage > 0 && (
                  <p className="text-sm text-green-700">
                    {t('routesheet.mileage')}: ${(() => {
                      let mileageCost = contract.mileageRate * mileage
                      if (contract.maxReimbursement && mileageCost > contract.maxReimbursement) {
                        mileageCost = contract.maxReimbursement
                      }
                      return mileageCost.toFixed(2)
                    })()} ({mileage} miles × ${contract.mileageRate.toFixed(2)})
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {t('common.submitting')}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {t('routesheet.submit')}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>

      {/* Signature Modal */}
      {signatureModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setSignatureModal(false)}
            />

            {/* Modal */}
            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  onClick={() => setSignatureModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {t('routesheet.addYourSignature')}
                  </h3>

                  {/* Mode Toggle */}
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
                          placeholder={t('routesheet.enterFullName')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      {typedName && (
                        <div className="border-2 border-gray-300 rounded-lg p-4 bg-white text-center">
                          <p
                            style={{
                              fontFamily: `"${selectedFont}", cursive`,
                              fontSize: '32px'
                            }}
                          >
                            {typedName}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                    <button
                      type="button"
                      onClick={handleConfirmSignature}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm"
                    >
                      {t('routesheet.confirmSignature')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
