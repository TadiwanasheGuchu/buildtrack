import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, LifeBuoy, Mail, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/NotificationBell'

interface FaqItem {
  q: string
  a: string
}

interface FaqSection {
  category: string
  icon: string
  items: FaqItem[]
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    category: 'Projects & Milestones',
    icon: 'folder_open',
    items: [
      {
        q: 'How do I create a project?',
        a: 'Go to Projects in the sidebar and click "New Project". Fill in the name, location, status, budget, and start/end dates, then click Create Project. You can edit any of these later from the project page using the Edit button.',
      },
      {
        q: 'How does project progress work?',
        a: 'Progress is calculated automatically from milestones: it\'s the percentage of milestones marked complete. Add milestones in the Milestones tab of a project, and tick them off as work finishes — the progress bar updates everywhere instantly.',
      },
      {
        q: 'What do the project statuses mean?',
        a: 'Planning — not yet on site. Active — work in progress. On Hold — temporarily paused. Delayed — behind schedule and needs attention (shows on the dashboard attention count). Completed — handed over.',
      },
      {
        q: 'Can I delete a project?',
        a: 'Yes — open the project and click Delete. This permanently removes the project along with its milestones, budget data, punch items, documents, site logs, and feed posts. Equipment, materials, and vehicles assigned to it are kept and become unassigned.',
      },
    ],
  },
  {
    category: 'Budget & Costs',
    icon: 'payments',
    items: [
      {
        q: 'How do I track spending against a budget?',
        a: 'Open a project and go to the Budget tab. Use "Edit Allocations" to split the project budget across categories (Labour, Materials, Equipment, Subcontractors, Permits & Fees, Other), then log each expense with "Log Cost". The summary cards and category bars show spend vs budget in real time.',
      },
      {
        q: 'What happens when a project goes over budget?',
        a: 'The moment a cost entry pushes total spend past the project budget, everyone in the company gets a notification, and the project shows in red on the Reports page. The warning fires once — you won\'t be spammed on every entry afterwards.',
      },
      {
        q: 'Where can I see company-wide spend?',
        a: 'The Executive Dashboard has a Budget Overview widget with totals across all projects, and the Reports page breaks down budget utilisation per project with export options.',
      },
    ],
  },
  {
    category: 'Site Operations',
    icon: 'engineering',
    items: [
      {
        q: 'What are daily site logs?',
        a: 'A structured daily diary per project: date, weather, temperature, crew count, work completed, materials delivered, issues, and safety notes. Find them in the Site Logs tab of a project. They\'re exportable as CSV from the Reports page.',
      },
      {
        q: 'How do punch lists work?',
        a: 'Punch items track snags and defects. Each has a priority (Low to Critical), a status (Open, In Progress, Resolved), and can be assigned to a team member with a due date. Assignees get notified, and the creator is notified when their item is resolved.',
      },
      {
        q: 'How do I post a site update with photos?',
        a: 'Use "Post Update" on the Site Feed page (or the Feed tab inside a project). Attach the update to a project, write up to 1000 characters, and optionally add a photo. Everyone in the company sees it in the feed and gets a notification.',
      },
      {
        q: 'How do I store project documents?',
        a: 'The Documents tab in each project accepts PDFs, images, and other files up to 20MB. Tag each upload with a category (drawings, contracts, permits, etc.) so they\'re easy to filter and download later.',
      },
    ],
  },
  {
    category: 'Resources & Fleet',
    icon: 'local_shipping',
    items: [
      {
        q: 'How do I manage equipment, materials, and vehicles?',
        a: 'Resources & Logistics in the sidebar has three tabs: Equipment (with Available / In Use / Maintenance status), Materials (with quantities and units), and Fleet (vehicles with plates and drivers). Each item can be assigned to a project or left unassigned.',
      },
      {
        q: 'What happens to resources when their project is deleted?',
        a: 'They aren\'t deleted — they simply become unassigned and stay in your inventory, ready to be assigned to another project.',
      },
    ],
  },
  {
    category: 'Team & Account',
    icon: 'group',
    items: [
      {
        q: 'How do I invite someone to my company?',
        a: 'Go to Team in the sidebar and click "Invite Member" (owners only). Enter their email and role — they\'ll receive an email link valid for 7 days. When they accept and set a password, the whole team is notified.',
      },
      {
        q: 'What can each role do?',
        a: 'Owner — full control, including team management and company settings. Site Manager — day-to-day project management. Worker — site-level updates. Client — reserved for the upcoming read-only client portal.',
      },
      {
        q: 'How do I change my name, photo, or password?',
        a: 'Click your name at the bottom of the sidebar and choose "Profile settings". You can update your name, upload a profile photo, and change your password there.',
      },
      {
        q: 'How do I rename my company?',
        a: 'Owners can rename the company under "Company settings" in the sidebar profile menu. The new name appears for everyone.',
      },
    ],
  },
  {
    category: 'Reports & Notifications',
    icon: 'monitoring',
    items: [
      {
        q: 'What\'s on the Reports page?',
        a: 'Portfolio-level analytics: budget utilisation, milestone completion and on-time rate, open punch items, and a per-project breakdown table. You can export the portfolio summary as CSV, export per-project data (milestones, costs, punch list, site logs), or print to PDF.',
      },
      {
        q: 'When do I get notifications?',
        a: 'The bell shows alerts for: new site updates, completed milestones, punch items assigned to you or resolved, projects going over budget, and new team members joining. Click a notification to jump to the related project. The badge refreshes every minute.',
      },
      {
        q: 'How do I export data?',
        a: 'On the Reports page, the Export CSV button downloads the portfolio summary, and each project row has a download menu for milestones, cost entries, punch list, or site logs. Use Print / PDF for a printable report.',
      },
    ],
  },
]

const QUICK_LINKS = [
  { label: 'Create a project', to: '/projects/new', icon: 'add_business' },
  { label: 'Invite your team', to: '/settings/team', icon: 'person_add' },
  { label: 'Post a site update', to: '/site-feed', icon: 'photo_camera' },
  { label: 'View reports', to: '/reports', icon: 'monitoring' },
]

function FaqRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-outline-variant last:border-b-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-3.5 text-left group"
        aria-expanded={open}
      >
        <span className="text-label-md font-medium text-on-surface group-hover:text-primary transition-colors">
          {item.q}
        </span>
        <ChevronDown className={`w-4 h-4 text-on-surface-variant shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="text-body-md text-on-surface-variant pb-4 pr-8 leading-relaxed">{item.a}</p>
      )}
    </div>
  )
}

export default function HelpCenter() {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const sections = q
    ? FAQ_SECTIONS.map(s => ({
        ...s,
        items: s.items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)),
      })).filter(s => s.items.length > 0)
    : FAQ_SECTIONS

  return (
    <div className="p-gutter lg:p-margin-desktop flex flex-col gap-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg text-foreground">Help Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Answers to common questions about TerraConstruct</p>
        </div>
        <NotificationBell />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search help topics…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Quick links */}
      {!q && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant hover:border-primary hover:shadow-warm transition-all text-center"
            >
              <span className="material-symbols-outlined text-primary text-[28px]">{link.icon}</span>
              <span className="text-label-md font-medium text-on-surface">{link.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* FAQ sections */}
      {sections.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center text-on-surface-variant">
          <LifeBuoy className="w-10 h-10 mb-3" />
          <p className="text-body-md">No help topics match “{query.trim()}”</p>
          <p className="text-sm mt-1">Try a different keyword, or contact support below.</p>
        </div>
      ) : (
        sections.map(section => (
          <Card key={section.category}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="material-symbols-outlined text-primary">{section.icon}</span>
                <h2 className="font-bold text-on-surface text-label-md">{section.category}</h2>
              </div>
              {section.items.map(item => (
                <FaqRow key={item.q} item={item} />
              ))}
            </CardContent>
          </Card>
        ))
      )}

      {/* Contact */}
      <Card className="bg-primary-container/20 border-primary/20">
        <CardContent className="pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <LifeBuoy className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-on-surface text-label-md">Still stuck?</h2>
              <p className="text-body-md text-on-surface-variant mt-0.5">
                Email us and we'll get back to you within one business day.
              </p>
            </div>
          </div>
          <Button asChild>
            <a href="mailto:support@terraconstruct.app?subject=TerraConstruct%20support%20request">
              <Mail className="w-4 h-4 mr-2" />
              Contact support
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
