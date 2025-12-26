// Date utilities dengan timezone handling yang benar
// Database sudah GMT+7, jadi kita perlu handle dengan benar
// Jika backend mengirim dengan 'Z' (UTC indicator) padahal nilainya sudah GMT+7,
// kita perlu treat sebagai local time untuk menghindari double conversion
import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

// Helper function untuk parse date dengan benar
// Backend mengirim timestamp yang sudah GMT+7, tapi mungkin dengan format 'Z'
// Jika ada 'Z', kita remove dan treat sebagai local time
function parseDateCorrectly(dateString: string): Date {
  // Jika string berakhir dengan 'Z' atau '+00:00', berarti backend treat sebagai UTC
  // Tapi karena nilainya sudah GMT+7, kita perlu adjust
  // Solusi: remove 'Z' dan treat sebagai local time
  let adjustedString = dateString
  
  // Jika berakhir dengan 'Z', remove dan treat sebagai local time
  if (dateString.endsWith('Z')) {
    // Remove 'Z' dan parse sebagai local time
    adjustedString = dateString.slice(0, -1)
    // Parse sebagai local time (tanpa timezone indicator)
    return new Date(adjustedString)
  }
  
  // Jika sudah ada timezone offset, parse langsung
  return parseISO(dateString)
}

// Format date untuk display (handle timezone dengan benar)
// Database sudah GMT+7, jadi tidak perlu convert lagi
export function formatDate(dateString: string | null | undefined, formatStr: string = 'dd MMM yyyy HH:mm'): string {
  if (!dateString) return 'N/A'
  
  try {
    const date = parseDateCorrectly(dateString)
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
    const date = parseDateCorrectly(dateString)
    // Format: "26 Desember 2025, 16:08"
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
    const date = parseDateCorrectly(dateString)
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
    const date = parseDateCorrectly(dateString)
    return format(date, 'HH:mm', { locale: id })
  } catch (error) {
    console.error('Error formatting date:', error)
    return dateString
  }
}

