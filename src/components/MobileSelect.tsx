import { useState } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'

interface MobileSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  error?: boolean
  label?: string
  required?: boolean
  searchable?: boolean
}

export function MobileSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  error = false,
  label,
  required = false,
  searchable = false
}: MobileSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const selectedOption = options.find(opt => opt.value === value)

  // Filter options based on search query
  const filteredOptions = searchable && searchQuery
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleOpen = () => {
    setIsOpen(true)
    setSearchQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredOptions.length > 0) {
      e.preventDefault()
      handleSelect(filteredOptions[0].value)
    }
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Select Button */}
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full px-4 py-3 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none flex items-center justify-between bg-white ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <span className={`text-base ${!value ? 'text-gray-400' : 'text-gray-900'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false)
              setSearchQuery('')
            }}
          />

          {/* Options List - Always positioned below the field */}
          <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-80 overflow-hidden flex flex-col">
            {/* Search Input */}
            {searchable && (
              <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type to search..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Options */}
            <div className="overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-4 py-4 text-left text-base hover:bg-blue-50 flex items-center justify-between border-b border-gray-100 last:border-b-0 ${
                      option.value === value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-900'
                    }`}
                  >
                    <span>{option.label}</span>
                    {option.value === value && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No results found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
