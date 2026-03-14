"use client";

import { LogOut, ShieldCheck, UserRound, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return digits;
}

function formatPhoneNumber(value: string) {
  const phone = normalizePhoneNumber(value);

  if (phone.length !== 10) {
    return value;
  }

  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

function maskPhoneNumber(value: string) {
  const phone = normalizePhoneNumber(value);

  if (phone.length !== 10) {
    return value;
  }

  return `+91 ${phone.slice(0, 2)}XXXX${phone.slice(-4)}`;
}

export function AuthModal() {
  const { user, isAuthOpen, authIntent, closeAuth, login, logout } = useAuth();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [submittedName, setSubmittedName] = useState("");
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [requestId, setRequestId] = useState("");
  const [otpLength, setOtpLength] = useState(4);
  const [resendAvailableAt, setResendAvailableAt] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    if (!isAuthOpen) {
      setStep("details");
      setName("");
      setPhone("");
      setOtp("");
      setSubmittedName("");
      setSubmittedPhone("");
      setRequestId("");
      setOtpLength(4);
      setResendAvailableAt("");
      setIsSendingOtp(false);
      setIsVerifyingOtp(false);
      setClock(Date.now());
      setErrorMessage("");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAuthOpen]);

  useEffect(() => {
    if (!isAuthOpen || step !== "otp") {
      return;
    }

    const intervalId = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [isAuthOpen, step]);

  const title = useMemo(() => {
    if (user) {
      return "Your account";
    }

    return authIntent === "checkout" ? "Sign in to continue" : "Create your QuickBasket account";
  }, [authIntent, user]);

  const description = useMemo(() => {
    if (user) {
      return "You are signed in and your profile is stored as a WooCommerce customer.";
    }

    return authIntent === "checkout"
      ? "Enter your name and phone number first. After OTP verification, we will create or update your WooCommerce customer profile."
      : "Use your name and mobile number to sign in quickly before ordering groceries.";
  }, [authIntent, user]);

  const resendRemainingSeconds = useMemo(() => {
    if (!resendAvailableAt) {
      return 0;
    }

    const availableAt = new Date(resendAvailableAt).getTime();
    return Math.max(0, Math.ceil((availableAt - clock) / 1000));
  }, [clock, resendAvailableAt]);

  const requestOtp = async (nextName: string, nextPhone: string) => {
    setIsSendingOtp(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: nextName,
          phone: nextPhone
        })
      });

      const result = (await response.json()) as {
        error?: string;
        requestId?: string;
        otpLength?: number;
        resendAvailableAt?: string;
      };

      if (!response.ok || !result.requestId) {
        setErrorMessage(result.error ?? "We could not send the OTP right now.");
        return false;
      }

      setSubmittedName(nextName);
      setSubmittedPhone(nextPhone);
      setRequestId(result.requestId);
      setOtpLength(result.otpLength ?? 4);
      setResendAvailableAt(result.resendAvailableAt ?? "");
      setClock(Date.now());
      setOtp("");
      setStep("otp");
      return true;
    } catch {
      setErrorMessage("We could not connect to the OTP service. Try again.");
      return false;
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const isAlphaName = /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(trimmedName);
    const normalizedPhone = normalizePhoneNumber(phone);

    if (trimmedName.length < 2 || !isAlphaName) {
      setErrorMessage("Enter a valid full name using alphabets only.");
      return;
    }

    if (normalizedPhone.length !== 10) {
      setErrorMessage("Enter a valid 10-digit mobile number.");
      return;
    }

    await requestOtp(trimmedName, normalizedPhone);
  };

  const handleResendOtp = async () => {
    if (!submittedName || !submittedPhone || resendRemainingSeconds > 0) {
      return;
    }

    await requestOtp(submittedName, submittedPhone);
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!requestId) {
      setErrorMessage("Please request a new OTP and try again.");
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          requestId,
          phone: submittedPhone,
          otp: otp.trim()
        })
      });

      const result = (await response.json()) as {
        error?: string;
        user?: {
          id: number;
          name: string;
          phone: string;
          email: string;
        };
        token?: string;
      };

      if (!response.ok || !result.user) {
        setErrorMessage(result.error ?? "We could not verify your account right now.");
        return;
      }

      login(result.user, result.token ?? null);
    } catch {
      setErrorMessage("We could not connect to WooCommerce. Try again.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  if (!isAuthOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        onClick={closeAuth}
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
      />

      <section className="surface-panel relative z-10 w-full max-w-md overflow-hidden p-6 shadow-2xl">
        <button
          type="button"
          onClick={closeAuth}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-line bg-white text-slate-600 transition hover:border-brand-green hover:text-brand-green"
          aria-label="Close authentication modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-12">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-yellow/90 text-brand-ink">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-brand-ink">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>

        {user ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-md border border-brand-line bg-brand-mint/50 p-4">
              <p className="text-xs text-slate-500">Signed in as</p>
              <p className="mt-1 text-lg font-bold text-brand-ink">{user.name}</p>
              <p className="mt-1 text-sm font-medium text-slate-600">{formatPhoneNumber(user.phone)}</p>
              {user.email ? <p className="mt-1 text-xs text-slate-500">{user.email}</p> : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeAuth}
                className="inline-flex items-center justify-center rounded-md border border-brand-line px-4 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-green hover:text-brand-green"
              >
                Continue shopping
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </div>
        ) : step === "details" ? (
          <form className="mt-6 space-y-4" onSubmit={handleSendOtp}>
            <label className="block">
              <span className="text-sm font-medium text-brand-ink">Full name</span>
              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                      .replace(/[^A-Za-z ]/g, "")
                      .replace(/\s+/g, " ")
                  )
                }
                className="mt-2 h-12 w-full rounded-md border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                placeholder="Enter your full name"
                autoComplete="name"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-brand-ink">Phone number</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                className="mt-2 h-12 w-full rounded-md border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                placeholder="Enter your 10-digit mobile number"
                autoComplete="tel"
                inputMode="tel"
              />
            </label>

            {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

            <button
              type="submit"
              disabled={isSendingOtp}
              className="inline-flex w-full items-center justify-center rounded-md bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSendingOtp ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleVerifyOtp}>
            <div className="rounded-md border border-brand-line bg-brand-mint/50 p-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white text-brand-green">
                  <UserRound className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-brand-ink">{submittedName}</p>
                  <p className="mt-1 text-xs text-slate-500">OTP requested for {maskPhoneNumber(submittedPhone)}</p>
                </div>
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-brand-ink">Enter OTP</span>
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, otpLength))}
                className="mt-2 h-12 w-full rounded-md border border-brand-line bg-white px-4 text-base font-bold tracking-[0.24em] text-brand-ink placeholder:tracking-normal placeholder:text-slate-400"
                placeholder={`Enter ${otpLength}-digit OTP`}
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={isVerifyingOtp}
              />
            </label>

            <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
              <p>OTP sent to {maskPhoneNumber(submittedPhone)}</p>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isSendingOtp || isVerifyingOtp || resendRemainingSeconds > 0}
                className="font-semibold text-brand-green transition hover:text-brand-ink disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {isSendingOtp ? "Sending..." : resendRemainingSeconds > 0 ? `Resend in ${resendRemainingSeconds}s` : "Resend OTP"}
              </button>
            </div>

            {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setStep("details");
                  setOtp("");
                  setRequestId("");
                  setResendAvailableAt("");
                  setErrorMessage("");
                }}
                disabled={isSendingOtp || isVerifyingOtp}
                className="inline-flex items-center justify-center rounded-md border border-brand-line px-4 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-green hover:text-brand-green"
              >
                Change details
              </button>
              <button
                type="submit"
                disabled={isVerifyingOtp || otp.trim().length !== otpLength}
                className="inline-flex items-center justify-center rounded-md bg-brand-green px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isVerifyingOtp ? "Verifying..." : "Verify and sign in"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
