import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { BaoCaoTuanService } from '../../services/bao-cao-tuan.service';
import type { BaoCaoTuanRow, BaoCaoTuanSavePayload } from '../../models/bao-cao-tuan.model';
import { getDefaultWeeklyReportRows } from '../../data/weekly-report-default-rows';

type DialogData = { mode: 'add' | 'edit'; reportId?: number };

/** Một khối lớn: bắt đầu tại dòng có `stt` (theo mẫu file), kết thúc trước dòng `stt` tiếp theo. */
interface BaoCaoTuanMajorBlock {
  start: number;
  end: number;
  /** Dữ liệu không bắt đầu bằng dòng STT — gom thành một khối (hiếm, ví dụ import lỗi). */
  implicitMajor?: boolean;
}

/** Một tiểu mục trong khối lớn: dòng đầu có thể là Danh mục 1; các dòng sau dm1 trống (kế thừa Excel). */
interface BaoCaoTuanSubsection {
  start: number;
  end: number;
}

@Component({
  selector: 'app-bao-cao-tuan-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatExpansionModule
  ],
  templateUrl: './bao-cao-tuan-form-dialog.component.html',
  styleUrls: ['./bao-cao-tuan-form-dialog.component.css']
})
export class BaoCaoTuanFormDialogComponent implements OnInit {
  isLoading = false;
  isSaving = false;
  tuanBaoCao = '';
  rows: BaoCaoTuanRow[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private readonly dialogRef: MatDialogRef<BaoCaoTuanFormDialogComponent>,
    private readonly service: BaoCaoTuanService,
    private readonly snackBar: MatSnackBar
  ) {}

  get title(): string {
    return this.data.mode === 'add' ? 'Thêm báo cáo tuần' : 'Cập nhật báo cáo tuần';
  }

  get displayTuanBaoCao(): string {
    const t = this.tuanBaoCao?.trim();
    return t ? t : '—';
  }

  /**
   * Tổng SL: chỉ số nguyên dương (1, 2, …) hoặc để trống.
   * Bỏ ký tự không phải số; bỏ số 0 đứng đầu; toàn số 0 → rỗng.
   */
  static normalizeTongSoPositiveInt(value: string | null | undefined): string {
    const digits = (value ?? '').replace(/\D/g, '');
    if (digits.length === 0) return '';
    const noLeadingZeros = digits.replace(/^0+/, '');
    if (noLeadingZeros.length === 0) return '';
    return noLeadingZeros;
  }

  onTongSoChange(rowIndex: number, value: string): void {
    const row = this.rows[rowIndex];
    if (!row) return;
    row.tongSo = BaoCaoTuanFormDialogComponent.normalizeTongSoPositiveInt(value);
  }

  /** Tuần hiển thị mặc định (thứ Hai–Chủ nhật chứa ngày tham chiếu). */
  private static defaultWeekLabel(ref: Date): string {
    const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const dow = d.getDay();
    const offsetToMonday = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(d);
    mon.setDate(d.getDate() + offsetToMonday);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (x: Date) =>
      `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
    return `${fmt(mon)} – ${fmt(sun)}`;
  }

  /** Khối theo STT trong file (1 — Công việc hằng ngày, 2 — …). */
  get majorBlocks(): BaoCaoTuanMajorBlock[] {
    const list = this.rows;
    if (!list.length) return [];
    const blocks: BaoCaoTuanMajorBlock[] = [];
    let i = 0;
    while (i < list.length) {
      if (list[i].stt != null) {
        const start = i;
        i++;
        while (i < list.length && list[i].stt == null) i++;
        blocks.push({ start, end: i - 1 });
      } else {
        const start = i;
        while (i < list.length && list[i].stt == null) i++;
        blocks.push({ start, end: i - 1, implicitMajor: true });
      }
    }
    return blocks;
  }

  /**
   * Tiểu mục 1), 2), … trong một khối STT: mỗi cụm bắt đầu tại một dòng, kéo dài qua các dòng dm1 trống kế tiếp.
   * Bỏ qua dòng tiêu đề khối (cùng index với STT).
   */
  subsectionsForMajor(m: BaoCaoTuanMajorBlock): BaoCaoTuanSubsection[] {
    const list = this.rows;
    const a = m.start + 1;
    const b = m.end;
    if (a > b) return [];
    const subs: BaoCaoTuanSubsection[] = [];
    let s = a;
    while (s <= b) {
      let e = s;
      while (e < b && !(list[e + 1].danhMuc1 ?? '').trim()) e++;
      subs.push({ start: s, end: e });
      s = e + 1;
    }
    return subs;
  }

  rowIndicesInGroup(g: BaoCaoTuanSubsection): number[] {
    const out: number[] = [];
    for (let i = g.start; i <= g.end; i++) out.push(i);
    return out;
  }

  innerRowCount(m: BaoCaoTuanMajorBlock): number {
    return Math.max(0, m.end - m.start);
  }

  /** Hiển thị nhãn danh mục (chỉ đọc); ô trống → "—". */
  displayLabel(value: string | null | undefined): string {
    const v = (value ?? '').trim();
    return v.length > 0 ? v : '—';
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.reportId) {
      this.loadDetail(this.data.reportId);
      return;
    }
    this.initForAdd();
  }

  private initForAdd(): void {
    this.rows = getDefaultWeeklyReportRows();
    const today = new Date();
    this.tuanBaoCao = BaoCaoTuanFormDialogComponent.defaultWeekLabel(today);
    this.sanitizeAllTongSo();
  }

  private loadDetail(id: number): void {
    this.isLoading = true;
    this.service.getMyById(id).subscribe({
      next: (d) => {
        this.isLoading = false;
        this.tuanBaoCao = d.tuanBaoCao || '';
        this.rows = Array.isArray(d.rows) && d.rows.length > 0 ? d.rows : getDefaultWeeklyReportRows();
        this.sanitizeAllTongSo();
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(err.error?.message || 'Không tải được dữ liệu báo cáo.', 'Đóng', { duration: 4000 });
        this.dialogRef.close(false);
      }
    });
  }

  save(): void {
    const payload = this.buildPayload();
    if (!payload || this.isSaving) return;
    this.isSaving = true;

    if (this.data.mode === 'edit' && this.data.reportId) {
      this.service.update(this.data.reportId, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.snackBar.open('Đã cập nhật báo cáo.', 'Đóng', { duration: 2500 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSaving = false;
          this.snackBar.open(err.error?.message || 'Không thể cập nhật báo cáo.', 'Đóng', { duration: 4000 });
        }
      });
      return;
    }

    this.service.create(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open('Đã thêm báo cáo.', 'Đóng', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSaving = false;
        this.snackBar.open(err.error?.message || 'Không thể thêm báo cáo.', 'Đóng', { duration: 4000 });
      }
    });
  }

  private buildPayload(): BaoCaoTuanSavePayload | null {
    const tuan = this.tuanBaoCao.trim();
    if (!tuan) {
      this.snackBar.open('Tuần báo cáo không xác định.', 'Đóng', { duration: 3000 });
      return null;
    }
    return {
      tuanBaoCao: tuan,
      rows: this.rows
    };
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  private sanitizeAllTongSo(): void {
    for (const row of this.rows) {
      row.tongSo = BaoCaoTuanFormDialogComponent.normalizeTongSoPositiveInt(row.tongSo);
    }
  }
}
