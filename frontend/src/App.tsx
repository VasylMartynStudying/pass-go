import { Route, Routes } from 'react-router-dom'

import { OrganizerLayout } from '@/components/organizer-layout'
import { ProtectedRoute } from '@/components/protected-route'
import { PublicLayout } from '@/components/public-layout'
import { EventCatalogPage } from '@/pages/event-catalog-page'
import { EventDetailPage } from '@/pages/event-detail-page'
import { OrganizerHomePage } from '@/pages/organizer-home-page'
import { OrganizerLoginPage } from '@/pages/organizer-login-page'
import { TicketPage } from '@/pages/ticket-page'

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<EventCatalogPage />} />
        <Route path="events/:slug" element={<EventDetailPage />} />
        <Route path="tickets/:ticketToken" element={<TicketPage />} />
      </Route>
      <Route path="organizer/login" element={<OrganizerLoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<OrganizerLayout />}>
          <Route path="organizer" element={<OrganizerHomePage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
