import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import StudentDashboard from "./student-dashboard";

export default async function StudentHome() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <StudentDashboard name={session.name} />;
}
