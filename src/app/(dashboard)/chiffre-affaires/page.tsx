import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, PageHeader } from "@/components/ui";
import { formatEUR } from "@/lib/pricing";
import { RevenueForm } from "./RevenueForm";
import { DeleteRevenueButton } from "./DeleteRevenueButton";
import { createRevenueEntry, updateRevenueEntry } from "./actions";

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

const NON_VENTILE = "Non ventilé";

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function periodLabel(entry: { periodType: string; date: Date }): string {
  if (entry.periodType === "MOIS") {
    return new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(entry.date);
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" }).format(
    entry.date
  );
}

function sumBy<T>(items: T[], amount: (item: T) => number): number {
  return items.reduce((sum, item) => sum + amount(item), 0);
}

export default async function ChiffreAffairesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; edit?: string }>;
}) {
  const params = await searchParams;

  const [entries, categories] = await Promise.all([
    prisma.revenueEntry.findMany({
      orderBy: { date: "desc" },
      include: { category: true },
    }),
    prisma.category.findMany({ orderBy: { nom: "asc" } }),
  ]);

  const now = new Date();
  const todayStr = toDateInputValue(now);
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  const todayEntries = entries.filter(
    (e) => e.periodType === "JOUR" && toDateInputValue(e.date) === todayStr
  );
  const todayTotal = sumBy(todayEntries, (e) => e.amountTTC);

  const thisMonthEntries = entries.filter(
    (e) => e.date.getUTCFullYear() === currentYear && e.date.getUTCMonth() === currentMonth
  );
  const thisMonthTotal = sumBy(thisMonthEntries, (e) => e.amountTTC);

  const thisYearEntries = entries.filter((e) => e.date.getUTCFullYear() === currentYear);
  const thisYearTotal = sumBy(thisYearEntries, (e) => e.amountTTC);

  const yearsWithData = Array.from(new Set(entries.map((e) => e.date.getUTCFullYear())));
  const years = Array.from(new Set([currentYear, ...yearsWithData])).sort((a, b) => b - a);

  const selectedYear = params.year ? Number(params.year) : currentYear;
  const yearEntries = entries.filter((e) => e.date.getUTCFullYear() === selectedYear);

  const monthlyBreakdown = MONTHS_FR.map((label, monthIndex) => {
    const monthEntries = yearEntries.filter((e) => e.date.getUTCMonth() === monthIndex);
    return {
      label,
      total: sumBy(monthEntries, (e) => e.amountTTC),
      count: monthEntries.length,
    };
  });
  const selectedYearTotal = sumBy(yearEntries, (e) => e.amountTTC);

  const yearlyTotals = years.map((year) => ({
    year,
    total: sumBy(
      entries.filter((e) => e.date.getUTCFullYear() === year),
      (e) => e.amountTTC
    ),
  }));

  const tvaBuckets = [20, 10, 5.5, 0];
  const tvaBreakdown = [
    ...tvaBuckets.map((rate) => ({
      label: `${rate.toString().replace(".", ",")} %`,
      total: sumBy(
        yearEntries.filter((e) => e.tvaRate === rate),
        (e) => e.amountTTC
      ),
    })),
    {
      label: NON_VENTILE,
      total: sumBy(
        yearEntries.filter((e) => e.tvaRate === null),
        (e) => e.amountTTC
      ),
    },
  ].filter((b) => b.total > 0);

  const categoryBreakdown = [
    ...categories.map((c) => ({
      label: c.nom,
      total: sumBy(
        yearEntries.filter((e) => e.categoryId === c.id),
        (e) => e.amountTTC
      ),
    })),
    {
      label: NON_VENTILE,
      total: sumBy(
        yearEntries.filter((e) => e.categoryId === null),
        (e) => e.amountTTC
      ),
    },
  ].filter((b) => b.total > 0);

  const editingEntry = params.edit ? entries.find((e) => e.id === params.edit) : undefined;
  const recentEntries = entries.slice(0, 40);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Chiffre d'affaires"
        description="Saisissez votre CA par jour ou par mois, éventuellement ventilé par TVA et par famille."
      />

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Aujourd&apos;hui</p>
          <p className="text-2xl font-semibold text-gray-900">
            {todayEntries.length > 0 ? formatEUR(todayTotal) : "—"}
          </p>
          {todayEntries.length === 0 && (
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
        key={editingEntry?.id ?? "new"}
        categories={categories}
        todayStr={todayStr}
        entry={
          editingEntry
            ? {
                periodType: editingEntry.periodType,
                date: editingEntry.date.toISOString(),
                categoryId: editingEntry.categoryId,
                tvaRate: editingEntry.tvaRate,
                amountTTC: editingEntry.amountTTC,
                note: editingEntry.note,
              }
            : undefined
        }
        action={
          editingEntry ? updateRevenueEntry.bind(null, editingEntry.id) : createRevenueEntry
        }
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
                <th className="px-4 py-2">Saisies</th>
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

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-900">
            Répartition par TVA ({selectedYear})
          </p>
          <Card className="overflow-hidden">
            {tvaBreakdown.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Aucune donnée pour {selectedYear}.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {tvaBreakdown.map((b) => (
                    <tr key={b.label}>
                      <td className="px-4 py-2 text-gray-900">{b.label}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                        {formatEUR(b.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-900">
            Répartition par famille ({selectedYear})
          </p>
          <Card className="overflow-hidden">
            {categoryBreakdown.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Aucune donnée pour {selectedYear}.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {categoryBreakdown.map((b) => (
                    <tr key={b.label}>
                      <td className="px-4 py-2 text-gray-900">{b.label}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                        {formatEUR(b.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
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
                  <th className="px-4 py-2">Période</th>
                  <th className="px-4 py-2">Famille</th>
                  <th className="px-4 py-2">TVA</th>
                  <th className="px-4 py-2">CA TTC</th>
                  <th className="px-4 py-2">Note</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentEntries.map((e) => {
                  const label = periodLabel(e);
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">
                        {label}
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-500">
                          {e.periodType === "JOUR" ? "Jour" : "Mois"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{e.category?.nom ?? "—"}</td>
                      <td className="px-4 py-2 text-gray-500">
                        {e.tvaRate !== null ? `${e.tvaRate.toString().replace(".", ",")} %` : "—"}
                      </td>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {formatEUR(e.amountTTC)}
                      </td>
                      <td className="px-4 py-2 text-gray-500">{e.note || "—"}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/chiffre-affaires?edit=${e.id}`}
                            className="text-xs font-medium text-gray-600 hover:text-gray-900"
                          >
                            Modifier
                          </Link>
                          <DeleteRevenueButton id={e.id} label={label} />
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
