import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default function Page() {
  // Google Maps のキーはサーバー側で実行時に読む（ビルドし直さずに切り替えられる）
  const googleApiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    "";
  const googleMapId =
    process.env.GOOGLE_MAPS_MAP_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ||
    "DEMO_MAP_ID";

  return <AppShell googleApiKey={googleApiKey} googleMapId={googleMapId} />;
}
