import { useRole } from "./role-context";

export function ScopeBanner() {
  const { viewer } = useRole();
  return (
    <div className="rounded-2xl border border-iris/20 bg-iris/8 px-4 py-2.5 text-[12px] font-medium text-iris">
      Viewing · {viewer.label}
    </div>
  );
}
