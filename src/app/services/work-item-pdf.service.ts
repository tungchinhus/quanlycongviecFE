import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { WorkItemWithAssignment } from '../models/machine-assignment.model';
import { formatDate } from '../utils/date.util';

/** Style giống mẫu phiếu bên phải: viền mỏng xám, header xanh nhạt, bo góc */
const PDF_STYLE = {
  fontFamily: 'Arial, "Helvetica Neue", "Times New Roman", sans-serif',
  borderColor: '#666666',
  borderLight: '#999999',
  headerBg: '#5b8fc7',
  headerColor: '#ffffff',
  cellPadding: '6px 8px',
  fontSize: 12,
  fontSizeSmall: 10,
  borderRadius: '4px'
};

@Injectable({
  providedIn: 'root'
})
export class WorkItemPdfService {

  /**
   * Rút gọn họ tên theo dạng N.L.Khoi (chữ cái đầu từng từ + tên không dấu).
   * VD: "Nguyễn Lê Khôi" -> "N.L.Khoi"
   */
  private formatDisplayName(raw: string | undefined | null): string {
    if (raw == null || (raw = String(raw).trim()) === '') return '-';
    const parts = raw.split(/\s+/).filter(p => p.length > 0);
    if (parts.length === 0) return raw;
    if (parts.length === 1) return this.removeDiacritics(parts[0]);
    const initials = parts.slice(0, -1).map(p => (p[0] || '').toUpperCase()).join('.');
    const last = this.removeDiacritics(parts[parts.length - 1]);
    const lastCapitalized = last.length > 0 ? last[0].toUpperCase() + last.slice(1).toLowerCase() : last;
    return initials + '.' + lastCapitalized;
  }

  /** Bỏ dấu tiếng Việt để hiển thị dạng Khoi từ Khôi */
  private removeDiacritics(s: string): string {
    const map: Record<string, string> = {
      'à':'a','á':'a','ả':'a','ã':'a','ạ':'a','ă':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a','â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a',
      'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e','ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
      'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
      'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o','ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o','ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o',
      'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u','ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u',
      'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y','đ':'d'
    };
    const upper = Object.fromEntries(Object.entries(map).map(([k, v]) => [k.toUpperCase(), v.toUpperCase()]));
    const all = { ...map, ...upper };
    return s.split('').map(c => all[c] ?? c).join('');
  }

  /**
   * Xuất phiếu phân công và theo dõi công việc dạng PDF – UI giống hệt mẫu bên phải.
   */
  exportAssignmentPdf(item: WorkItemWithAssignment): void {
    const assignment = item.assignment;
    if (!assignment) {
      return;
    }

    const rawWorkItems = assignment.workItems || [];
    // Thứ tự hiển thị: T.Kế ruột, K.Soát ruột, T.Kế vỏ, K.Soát vỏ, Đ.mức vật tư
    const workTypeOrder = ['Core Design', 'Core Review', 'Casing Design', 'Casing Review', 'Material Leveling'];
    const workItems = [...rawWorkItems].sort((a, b) => {
      const ia = workTypeOrder.indexOf(a.workType || '');
      const ib = workTypeOrder.indexOf(b.workType || '');
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    const tbktId = assignment.tbkt_ID || '-';
    // Ưu tiên Designer (người giao việc đúng theo DB) rồi mới TeamLeader
    const nguoiGiaoViecRaw = assignment.designer || assignment.teamLeader || '';
    const nguoiGiaoViecDisplay = this.formatDisplayName(nguoiGiaoViecRaw);

    const infoRowsWithoutTbkt = [
      ['Tên máy', assignment.machineName || '-'],
      ['ĐĐH/Giấy đề nghị', assignment.requestDocument || '-'],
      ['Yêu cầu SP (Tiêu chuẩn)', (assignment.standardRequirement || '-').substring(0, 120) + ((assignment.standardRequirement?.length || 0) > 120 ? '...' : '')],
      ['Yêu cầu khác', assignment.additionalRequest || '-'],
      ['Ngày giao B.vẽ cho KHVT', assignment.deliveryDate ? formatDate(assignment.deliveryDate) : '-'],
      ['Người giao việc (Tổ trưởng hoặc Phó Phòng)', nguoiGiaoViecDisplay]
    ];

    const workTypeDisplayLabel: Record<string, string> = {
      'Core Design': 'T.Kế ruột',
      'Core Review': 'K.Soát ruột',
      'Casing Design': 'T.Kế vỏ',
      'Casing Review': 'K.Soát vỏ',
      'Material Leveling': 'Đ.mức vật tư'
    };
    const workRows = workItems.map(wi => [
      workTypeDisplayLabel[wi.workType || ''] ?? wi.workType ?? '-',
      this.formatDisplayName(wi.fullName || wi.personName || undefined),
      '', // Xác nhận (chữ ký) người thực hiện — để trống
      wi.startDate ? formatDate(wi.startDate) : '-',
      wi.expectedFinish ? formatDate(wi.expectedFinish) : '-',
      wi.actualFinish ? formatDate(wi.actualFinish) : '-',
      '', // Cột xác nhận thời gian — để trống (không in "Xác nhận")
      wi.notes || ''
    ]);

    const html = this.buildPhiếuPhânCôngHtml(infoRowsWithoutTbkt, tbktId, workRows, nguoiGiaoViecDisplay);
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: 794px; min-height: 1123px; background: #fff;
      font-family: ${PDF_STYLE.fontFamily};
      font-size: ${PDF_STYLE.fontSize}px;
      color: #000; padding: 28px 32px; box-sizing: border-box;
    `;
    document.body.appendChild(container);

    html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
      windowHeight: container.scrollHeight
    }).then((canvas) => {
      try {
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const ratio = pageW / canvas.width;
        const imgH = canvas.height * ratio;
        const pageH = doc.internal.pageSize.getHeight();
        doc.addImage(imgData, 'JPEG', 0, 0, pageW, Math.min(imgH, pageH));
        for (let p = 1; p * pageH < imgH; p++) {
          doc.addPage();
          doc.addImage(imgData, 'JPEG', 0, -p * pageH, pageW, imgH);
        }
        const safeTbkt = (assignment.tbkt_ID || 'assignment').replace(/[\\/:*?"<>|]/g, '_');
        const fileName = `Phieu_phan_cong_${safeTbkt}_${formatDate(new Date()).replace(/\//g, '-')}.pdf`;
        doc.save(fileName);
      } finally {
        document.body.removeChild(container);
      }
    }).catch(() => {
      document.body.removeChild(container);
    });
  }

  private buildPhiếuPhânCôngHtml(
    infoRows: string[][],
    tbktId: string,
    workRows: string[][],
    nguoiGiaoViec: string
  ): string {
    const border = `1px solid ${PDF_STYLE.borderColor}`;
    const borderLight = `1px solid ${PDF_STYLE.borderLight}`;
    const thStyle = `background: ${PDF_STYLE.headerBg}; color: ${PDF_STYLE.headerColor}; font-weight: bold; padding: ${PDF_STYLE.cellPadding}; border: ${border}; font-size: ${PDF_STYLE.fontSizeSmall}px;`;
    const thStyleRounded = thStyle + ` border-top-left-radius: ${PDF_STYLE.borderRadius}; border-top-right-radius: ${PDF_STYLE.borderRadius};`;
    const tdStyle = `padding: ${PDF_STYLE.cellPadding}; border: ${borderLight}; font-size: ${PDF_STYLE.fontSizeSmall}px;`;

    let infoBody = '';
    infoRows.forEach(([label, value], idx) => {
      const isNguoiGiaoViec = label.indexOf('Người giao việc') !== -1;
      let valueCell = this.escapeHtml(value);
      if (isNguoiGiaoViec && nguoiGiaoViec) {
        valueCell = `
          <table style="width:100%; border-collapse: collapse; border: none;">
            <tr>
              <td style="border: none; padding: 2px 4px; font-size: ${PDF_STYLE.fontSizeSmall}px; width: 33%;">Tên</td>
              <td style="border: none; padding: 2px 4px; font-size: ${PDF_STYLE.fontSizeSmall}px; width: 33%;">X.nhận</td>
              <td style="border: none; padding: 2px 4px; font-size: ${PDF_STYLE.fontSizeSmall}px; width: 34%;">Trưởng Đ.vị</td>
            </tr>
            <tr>
              <td style="border: none; padding: 2px 4px;">${this.escapeHtml(nguoiGiaoViec)}</td>
              <td style="border: none; padding: 2px 4px;"></td>
              <td style="border: none; padding: 2px 4px;"></td>
            </tr>
          </table>`;
      }
      infoBody += `<tr><td style="${tdStyle} width: 32%; vertical-align: top;">${this.escapeHtml(label)}</td><td style="${tdStyle} vertical-align: top;">${valueCell}</td><td style="${tdStyle} width: 12%;"></td></tr>`;
    });

    let workBody = '';
    workRows.forEach(row => {
      workBody += '<tr>';
      row.forEach(cell => {
        workBody += `<td style="${tdStyle}">${this.escapeHtml(cell)}</td>`;
      });
      workBody += '</tr>';
    });

    const workTable =
      workRows.length > 0
        ? `
    <p style="font-weight: bold; margin: 14px 0 8px 0; font-size: ${PDF_STYLE.fontSize}px;">Bảng phân công và theo dõi</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: ${borderLight}; border-radius: ${PDF_STYLE.borderRadius}; overflow: hidden;">
      <thead>
        <tr>
          <th style="${thStyleRounded}" rowspan="2">Hạng mục</th>
          <th style="${thStyle}" colspan="2">Người thực hiện</th>
          <th style="${thStyle}" colspan="3">Thời gian thực hiện</th>
          <th style="${thStyle}" rowspan="2">Xác nhận</th>
          <th style="${thStyleRounded}" rowspan="2">Ghi chú</th>
        </tr>
        <tr>
          <th style="${thStyle}">Tên</th>
          <th style="${thStyle}">Xác nhận</th>
          <th style="${thStyle}">Bắt đầu</th>
          <th style="${thStyle}">Dự kiến hoàn thành</th>
          <th style="${thStyle}">Kết thúc</th>
        </tr>
      </thead>
      <tbody>${workBody}</tbody>
    </table>`
        : '';

    const changeTable = `
    <p style="font-weight: bold; margin: 14px 0 6px 0; font-size: ${PDF_STYLE.fontSize}px;">Các hạng mục thay đổi (nếu có)</p>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; border: ${borderLight};">
      <thead>
        <tr>
          <th style="${thStyleRounded} width: 6%;">Stt</th>
          <th style="${thStyle}">Các hạng mục thay đổi (nếu có)</th>
          <th style="${thStyleRounded} width: 12%;">Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="${tdStyle} text-align: center;">1</td>
          <td style="${tdStyle}">Thay đổi theo phiếu đăng ký sửa đổi bản vẽ TBKT số :</td>
          <td style="${tdStyle} text-align: center;">☐</td>
        </tr>
        <tr>
          <td style="${tdStyle} text-align: center;">2</td>
          <td style="${tdStyle}">Thay đổi theo sửa đổi định mức vật tư</td>
          <td style="${tdStyle} text-align: center;">☐</td>
        </tr>
        <tr>
          <td style="${tdStyle} text-align: center;">3</td>
          <td style="${tdStyle}">Vấn đề khác (nếu có)</td>
          <td style="${tdStyle} text-align: center;">☐</td>
        </tr>
      </tbody>
    </table>`;

    return `
<div style="font-family: ${PDF_STYLE.fontFamily}; max-width: 100%;">
  <p style="text-align: left; font-size: 13px; font-weight: normal; margin: 0 0 2px 0; padding-left: 0;">CÔNG TY CỔ PHẦN THIẾT BỊ ĐIỆN</p>
  <p style="text-align: left; font-size: 12px; font-weight: 600; margin: 0 0 14px 0; padding-left: 50px;">PHÒNG THIẾT KẾ</p>
  <p style="text-align: center; font-size: 16px; font-weight: bold; margin: 0 0 20px 0;">PHIẾU PHÂN CÔNG VÀ THEO DÕI CÔNG VIỆC</p>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 0; border: ${borderLight}; border-top-left-radius: ${PDF_STYLE.borderRadius}; border-top-right-radius: ${PDF_STYLE.borderRadius}; overflow: hidden;">
    <thead><tr>
      <th style="${thStyleRounded} width: 32%;">Thông tin</th>
      <th style="${thStyle}">Nội dung</th>
      <th style="${thStyleRounded} width: 12%;">Ghi chú</th>
    </tr></thead>
    <tbody>${infoBody}</tbody>
  </table>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; border: ${borderLight}; border-top: none;">
    <tr>
      <td style="padding: ${PDF_STYLE.cellPadding}; border: ${borderLight}; border-top: none; text-align: center; font-size: ${PDF_STYLE.fontSizeSmall}px;">TBKT số: ${this.escapeHtml(tbktId)}</td>
    </tr>
  </table>

  ${workTable}

  ${changeTable}

  <table style="width: 100%; border-collapse: collapse; margin: 14px 0 12px 0; border: ${border}; font-size: ${PDF_STYLE.fontSizeSmall}px; table-layout: fixed;">
    <colgroup>
      <col style="width: 14%;">
      <col style="width: 14.33%;"><col style="width: 14.33%;">
      <col style="width: 14.33%;"><col style="width: 14.33%;">
      <col style="width: 14.33%;"><col style="width: 14.33%;">
    </colgroup>
    <tr>
      <th style="${thStyle} vertical-align: middle; text-align: center;" rowspan="3">Kiểm tra hoàn tất</th>
      <th style="${thStyle} text-align: center;" colspan="2">Trưởng đơn vị</th>
      <th style="${thStyle} text-align: center;" colspan="2">QO Phòng</th>
      <th style="${thStyle} text-align: center;" colspan="2">Người giao việc</th>
    </tr>
    <tr>
      <td style="${tdStyle} text-align: left;" colspan="2">Ngày... tháng... năm....</td>
      <td style="${tdStyle} text-align: left;" colspan="2">Ngày... tháng... năm....</td>
      <td style="${tdStyle} text-align: left;" colspan="2">Ngày... tháng... năm....</td>
    </tr>
    <tr>
      <td style="${tdStyle}">Xác nhận</td>
      <td style="${tdStyle}"></td>
      <td style="${tdStyle}">Tên/ xác nhận</td>
      <td style="${tdStyle}"></td>
      <td style="${tdStyle}">Xác nhận</td>
      <td style="${tdStyle}"></td>
    </tr>
  </table>

  <p style="font-weight: bold; margin: 0 0 4px 0; font-size: ${PDF_STYLE.fontSizeSmall}px;">Ghi chú:</p>
  <p style="margin: 0 0 8px 0; font-size: ${PDF_STYLE.fontSizeSmall}px; font-style: italic;">Cột xác nhận thời gian thực hiện người ở công đoạn sau ký xác nhận cho công đoạn trước. Người thiết kế xác nhận ĐMVT. Mục kiểm tra hoàn tất phiếu thực hiện khi thiết kế đã gia công chế thử xong.</p>
  <p style="margin: 0; font-size: ${PDF_STYLE.fontSizeSmall}px;">Lần ban hành soát xét : 6/0 ngày 30/6/22</p>
</div>`;
  }

  private escapeHtml(text: string): string {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
}
