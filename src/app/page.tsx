import { createClient } from "@/backend/database/server";
import LandingPage from "@/frontend/components/LandingPage";
import Dashboard from "@/frontend/components/Dashboard";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LandingPage />;
  }

  return <Dashboard userId={user.id} />;
}
