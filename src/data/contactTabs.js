import {
  FileText,
  Share2,
  TrendingUp,
  ClipboardList,
  BookOpen,
  CalendarClock,
  Folder,
  PackageCheck,
} from 'lucide-react'

export const CONTACT_TABS = [
  {
    key: 'case-notes',
    label: 'Case Notes',
    icon: FileText,
    emptyTitle: 'No case notes yet',
    emptyText: 'Notes logged by staff for this contact will appear here.',
  },
  {
    key: 'referrals',
    label: 'Referrals',
    icon: Share2,
    emptyTitle: 'No referrals yet',
    emptyText: 'Referrals sent or received for this contact will be tracked here.',
  },
  {
    key: 'goals-outcomes',
    label: 'Goals & Outcomes',
    icon: TrendingUp,
    emptyTitle: 'No goals set yet',
    emptyText: 'Goals and outcome tracking for this contact will appear here.',
  },
  {
    key: 'staff-register',
    label: 'Staff Register',
    icon: ClipboardList,
    emptyTitle: 'No staff assigned yet',
    emptyText: 'Staff members responsible for this contact will be listed here.',
  },
  {
    key: 'programs',
    label: 'Programs',
    icon: BookOpen,
    emptyTitle: 'Not enrolled in any programs',
    emptyText: 'Programs this contact is enrolled in will appear here.',
  },
  {
    key: 'follow-ups',
    label: 'Follow Ups',
    icon: CalendarClock,
    emptyTitle: 'No follow-ups scheduled',
    emptyText: 'Upcoming and completed follow-ups will be tracked here.',
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: Folder,
    emptyTitle: 'No documents uploaded',
    emptyText: 'Files and documents related to this contact will appear here.',
  },
  {
    key: 'service-delivery',
    label: 'Service Delivery',
    icon: PackageCheck,
    emptyTitle: 'No services delivered yet',
    emptyText: 'A record of services delivered to this contact will appear here.',
  },
]
