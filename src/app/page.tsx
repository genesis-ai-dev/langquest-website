import { DatabaseViewer } from "@/components/database-viewer";
import type { Metadata } from "next";
import Link from "next/link";

export default function Home() {
  return (
    <main className="container mx-auto mt-44 px-4 text-center bg-background">
      <svg height="100" width="100" className="mx-auto">
        <circle
          cx="50"
          cy="50"
          r="31"
          stroke="#679b08"
          strokeWidth="9.5"
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r="6"
          stroke="#679b08"
          strokeWidth="1"
          fill="#679b08"
        />
        <line
          x1="50"
          y1="50"
          x2="35"
          y2="50"
          stroke="#679b08"
          strokeWidth="6"
        />
        <line
          x1="65"
          y1="35"
          x2="50"
          y2="50"
          stroke="#679b08"
          strokeWidth="6"
        />
        <path d="M59 65 L83 65 L75 87 Z" fill="#679b08" />
        <rect width="20" height="9" x="70" y="56" fill="#eee" strokeWidth="0" />
      </svg>

      <div>
        <h1 className="text-5xl font-light mb-5">
          Future home of something quite cool, in next.js.
        </h1>
        <p className="text-xl font-light mb-5">
          If you&apos;re the <strong>site owner</strong>,{" "}
          <a href="/cpanel" className="text-blue-500">
            log in
          </a>{" "}
          to launch this site
        </p>
        <p className="text-xl font-light">
          <Link href="/database" className="text-blue-500">
            View all of our data
          </Link>
        </p>
      </div>
    </main>
  );
}
