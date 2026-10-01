import { Route, Routes } from 'react-router-dom'

import { OrganizerLayout } from '@/components/organizer-layout'
import { ProtectedRoute } from '@/components/protected-route'
import { PublicLayout } from '@/components/public-layout'
import { EventCatalogPage } from '@/pages/event-catalog-page'
import { EventDetailPage } from '@/pages/event-detail-page'
import { ForbiddenPage } from '@/pages/forbidden-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { OrganizerEventDashboardPage } from '@/pages/organizer-event-dashboard-page'
import { OrganizerEventFormPage } from '@/pages/organizer-event-form-page'
import { OrganizerHomePage } from '@/pages/organizer-home-page'
import { OrganizerLoginPage } from '@/pages/organizer-login-page'
import { OrganizerScanPage } from '@/pages/organizer-scan-page'
import { TicketPage } from '@/pages/ticket-page'

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<EventCatalogPage />} />
        <Route path="events/:slug" element={<EventDetailPage />} />
        <Route path="tickets/:ticketToken" element={<TicketPage />} />
        <Route path="403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="organizer/login" element={<OrganizerLoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<OrganizerLayout />}>
          <Route path="organizer" element={<OrganizerHomePage />} />
          <Route path="organizer/scan" element={<OrganizerScanPage />} />
          <Route path="organizer/events/new" element={<OrganizerEventFormPage />} />
          <Route
            path="organizer/events/:slug"
            element={<OrganizerEventDashboardPage />}
          />
          <Route
            path="organizer/events/:slug/edit"
            element={<OrganizerEventFormPage />}
          />
          <Route path="organizer/*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
