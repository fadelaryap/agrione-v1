// Date utilities dengan timezone handling yang benar
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

// Format date untuk display (handle timezone dengan benar)
// Database sudah GMT+7, jadi tidak perlu convert lagi
export function formatDate(dateString: string | null | undefined, formatStr: string = 'dd MMM yyyy HH:mm'): string {
  if (!dateString) return 'N/A'
  
  try {
    // Parse ISO string (database sudah GMT+7)
    const date = parseISO(dateString)
    // Format dengan locale Indonesia
    return format(date, formatStr, { locale: id })
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}

// Format date untuk display dengan locale Indonesia
export function formatDateIndonesian(dateString: string | null | undefined): string {
  if (!dateString) return 'Tidak tersedia'
  
  try {
    const date = parseISO(dateString)
    // Format: "26 Desember 2025, 14:30"
    return format(date, 'dd MMMM yyyy, HH:mm', { locale: id })
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}

// Format date untuk display (hanya tanggal)
export function formatDateOnly(dateString: string | null | undefined): string {
  if (!dateString) return 'Tidak tersedia'
  
  try {
    const date = parseISO(dateString)
    return format(date, 'dd MMMM yyyy', { locale: id })
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}

// Format date untuk display (hanya waktu)
export function formatTimeOnly(dateString: string | null | undefined): string {
  if (!dateString) return 'Tidak tersedia'
  
  try {
    const date = parseISO(dateString)
    return format(date, 'HH:mm', { locale: id })
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}

