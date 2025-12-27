// Activity types untuk cultivation
export const CULTIVATION_ACTIVITIES = [
  "Pengolahan Tanah",
  "Persemaian", 
  "Penanaman",
  "Pengelolaan Air (Irigasi Presisi)",
  "Pemupukan",
  "Pengendalian Gulma",
  "Pengendalian Hama Penyakit",
  "Forecasting Panen",
  "Panen",
  "Rehabilitasi Lahan",
  "RnD"
] as const

export type CultivationActivity = typeof CULTIVATION_ACTIVITIES[number]

export type ActivityCategory = 'Planting Prep' | 'Crop Care' | 'Harvest' | 'RnD'

export interface CultivationActivityItem {
  id: string
  activity: CultivationActivity
  title: string
  startDate: string
  endDate: string
  fieldId?: number
  fieldName?: string
  assignee?: string
  priority?: 'low' | 'medium' | 'high'
  description?: string
  // HST (Hari Sejak Tanam) - relatif terhadap tanggal tanam
  hstMin?: number // Waktu minimum dalam HST
  hstMax?: number // Waktu maksimum dalam HST
  duration?: number // Durasi dalam hari
  // Hierarki parent-child
  parentId?: string // ID parent activity jika ini adalah sub-activity
  category?: ActivityCategory
  remark?: string
  // Activity-specific parameters
  parameters?: {
    // For Panen & Forecasting Panen
    harvestQuantity?: number // in ton/kg
    harvestQuality?: string
    // For Pemupukan
    fertilizerType?: string
    fertilizerAmount?: number
    // For Pengolahan Tanah
    area?: number // hectares
    // etc.
  }
}

export interface CultivationTemplate {
  id: string
  name: string
  description?: string
  activities: CultivationActivityItem[]
  createdAt?: string
  plantingDate?: string // Tanggal tanam untuk menghitung HST
}

// Helper function untuk menghitung tanggal berdasarkan HST
export function calculateDateFromHST(plantingDate: string, hst: number): string {
  const planting = new Date(plantingDate)
  const targetDate = new Date(planting)
  targetDate.setDate(targetDate.getDate() + hst)
  return targetDate.toISOString().split('T')[0]
}

// Helper function untuk menghitung HST dari tanggal
export function calculateHSTFromDate(plantingDate: string, date: string): number {
  const planting = new Date(plantingDate)
  const target = new Date(date)
  const diffTime = target.getTime() - planting.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Template default berdasarkan data cultivation standar
export function getDefaultCultivationTemplate(plantingDate: string = '2025-12-01'): CultivationTemplate {
  const activities: CultivationActivityItem[] = []
  const parentMap: Record<string, string> = {} // Map activity name to parent ID

  // Helper untuk membuat activity
  const createActivity = (
    no: number,
    aktivitas: string,
    hstMin: number | null,
    hstMax: number | null,
    duration: number | null,
    startDate: string,
    endDate: string,
    remark: string,
    category: ActivityCategory,
    activity: CultivationActivity,
    parentActivity?: string
  ): CultivationActivityItem => {
    const id = `activity_${no}`
    const parentId = parentActivity ? parentMap[parentActivity] : undefined
    
    const item: CultivationActivityItem = {
      id,
      activity,
      title: aktivitas,
      startDate,
      endDate,
      hstMin: hstMin ?? undefined,
      hstMax: hstMax ?? undefined,
      duration: duration ?? undefined,
      category,
      remark: remark || undefined,
      parentId,
      priority: category === 'Harvest' ? 'high' : category === 'Planting Prep' ? 'high' : 'medium',
    }

    // Simpan parent ID untuk child activities
    if (!parentActivity) {
      parentMap[aktivitas] = id
    }

    return item
  }

  // Parse dates dari format "1-Nov-2025" ke "2025-11-01"
  const parseDate = (dateStr: string): string => {
    const [day, month, year] = dateStr.split('-')
    const monthMap: Record<string, string> = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    }
    return `${year}-${monthMap[month]}-${day.padStart(2, '0')}`
  }

  // Planting Prep - Pengolahan Tanah
  activities.push(createActivity(1, 'Pengolahan Tanah', -30, -1, 29, parseDate('1-Nov-2025'), parseDate('30-Nov-2025'), '', 'Planting Prep', 'Pengolahan Tanah'))
  activities.push(createActivity(2, 'Perbaikan Pematang + Saluran Cacing', -30, -4, 26, parseDate('1-Nov-2025'), parseDate('27-Nov-2025'), '', 'Planting Prep', 'Pengolahan Tanah', 'Pengolahan Tanah'))
  activities.push(createActivity(3, 'Irigasi Awal Lahan', -19, -17, 2, parseDate('12-Nov-2025'), parseDate('14-Nov-2025'), '', 'Planting Prep', 'Pengolahan Tanah', 'Pengolahan Tanah'))
  activities.push(createActivity(4, 'Pembajakan Pertama', -15, -13, 2, parseDate('16-Nov-2025'), parseDate('18-Nov-2025'), '', 'Planting Prep', 'Pengolahan Tanah', 'Pengolahan Tanah'))
  activities.push(createActivity(5, 'Penggenangan Lahan', -14, -12, 2, parseDate('17-Nov-2025'), parseDate('19-Nov-2025'), '', 'Planting Prep', 'Pengolahan Tanah', 'Pengolahan Tanah'))
  activities.push(createActivity(6, 'Pengkondisian Tanah', -10, -8, 2, parseDate('21-Nov-2025'), parseDate('23-Nov-2025'), '', 'Planting Prep', 'Pengolahan Tanah', 'Pengolahan Tanah'))
  activities.push(createActivity(7, 'Pembajakan Kedua (Leveling)', -6, -4, 2, parseDate('25-Nov-2025'), parseDate('27-Nov-2025'), '', 'Planting Prep', 'Pengolahan Tanah', 'Pengolahan Tanah'))
  activities.push(createActivity(8, 'Quality Control Check', -5, -3, 2, parseDate('26-Nov-2025'), parseDate('28-Nov-2025'), '', 'Planting Prep', 'Pengolahan Tanah', 'Pengolahan Tanah'))
  activities.push(createActivity(9, 'Pengurangan Air', -1, -1, 0, parseDate('30-Nov-2025'), parseDate('30-Nov-2025'), '', 'Planting Prep', 'Pengolahan Tanah', 'Pengolahan Tanah'))

  // Planting Prep - Persemaian
  activities.push(createActivity(10, 'Persemaian', -25, -1, 24, parseDate('6-Nov-2025'), parseDate('30-Nov-2025'), '', 'Planting Prep', 'Persemaian'))
  activities.push(createActivity(11, 'Persiapan Benih', -25, -23, 2, parseDate('6-Nov-2025'), parseDate('8-Nov-2025'), '', 'Planting Prep', 'Persemaian', 'Persemaian'))
  activities.push(createActivity(12, 'Persiapan Tanah + Dapok', -24, -22, 2, parseDate('7-Nov-2025'), parseDate('9-Nov-2025'), '', 'Planting Prep', 'Persemaian', 'Persemaian'))
  activities.push(createActivity(13, 'Penyebaran Benih', -22, -21, 1, parseDate('9-Nov-2025'), parseDate('10-Nov-2025'), '', 'Planting Prep', 'Persemaian', 'Persemaian'))
  activities.push(createActivity(14, 'Pemeliharaan Persemaian', -21, -1, 20, parseDate('10-Nov-2025'), parseDate('30-Nov-2025'), '', 'Planting Prep', 'Persemaian', 'Persemaian'))
  activities.push(createActivity(15, 'Quality Control Check (Persemaian)', -11, -6, 5, parseDate('20-Nov-2025'), parseDate('25-Nov-2025'), '', 'Planting Prep', 'Persemaian', 'Persemaian'))
  activities.push(createActivity(16, 'Pemindahan Bibit ke Lahan', -2, -1, 1, parseDate('29-Nov-2025'), parseDate('30-Nov-2025'), '', 'Planting Prep', 'Persemaian', 'Persemaian'))

  // Planting Prep - Penanaman
  activities.push(createActivity(17, 'Penanaman', -2, 5, 7, parseDate('29-Nov-2025'), parseDate('6-Dec-2025'), '', 'Planting Prep', 'Penanaman'))
  activities.push(createActivity(18, 'Persiapan Mesin Transplanter', -2, -1, 1, parseDate('29-Nov-2025'), parseDate('30-Nov-2025'), '', 'Planting Prep', 'Penanaman', 'Penanaman'))
  activities.push(createActivity(19, 'Penanaman Bibit', 0, 0, 0, parseDate('1-Dec-2025'), parseDate('1-Dec-2025'), '', 'Planting Prep', 'Penanaman', 'Penanaman'))
  activities.push(createActivity(20, 'Quality Control Check (Penanaman)', 1, 5, 4, parseDate('2-Dec-2025'), parseDate('6-Dec-2025'), '', 'Planting Prep', 'Penanaman', 'Penanaman'))

  // Crop Care - Pengelolaan Air
  activities.push(createActivity(21, 'Pengelolaan Air (Irigasi Presisi)', 1, 100, 99, parseDate('2-Dec-2025'), parseDate('11-Mar-2026'), '', 'Crop Care', 'Pengelolaan Air (Irigasi Presisi)'))
  activities.push(createActivity(22, 'Irigasi Setelah Tanam', 1, 3, 2, parseDate('2-Dec-2025'), parseDate('4-Dec-2025'), '', 'Crop Care', 'Pengelolaan Air (Irigasi Presisi)', 'Pengelolaan Air (Irigasi Presisi)'))
  activities.push(createActivity(23, 'Monitoring Ketersediaan Air', 7, 90, 83, parseDate('8-Dec-2025'), parseDate('1-Mar-2026'), '', 'Crop Care', 'Pengelolaan Air (Irigasi Presisi)', 'Pengelolaan Air (Irigasi Presisi)'))
  activities.push(createActivity(24, 'Pengairan Lahan', 14, 90, null, parseDate('15-Dec-2025'), parseDate('1-Mar-2026'), '', 'Crop Care', 'Pengelolaan Air (Irigasi Presisi)', 'Pengelolaan Air (Irigasi Presisi)'))
  activities.push(createActivity(25, 'Pengeringan menjelang Panen', 90, 100, 10, parseDate('1-Mar-2026'), parseDate('11-Mar-2026'), '', 'Crop Care', 'Pengelolaan Air (Irigasi Presisi)', 'Pengelolaan Air (Irigasi Presisi)'))

  // Crop Care - Pemupukan
  activities.push(createActivity(26, 'Pemupukan', 0, 70, 70, parseDate('1-Dec-2025'), parseDate('9-Feb-2026'), '', 'Crop Care', 'Pemupukan'))
  activities.push(createActivity(27, 'Pemupukan Dasar', 0, 14, 14, parseDate('1-Dec-2025'), parseDate('15-Dec-2025'), '', 'Crop Care', 'Pemupukan', 'Pemupukan'))
  activities.push(createActivity(28, 'Monitoring Hasil Pemupukan', 3, 17, 14, parseDate('4-Dec-2025'), parseDate('18-Dec-2025'), 'Setiap 7 hari', 'Crop Care', 'Pemupukan', 'Pemupukan'))
  activities.push(createActivity(29, 'Pemupukan Susulan 1', 21, 25, 4, parseDate('22-Dec-2025'), parseDate('26-Dec-2025'), '', 'Crop Care', 'Pemupukan', 'Pemupukan'))
  activities.push(createActivity(30, 'Monitoring Hasil Pemupukan', 24, 28, 4, parseDate('25-Dec-2025'), parseDate('29-Dec-2025'), '', 'Crop Care', 'Pemupukan', 'Pemupukan'))
  activities.push(createActivity(31, 'Pemupukan Susulan 2', 31, 35, 4, parseDate('1-Jan-2026'), parseDate('5-Jan-2026'), 'Setiap 7 hari', 'Crop Care', 'Pemupukan', 'Pemupukan'))
  activities.push(createActivity(32, 'Monitoring Hasil Pemupukan', 34, 38, 4, parseDate('4-Jan-2026'), parseDate('8-Jan-2026'), '', 'Crop Care', 'Pemupukan', 'Pemupukan'))
  activities.push(createActivity(33, 'Pemupukan Tambahan (opsional)', 50, 70, 20, parseDate('20-Jan-2026'), parseDate('9-Feb-2026'), '', 'Crop Care', 'Pemupukan', 'Pemupukan'))

  // Crop Care - Pengendalian Gulma
  activities.push(createActivity(34, 'Pengendalian Gulma', -4, 50, 54, parseDate('27-Nov-2025'), parseDate('20-Jan-2026'), '', 'Crop Care', 'Pengendalian Gulma'))
  activities.push(createActivity(35, 'Pengaplikasian Herbisida', -4, -2, 2, parseDate('27-Nov-2025'), parseDate('29-Nov-2025'), '', 'Crop Care', 'Pengendalian Gulma', 'Pengendalian Gulma'))
  activities.push(createActivity(36, 'Monitoring Pertumbuhan Gulma', 7, 50, 43, parseDate('8-Dec-2025'), parseDate('20-Jan-2026'), '', 'Crop Care', 'Pengendalian Gulma', 'Pengendalian Gulma'))
  activities.push(createActivity(37, 'Penyiangan Mekanis', 14, 20, 6, parseDate('15-Dec-2025'), parseDate('21-Dec-2025'), '', 'Crop Care', 'Pengendalian Gulma', 'Pengendalian Gulma'))
  activities.push(createActivity(38, 'Aplikasi Herbisida', 28, 32, 4, parseDate('29-Dec-2025'), parseDate('2-Jan-2026'), '', 'Crop Care', 'Pengendalian Gulma', 'Pengendalian Gulma'))

  // Crop Care - Pengendalian Hama Penyakit
  activities.push(createActivity(39, 'Pengendalian Hama Penyakit', 7, 100, 93, parseDate('8-Dec-2025'), parseDate('11-Mar-2026'), '', 'Crop Care', 'Pengendalian Hama Penyakit'))
  activities.push(createActivity(40, 'Monitoring Organisme Penganggu Tanaman', 7, 90, 83, parseDate('8-Dec-2025'), parseDate('1-Mar-2026'), '', 'Crop Care', 'Pengendalian Hama Penyakit', 'Pengendalian Hama Penyakit'))
  activities.push(createActivity(41, 'Perhitungan Ambang Batas Ekonomi Serangan Hama', 7, 90, 83, parseDate('8-Dec-2025'), parseDate('1-Mar-2026'), '', 'Crop Care', 'Pengendalian Hama Penyakit', 'Pengendalian Hama Penyakit'))
  activities.push(createActivity(42, 'Pengendalian Biologis / Mekanis', 7, 100, 93, parseDate('8-Dec-2025'), parseDate('11-Mar-2026'), '', 'Crop Care', 'Pengendalian Hama Penyakit', 'Pengendalian Hama Penyakit'))
  activities.push(createActivity(43, 'Pengaplikasian Pestisida', 14, 100, null, parseDate('15-Dec-2025'), parseDate('11-Mar-2026'), '', 'Crop Care', 'Pengendalian Hama Penyakit', 'Pengendalian Hama Penyakit'))

  // Harvest - Forecasting Panen
  activities.push(createActivity(44, 'Forecasting Panen', 86, 97, 11, parseDate('25-Feb-2026'), parseDate('8-Mar-2026'), '', 'Harvest', 'Forecasting Panen'))
  activities.push(createActivity(45, 'Sampling Ubinan', 86, 96, 10, parseDate('25-Feb-2026'), parseDate('7-Mar-2026'), '', 'Harvest', 'Forecasting Panen', 'Forecasting Panen'))
  activities.push(createActivity(46, 'Perhitungan Estimasi Hasil', 87, 97, 10, parseDate('26-Feb-2026'), parseDate('8-Mar-2026'), '', 'Harvest', 'Forecasting Panen', 'Forecasting Panen'))

  // Harvest - Panen
  activities.push(createActivity(47, 'Panen', 99, 110, 11, parseDate('10-Mar-2026'), parseDate('21-Mar-2026'), '', 'Harvest', 'Panen'))
  activities.push(createActivity(48, 'Persiapan Combine Harvester', 99, 109, 10, parseDate('10-Mar-2026'), parseDate('20-Mar-2026'), '', 'Harvest', 'Panen', 'Panen'))
  activities.push(createActivity(49, 'Pemanenan', 100, 110, 10, parseDate('11-Mar-2026'), parseDate('21-Mar-2026'), '', 'Harvest', 'Panen', 'Panen'))
  activities.push(createActivity(50, 'Perhitungan Hasil Panen', 100, 110, 10, parseDate('11-Mar-2026'), parseDate('21-Mar-2026'), '', 'Harvest', 'Panen', 'Panen'))
  activities.push(createActivity(51, 'Pemindahan Hasil Panen ke Gudang', 100, 110, 10, parseDate('11-Mar-2026'), parseDate('21-Mar-2026'), '', 'Harvest', 'Panen', 'Panen'))

  // Planting Prep - Rehabilitasi Lahan
  activities.push(createActivity(52, 'Rehabilitasi Lahan', 105, 126, 21, parseDate('16-Mar-2026'), parseDate('6-Apr-2026'), '', 'Planting Prep', 'Rehabilitasi Lahan'))
  activities.push(createActivity(53, 'Pengambilan Sampel Tanah', 105, 115, 10, parseDate('16-Mar-2026'), parseDate('26-Mar-2026'), '', 'Planting Prep', 'Rehabilitasi Lahan', 'Rehabilitasi Lahan'))
  activities.push(createActivity(54, 'Analisis Tanah', 111, 116, 5, parseDate('22-Mar-2026'), parseDate('27-Mar-2026'), '', 'Planting Prep', 'Rehabilitasi Lahan', 'Rehabilitasi Lahan'))
  activities.push(createActivity(55, 'Aplikasi Pembenah Tanah', 121, 126, 5, parseDate('1-Apr-2026'), parseDate('6-Apr-2026'), '', 'Planting Prep', 'Rehabilitasi Lahan', 'Rehabilitasi Lahan'))

  // RnD
  activities.push(createActivity(57, 'Analisis Praktik dan Varietas serta Evaluasi Produksi', 110, 120, null, parseDate('21-Mar-2026'), parseDate('31-Mar-2026'), '', 'RnD', 'RnD'))
  activities.push(createActivity(58, 'Pembuatan Rekomendasi Musim Tanam Selanjutnya', 120, 130, null, parseDate('31-Mar-2026'), parseDate('10-Apr-2026'), '', 'RnD', 'RnD'))

  return {
    id: 'default_template',
    name: 'Template Standar Cultivation Padi',
    description: 'Template lengkap untuk cultivation padi dengan semua aktivitas standar',
    activities,
    plantingDate,
    createdAt: new Date().toISOString()
  }
}

