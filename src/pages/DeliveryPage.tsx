import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, X, FlipHorizontal, Check, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { MobileSelect } from '../components/MobileSelect'
import { HamburgerMenu } from '../components/HamburgerMenu'
import ReactSignatureCanvas from 'react-signature-canvas'
import Webcam from 'react-webcam'
import toast from 'react-hot-toast'

const FACING_MODE_USER = 'user'
const FACING_MODE_ENVIRONMENT = 'environment'

interface Distribution {
  id: string
  patientCd: string
  short_description?: string
  description: string
  order_qty: number
  unit_uom: string
  record_id: string
  category: string
}

export function DeliveryPage() {
  const navigate = useNavigate()
  const { employee } = useAuth()
  const sigCanvas = useRef<ReactSignatureCanvas>(null)
  const webcamRef = useRef<Webcam>(null)

  // State
  const [client, setClient] = useState('')
  const [clients, setClients] = useState<string[]>([])
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [selectedDistributions, setSelectedDistributions] = useState<Distribution[]>([])
  const [receivedBy, setReceivedBy] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSigned, setIsSigned] = useState(false)

  // Photo modal state
  const [isPhotoOpen, setIsPhotoOpen] = useState(false)
  const [imgSrc, setImgSrc] = useState('')
  const [capturedImg, setCapturedImg] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState(FACING_MODE_USER)

  // Validation errors
  const [signatureError, setSignatureError] = useState('')
  const [receivedByError, setReceivedByError] = useState('')

  useEffect(() => {
    if (employee?.id) {
      setReceivedBy(employee.name || '')
      fetchDistributions()
    }
  }, [employee?.id])

  const fetchDistributions = async () => {
    if (!employee?.id || !employee?.companyId) return

    try {
      setLoading(true)
      console.log('📦 Fetching distributions for delivery:', {
        employeeId: employee.id,
        companyId: employee.companyId
      })

      const { data, error } = await supabase
        .from('distributions')
        .select('*')
        .eq('companyId', employee.companyId)
        .eq('requestor_id', employee.id)
        .eq('category', 'Medical/Incontinence')
        .is('actualDeliveredDt', null)
        .order('patientCd', { ascending: true })

      if (error) throw error

      console.log('✅ Distributions fetched:', data?.length)

      const uniqueClients = Array.from(new Set(data?.map(d => d.patientCd) || []))
      setClients(uniqueClients)
      setDistributions(data || [])

    } catch (error) {
      console.error('❌ Error fetching distributions:', error)
      toast.error('Failed to fetch delivery data')
    } finally {
      setLoading(false)
    }
  }

  const handleClientChange = (selectedClient: string) => {
    setClient(selectedClient)
    const filtered = distributions.filter(d => d.patientCd === selectedClient)
    setSelectedDistributions(filtered)
  }

  const handleSignatureBegin = () => {
    setIsSigned(true)
    setSignatureError('')
  }

  const clearSignature = () => {
    sigCanvas.current?.clear()
    setIsSigned(false)
  }

  // Camera functions
  const handleFlipCamera = useCallback(() => {
    setFacingMode(prevMode =>
      prevMode === FACING_MODE_USER ? FACING_MODE_ENVIRONMENT : FACING_MODE_USER
    )
  }, [])

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot()
      setCapturedImg(imageSrc)
    }
  }, [])

  const handleRetake = () => {
    setCapturedImg(null)
  }

  const handleUsePhoto = () => {
    if (capturedImg) {
      setImgSrc(capturedImg)
      setIsPhotoOpen(false)
      setCapturedImg(null)
    }
  }

  const handleTakePhoto = () => {
    setIsPhotoOpen(true)
    setCapturedImg(null)
  }

  const handleClosePhoto = () => {
    setIsPhotoOpen(false)
    setCapturedImg(null)
  }

  const handleSubmit = async () => {
    // Validation
    let isValid = true

    if (!isSigned) {
      setSignatureError('Signature is required')
      isValid = false
    }

    if (!receivedBy.trim()) {
      setReceivedByError('Received by is required')
      isValid = false
    }

    if (!isValid) return

    try {
      const signatureImg = sigCanvas.current?.getCanvas().toDataURL('image/png')
      const orderIds = selectedDistributions.map(d => d.record_id).filter(id => id)

      // Create photo records
      const photoPayload = []

      // Add signature photos
      for (const orderId of orderIds) {
        photoPayload.push({
          created_at: new Date().toISOString(),
          category: 'delivery_signature',
          record_id: orderId,
          image_based: signatureImg,
          printedName: receivedBy,
          companyId: employee?.companyId,
          createdUser: {
            name: employee?.name,
            userId: employee?.id,
            date: new Date().toISOString()
          },
          updatedUser: {
            name: employee?.name,
            userId: employee?.id,
            date: new Date().toISOString()
          }
        })
      }

      // Add photo evidence if photo was taken
      if (imgSrc) {
        for (const orderId of orderIds) {
          photoPayload.push({
            created_at: new Date().toISOString(),
            category: 'delivery_photo',
            record_id: orderId,
            image_based: imgSrc,
            printedName: receivedBy,
            companyId: employee?.companyId,
            createdUser: {
              name: employee?.name,
              userId: employee?.id,
              date: new Date().toISOString()
            },
            updatedUser: {
              name: employee?.name,
              userId: employee?.id,
              date: new Date().toISOString()
            }
          })
        }
      }

      // Insert photo records
      const { error: photoError } = await supabase
        .from('photos')
        .insert(photoPayload)

      if (photoError) throw photoError

      // Update distribution records with actual delivery date
      const distributionUpdates = selectedDistributions.map(d => ({
        id: d.id,
        companyId: employee?.companyId,
        actualDeliveredDt: new Date().toISOString(),
        updatedUser: {
          name: employee?.name,
          userId: employee?.id,
          date: new Date().toISOString()
        }
      }))

      const { error: updateError } = await supabase
        .from('distributions')
        .upsert(distributionUpdates)

      if (updateError) throw updateError

      toast.success('Supplies have been successfully delivered!')

      // Reset form
      setClient('')
      setSelectedDistributions([])
      clearSignature()
      setImgSrc('')
      setReceivedBy(employee?.name || '')

      // Refresh distributions
      fetchDistributions()

    } catch (error) {
      console.error('❌ Error submitting delivery:', error)
      toast.error('Failed to submit delivery')
    }
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
                className="h-12 w-auto mb-2"
                style={{ mixBlendMode: 'multiply' }}
              />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
                Delivery Tracking
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
          {/* Client Selection */}
          <div className="mb-6">
            <MobileSelect
              label={`Select Client ${clients.length > 0 ? `(${clients.length})` : ''}`}
              value={client}
              onChange={handleClientChange}
              options={[
                { value: '', label: 'Select One' },
                ...clients.map(c => ({ value: c, label: c }))
              ]}
              placeholder="Select One"
            />
            {clients.length === 0 && !loading && (
              <p className="mt-2 text-sm text-amber-600">
                There are currently no supplies available for client delivery. Please refresh the page to check for any available supplies.
              </p>
            )}
          </div>

          {/* Supplies Table */}
          {client && selectedDistributions.length > 0 && (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Supplies ({selectedDistributions.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedDistributions.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{idx + 1}</td>
                          <td className="px-3 py-4 text-sm text-gray-900">
                            {item.short_description || item.description}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.order_qty} {item.unit_uom}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signature */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">Signature</h3>
                  {isSigned && (
                    <button
                      onClick={clearSignature}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear
                    </button>
                  )}
                </div>
                <div className="border-4 border-gray-300 rounded-lg bg-white p-2">
                  <ReactSignatureCanvas
                    ref={sigCanvas}
                    onBegin={handleSignatureBegin}
                    penColor="green"
                    canvasProps={{
                      className: 'w-full h-32 bg-white rounded'
                    }}
                  />
                </div>
                {signatureError && (
                  <p className="mt-1 text-sm text-red-600">{signatureError}</p>
                )}
              </div>

              {/* Received By */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Received By:
                </label>
                <input
                  type="text"
                  value={receivedBy}
                  onChange={(e) => {
                    setReceivedBy(e.target.value)
                    setReceivedByError('')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter name"
                />
                {receivedByError && (
                  <p className="mt-1 text-sm text-red-600">{receivedByError}</p>
                )}
              </div>

              {/* Photo Preview */}
              {imgSrc && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Photo Evidence</h3>
                    <button
                      onClick={() => setImgSrc('')}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                  <div className="w-full">
                    <img
                      src={imgSrc}
                      alt="Delivery proof"
                      className="w-full sm:w-64 h-auto object-cover rounded-lg border border-gray-300"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleTakePhoto}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  {imgSrc ? 'Retake Photo' : 'Take Photo'}
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Check className="w-5 h-5" />
                  Submit
                </button>
              </div>
            </>
          )}
        </div>

        {/* Photo Modal */}
        {isPhotoOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Take Photo</h3>
                <button
                  onClick={handleClosePhoto}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {!capturedImg ? (
                <>
                  <div className="mb-4">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode }}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={capturePhoto}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Camera className="w-5 h-5" />
                      Take Picture
                    </button>
                    <button
                      onClick={handleFlipCamera}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <FlipHorizontal className="w-5 h-5" />
                      Flip Camera
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <img src={capturedImg} alt="Captured" className="w-full rounded-lg" />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleUsePhoto}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Check className="w-5 h-5" />
                      Use Photo
                    </button>
                    <button
                      onClick={handleRetake}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <X className="w-5 h-5" />
                      Retake
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
