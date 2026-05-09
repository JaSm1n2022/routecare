import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { MobileSelect } from '../components/MobileSelect'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, X, Edit3, Type } from 'lucide-react'
import dayjs from 'dayjs'
import SignatureCanvas from 'react-signature-canvas'

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
  const navigate = useNavigate()
  const { employee, authUser } = useAuth()
  const sigCanvasRef = useRef<any>(null)

  // Form state
  const [patients, setPatients] = useState<string[]>([])
  const [selectedPatient, setSelectedPatient] = useState('')
  const [service, setService] = useState('Regular Visit')
  const [serviceDate, setServiceDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [timeIn, setTimeIn] = useState(dayjs().format('HH:mm'))
  const [timeOut, setTimeOut] = useState(dayjs().add(45, 'minute').format('HH:mm'))
  const [mileage, setMileage] = useState(0)
  const [notes, setNotes] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Data
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [contract, setContract] = useState<Contract | null>(null)

  // Errors
  const [errors, setErrors] = useState({
    patient: '',
    signature: ''
  })

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

  // Update contract when patient or service changes
  useEffect(() => {
    if (!selectedPatient || !service || !employee?.id) return

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
  }, [selectedPatient, service, contracts, employee])

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

    if (!selectedPatient) {
      newErrors.patient = 'Please select a patient'
      isValid = false
    }

    if (!signature) {
      newErrors.signature = 'Signature is required'
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

      const routesheetData = {
        companyId: employee?.companyId,
        patientCd: selectedPatient,
        service: service,
        serviceCd: service,
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
        comments: notes,
        signature_based: signature,
        createdAt: new Date().toISOString(),
        createdUser: {
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

      toast.success('Route sheet submitted successfully!')

      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)

    } catch (error: any) {
      console.error('❌ Error submitting routesheet:', error)
      toast.error('Failed to submit: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClear = () => {
    setSignature(null)
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear()
    }
  }

  const handleSaveSignature = () => {
    if (sigCanvasRef.current) {
      const dataURL = sigCanvasRef.current.toDataURL()
      setSignature(dataURL)
      setErrors({ ...errors, signature: '' })
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Route Sheet</h1>
          <p className="text-gray-600">Record your visit</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Patient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <MobileSelect
                  label="Patient"
                  required
                  value={selectedPatient}
                  onChange={handlePatientChange}
                  options={patients.map(p => ({ value: p, label: p }))}
                  placeholder="Select Patient"
                  error={!!errors.patient}
                />
                {errors.patient && (
                  <p className="text-red-500 text-sm mt-1">{errors.patient}</p>
                )}
              </div>

              <div>
                <MobileSelect
                  label="Service Type"
                  value={service}
                  onChange={setService}
                  options={[
                    { value: 'Regular Visit', label: 'Regular Visit' },
                    { value: 'Skilled Nursing', label: 'Skilled Nursing' },
                    { value: 'Assessment', label: 'Assessment' },
                    { value: 'Other', label: 'Other' }
                  ]}
                  placeholder="Select Service"
                />
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Visit Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Date
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
                  Time In
                </label>
                <input
                  type="time"
                  value={timeIn}
                  onChange={(e) => setTimeIn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Out
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
                <strong>Duration:</strong> {calculateDuration()}
              </p>
            </div>
          </div>

          {/* Mileage */}
          {contract?.isMileageRate && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Mileage</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Miles Driven
                </label>
                <input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {contract.mileageRate && (
                  <p className="text-sm text-gray-600 mt-1">
                    Rate: ${contract.mileageRate}/mile (Max: $
                    {contract.maxReimbursement || 0})
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any visit notes or comments..."
            />
          </div>

          {/* Signature */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">
              Signature <span className="text-red-500">*</span>
            </h2>
            <div className="border-2 border-gray-300 rounded-lg p-4">
              {signature ? (
                <div>
                  <img src={signature} alt="Signature" className="max-h-32" />
                  <button
                    type="button"
                    onClick={handleClear}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Clear Signature
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Signature required</p>
                  <button
                    type="button"
                    onClick={handleSaveSignature}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Signature
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
                Estimated Payment
              </h2>
              <p className="text-3xl font-bold text-green-900">
                ${calculateEstimatedPayment().toFixed(2)}
              </p>
              <p className="text-sm text-green-700 mt-2">
                Service Rate: ${contract.serviceRate} ({contract.serviceRateType || 'flat'})
              </p>
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
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Submit Route Sheet
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
