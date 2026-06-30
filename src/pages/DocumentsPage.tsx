import { useNavigate } from 'react-router-dom'
import { FileText, Download } from 'lucide-react'
import { HamburgerMenu } from '../components/HamburgerMenu'
import { useTranslation } from 'react-i18next'

interface Document {
  id: string
  name: string
  description: string
  url: string
  icon: typeof FileText
}

export function DocumentsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const documents: Document[] = [
    {
      id: '1',
      name: t('documents.employeeHandbook'),
      description: t('documents.handbookDesc'),
      url: 'https://acwocotrngkeaxtzdzfz.supabase.co/storage/v1/object/public/documents/HTH%20Employee%20Handbook_V3.pdf',
      icon: FileText,
    },
    {
      id: '2',
      name: t('documents.aboutRouteCare'),
      description: t('documents.aboutRouteCareDesc'),
      url: 'https://acwocotrngkeaxtzdzfz.supabase.co/storage/v1/object/public/documents/MyRouteCare.pdf',
      icon: FileText,
    },
  ]

  const handleDownload = (doc: Document) => {
    // Open in new tab to download
    window.open(doc.url, '_blank')
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
                {t('documents.title')}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Documents List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {documents.map((doc) => {
              const Icon = doc.icon
              return (
                <div
                  key={doc.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {doc.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {doc.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      <Download className="w-5 h-5" />
                      <span className="hidden sm:inline">{t('documents.download')}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Empty State (if no documents) */}
        {documents.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">
              {t('documents.noDocuments')}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {t('documents.checkBackLater')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
