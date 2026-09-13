const LOGO: Record<string, string> = { AWS: "/logos/aws.svg", GCP: "/logos/gcp.svg", Azure: "/logos/azure.svg" };

/** Official cloud-provider logo mark, used in the icon squares across the app. */
export function ProviderMark({ provider, size = 22 }: { provider: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={LOGO[provider] ?? "/logos/aws.svg"} alt={provider} style={{ width: size, height: size, objectFit: "contain", display: "block" }} />
  );
}

/** The UNDER wordmark. Black by default; pass `light` to render white (over the video hero). */
export function Logo({ height = 17, light = false }: { height?: number; light?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/under.png"
      alt="Under"
      style={{ height, width: "auto", display: "block", filter: light ? "invert(1)" : "none" }}
    />
  );
}
