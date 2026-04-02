"use client";

import type { SVGProps } from "react";

export type NavIconName =
  | "home"
  | "tasks"
  | "lists"
  | "calendar"
  | "schedules"
  | "notifications"
  | "meals"
  | "chores"
  | "rewards"
  | "notes"
  | "messages"
  | "expenses"
  | "documents"
  | "routines"
  | "family"
  | "family_settings"
  | "settings"
  | "product_admin"
  | "more";

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const commonProps: SVGProps<SVGSVGElement> = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true
  };

  switch (name) {
    case "home":
      return (
        <svg {...commonProps} className={className}>
          <path d="M3.75 10.75 12 4l8.25 6.75v8a1.25 1.25 0 0 1-1.25 1.25H5a1.25 1.25 0 0 1-1.25-1.25z" />
          <path d="M9.25 20v-5h5.5v5" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...commonProps} className={className}>
          <rect x="4" y="3.75" width="16" height="16.5" rx="2.25" />
          <path d="m8.5 12.25 2.2 2.2 4.8-4.8" />
        </svg>
      );
    case "lists":
      return (
        <svg {...commonProps} className={className}>
          <path d="M9 6.5h10.5M9 12h10.5M9 17.5h10.5" />
          <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...commonProps} className={className}>
          <rect x="3.5" y="5.25" width="17" height="15.25" rx="2.25" />
          <path d="M16.5 3.5v3.5M7.5 3.5v3.5M3.5 9.25h17" />
        </svg>
      );
    case "schedules":
      return (
        <svg {...commonProps} className={className}>
          <circle cx="12" cy="12" r="8.25" />
          <path d="M12 7.75v4.75l3 1.75" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...commonProps} className={className}>
          <path d="M6.5 10.25a5.5 5.5 0 0 1 11 0v3.25c0 1.2.55 2.35 1.5 3.1H5c.95-.75 1.5-1.9 1.5-3.1z" />
          <path d="M9.5 17.5a2.5 2.5 0 0 0 5 0" />
        </svg>
      );
    case "meals":
      return (
        <svg {...commonProps} className={className}>
          <path d="M7.25 3.5v8.75M4.75 3.5v4.25a2.5 2.5 0 0 0 2.5 2.5M9.75 3.5v4.25a2.5 2.5 0 0 1-2.5 2.5M7.25 12.25V20" />
          <path d="M16.5 3.5c1.66 0 3 1.34 3 3v5.75h-4.5V6.5c0-1.66.84-3 1.5-3Z" />
          <path d="M17.25 12.25V20" />
        </svg>
      );
    case "chores":
      return (
        <svg {...commonProps} className={className}>
          <path d="m12 4.5 2.1 4.25 4.7.68-3.4 3.32.8 4.69L12 15.1l-4.2 2.34.8-4.7-3.4-3.3 4.7-.69z" />
        </svg>
      );
    case "rewards":
      return (
        <svg {...commonProps} className={className}>
          <path d="M8 4.25h8v3.5a4 4 0 0 1-8 0z" />
          <path d="M8 5.25H6.75A2.75 2.75 0 0 0 4 8c0 1.52 1.23 2.75 2.75 2.75H8M16 5.25h1.25A2.75 2.75 0 0 1 20 8a2.75 2.75 0 0 1-2.75 2.75H16" />
          <path d="M12 11.75V16.5M9 20h6" />
        </svg>
      );
    case "notes":
      return (
        <svg {...commonProps} className={className}>
          <path d="M6 3.75h8.5l3.5 3.5V20.25H6a2 2 0 0 1-2-2V5.75a2 2 0 0 1 2-2Z" />
          <path d="M14.5 3.75v3.5H18M8 11h8M8 15h6" />
        </svg>
      );
    case "messages":
      return (
        <svg {...commonProps} className={className}>
          <path d="M5.5 5h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 3v-3h-1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          <path d="M8 10h8M8 13.5h5.5" />
        </svg>
      );
    case "expenses":
      return (
        <svg {...commonProps} className={className}>
          <rect x="3.5" y="6.25" width="17" height="11.5" rx="2.25" />
          <path d="M16.75 12h.01M3.5 9h17" />
        </svg>
      );
    case "documents":
      return (
        <svg {...commonProps} className={className}>
          <path d="M7 3.75h7.75L19 8v12.25a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-14.5a2 2 0 0 1 2-2Z" />
          <path d="M14.75 3.75V8H19M8.25 12h7.5M8.25 15.5h7.5M8.25 19h5" />
        </svg>
      );
    case "routines":
      return (
        <svg {...commonProps} className={className}>
          <path d="M20 12a8 8 0 0 1-13.66 5.66M4 12a8 8 0 0 1 13.66-5.66" />
          <path d="M6.34 17.66H3.5V20.5M17.66 6.34H20.5V3.5" />
        </svg>
      );
    case "family":
      return (
        <svg {...commonProps} className={className}>
          <path d="M16.5 20v-1.5a3 3 0 0 0-3-3h-3a3 3 0 0 0-3 3V20M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
          <path d="M19.5 20v-1a2.5 2.5 0 0 0-2.5-2.5M4.5 20v-1A2.5 2.5 0 0 1 7 16.5" />
        </svg>
      );
    case "family_settings":
      return (
        <svg {...commonProps} className={className}>
          <path d="M4 6.5h7M14 6.5h6M10 6.5a2 2 0 1 0 0 0ZM4 12h3M10 12h10M8 12a2 2 0 1 0 0 0ZM4 17.5h9M16 17.5h4M14 17.5a2 2 0 1 0 0 0Z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps} className={className}>
          <path d="M12 9.25A2.75 2.75 0 1 1 12 14.75 2.75 2.75 0 0 1 12 9.25Z" />
          <path d="M19.4 13.1a1 1 0 0 0 .2 1.1l.04.04a1.75 1.75 0 1 1-2.47 2.47l-.04-.04a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.92V18a1.75 1.75 0 1 1-3.5 0v-.07a1 1 0 0 0-.6-.92 1 1 0 0 0-1.1.2l-.04.04a1.75 1.75 0 0 1-2.47-2.47l.04-.04a1 1 0 0 0 .2-1.1 1 1 0 0 0-.92-.6H6a1.75 1.75 0 1 1 0-3.5h.07a1 1 0 0 0 .92-.6 1 1 0 0 0-.2-1.1l-.04-.04a1.75 1.75 0 0 1 2.47-2.47l.04.04a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.92V6a1.75 1.75 0 1 1 3.5 0v.07a1 1 0 0 0 .6.92 1 1 0 0 0 1.1-.2l.04-.04a1.75 1.75 0 1 1 2.47 2.47l-.04.04a1 1 0 0 0-.2 1.1 1 1 0 0 0 .92.6H18a1.75 1.75 0 1 1 0 3.5h-.07a1 1 0 0 0-.92.6Z" />
        </svg>
      );
    case "product_admin":
      return (
        <svg {...commonProps} className={className}>
          <path d="M12 3.75 5.25 6.5v5.58c0 4.02 2.73 7.74 6.75 9.17 4.02-1.43 6.75-5.15 6.75-9.17V6.5z" />
          <path d="m9.25 12.5 1.9 1.9 3.6-3.6" />
        </svg>
      );
    case "more":
      return (
        <svg {...commonProps} className={className}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    default:
      return null;
  }
}
