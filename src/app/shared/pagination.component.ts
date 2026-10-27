import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <nav *ngIf="totalItems > 0" class="pagination" aria-label="Paginazione">
      <span class="summary">Visualizzati {{ firstItem }}–{{ lastItem }} di {{ totalItems }} {{ label }}</span>
      <div class="controls">
        <label class="page-size">
          Righe
          <select
            [ngModel]="pageSize"
            [ngModelOptions]="{ standalone: true }"
            (ngModelChange)="pageSizeChange.emit($event)">
            <option *ngFor="let size of pageSizes" [ngValue]="size">{{ size }}</option>
          </select>
        </label>
        <button type="button" [disabled]="page <= 1" (click)="pageChange.emit(page - 1)">Precedente</button>
        <span class="page-number">Pagina {{ page }} di {{ totalPages }}</span>
        <button type="button" [disabled]="page >= totalPages" (click)="pageChange.emit(page + 1)">Successiva</button>
      </div>
    </nav>
  `,
  styles: [`
    .pagination,.controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .pagination{justify-content:space-between;margin-top:16px;padding-top:14px;border-top:1px solid #e5ebf3}
    .summary,.page-number,.page-size{color:#66758b;font-size:12px}
    .controls{justify-content:flex-end}
    .page-size{display:flex;align-items:center;gap:7px}
    select,button{min-height:34px;padding:6px 10px;border:1px solid #dce3ec;border-radius:8px;background:#fff;color:#334155;font:inherit}
    button{cursor:pointer;font-size:12px;font-weight:600;transition:background .15s,border-color .15s}
    button:hover:not(:disabled){background:#f1f6fd;border-color:#b8c9e0}
    button:disabled{opacity:.45;cursor:not-allowed}
    select:focus-visible,button:focus-visible{outline:3px solid #bfdbfe;outline-offset:1px}
    @media(max-width:650px){.pagination,.controls{justify-content:center}.pagination{flex-direction:column}}
  `]
})
export class PaginationComponent {
  @Input() totalItems = 0;
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() label = 'elementi';
  @Input() pageSizes = [10, 25, 50];
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get firstItem(): number {
    return this.totalItems ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  get lastItem(): number {
    return Math.min(this.page * this.pageSize, this.totalItems);
  }
}
