import { ConvexProvider, ConvexReactClient } from "convex/react"
import SuccessPage from './components/SuccessPage.tsx'

// Only the payment success page talks to Convex, so the client loads with this route
// instead of on the landing page.
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

export default function SuccessRoute() {
  return (
    <ConvexProvider client={convex}>
      <SuccessPage />
    </ConvexProvider>
  )
}
