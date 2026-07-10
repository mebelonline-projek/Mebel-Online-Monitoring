"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useCachedList } from "@/lib/use-cached-list";
import type { PiutangRow } from "@/lib/piutang";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowRight } from "lucide-react";
import { useProfile } from "@/components/providers/profile-context";

interface PiutangResponse {
  piutangList: PiutangRow[];
  totalPiutang: number;
}

async function fetchPiutang(): Promise<PiutangResponse> {
  const res = await fetch("/api/piutang");
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || "Gagal memuat piutang");
  return json;
}

function ListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="h-8 w-32 bg-muted rounded" />
      <div className="h-20 bg-muted/50 rounded-xl" />
      <div className="h-64 bg-muted/50 rounded-xl" />
    </div>
  );
}

export function PiutangPageClient() {
  const router = useRouter();
  const profile = useProfile();
  const { data, loading, error } = useCachedList("piutang:page", fetchPiutang);

  useEffect(() => {
    if (profile.role !== "OWNER") {
      router.replace("/dashboard/karyawan");
    }
  }, [profile.role, router]);

  if (profile.role !== "OWNER") {
    return <p className="p-6 text-muted-foreground">Memuat...</p>;
  }

  if (!data && loading) return <ListSkeleton />;
  if (error && !data) return <p className="p-6 text-destructive">{error}</p>;

  const piutangList = data?.piutangList ?? [];
  const totalPiutang = data?.totalPiutang ?? 0;

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Piutang</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Daftar transaksi DP dan menunggu pelunasan yang masih ada sisa tagihan.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Total Piutang
            </p>
            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              {formatCurrency(totalPiutang)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
        </CardContent>
      </Card>

      {piutangList.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center text-muted-foreground">
            Tidak ada piutang outstanding saat ini.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {piutangList.map((tx) => (
              <Card key={tx.id} className="shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold">{tx.transaction_number}</span>
                    <StatusBadge status={tx.status} />
                  </div>
                  <p className="font-semibold">{tx.customer_name || "Tanpa nama"}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sisa tagihan</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {formatCurrency(tx.remaining)}
                    </span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full gap-1">
                    <Link href={`/transaksi/${tx.id}/pelunasan`}>
                      Input Pelunasan
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-sm overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Transaksi</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Dibayar</TableHead>
                    <TableHead>Sisa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="w-[120px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {piutangList.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm font-bold">
                        {tx.transaction_number}
                      </TableCell>
                      <TableCell>{tx.customer_name || "—"}</TableCell>
                      <TableCell>{formatCurrency(tx.final_price)}</TableCell>
                      <TableCell>{formatCurrency(tx.paid)}</TableCell>
                      <TableCell className="font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(tx.remaining)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(tx.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/transaksi/${tx.id}/pelunasan`}>Pelunasan</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
