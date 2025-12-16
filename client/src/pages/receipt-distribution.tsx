import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useMissions } from "../hooks/use-missions";
import { Badge } from "../components/ui/badge";
import { AlertTriangle, ArrowLeft, Copy, PlusCircle, ReceiptText } from "lucide-react";

interface ReceiptRow {
  id: string;
  number: string;
  amount: string;
}

export default function ReceiptDistributionPage() {
  const [, setLocation] = useLocation();
  const { missions } = useMissions();
  const [activeMissionId, setActiveMissionId] = useState<string>("");
  const [rowsByMission, setRowsByMission] = useState<Record<string, ReceiptRow[]>>({});
  const [dragState, setDragState] = useState<{ active: boolean; value: string }>({ active: false, value: "" });
  const dragSourceRef = useRef<string | null>(null);

  // Initialize the active mission
  useEffect(() => {
    if (!activeMissionId && missions.length > 0) {
      setActiveMissionId(missions[0].id);
    }
  }, [activeMissionId, missions]);

  // Ensure each mission has an initial row
  useEffect(() => {
    if (activeMissionId && !rowsByMission[activeMissionId]) {
      setRowsByMission(prev => ({
        ...prev,
        [activeMissionId]: [createEmptyRow(1)],
      }));
    }
  }, [activeMissionId, rowsByMission]);

  const rows = rowsByMission[activeMissionId] || [];

  const duplicateNumbers = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach(row => {
      const key = row.number.trim();
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([num]) => num));
  }, [rows]);

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  }, [rows]);

  function createEmptyRow(index: number): ReceiptRow {
    return { id: `receipt-${index}`, number: "", amount: "" };
  }

  function updateRows(updatedRows: ReceiptRow[]) {
    if (!activeMissionId) return;
    setRowsByMission(prev => ({
      ...prev,
      [activeMissionId]: updatedRows,
    }));
  }

  function handleNumberChange(rowId: string, value: string) {
    const updated = rows.map(row => row.id === rowId ? { ...row, number: value } : row);
    updateRows(updated);
  }

  function handleAmountChange(rowId: string, value: string) {
    const sanitized = value.replace(/[^0-9.]/g, "");
    const updated = rows.map(row => row.id === rowId ? { ...row, amount: sanitized } : row);
    updateRows(updated);
  }

  function addRow() {
    const nextIndex = rows.length + 1;
    updateRows([...rows, createEmptyRow(nextIndex)]);
  }

  function startDragFill(value: string, rowId: string) {
    if (!value) return;
    dragSourceRef.current = rowId;
    setDragState({ active: true, value });
  }

  function applyDragFill(targetRowId: string) {
    if (!dragState.active) return;
    if (dragSourceRef.current === targetRowId) return;
    const updated = rows.map(row => row.id === targetRowId ? { ...row, amount: dragState.value } : row);
    updateRows(updated);
  }

  useEffect(() => {
    const stopDrag = () => setDragState({ active: false, value: "" });
    window.addEventListener("mouseup", stopDrag);
    return () => window.removeEventListener("mouseup", stopDrag);
  }, []);

  const missionOptions = missions.map(m => {
    const label = [m.employeeName, m.statement].filter(Boolean).join(" - ") || "مأمورية بدون عنوان";
    return { label, value: m.id };
  });

  if (!missions.length) {
    return (
      <div className="container mx-auto px-4 py-10 space-y-4">
        <div className="flex items-center gap-3">
          <ReceiptText className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">توزيع الإيصالات</h1>
            <p className="text-muted-foreground">لا توجد مأموريات حالية لإسناد الإيصالات إليها</p>
          </div>
        </div>
        <Card className="p-6 bg-background border shadow-sm">
          <p className="text-muted-foreground mb-4">قم بإنشاء مأمورية جديدة أولًا ثم عد لإدارة الإيصالات الخاصة بها.</p>
          <Button onClick={() => setLocation("/")}>
            الرجوع لإنشاء المأمورية
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground rounded-lg p-3">
            <ReceiptText className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">توزيع الإيصالات</h1>
            <p className="text-muted-foreground">إدارة أرقام وقيم الإيصالات المرتبطة بالمأموريات</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setLocation("/")}>العودة إلى المأموريات</Button>
      </div>

      <Card className="p-4 shadow-sm border bg-background">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">اختر المأمورية</label>
            <Select value={activeMissionId} onValueChange={setActiveMissionId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر مأمورية" />
              </SelectTrigger>
              <SelectContent>
                {missionOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-sm text-muted-foreground">إجمالي الإيصالات</div>
              <div className="text-2xl font-bold">{rows.length}</div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-sm text-muted-foreground">إجمالي المبالغ</div>
              <div className="text-2xl font-bold">{totalAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 shadow-sm border bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">جدول الإيصالات</h2>
            <p className="text-sm text-muted-foreground">أدخل أرقام الإيصالات ومبالغها بدون تحديث الصفحة</p>
          </div>
          <div className="flex gap-2">
            {dragState.active && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Copy className="w-4 h-4" /> سحب لنسخ المبلغ
              </Badge>
            )}
            <Button onClick={addRow} className="flex items-center gap-2" variant="secondary">
              <PlusCircle className="w-4 h-4" /> صف جديد
            </Button>
          </div>
        </div>

        <div className="overflow-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-right">
                <th className="px-4 py-3 font-semibold border-l">رقم الإيصال</th>
                <th className="px-4 py-3 font-semibold">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const trimmedNumber = row.number.trim();
                const numberError = !trimmedNumber ? "رقم الإيصال مطلوب" : duplicateNumbers.has(trimmedNumber) ? "رقم الإيصال مكرر" : "";
                const amountError = row.amount === "" ? "المبلغ مطلوب" : "";

                return (
                  <tr key={row.id} className="border-t hover:bg-muted/40">
                    <td className="px-4 py-2 align-top border-l">
                      <Input
                        value={row.number}
                        onChange={(e) => handleNumberChange(row.id, e.target.value)}
                        placeholder="مثلًا: 12345"
                        className={numberError ? "border-destructive" : ""}
                        data-testid={`receipt-number-${index}`}
                      />
                      {numberError && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {numberError}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <Input
                        value={row.amount}
                        onChange={(e) => handleAmountChange(row.id, e.target.value)}
                        placeholder="0.00"
                        onMouseDown={() => startDragFill(row.amount, row.id)}
                        onMouseEnter={() => applyDragFill(row.id)}
                        className={amountError ? "border-destructive" : ""}
                        inputMode="decimal"
                        data-testid={`receipt-amount-${index}`}
                      />
                      {amountError && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {amountError}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="outline">سحب للأسفل لنسخ المبلغ</Badge>
            <span>يدعم مبالغ ثابتة أو مختلفة لكل إيصال</span>
          </div>
          <div className="flex items-center gap-2 font-medium text-foreground">
            الإجمالي: <span className="text-primary">{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      <Card className="p-4 shadow-sm border bg-muted/50">
        <div className="flex items-center gap-3 mb-2">
          <ArrowLeft className="w-4 h-4" />
          <p className="text-sm text-muted-foreground">
            الحقول فارغة لن يتم حفظها تلقائيًا، وتظهر الأخطاء فورًا عند تكرار رقم الإيصال أو ترك البيانات فارغة.
          </p>
        </div>
      </Card>
    </div>
  );
}
