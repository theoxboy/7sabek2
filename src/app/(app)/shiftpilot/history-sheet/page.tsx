import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ShiftPilotHistorySheetEntryPage() {
  const cookieStore = await cookies();
  const hasAccessToken = Boolean(cookieStore.get("access_token")?.value);
  const hasSuperadminSession = Boolean(
    cookieStore.get("superadmin_session_token")?.value
  );

  if (!hasAccessToken) {
    redirect("/login");
  }

  if (hasSuperadminSession) {
    redirect("/superadmin/shiftpilot/history-sheet");
  }

  redirect("/dashboard");
}
