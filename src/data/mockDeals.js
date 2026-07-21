export const DEAL_STAGES = [
  { key: 'new', label: 'New' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'negotiation', label: 'Negotiation' },
  { key: 'won', label: 'Won' },
  { key: 'lost', label: 'Lost' },
]

export const mockDeals = [
  { id: 1, title: 'Wellness Program Sponsorship', company: 'Northside Community Health', value: 18000, stage: 'new', closeDate: '2026-08-15', owner: 'JD' },
  { id: 2, title: 'Annual Supply Contract', company: 'Rivermill Foods', value: 42000, stage: 'new', closeDate: '2026-08-28', owner: 'AR' },
  { id: 3, title: 'Youth Mentoring Grant', company: 'Bright Futures Youth Foundation', value: 25000, stage: 'qualified', closeDate: '2026-09-05', owner: 'JD' },
  { id: 4, title: 'Legal Services Retainer', company: 'Northgate Legal Aid', value: 12000, stage: 'qualified', closeDate: '2026-08-20', owner: 'MK' },
  { id: 5, title: 'Wellness Centre Partnership', company: 'Cascade Wellness Centre', value: 30000, stage: 'proposal', closeDate: '2026-09-12', owner: 'AR' },
  { id: 6, title: 'Realty Referral Agreement', company: 'Palm & Pine Realty', value: 8000, stage: 'proposal', closeDate: '2026-08-30', owner: 'JD' },
  { id: 7, title: 'Corporate Volunteering Package', company: 'Ironbridge Systems', value: 15000, stage: 'negotiation', closeDate: '2026-08-18', owner: 'MK' },
  { id: 8, title: 'Facilities Lease Renewal', company: 'Fenwick & Co', value: 60000, stage: 'negotiation', closeDate: '2026-09-01', owner: 'AR' },
  { id: 9, title: 'Community Health Grant', company: 'Northside Community Health', value: 20000, stage: 'won', closeDate: '2026-07-10', owner: 'JD' },
  { id: 10, title: 'Employment Services Contract', company: 'Vantage Freight', value: 27000, stage: 'won', closeDate: '2026-06-28', owner: 'MK' },
  { id: 11, title: 'Media Sponsorship Package', company: 'Corsair Media Group', value: 10000, stage: 'lost', closeDate: '2026-07-02', owner: 'AR' },
]
