import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { formatEUR } from "@/lib/pricing";
import { RevenueForm } from "./RevenueForm";
import { DeleteRevenueButton } from "./DeleteRevenueButton";

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function ChiffreAffairesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; date?: string }>;
}) {
  const params = await searchParams;

  const entries = await prisma.dailyRevenue.findMany({
    orderBy: { date: "desc" },
  });

  const now = new Date();
  const todayStr = toDateInputValue(now);
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const todayEntry = entries.find((e) => toDateInputValue(e.date) === todayStr);

  const thisMonthTotal = entries
    .filter(
      (e) =>
        e.date.getUTCFullYear() === currentYear && e.date.getUTCMonth() === currentMonth
    )
    .reduce((sum, e) => sum + e.amountTTC, 0);

  const thisYearTotal = entries
    .filter((e) => e.date.getUTCFullYear() === currentYear)
    .reduce((sum, e) => sum + e.amountTTC, 0);

  const yearsWithData = Array.from(new Set(entries.map((e) => e.date.getUTCFullYear())));
  const years = Array.from(new Set([currentYear, ...yearsWithData])).sort((a, b) => b - a);

  const selectedYear = params.year ? Number(params.year) : currentYear;

  const monthlyBreakdown = MONTHS_FR.map((label, monthIndex) => {
    const monthEntries = entries.filter(
      (e) => e.date.getUTCFullYear() === selectedYear && e.date.getUTCMonth() === monthIndex
    );
    return {
      label,
      total: monthEntries.reduce((sum, e) => sum + e.amountTTC, 0),
      count: monthEntries.length,
    };
  });
  const selectedYearTotal = monthlyBreakdown.reduce((sum, m) => sum + m.total, 0);

  const yearlyTotals = years.map((year) => ({
    year,
    total: entries
      .filter((e) => e.date.getUTCFullYear() === year)
      .reduce((sum, e) => sum + e.amountTTC, 0),
  }));

  const editingEntry = params.date
    ? entries.find((e) => toDateInputValue(e.date) === params.date)
    : todayEntry;

  const recentEntries = entries.slice(0, 31);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Chiffre d'affaires"
        description="Saisissez votre CA journalier, les totaux mensuels et annuels se calculent automatiquement."
      />

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Aujourd&apos;hui</p>
          <p className="text-2xl font-semibold text-gray-900">
            {todayEntry ? formatEUR(todayEntry.amountTTC) : "—"}
          </p>
          {!todayEntry && (
            <p className="mt-1 text-xs text-gray-400">Pas encore saisi</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Ce mois-ci ({MONTHS_FR[currentMonth]})</p>
          <p className="text-2xl font-semibold text-gray-900">{formatEUR(thisMonthTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Cette année ({currentYear})</p>
          <p className="text-2xl font-semibold text-gray-900">{formatEUR(thisYearTotal)}</p>
        </Card>
      </div>

      <RevenueForm
        key={params.date ?? todayStr}
        defaultDate={params.date ?? todayStr}
        defaultAmount={editingEntry?.amountTTC}
        defaultNote={editingEntry?.note}
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">
            Répartition mensuelle {selectedYear}
          </p>
          <div className="flex gap-1">
            {years.map((y) => (
              <Link
                key={y}
                href={`/chiffre-affaires?year=${y}`}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${
                  y === selectedYear
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Mois</th>
                <th className="px-4 py-2">Jours saisis</th>
                <th className="px-4 py-2">Total TTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyBreakdown.map((m) => (
                <tr key={m.label}>
                  <td className="px-4 py-2 text-gray-900">{m.label}</td>
                  <td className="px-4 py-2 text-gray-500">{m.count}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {m.total > 0 ? formatEUR(m.total) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-4 py-2 font-semibold text-gray-900">Total {selectedYear}</td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2 font-semibold text-gray-900">
                  {formatEUR(selectedYearTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      </div>

      {yearlyTotals.length > 1 && (
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-900">Total par année</p>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {yearlyTotals.map((y) => (
                  <tr key={y.year}>
                    <td className="px-4 py-2 text-gray-900">{y.year}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      {formatEUR(y.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <div>
        <p className="mb-3 text-sm font-semibold text-gray-900">Dernières saisies</p>
        {recentEntries.length === 0 ? (
          <Card className="p-6 text-sm text-gray-500">
            Aucune saisie pour le moment. Utilisez le formulaire ci-dessus.
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">CA TTC</th>
                  <th className="px-4 py-2">Note</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentEntries.map((e) => {
                  const dateStr = toDateInputValue(e.date);
                  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "long",
                    timeZone: "UTC",
                  }).format(e.date);
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">{dateLabel}</td>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {formatEUR(e.amountTTC)}
                      </td>
                      <td className="px-4 py-2 text-gray-500">{e.note || "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/chiffre-affaires?date=${dateStr}`}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900"
                          >
                            Modifier
                          </Link>
                          <DeleteRevenueButton id={e.id} dateLabel={dateLabel} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
