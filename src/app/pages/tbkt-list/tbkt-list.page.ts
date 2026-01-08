import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { AssignmentService } from '../../services/assignment.service';
import { MachineAssignment, TechnicalSheet } from '../../models/machine-assignment.model';

export interface TBKTListItem {
  stt: number;
  tbkt_ID: string;
  phase?: string;
  power_kVA?: number;
  voltageSpec?: string;
  salesOrder?: string;
  standardCode?: string;
  proposer?: string; // FirebaseUID (string) thay vì number
  drawingDate?: Date | string;
  requesterElectrical?: string;
  requesterMechanical?: string;
  archivedDate?: Date | string;
  notes?: string;
}

@Component({
  selector: 'app-tbkt-list-page',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './tbkt-list.page.html',
  styleUrl: './tbkt-list.page.css'
})
export class TBKTListPage implements OnInit {
  private readonly assignmentService = inject(AssignmentService);

  readonly tbktList = signal<TBKTListItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly displayedColumns: string[] = [
    'stt',
    'tbkt_ID',
    'phase',
    'power_kVA',
    'voltageSpec',
    'salesOrder',
    'standardCode',
    'proposer',
    'drawingDate',
    'requesterElectrical',
    'requesterMechanical',
    'archivedDate',
    'notes'
  ];

  ngOnInit(): void {
    this.loadTBKTData();
  }

  loadTBKTData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.assignmentService.getAllAssignments().subscribe({
      next: (assignments) => {
        // Group assignments by TBKT_ID and extract TechnicalSheet data
        const tbktMap = new Map<string, TBKTListItem>();
        
        assignments.forEach((assignment, index) => {
          const tbktId = assignment.tbkt_ID;
          
          if (!tbktMap.has(tbktId)) {
            const technicalSheet = assignment.technicalSheet;
            const item: TBKTListItem = {
              stt: tbktMap.size + 1,
              tbkt_ID: tbktId,
              phase: technicalSheet?.phase,
              power_kVA: technicalSheet?.power_kVA,
              voltageSpec: technicalSheet?.voltageSpec,
              salesOrder: technicalSheet?.salesOrder,
              standardCode: technicalSheet?.standardCode,
              proposer: technicalSheet?.proposer,
              drawingDate: technicalSheet?.drawingDate,
              requesterElectrical: technicalSheet?.requesterElectrical,
              requesterMechanical: technicalSheet?.requesterMechanical,
              archivedDate: technicalSheet?.archivedDate,
              notes: technicalSheet?.notes
            };
            tbktMap.set(tbktId, item);
          }
        });

        // Convert map to array and sort by TBKT_ID
        const tbktArray = Array.from(tbktMap.values()).sort((a, b) => 
          a.tbkt_ID.localeCompare(b.tbkt_ID)
        );
        
        // Update STT after sorting
        tbktArray.forEach((item, index) => {
          item.stt = index + 1;
        });

        this.tbktList.set(tbktArray);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading TBKT data:', err);
        this.error.set('Không thể tải dữ liệu TBKT. Vui lòng thử lại sau.');
        this.loading.set(false);
      }
    });
  }

  refresh(): void {
    this.loadTBKTData();
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    // Format as DD/MM/YYYY
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${('00' + day).slice(-2)}/${('00' + month).slice(-2)}/${year}`;
  }
}

