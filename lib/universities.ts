// lib/universities.ts
// Single source of truth for supported universities — mirrored in the backend
// at Constants/Universities.cs (same codes, domains, campus names/coords).
// Update BOTH files together if this list changes.

export interface Campus {
  name: string
  lat: number
  lng: number
}

export interface University {
  code: string          // "LAU" — stored on User.University
  name: string           // "Lebanese American University"
  emailDomains: string[] // domain endings that count as a match; [] = always allowed (OTHER)
  campuses: Campus[]
}

export const UNIVERSITIES: University[] = [
  {
    code: 'LAU', name: 'Lebanese American University', emailDomains: ['lau.edu'],
    campuses: [
      { name: 'LAU Beirut Campus', lat: 33.8925, lng: 35.4772 },
      { name: 'LAU Byblos Campus', lat: 34.1090, lng: 35.6520 },
    ],
  },
  {
    code: 'AUB', name: 'American University of Beirut', emailDomains: ['aub.edu', 'mail.aub.edu'],
    campuses: [
      { name: 'AUB Beirut Campus', lat: 33.9008, lng: 35.4823 },
    ],
  },
  {
    code: 'LIU', name: 'Lebanese International University', emailDomains: ['liu.edu.lb', 'students.liu.edu.lb'],
    campuses: [
      { name: 'LIU Beirut Campus', lat: 33.8715, lng: 35.5100 },
      { name: 'LIU Saida Campus', lat: 33.5580, lng: 35.3870 },
      { name: 'LIU Nabatieh Campus', lat: 33.3780, lng: 35.4840 },
      { name: 'LIU Tripoli Campus', lat: 34.4330, lng: 35.8440 },
      { name: 'LIU Bekaa Campus', lat: 33.8460, lng: 35.9020 },
    ],
  },
  {
    code: 'LU', name: 'Lebanese University', emailDomains: ['ul.edu.lb', 'st.ul.edu.lb'],
    campuses: [
      { name: 'LU Hadath Campus', lat: 33.8280, lng: 35.5310 },
      { name: 'LU Tripoli Campus', lat: 34.4250, lng: 35.8330 },
    ],
  },
  {
    code: 'BAU', name: 'Beirut Arab University', emailDomains: ['bau.edu.lb', 'student.bau.edu.lb'],
    campuses: [
      { name: 'BAU Beirut Campus', lat: 33.8735, lng: 35.5060 },
      { name: 'BAU Tripoli Campus', lat: 34.4210, lng: 35.8290 },
      { name: 'BAU Debbieh Campus', lat: 33.6410, lng: 35.4830 },
    ],
  },
  {
    code: 'USJ', name: 'Université Saint-Joseph', emailDomains: ['usj.edu.lb', 'net.usj.edu.lb'],
    campuses: [
      { name: 'USJ Campus des sciences humaines', lat: 33.8790, lng: 35.5150 },
    ],
  },
  {
    code: 'NDU', name: 'Notre Dame University', emailDomains: ['ndu.edu.lb'],
    campuses: [
      { name: 'NDU Zouk Mosbeh Campus', lat: 33.9790, lng: 35.6180 },
    ],
  },
  {
    code: 'USEK', name: 'Holy Spirit University of Kaslik', emailDomains: ['usek.edu.lb', 'net.usek.edu.lb'],
    campuses: [
      { name: 'USEK Kaslik Campus', lat: 33.9790, lng: 35.6280 },
    ],
  },
  {
    code: 'OTHER', name: 'Other university', emailDomains: [],
    campuses: [],
  },
]

export function findUniversity(code?: string | null): University | undefined {
  return UNIVERSITIES.find(u => u.code === code)
}

// Case-insensitive, subdomain-aware match: "students.liu.edu.lb" matches "liu.edu.lb".
export function emailMatchesUniversity(email: string, code: string): boolean {
  const uni = findUniversity(code)
  if (!uni || uni.emailDomains.length === 0) return true // OTHER / unknown — no domain check
  const domain = email.split('@')[1]?.toLowerCase().trim()
  if (!domain) return false
  return uni.emailDomains.some(d => domain === d.toLowerCase() || domain.endsWith('.' + d.toLowerCase()))
}

// Given an email, find the first university whose domain list matches — used
// for the register page's live "matches your email domain" hint.
export function universityFromEmail(email: string): University | undefined {
  const domain = email.split('@')[1]?.toLowerCase().trim()
  if (!domain) return undefined
  return UNIVERSITIES.find(u => u.emailDomains.some(d => domain === d.toLowerCase() || domain.endsWith('.' + d.toLowerCase())))
}

// All campuses across all universities, each tagged with its owning code —
// used by MapPicker to render every pin regardless of the picker's own user.
export function allCampuses(): Array<Campus & { universityCode: string }> {
  return UNIVERSITIES.flatMap(u => u.campuses.map(c => ({ ...c, universityCode: u.code })))
}
