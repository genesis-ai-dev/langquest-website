import { DatabaseViewer } from "@/components/database-viewer";
import { Suspense } from "react";

export default function Database() {
  return (
    <Suspense>
      <DatabaseViewer />
    </Suspense>
  );
}
