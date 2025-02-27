"use client";

import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { createClient, AuthError } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";
import { env } from "@/lib/env";

// This is the main page component (server component)
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center my-5">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

// This is the client component with all our existing logic
function ResetPasswordForm() {
  const [message, setMessage] = useState("Redirecting to LangQuest app...");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const searchParams = useSearchParams();

  // Initialize Supabase client
  const supabaseClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const isMobile = () => {
    if (typeof window === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  const handlePasswordReset = useCallback(async () => {
    // Get tokens from URL and hash
    const access_token =
      searchParams.get("access_token") ||
      window.location.hash.match(/access_token=([^&]*)/)?.[1];
    const refresh_token =
      searchParams.get("refresh_token") ||
      window.location.hash.match(/refresh_token=([^&]*)/)?.[1];
    const type =
      searchParams.get("type") ||
      window.location.hash.match(/type=([^&]*)/)?.[1];

    if (isMobile()) {
      // Mobile deep linking
      const deepLink = `langquest://reset-password#access_token=${access_token}&refresh_token=${refresh_token}&type=${type}`;
      const playStoreUrl =
        "https://play.google.com/store/apps/details?id=com.etengenesis.langquest";

      const now = Date.now();
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = deepLink;
      document.body.appendChild(iframe);

      setTimeout(() => {
        if (Date.now() - now < 3000) {
          window.location.href = playStoreUrl;
        }
      }, 2000);

      window.location.href = deepLink;
    } else {
      try {
        const { error: sessionError } = await supabaseClient.auth.setSession({
          access_token: access_token!,
          refresh_token: refresh_token!
        });

        if (sessionError) throw sessionError;

        setShowForm(true);
        setMessage("");
      } catch (error: unknown) {
        console.error("Error setting session:", error);
        setMessage(
          "Error: Invalid or expired reset link. Please request a new password reset."
        );
        setError("red");
      }
    }
  }, [searchParams, supabaseClient]);

  useEffect(() => {
    handlePasswordReset();
  }, [handlePasswordReset, searchParams]);

  const submitNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const password = (form.elements.namedItem("password") as HTMLInputElement)
      .value;

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setMessage(
        "Password successfully updated! You can now close this window and log in to the app."
      );
      setShowForm(false);
    } catch (error: unknown) {
      console.error("Error updating password:", error);
      if (error instanceof Error || error instanceof AuthError) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred");
      }
    }
  };

  return (
    <div className="container mx-auto px-4">
      {message && (
        <div
          id="message"
          className={`text-center my-5 ${error ? "text-red-500" : ""}`}
        >
          {message}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submitNewPassword}
          className="max-w-md mx-auto my-10 p-5"
        >
          <h2 className="text-2xl font-bold mb-5">Reset Your Password</h2>
          <input
            type="password"
            name="password"
            className="w-full p-2 mb-2 border rounded"
            placeholder="Enter new password"
            required
          />
          <button
            type="submit"
            className="w-full p-2 mt-4 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reset Password
          </button>
          {error && <div className="text-red-500 mt-2">{error}</div>}
        </form>
      )}
    </div>
  );
}
