import { Route, Routes } from 'react-router-dom'

import { PublicLayout } from '@/components/public-layout'
import { EventCatalogPage } from '@/pages/event-catalog-page'
import { EventDetailPage } from '@/pages/event-detail-page'
import { TicketPage } from '@/pages/ticket-page'

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<EventCatalogPage />} />
        <Route path="events/:slug" element={<EventDetailPage />} />
        <Route path="tickets/:ticketToken" element={<TicketPage />} />
      </Route>
    </Routes>
  )
}

export default App
