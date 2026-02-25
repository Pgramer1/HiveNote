// University configuration
// Add new universities here with their email domains and department structure

export type UniversityConfig = {
  id: string;
  name: string;
  displayName: string;
  emailDomains: string[];
  departments: {
    code: string;
    name: string;
    description: string;
  }[];
  batches: {
    code: string;
    years: string;
  }[];
};

export const UNIVERSITIES: Record<string, UniversityConfig> = {
  'adani': {
    id: 'adani',
    name: 'Adani University',
    displayName: 'Adani University',
    emailDomains: ['adaniuni.ac.in'],
    departments: [
      { 
        code: 'CSE', 
        name: 'Computer Science & Engineering',
        description: 'Software, AI, and Computing'
      },
      { 
        code: 'ICT', 
        name: 'Information & Communication Technology',
        description: 'Networks, Communication & IT'
      },
      { 
        code: 'CIE', 
        name: 'Computer & Internet Engineering',
        description: 'Internet Tech & Systems'
      },
    ],
    batches: [
      { code: '28', years: '2024-2028' },
      { code: '27', years: '2023-2027' },
      { code: '26', years: '2022-2026' },
      { code: '25', years: '2021-2025' },
    ],
  },
  
  // Example: Add more universities here
  // 'iit-delhi': {
  //   id: 'iit-delhi',
  //   name: 'IIT Delhi',
  //   displayName: 'Indian Institute of Technology, Delhi',
  //   emailDomains: ['iitd.ac.in'],
  //   departments: [
  //     { code: 'CSE', name: 'Computer Science & Engineering', description: 'CS & AI' },
  //     { code: 'EE', name: 'Electrical Engineering', description: 'Electronics & Communication' },
  //   ],
  //   batches: [
  //     { code: '24', years: '2024-2028' },
  //     { code: '23', years: '2023-2027' },
  //   ],
  // },
};

/**
 * Detect which university an email belongs to
 */
export function detectUniversityFromEmail(email: string): UniversityConfig | null {
  const emailLower = email.toLowerCase();
  
  for (const university of Object.values(UNIVERSITIES)) {
    for (const domain of university.emailDomains) {
      if (emailLower.endsWith(domain)) {
        return university;
      }
    }
  }
  
  return null;
}

/**
 * Check if an email is from any registered university
 */
export function isUniversityEmail(email: string): boolean {
  return detectUniversityFromEmail(email) !== null;
}

/**
 * Get university configuration by ID
 */
export function getUniversityById(id: string): UniversityConfig | null {
  return UNIVERSITIES[id] || null;
}

/**
 * Get all registered universities
 */
export function getAllUniversities(): UniversityConfig[] {
  return Object.values(UNIVERSITIES);
}
