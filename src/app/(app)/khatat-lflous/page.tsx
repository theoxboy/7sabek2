import type { Metadata } from "next";
import KhatatLflousClient from "./KhatatLflousClient";

export const metadata: Metadata = {
  title: "خطة الفلوس | حسابك",
  description: "التوجيه، الأظرفة، والإعدادات الذكية ديال الفلوس ديالك.",
};

export default function KhatatLflousPage() {
  return <KhatatLflousClient />;
}
