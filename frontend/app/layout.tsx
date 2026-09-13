import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Under, the secondary market for cloud commitments",
  description:
    "Sell the cloud spend you won't use on a Uniswap v4 pool whose price follows the time left to spend it. Sellers are verified with ENSv2 and World Selfie Check.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
