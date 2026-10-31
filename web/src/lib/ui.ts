export const TYPE_META: Record<string, { icon: string; label: string }> = {
  work: { icon: "💼", label: "Work" },
  client: { icon: "🤝", label: "Client call" },
  class: { icon: "🎓", label: "Class" },
  doctor: { icon: "🩺", label: "Doctor visit" },
  household: { icon: "🏠", label: "Household" },
  committee: { icon: "🏘️", label: "Committee" },
  parent_teacher: { icon: "👩‍🏫", label: "Parent–teacher" },
  interview: { icon: "🧑‍💼", label: "Interview" },
  vendor: { icon: "🔧", label: "Landlord / vendor" },
  other: { icon: "🗂️", label: "Meeting" },
};

export const typeMeta = (t: string) => TYPE_META[t] ?? TYPE_META.other;

export const fmtDate = (iso: string | null | undefined, withTime = false) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        weekday: "short", day: "numeric", month: "short",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "";
